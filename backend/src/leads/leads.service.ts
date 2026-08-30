import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { emailLayout, escapeHtml } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, LeadRequesterRole, LeadUnitCount } from './dto/create-lead.dto';
import { LeadStatus } from './dto/update-lead-status.dto';

const UNIT_COUNT_LABELS: Record<LeadUnitCount, string> = {
  [LeadUnitCount.LESS_THAN_10]: 'Moins de 10 logements',
  [LeadUnitCount.BETWEEN_10_30]: '10 à 30 logements',
  [LeadUnitCount.BETWEEN_30_100]: '30 à 100 logements',
  [LeadUnitCount.MORE_THAN_100]: 'Plus de 100 logements',
};

const ROLE_LABELS: Record<LeadRequesterRole, string> = {
  [LeadRequesterRole.HABITANT]: 'Habitant',
  [LeadRequesterRole.CONSEIL_SYNDICAL]: 'Conseil syndical',
  [LeadRequesterRole.SYNDIC]: 'Syndic',
  [LeadRequesterRole.GESTIONNAIRE]: 'Gestionnaire / agence',
};

/**
 * Tunnel de vente : capture des demandes de souscription depuis la page
 * publique /souscrire, notification par email des administrateurs.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Crée le lead et notifie les administrateurs (échec d'email non bloquant). */
  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        email: dto.email,
        residenceName: dto.residenceName,
        city: dto.city,
        unitCount: dto.unitCount,
        requesterRole: dto.requesterRole,
        message: dto.message ?? null,
      },
    });

    await this.notifyAdmins(dto);
    return { id: lead.id, createdAt: lead.createdAt };
  }

  /** Liste des demandes (back-office, ordre antichronologique). */
  list() {
    return this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Met à jour le statut de suivi d'un lead. */
  async updateStatus(id: string, status: LeadStatus) {
    return this.prisma.lead.update({ where: { id }, data: { status } });
  }

  private async notifyAdmins(dto: CreateLeadDto): Promise<void> {
    const admins = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (admins.length === 0) {
      this.logger.warn('Aucun ADMIN_EMAILS configuré : lead non notifié par email');
      return;
    }

    const body = [
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">Nouvelle demande de souscription reçue sur le site :</p>`,
      `<table style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#334155;">`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Nom</td><td>${escapeHtml(dto.name)}</td></tr>`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Email</td><td>${escapeHtml(dto.email)}</td></tr>`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Résidence</td><td>${escapeHtml(dto.residenceName)}</td></tr>`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Ville</td><td>${escapeHtml(dto.city)}</td></tr>`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Taille</td><td>${UNIT_COUNT_LABELS[dto.unitCount]}</td></tr>`,
      `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Profil</td><td>${ROLE_LABELS[dto.requesterRole]}</td></tr>`,
      ...(dto.message
        ? [
            `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#1e293b;">Message</td><td>${escapeHtml(dto.message)}</td></tr>`,
          ]
        : []),
      `</table>`,
    ].join('');

    const adminUrl = (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');

    for (const admin of admins) {
      await this.emailService.sendMail(
        admin,
        `Proximo : demande de souscription (${dto.residenceName})`,
        emailLayout({
          heading: '🛎️ Nouvelle demande de souscription',
          body,
          ...(adminUrl ? { ctaUrl: `${adminUrl}/admin`, ctaLabel: 'Voir le back-office' } : {}),
          footer: 'Proximo — demande envoyée depuis la page publique /souscrire.',
        }),
      );
    }
  }
}
