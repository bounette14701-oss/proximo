import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Envoi d'un message à un voisin.
 */
export class CreateMessageDto {
  @IsUUID('4', { message: 'Destinataire invalide' })
  recipientId!: string;

  @IsString({ message: 'Message requis' })
  @MinLength(1, { message: 'Message vide' })
  @MaxLength(2000, { message: 'Message trop long (2000 caractères max)' })
  content!: string;
}
