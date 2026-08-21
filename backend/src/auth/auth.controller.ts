import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RefreshGuard } from '../common/guards/refresh.guard';
import { AuthService, PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Requête enrichie par RefreshGuard (`req.refreshToken`). */
interface RefreshRequest extends Request {
  refreshToken?: { id: string; userId: string };
}

/**
 * Routes d'authentification. Débit fortement limité (anti brute-force).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const { user } = await this.authService.register(dto);
    await this.authService.issueSession(response, user);
    return { user };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { user } = await this.authService.login(dto);
    await this.authService.issueSession(response, user);
    return { user };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(RefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: RefreshRequest, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.refreshToken as { id: string; userId: string };
    const user = await this.authService.toPublicUserOrThrow(refreshToken.userId);
    // Rotation : l'ancien refresh est révoqué, une nouvelle paire est émise.
    await this.authService.issueSession(response, user, refreshToken.id);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: RefreshRequest, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.refreshToken as { id: string } | undefined;
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken.id);
    }
    this.authService.clearAuthCookies(response);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: PublicUser) {
    const full = await this.authService.findById(user.id);
    return { user: full };
  }
}
