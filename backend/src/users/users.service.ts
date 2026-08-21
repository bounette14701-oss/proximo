import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Profil public d'un voisin : uniquement les informations nécessaires
 * à la mise en relation. Jamais d'adresse, de coordonnées ni d'email.
 */
export interface PublicProfile {
  id: string;
  firstName: string;
  neighborhood: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        neighborhood: true,
        role: true,
        status: true,
        totpEnabled: true,
        emailNotifications: true,
        createdAt: true,
        listings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            neighborhood: true,
            createdAt: true,
          },
        },
      },
    });
    return user;
  }

  /** Met à jour le profil et les réglages de notification. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.neighborhood !== undefined) {
      data.neighborhood = dto.neighborhood.trim() || null;
    }
    if (dto.emailNotifications !== undefined) data.emailNotifications = dto.emailNotifications;

    // Changement d'email : uniquement pour les comptes à mot de passe
    // (les comptes Google sont liés à l'identité vérifiée).
    if (dto.email !== undefined) {
      const current = await this.prisma.user.findUnique({ where: { id: userId } });
      if (current?.passwordHash) {
        const normalized = dto.email.toLowerCase().trim();
        const conflict = await this.prisma.user.findUnique({ where: { email: normalized } });
        if (conflict && conflict.id !== userId) {
          throw new BadRequestException('Cet email est déjà utilisé');
        }
        data.email = normalized;
      } else {
        throw new BadRequestException(
          'Adresse email non modifiable sur un compte Google (utilisez votre identité Google)',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        neighborhood: true,
        role: true,
        status: true,
        totpEnabled: true,
        emailNotifications: true,
        createdAt: true,
      },
    });
    return user;
  }

  async getPublicProfile(userId: string): Promise<PublicProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, neighborhood: true },
    });
    return user;
  }
}
