import { IsEnum, IsOptional } from 'class-validator';

/**
 * Statuts de traitement d'un signalement.
 */
export enum IncidentStatus {
  OPEN = 'OPEN', // Nouveau
  IN_PROGRESS = 'IN_PROGRESS', // En cours de traitement
  RESOLVED = 'RESOLVED', // Résolu
}

/**
 * Mise à jour du statut par un administrateur.
 */
export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus, { message: 'Statut invalide' })
  status!: IncidentStatus;

  @IsOptional()
  adminNote?: string;
}
