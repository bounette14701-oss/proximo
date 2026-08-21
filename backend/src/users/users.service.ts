import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async getPublicProfile(userId: string): Promise<PublicProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, neighborhood: true },
    });
    return user;
  }
}
