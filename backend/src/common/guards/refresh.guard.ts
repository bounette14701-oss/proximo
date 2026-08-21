import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { REFRESH_TOKEN_COOKIE } from '../../auth/auth.constants';

/**
 * Garde de rafraîchissement : valide le cookie `refresh_token` (opaque,
 * stocké hashé en base, révocable) et attache l'entité token à `req.refreshToken`.
 */
@Injectable()
export class RefreshGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const rawToken: string | undefined = request.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!rawToken) {
      throw new UnauthorizedException('Session expirée');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!token) {
      throw new UnauthorizedException('Session expirée');
    }

    request.refreshToken = token;
    request.refreshTokenRaw = rawToken;
    return true;
  }
}
