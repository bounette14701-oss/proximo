import { IsEnum } from 'class-validator';

/** Statut de suivi commercial d'un lead. */
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  WON = 'WON',
  LOST = 'LOST',
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus, { message: 'Statut invalide' })
  status!: LeadStatus;
}
