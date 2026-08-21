import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { GeocodingService } from './geocoding.service';

/**
 * Recherche d'adresse pour le formulaire de création d'annonce.
 * Débit limité (le géocodage externe est une ressource partagée).
 */
class GeocodeQueryDto {
  @IsString({ message: 'Requête invalide' })
  @MaxLength(200, { message: 'Requête trop longue' })
  q!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string;
}

@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async search(@Query() query: GeocodeQueryDto) {
    const result = await this.geocodingService.geocode(query.q);
    return result;
  }
}
