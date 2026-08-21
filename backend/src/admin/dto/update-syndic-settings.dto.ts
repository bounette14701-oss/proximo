import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Réglages du syndic / de l'agence de gestion (singleton).
 * `residenceName` : nom de la résidence affiché dans toute l'interface
 * et dans les emails (ex. « Résidence Les Cèdres »).
 */
export class UpdateSyndicSettingsDto {
  @IsOptional()
  @IsString({ message: 'Nom d’agence invalide' })
  @MaxLength(120, { message: 'Nom d’agence trop long' })
  agencyName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email du syndic invalide' })
  @MaxLength(160, { message: 'Email trop long' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Nom de résidence invalide' })
  @MaxLength(120, { message: 'Nom de résidence trop long' })
  residenceName?: string;
}
