import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur de paramètre : expose l'utilisateur authentifié
 * (posé par JwtAuthGuard sur `req.user`).
 *
 * Usage : `@CurrentUser() user: AuthenticatedUser`
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  status: string;
  totpEnabled: boolean;
  twoFactorVerified: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    return request.user as AuthenticatedUser;
  },
);
