import { IsEmail, IsString, MaxLength } from 'class-validator';

/**
 * Connexion.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254, { message: 'Adresse email trop longue' })
  email!: string;

  @IsString({ message: 'Mot de passe requis' })
  password!: string;
}
