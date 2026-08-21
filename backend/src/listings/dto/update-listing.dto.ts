import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';

/**
 * Statuts d'une annonce.
 */
export enum ListingStatus {
  OPEN = 'OPEN', // Visible et disponible
  RESERVED = 'RESERVED', // Réservée (masquée des recherches)
  CLOSED = 'CLOSED', // Clôturée (masquée des recherches)
}

/**
 * Mise à jour d'annonce : tous les champs sont optionnels.
 * Seul le propriétaire peut modifier.
 */
export class UpdateListingDto extends PartialType(CreateListingDto) {
  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Statut invalide' })
  status?: ListingStatus;
}
