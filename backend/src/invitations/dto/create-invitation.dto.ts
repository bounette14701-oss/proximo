import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Création d'une invitation (lien partageable + QR code).
 * Le jeton est à usage unique et expire (défaut : 72 h).
 */
export class CreateInvitationDto {
  @IsString({ message: 'Quartier requis' })
  @MaxLength(120, { message: 'Quartier trop long' })
  neighborhood!: string;

  @IsOptional()
  @IsInt({ message: 'Durée invalide' })
  @Min(1, { message: 'Durée minimale : 1 heure' })
  @Max(168, { message: 'Durée maximale : 168 heures (7 jours)' })
  expiresInHours?: number;
}
