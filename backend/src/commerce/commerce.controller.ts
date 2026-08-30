import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { CommerceService } from './commerce.service';

/**
 * Tunnel de paiement automatisé.
 * - POST /api/commerce/checkout : crée la session Stripe (publique, limitée)
 * - POST /api/commerce/webhook : reçoit les événements Stripe (signature vérifiée)
 */
@Controller('commerce')
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Post('checkout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async checkout(@Body() dto: CreateLeadDto) {
    return this.commerceService.createCheckout(dto);
  }

  @Post('webhook')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.commerceService.handleWebhook(request.rawBody ?? Buffer.from(''), signature ?? '');
  }
}
