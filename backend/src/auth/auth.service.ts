import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import { authenticator } from 'otplib';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_DEFAULT,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_DEFAULT,
  ROLE_ADMIN,
  ROLE_USER,
  STATUS_ACTIVE,
  STATUS_PENDING,
  TWO_FACTOR_TOKEN_COOKIE,
  TWO_FACTOR_TOKEN_TTL,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Données utilisateur renvoyées au client (jamais lat/lng, hash ou secret TOTP).
 */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  neighborhood: string | null;
  role: string;
  status: string;
  totpEnabled: boolean;
  emailNotifications: boolean;
  createdAt: Date;
}

/** Emails administrateurs déclarés dans ADMIN_EMAILS (bootstrap). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Authentification par cookies HTTP-only :
 *  - access_token  : JWT court (15 min) — envoyé sur toutes les routes /api
 *  - refresh_token : token opaque (30 j, ou 90 j avec « Se souvenir de moi »),
 *                    stocké hashé (SHA-256) en base, révocable, rotation à chaque usage.
 *  - 2FA TOTP obligatoire pour les administrateurs (voir auth-2fa).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser }> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    if (!dto.password) {
      throw new BadRequestException('Un mot de passe est requis (ou utilisez Google)');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    // Invitation (QR code) : valide le jeton et pré-remplit le quartier.
    let neighborhood = dto.neighborhood?.trim() || null;
    if (dto.invitationToken) {
      neighborhood = await this.consumeInvitation(dto.invitationToken, neighborhood);
    }

    const isAdmin = adminEmails().includes(email);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        neighborhood,
        role: isAdmin ? ROLE_ADMIN : ROLE_USER,
        // Les administrateurs déclarés sont actifs d'emblée ;
        // les autres comptes attendent la validation d'un admin.
        status: isAdmin ? STATUS_ACTIVE : STATUS_PENDING,
      },
    });

    await this.emailService.sendWelcome(email, user.firstName);

    return { user: this.toPublicUser(user) };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser }> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    this.assertLoginAllowed(user);

    return { user: this.toPublicUser(user) };
  }

  /** Vérifie que le compte peut se connecter (statut). */
  private assertLoginAllowed(user: User): void {
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Compte suspendu. Contactez un administrateur.');
    }
  }

  /**
   * Crée une paire access/refresh, pose les cookies et révoque le refresh
   * précédent s'il est fourni (rotation lors du rafraîchissement).
   */
  async issueSession(
    response: Response,
    user: PublicUser,
    options: {
      rememberMe?: boolean;
      twoFactorVerified?: boolean;
      previousRefreshTokenId?: string;
    } = {},
  ): Promise<void> {
    if (options.previousRefreshTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: options.previousRefreshTokenId },
        data: { revokedAt: new Date() },
      });
    }

    const accessToken = await this.signAccessToken(user, options.twoFactorVerified ?? false);
    const rememberMe = options.rememberMe ?? false;
    const refreshTtl =
      Number(process.env.JWT_REFRESH_TTL ?? REFRESH_TOKEN_TTL_DEFAULT) * (rememberMe ? 3 : 1);
    const { token: refreshToken, id: refreshTokenId } = await this.createRefreshToken(
      user.id,
      refreshTtl,
    );

    const accessTtl = Number(process.env.JWT_ACCESS_TTL ?? ACCESS_TOKEN_TTL_DEFAULT);
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

    (response as Response & { locals: Record<string, unknown> }).locals.refreshTokenId =
      refreshTokenId;
  }

  async signAccessToken(user: PublicUser, twoFactorVerified: boolean): Promise<string> {
    const ttl = Number(process.env.JWT_ACCESS_TTL ?? ACCESS_TOKEN_TTL_DEFAULT);
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        totpEnabled: user.totpEnabled,
        twoFactorVerified,
        type: 'access',
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: ttl },
    );
  }

  /** Jeton de pré-validation 2FA (5 min, usage unique) posé en cookie. */
  async issueTwoFactorToken(response: Response, user: PublicUser): Promise<void> {
    const token = await this.jwtService.signAsync(
      { sub: user.id, purpose: '2fa-login', type: 'twofactor' },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: TWO_FACTOR_TOKEN_TTL },
    );
    response.cookie(TWO_FACTOR_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: TWO_FACTOR_TOKEN_TTL * 1000,
    });
  }

  clearTwoFactorToken(response: Response): void {
    response.clearCookie(TWO_FACTOR_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
    });
  }

  /** Vérifie un code TOTP pour l'utilisateur (2FA). */
  verifyTotp(user: User, code: string): boolean {
    if (!user.totpSecret) {
      throw new BadRequestException('Double authentification non configurée');
    }
    return authenticator.verify({ token: code, secret: user.totpSecret });
  }

  private async createRefreshToken(
    userId: string,
    ttlSeconds: number,
  ): Promise<{ token: string; id: string }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
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
    this.clearTwoFactorToken(response);
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
      role: user.role,
      status: user.status,
      totpEnabled: user.totpEnabled,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
    };
  }

  /**
   * Consomme un jeton d'invitation : valide l'existence, l'expiration et
   * l'usage unique, puis retourne le quartier ciblé (ou le quartier fourni).
   */
  private async consumeInvitation(
    token: string,
    providedNeighborhood: string | null,
  ): Promise<string> {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) {
      throw new BadRequestException("Jeton d'invitation invalide");
    }
    if (invitation.usedAt) {
      throw new BadRequestException("Ce jeton d'invitation a déjà été utilisé");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("Ce jeton d'invitation a expiré");
    }
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });
    return providedNeighborhood ?? invitation.neighborhood;
  }
}
