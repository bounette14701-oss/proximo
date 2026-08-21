import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Catégories de signalements d'incident (syndic / agence).
 */
export enum IncidentCategory {
  WATER_LEAK = 'WATER_LEAK', // Fuite d'eau
  ELEVATOR = 'ELEVATOR', // Panne d'ascenseur
  DAMAGE = 'DAMAGE', // Dégradation
  OTHER = 'OTHER', // Autre
}

/**
 * Création d'un signalement (multipart/form-data).
 * Les pièces jointes sont validées par le contrôleur (MIME + taille).
 */
export class CreateIncidentDto {
  @IsString({ message: 'Titre requis' })
  @Length(3, 120, { message: 'Le titre doit contenir entre 3 et 120 caractères' })
  title!: string;

  @IsEnum(IncidentCategory, { message: 'Catégorie invalide' })
  category!: IncidentCategory;

  @IsString({ message: 'Description requise' })
  @Length(10, 3000, { message: 'La description doit contenir entre 10 et 3000 caractères' })
  description!: string;

  @IsOptional()
  @IsString({ message: 'Quartier invalide' })
  @MaxLength(120, { message: 'Quartier trop long' })
  neighborhood?: string;
}
