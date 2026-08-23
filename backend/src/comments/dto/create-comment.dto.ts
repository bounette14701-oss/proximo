import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Création d'un commentaire public sur une annonce ou un signalement.
 * Polymorphe : exactement un des deux champs (listingId / incidentId).
 */
export class CreateCommentDto {
  @IsOptional()
  @IsUUID('4', { message: 'Identifiant d’annonce invalide' })
  listingId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Identifiant de signalement invalide' })
  incidentId?: string;

  @IsString({ message: 'Commentaire invalide' })
  @MinLength(1, { message: 'Le commentaire ne peut pas être vide' })
  @MaxLength(1000, { message: 'Commentaire trop long (1000 caractères max.)' })
  content!: string;
}
