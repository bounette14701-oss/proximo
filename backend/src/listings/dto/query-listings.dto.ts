import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ListingCategory } from './create-listing.dto';

/**
 * Filtres de recherche des annonces.
 * `lat`/`lng` (optionnels) : centre du périmètre ; `radiusKm` : rayon (défaut 10 km).
 */
export class QueryListingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude invalide' })
  @Min(-90, { message: 'Latitude invalide' })
  @Max(90, { message: 'Latitude invalide' })
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude invalide' })
  @Min(-180, { message: 'Longitude invalide' })
  @Max(180, { message: 'Longitude invalide' })
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rayon invalide' })
  @Min(1, { message: 'Le rayon doit être d’au moins 1 km' })
  @Max(100, { message: 'Le rayon ne peut pas dépasser 100 km' })
  radiusKm?: number;

  @IsOptional()
  @IsEnum(ListingCategory, { message: 'Catégorie invalide' })
  category?: ListingCategory;

  @IsOptional()
  @IsString({ message: 'Recherche invalide' })
  @MaxLength(80, { message: 'Recherche trop longue' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page invalide' })
  @Min(1, { message: 'Page invalide' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite invalide' })
  @Min(1, { message: 'Limite invalide' })
  @Max(50, { message: 'Limite invalide' })
  limit?: number;
}
