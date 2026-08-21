import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_ADMIN } from './auth.constants';

/**
 * Double authentification TOTP (Google Authenticator / Authy) — réservée
 * aux administrateurs. Le secret est stocké en base (jamais exposé après
 * la phase de configuration) et le QR code n'est affiché qu'au setup.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** Génère un secret et le QR code de configuration (admin uniquement). */
  async setup(userId: string): Promise<{ qrDataUrl: string; secret: string; otpauthUrl: string }> {
    const user = await this.getAdmin(userId);

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Proximo', secret);

    const qrDataUrl = await qrcode.toDataURL(otpauthUrl, {
      width: 240,
      margin: 1,
    });

    // Le secret est conservé dès la génération : le code de confirmation
    // devra correspondre, sinon le setup est réessayé.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: false },
    });

    return { qrDataUrl, secret, otpauthUrl };
  }

  /** Active le 2FA après vérification d'un premier code. */
  async confirm(userId: string, code: string): Promise<{ enabled: boolean }> {
    const user = await this.getAdmin(userId);
    if (!user.totpSecret) {
      throw new BadRequestException('Aucun secret TOTP en attente. Relancez la configuration.');
    }
    if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new BadRequestException('Code incorrect');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });
    return { enabled: true };
  }

  /** Désactive le 2FA (un code valide est requis). */
  async disable(userId: string, code: string): Promise<{ enabled: boolean }> {
    const user = await this.getAdmin(userId);
    if (!user.totpEnabled) {
      return { enabled: false };
    }
    if (!user.totpSecret || !authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new BadRequestException('Code incorrect');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    });
    return { enabled: false };
  }

  /** Vérifie le jeton de pré-validation 2FA (cookie `two_factor_token`). */
  async verifyTwoFactorToken(token: string): Promise<{ sub: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; purpose: string }>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      if (payload.purpose !== '2fa-login') {
        throw new Error('Mauvais usage');
      }
      return { sub: payload.sub };
    } catch {
      throw new UnauthorizedException('Session de double authentification expirée');
    }
  }

  /**
   * Étape finale du login 2FA : vérifie le jeton de pré-validation PUIS le
   * code TOTP. Retourne l'identifiant de l'utilisateur, sinon lève.
   */
  async verifyLogin(token: string, code: string): Promise<string> {
    const { sub } = await this.verifyTwoFactorToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException('Double authentification non configurée');
    }
    if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new UnauthorizedException('Code incorrect');
    }
    return user.id;
  }

  private async getAdmin(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }
    if (user.role !== ROLE_ADMIN) {
      throw new ForbiddenException('La double authentification est réservée aux administrateurs');
    }
    return user;
  }
}
