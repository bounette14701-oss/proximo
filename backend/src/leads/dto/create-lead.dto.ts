import { IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/** Tranche de logements de la résidence. */
export enum LeadUnitCount {
  LESS_THAN_10 = 'LESS_THAN_10',
  BETWEEN_10_30 = 'BETWEEN_10_30',
  BETWEEN_30_100 = 'BETWEEN_30_100',
  MORE_THAN_100 = 'MORE_THAN_100',
}

/** Qui soumet la demande (profil du demandeur). */
export enum LeadRequesterRole {
  HABITANT = 'HABITANT',
  CONSEIL_SYNDICAL = 'CONSEIL_SYNDICAL',
  SYNDIC = 'SYNDIC',
  GESTIONNAIRE = 'GESTIONNAIRE',
}

/**
 * Demande de souscription soumise depuis la page publique /souscrire.
 * Données personnelles : utilisées uniquement pour recontacter le demandeur
 * dans le cadre de sa demande.
 */
export class CreateLeadDto {
  @IsString({ message: 'Nom requis' })
  @Length(2, 120, { message: 'Le nom doit contenir entre 2 et 120 caractères' })
  name!: string;

  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254, { message: 'Adresse email trop longue' })
  email!: string;

  @IsString({ message: 'Nom de la résidence requis' })
  @Length(2, 160, { message: 'Le nom de la résidence doit contenir entre 2 et 160 caractères' })
  residenceName!: string;

  @IsString({ message: 'Ville requise' })
  @Length(2, 120, { message: 'La ville doit contenir entre 2 et 120 caractères' })
  city!: string;

  @IsEnum(LeadUnitCount, { message: 'Tranche de logements invalide' })
  unitCount!: LeadUnitCount;

  @IsEnum(LeadRequesterRole, { message: 'Profil invalide' })
  requesterRole!: LeadRequesterRole;

  @IsOptional()
  @IsString({ message: 'Message invalide' })
  @MaxLength(2000, { message: 'Le message ne peut pas dépasser 2000 caractères' })
  message?: string;
}
