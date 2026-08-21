import { Injectable, NotFoundException } from '@nestjs/common';
import { Incident, IncidentAttachment } from '@prisma/client';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentStatus } from './dto/update-incident-status.dto';

/** Répertoire de stockage des pièces jointes (volume Docker /data/uploads). */
export function uploadsDir(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
}

/**
 * Signalements d'incidents envoyés au syndic / à l'agence.
 * Les pièces jointes sont stockées sur disque (volume Docker), jamais en base ;
 * la base ne conserve que les métadonnées (nom original, type MIME, taille).
 */
@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Crée un signalement + pièces jointes, puis prévient le syndic par email. */
  async create(
    userId: string,
    dto: CreateIncidentDto,
    files: Express.Multer.File[],
    userNeighborhood: string | null,
  ): Promise<Incident & { attachments: IncidentAttachment[] }> {
    await mkdir(uploadsDir(), { recursive: true });

    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title.trim(),
        category: dto.category,
        description: dto.description.trim(),
        userId,
      },
    });

    const attachments: IncidentAttachment[] = [];
    for (const file of files) {
      const attachment = await this.prisma.incidentAttachment.create({
        data: {
          incidentId: incident.id,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.filename, // nom unique généré par multer
        },
      });
      attachments.push(attachment);
    }

    await this.notifySyndic(incident, attachments, dto.neighborhood ?? userNeighborhood, userId);

    return { ...incident, attachments };
  }

  /** Mes signalements (déclarant). */
  async listMine(userId: string): Promise<Array<Incident & { attachments: IncidentAttachment[] }>> {
    return this.prisma.incident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /** Détail d'un signalement (déclarant ou administrateur). */
  async findForUser(incidentId: string, userId: string, isAdmin: boolean) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { attachments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!incident || (!isAdmin && incident.userId !== userId)) {
      throw new NotFoundException('Signalement introuvable');
    }
    return incident;
  }

  /** Tous les signalements (administration). */
  async listAll(status?: string): Promise<
    Array<
      Incident & {
        attachments: IncidentAttachment[];
        user: { firstName: string; lastName: string; email: string };
      }
    >
  > {
    return this.prisma.incident.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  /** Change le statut (administration) et prévient le déclarant. */
  async updateStatus(incidentId: string, status: IncidentStatus): Promise<Incident> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { user: true },
    });
    if (!incident) {
      throw new NotFoundException('Signalement introuvable');
    }

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status },
    });

    if (incident.user.emailNotifications) {
      await this.emailService.sendIncidentStatusUpdate(incident.user.email, incident.title, status);
    }
    return updated;
  }

  /** Résout le chemin absolu d'une pièce jointe. */
  attachmentPath(attachment: IncidentAttachment): string {
    return join(uploadsDir(), attachment.path);
  }

  /** Supprime les fichiers d'un signalement (cascade). */
  async removeFiles(incidentId: string): Promise<void> {
    const attachments = await this.prisma.incidentAttachment.findMany({
      where: { incidentId },
    });
    for (const attachment of attachments) {
      try {
        await unlink(this.attachmentPath(attachment));
      } catch {
        // Fichier déjà absent : sans gravité.
      }
    }
  }

  /** Supprime un fichier uploadé (fichiers rejetés par la validation). */
  async removeUploadedFile(filename: string): Promise<void> {
    try {
      await unlink(join(uploadsDir(), filename));
    } catch {
      // Fichier déjà absent : sans gravité.
    }
  }

  private async notifySyndic(
    incident: Incident,
    attachments: IncidentAttachment[],
    neighborhood: string | null,
    reporterId: string,
  ): Promise<void> {
    const settings = await this.prisma.syndicSettings.findUnique({ where: { id: 1 } });
    const syndicEmail = settings?.email || process.env.SYNDIC_EMAIL;
    if (!syndicEmail) {
      return; // Aucun destinataire configuré : rien à envoyer.
    }

    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!reporter) return;

    await this.emailService.sendIncidentToSyndic(
      syndicEmail,
      {
        title: incident.title,
        category: incident.category,
        description: incident.description,
        neighborhood: neighborhood ?? 'Non précisé',
      },
      reporter,
      attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType })),
    );
  }
}
