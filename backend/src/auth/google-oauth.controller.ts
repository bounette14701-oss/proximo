import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OAUTH_STATE_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

/**
 * Flux Google OAuth2 : /api/auth/google → Google → /api/auth/google/callback.
 * En cas de 2FA actif sur le compte, le navigateur est redirigé vers
 * `/connexion?2fa=1` avec le cookie `two_factor_token` posé.
 */
@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly googleOAuth: GoogleOAuthService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async redirect(
    @Res({ passthrough: true }) response: Response,
    @Query('residenceCode') residenceCode?: string,
  ) {
    if (!this.googleOAuth.enabled) {
      throw new NotFoundException('Connexion Google non configurée');
    }

    // Code de résidence : obligatoire avant une création de compte si un code
    // est configuré (l'inscription par email est également contrôlée).
    const settings = await this.prisma.syndicSettings.findUnique({ where: { id: 1 } });
    const configuredCode = settings?.residenceCode?.trim();
    if (configuredCode) {
      const submitted = (residenceCode ?? '').trim().toUpperCase();
      if (!submitted || submitted !== configuredCode.toUpperCase()) {
        throw new BadRequestException(
          'Code de résidence invalide. Demandez-le à votre syndic ou à un voisin.',
        );
      }
    }

    const { url, state } = this.googleOAuth.buildAuthorizationUrl(residenceCode?.trim());
    this.googleOAuth.setStateCookie(response, state);
    return { url };
  }

  @Get('callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expectedState: string | undefined = request.cookies?.[OAUTH_STATE_COOKIE];
    this.googleOAuth.clearStateCookie(response);

    if (!code || !state) {
      return response.redirect(`${FRONTEND_URL}/connexion?error=google`);
    }

    try {
      const profile = await this.googleOAuth.exchangeCode(code, expectedState, state);
      const residenceCode = this.googleOAuth.residenceCodeFromState(state);
      const user = await this.googleOAuth.findOrCreateUser(profile, residenceCode);
      const publicUser = this.authService.toPublicUser(user);

      // 2FA obligatoire pour les administrateurs : étape supplémentaire.
      if (publicUser.totpEnabled) {
        await this.authService.issueTwoFactorToken(response, publicUser);
        return response.redirect(`${FRONTEND_URL}/connexion?2fa=1`);
      }

      await this.authService.issueSession(response, publicUser, { rememberMe: false });
      return response.redirect(`${FRONTEND_URL}/auth/callback`);
    } catch {
      return response.redirect(`${FRONTEND_URL}/connexion?error=google`);
    }
  }
}
