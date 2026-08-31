import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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

  @IsOptional()
  @IsString({ message: 'Code de résidence invalide' })
  @Matches(/^[A-Za-z0-9-]{4,32}$/, {
    message: 'Code de résidence invalide (4 à 32 caractères, lettres, chiffres, tirets)',
  })
  residenceCode?: string;
}
