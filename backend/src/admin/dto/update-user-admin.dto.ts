import { IsEnum, IsOptional } from 'class-validator';

/**
 * Statuts et rôles gérables par l'administration.
 */
export enum AdminUserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum AdminUserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Mise à jour d'un utilisateur par un administrateur.
 */
export class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(AdminUserStatus, { message: 'Statut invalide' })
  status?: AdminUserStatus;

  @IsOptional()
  @IsEnum(AdminUserRole, { message: 'Rôle invalide' })
  role?: AdminUserRole;
}
