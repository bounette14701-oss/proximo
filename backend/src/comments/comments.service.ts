import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

/** Commentaire public avec auteur (données affichables). */
export interface CommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    showDetails: boolean;
    building: string | null;
    floor: string | null;
  };
}

/**
 * Discussion publique attachée à une annonce ou un signalement.
 * Visible par tous les habitants (statut ACTIVE), suppression réservée
 * à l'auteur ou à un administrateur.
 */
@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste les commentaires d'une annonce (chronologique). */
  async listForListing(listingId: string): Promise<CommentWithAuthor[]> {
    return this.list({ listingId });
  }

  /** Liste les commentaires d'un signalement (chronologique). */
  async listForIncident(incidentId: string): Promise<CommentWithAuthor[]> {
    return this.list({ incidentId });
  }

  private async list(where: {
    listingId?: string;
    incidentId?: string;
  }): Promise<CommentWithAuthor[]> {
    const comments = await this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            showDetails: true,
            building: true,
            floor: true,
          },
        },
      },
    });
    return comments;
  }

  /** Crée un commentaire sur l'annonce ou le signalement ciblé. */
  async create(authorId: string, dto: CreateCommentDto): Promise<CommentWithAuthor> {
    const { listingId, incidentId, content } = dto;
    if (!listingId && !incidentId) {
      throw new BadRequestException('Précisez une annonce ou un signalement');
    }
    if (listingId && incidentId) {
      throw new BadRequestException('Un seul type de cible à la fois');
    }

    // La cible doit exister.
    if (listingId) {
      const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) throw new NotFoundException('Annonce introuvable');
    }
    if (incidentId) {
      const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
      if (!incident) throw new NotFoundException('Signalement introuvable');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: content.trim(),
        authorId,
        ...(listingId ? { listingId } : {}),
        ...(incidentId ? { incidentId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            showDetails: true,
            building: true,
            floor: true,
          },
        },
      },
    });
    return comment;
  }

  /** Supprime un commentaire (auteur ou admin). */
  async remove(commentId: string, user: { id: string; role: string }): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable');
    if (comment.authorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce commentaire');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
