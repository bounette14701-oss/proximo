import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Garde anti-CSRF pragmatique :
 * les requêtes mutantes (POST/PUT/PATCH/DELETE) émises par un navigateur
 * portent un en-tête Origin/Referer. Si cet en-tête est présent et qu'il ne
 * correspond pas à une origine autorisée, la requête est rejetée.
 * Les requêtes sans en-tête (curl, services, même-origine) passent.
 */
@Injectable()
export class OriginCheckGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string, any>>();

    // Les lectures ne présentent pas de risque CSRF.
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const origin = request.headers?.['origin'] ?? request.headers?.['referer'];
    if (!origin) {
      return true;
    }

    let originHost: string | null = null;
    try {
      originHost = new URL(String(origin)).origin;
    } catch {
      originHost = null;
    }

    if (originHost === null) {
      throw new ForbiddenException('Origine invalide');
    }

    const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!allowed.includes(originHost)) {
      throw new ForbiddenException('Origine non autorisée');
    }
    return true;
  }
}
