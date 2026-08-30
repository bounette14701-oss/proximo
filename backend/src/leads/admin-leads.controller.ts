import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

/**
 * Suivi des demandes de souscription — back-office (rôle ADMIN + 2FA).
 */
@Controller('admin/leads')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  list() {
    return this.leadsService.list();
  }

  @Patch(':id')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto.status);
  }
}
