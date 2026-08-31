import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OAUTH_STATE_COOKIE, ROLE_ADMIN, STATUS_ACTIVE, STATUS_PENDING } from './auth.constants';

/** Profil retourné par Google (id_token vérifié). */
export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Emails administrateurs déclarés dans ADMIN_EMAILS (bootstrap). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Connexion / inscription via Google OAuth2 (OpenID Connect).
 * Le flux utilise un `state` anti-CSRF stocké en cookie HTTP-only,
 * et l'`id_token` est vérifié (signature + audience) via google-auth-library.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CALLBACK_URL,
    });
  }

  get enabled(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  /** Construit l'URL de redirection vers Google (avec state anti-CSRF). */
  buildAuthorizationUrl(residenceCode?: string): { url: string; state: string } {
    const state = randomBytes(24).toString('hex');
    // Le code de résidence est embarqué dans le state (rappelé par Google au
    // callback) — le state reste imprévisible (hex aléatoire) donc anti-CSRF.
    const stateWithCode = residenceCode ? `${state}:${encodeURIComponent(residenceCode)}` : state;
    const url = this.client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'profile', 'email'],
      state: stateWithCode,
      prompt: 'select_account',
    });
    return { url, state: stateWithCode };
  }

  /** Extrait le code de résidence éventuel du state OAuth. */
  residenceCodeFromState(state: string): string | undefined {
    const separator = state.indexOf(':');
    if (separator === -1) return undefined;
    const code = state.slice(separator + 1);
    return code ? decodeURIComponent(code) : undefined;
  }

  /** Pose le cookie `oauth_state` (5 min, chemin restreint au callback). */
  setStateCookie(response: Response, state: string): void {
    response.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth/google',
      maxAge: 5 * 60 * 1000,
    });
  }

  clearStateCookie(response: Response): void {
    response.clearCookie(OAUTH_STATE_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth/google',
    });
  }

  /**
   * Échange le code d'autorisation contre un profil vérifié.
   * @throws UnauthorizedException si le state ne correspond pas ou le jeton est invalide.
   */
  async exchangeCode(
    code: string,
    expectedState: string | undefined,
    receivedState: string,
  ): Promise<GoogleProfile> {
    // Le state peut contenir « hex:residenceCode » — on compare la partie hex.
    const actualState = this.residenceCodeFromState(receivedState)
      ? receivedState.slice(0, receivedState.indexOf(':'))
      : receivedState;
    if (!expectedState || expectedState !== actualState) {
      throw new UnauthorizedException('État OAuth invalide (protection CSRF)');
    }

    let idToken: string;
    try {
      const { tokens } = await this.client.getToken(code);
      idToken = tokens.id_token ?? '';
    } catch {
      throw new BadGatewayException('Échange du code Google impossible');
    }
    if (!idToken) {
      throw new UnauthorizedException('Jeton Google manquant');
    }

    const login = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = login.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Profil Google incomplet');
    }

    const nameParts = (payload.name ?? '').split(' ').filter(Boolean);
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name ?? nameParts[0] ?? 'Voisin',
      lastName: payload.family_name ?? nameParts.slice(1).join(' ') ?? 'Google',
    };
  }

  /**
   * Récupère ou crée l'utilisateur associé au compte Google.
   * Le compte est créé en statut PENDING sauf si l'email est un admin déclaré.
   * `residenceCode` : si fourni (validé en amont), rattache le compte à la
   * résidence de l'instance.
   */
  async findOrCreateUser(profile: GoogleProfile, residenceCode?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    });
    if (existing) {
      if (!existing.googleId) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId },
        });
      }
      return existing;
    }

    const settings = await this.prisma.syndicSettings.findUnique({ where: { id: 1 } });
    const neighborhood = residenceCode && settings?.residenceName ? settings.residenceName : null;

    const isAdmin = adminEmails().includes(profile.email);
    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        passwordHash: null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        neighborhood,
        role: isAdmin ? ROLE_ADMIN : 'USER',
        status: isAdmin ? STATUS_ACTIVE : STATUS_PENDING,
      },
    });
    await this.emailService.sendWelcome(created.email, created.firstName);
    return created;
  }
}
