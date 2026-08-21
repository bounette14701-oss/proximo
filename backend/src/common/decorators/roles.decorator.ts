import { SetMetadata } from '@nestjs/common';

/**
 * Déclare les rôles autorisés sur une route.
 * Usage : `@Roles('ADMIN')` — combiné avec RolesGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
