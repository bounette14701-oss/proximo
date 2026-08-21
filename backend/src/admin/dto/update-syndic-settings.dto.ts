import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Réglages du syndic / de l'agence de gestion (singleton).
 */
export class UpdateSyndicSettingsDto {
  @IsOptional()
  @IsString({ message: 'Nom invalide' })
  @MaxLength(120, { message: 'Nom trop long' })
  agencyName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254, { message: 'Adresse email trop longue' })
  email?: string;
}
