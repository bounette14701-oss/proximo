import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Connexion locale.
 * `rememberMe` : étend la durée de vie du refresh token (90 jours au lieu
 * de 30) — le cookie HTTP-only reste de type « session » dans les deux cas.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254, { message: 'Adresse email trop longue' })
  email!: string;

  @IsString({ message: 'Mot de passe requis' })
  password!: string;

  @IsOptional()
  @IsBoolean({ message: 'Valeur invalide' })
  rememberMe?: boolean;
}
