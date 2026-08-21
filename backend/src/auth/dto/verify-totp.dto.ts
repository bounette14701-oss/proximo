import { IsString, Length, Matches } from 'class-validator';

/**
 * Vérification d'un code TOTP à 6 chiffres.
 */
export class VerifyTotpDto {
  @IsString({ message: 'Code requis' })
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir uniquement des chiffres' })
  code!: string;
}
