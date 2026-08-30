import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

/**
 * Demande de souscription — route publique (tunnel de vente).
 * Rate limiting renforcé : 5 demandes / minute / IP.
 */
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }
}
