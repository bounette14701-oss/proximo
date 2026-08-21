import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Catégories d'annonces d'entraide.
 */
export enum ListingCategory {
  TOOL = 'TOOL', // Prêt de matériel / outillage
  SERVICE = 'SERVICE', // Service entre voisins (aide déménagement, garde…)
  DONATION = 'DONATION', // Don d'objets
  OTHER = 'OTHER', // Autre
}

/**
 * Création d'annonce.
 * Deux voies de localisation, mutuellement exclusives :
 *  1. `address`           -> géocodage automatique (recommandé) ;
 *  2. `lat` + `lng` + `neighborhood` -> saisie manuelle (repli si géocodage indisponible).
 * La cohérence est vérifiée dans le service.
 */
export class CreateListingDto {
  @IsString({ message: 'Titre requis' })
  @Length(3, 80, { message: 'Le titre doit contenir entre 3 et 80 caractères' })
  title!: string;

  @IsString({ message: 'Description requise' })
  @Length(10, 2000, { message: 'La description doit contenir entre 10 et 2000 caractères' })
  description!: string;

  @IsEnum(ListingCategory, { message: 'Catégorie invalide' })
  category!: ListingCategory;

  @IsOptional()
  @IsString({ message: 'Adresse invalide' })
  @Length(3, 200, { message: 'Adresse invalide' })
  address?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Latitude invalide' })
  @Min(-90, { message: 'Latitude invalide' })
  @Max(90, { message: 'Latitude invalide' })
  lat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude invalide' })
  @Min(-180, { message: 'Longitude invalide' })
  @Max(180, { message: 'Longitude invalide' })
  lng?: number;

  @IsOptional()
  @IsString({ message: 'Quartier invalide' })
  @MaxLength(120, { message: 'Quartier trop long' })
  neighborhood?: string;
}
