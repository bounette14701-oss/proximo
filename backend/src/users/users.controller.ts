import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

/**
 * Profils utilisateurs.
 *  - GET /users/me    : profil complet de l'utilisateur connecté
 *  - PATCH /users/me  : réglages (notifications email, quartier, nom)
 *  - GET /users/:id   : profil public minimal d'un voisin (messagerie)
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string }) {
    const profile = await this.usersService.getProfile(user.id);
    return { user: profile };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return { user: profile };
  }

  @Get(':id')
  async getPublic(@Param('id') id: string) {
    const profile = await this.usersService.getPublicProfile(id);
    if (!profile) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return { user: profile };
  }
}
