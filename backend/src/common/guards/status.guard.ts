import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Vérifie que le compte de l'utilisateur est ACTIVE.
 * Les comptes PENDING (en attente de validation par un administrateur)
 * ou SUSPENDED n'accèdent pas aux fonctionnalités métier.
 */
@Injectable()
export class StatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const user = request.user as { status?: string } | undefined;

    if (!user?.status) {
      throw new ForbiddenException('Compte introuvable');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Compte suspendu. Contactez un administrateur.');
    }
    if (user.status === 'PENDING') {
      throw new ForbiddenException('Compte en attente de validation par un administrateur.');
    }
    return true;
  }
}
