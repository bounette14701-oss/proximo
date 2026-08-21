import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IncidentsService } from '../incidents/incidents.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateIncidentStatusDto } from '../incidents/dto/update-incident-status.dto';
import { UpdateSyndicSettingsDto } from './dto/update-syndic-settings.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

/**
 * Back-office administrateur — toutes les routes exigent le rôle ADMIN et
 * une session 2FA vérifiée (AdminGuard).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incidentsService: IncidentsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  // ─── Utilisateurs ────────────────────────────────────────────

  @Get('users')
  async listUsers(@Query('status') status?: string, @Query('search') search?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        neighborhood: true,
        role: true,
        status: true,
        totpEnabled: true,
        createdAt: true,
      },
    });
    return { users };
  }

  @Patch('users/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() admin: { id: string; role: string },
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    // Garde-fous : un admin ne peut ni se suspendre ni se déclasser lui-même.
    if (id === admin.id && (dto.status === 'SUSPENDED' || dto.role === 'USER')) {
      throw new ForbiddenException('Impossible de modifier votre propre compte ainsi');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.role ? { role: dto.role } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
    return { user: updated };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: { id: string }) {
    if (id === admin.id) {
      throw new ForbiddenException('Impossible de supprimer votre propre compte');
    }
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new BadRequestException('Utilisateur introuvable');
    }
    await this.prisma.user.delete({ where: { id } });
  }

  // ─── Signalements ────────────────────────────────────────────

  @Get('incidents')
  async listIncidents(@Query('status') status?: string) {
    const incidents = await this.incidentsService.listAll(status);
    return { incidents };
  }

  @Patch('incidents/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async updateIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    const incident = await this.incidentsService.updateStatus(id, dto.status);
    return { incident };
  }

  // ─── Annonces (modération) ─────────────────────────────────

  @Get('listings')
  async listListings(@Query('status') status?: string) {
    const listings = await this.prisma.listing.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return { listings };
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(@Param('id', ParseUUIDPipe) id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new BadRequestException('Annonce introuvable');
    }
    await this.prisma.listing.delete({ where: { id } });
  }

  // ─── Réglages syndic / agence ────────────────────────────────

  @Get('settings')
  async getSettings() {
    const settings = await this.prisma.syndicSettings.upsert({
      where: { id: 1 },
      create: { id: 1, agencyName: 'Agence de gestion', email: '' },
      update: {},
    });
    return { settings };
  }

  @Patch('settings')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async updateSettings(@Body() dto: UpdateSyndicSettingsDto) {
    const settings = await this.prisma.syndicSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        agencyName: dto.agencyName ?? 'Agence de gestion',
        email: dto.email ?? '',
        ...(dto.residenceName !== undefined ? { residenceName: dto.residenceName } : {}),
      },
      update: {
        ...(dto.agencyName !== undefined ? { agencyName: dto.agencyName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.residenceName !== undefined ? { residenceName: dto.residenceName } : {}),
      },
    });
    return { settings };
  }

  // ─── Signalements (modération) ─────────────────────────────

  @Delete('incidents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIncident(@Param('id', ParseUUIDPipe) id: string) {
    await this.incidentsService.adminRemove(id);
  }

  // ─── Invitations ─────────────────────────────────────────────

  @Get('invitations')
  async listInvitations() {
    const invitations = await this.invitationsService.listAll();
    return { invitations };
  }

  // ─── Vue d'ensemble (stats) ─────────────────────────────────

  @Get('stats')
  async stats() {
    const [members, pending, incidents, incidentsOpen, invitations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'PENDING' } }),
      this.prisma.incident.count(),
      this.prisma.incident.count({ where: { status: 'OPEN' } }),
      this.prisma.invitation.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }),
    ]);
    return {
      stats: {
        members,
        pending,
        incidents,
        incidentsOpen,
        invitationsActive: invitations,
      },
    };
  }
}
