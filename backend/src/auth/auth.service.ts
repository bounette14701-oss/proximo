import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_DEFAULT,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_DEFAULT,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Données utilisateur renvoyées au client (jamais lat/lng ni hash).
 */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  neighborhood: string | null;
}

/**
 * Authentification par cookies HTTP-only :
 *  - access_token  : JWT court (15 min) — envoyé sur toutes les routes /api
 *  - refresh_token : token opaque (30 j) — envoyé uniquement sur /api/auth,
 *                    stocké hashé (SHA-256) en base, révocable, rotation à chaque usage.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser }> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        neighborhood: dto.neighborhood?.trim() || null,
      },
    });

    return { user: this.toPublicUser(user) };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser }> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Réponse identique que mot de passe incorrect : pas d'énumération de comptes.
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return { user: this.toPublicUser(user) };
  }

  /**
   * Crée une paire access/refresh, pose les cookies et révoque le refresh
   * précédent s'il est fourni (rotation lors du rafraîchissement).
   */
  async issueSession(
    response: Response,
    user: PublicUser,
    previousRefreshTokenId?: string,
  ): Promise<void> {
    if (previousRefreshTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: previousRefreshTokenId },
        data: { revokedAt: new Date() },
      });
    }

    const accessToken = await this.signAccessToken(user);
    const { token: refreshToken, id: refreshTokenId } = await this.createRefreshToken(user.id);

    const accessTtl = Number(process.env.JWT_ACCESS_TTL ?? ACCESS_TOKEN_TTL_DEFAULT);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL ?? REFRESH_TOKEN_TTL_DEFAULT);
    const secure = process.env.NODE_ENV === 'production';

    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: accessTtl * 1000,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/api/auth',
      maxAge: refreshTtl * 1000,
    });

    // Conserve l'id pour la révocation dans le cadre de la rotation.
    (response as Response & { locals: Record<string, unknown> }).locals.refreshTokenId =
      refreshTokenId;
  }

  async signAccessToken(user: PublicUser): Promise<string> {
    const ttl = Number(process.env.JWT_ACCESS_TTL ?? ACCESS_TOKEN_TTL_DEFAULT);
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'access' },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: ttl },
    );
  }

  private async createRefreshToken(userId: string): Promise<{ token: string; id: string }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const ttl = Number(process.env.JWT_REFRESH_TTL ?? REFRESH_TOKEN_TTL_DEFAULT);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return { token, id: record.id };
  }

  /** Révoque le refresh token courant (déconnexion). */
  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /** Nettoie les cookies côté navigateur. */
  clearAuthCookies(response: Response): void {
    const secure = process.env.NODE_ENV === 'production';
    response.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    });
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/api/auth',
    });
  }

  async findById(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }
    return this.toPublicUser(user);
  }

  async toPublicUserOrThrow(userId: string): Promise<PublicUser> {
    return this.findById(userId);
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      neighborhood: user.neighborhood,
    };
  }
}
