import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CommerceService } from './commerce.service';

/**
 * Suivi des provisionnements — back-office (rôle ADMIN + 2FA).
 * Liste des résidences payantes et relance des provisionnements en échec.
 */
@Controller('admin/provisions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvisionsController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get()
  list() {
    return this.commerceService.listProvisions();
  }

  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.commerceService.retryProvision(id);
  }
}
