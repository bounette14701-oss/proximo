import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { SetupService } from './setup.service';

/**
 * Installation initiale (premier lancement) — accessible UNIQUEMENT
 * tant qu'aucun administrateur n'existe. Ensuite, 403.
 * Voir SetupService pour la logique de verrouillage.
 */
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /** L'installation est-elle requise ? (aucun admin en base) */
  @Get('status')
  async status(): Promise<{ required: boolean }> {
    return { required: await this.setupService.isRequired() };
  }

  /** Crée l'administrateur + configure la résidence (une seule transaction). */
  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async complete(@Body() dto: CompleteSetupDto): Promise<{ adminEmail: string }> {
    return this.setupService.complete(dto);
  }
}
