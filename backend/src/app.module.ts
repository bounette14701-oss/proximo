import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { OriginCheckGuard } from './common/guards/origin-check.guard';
import { GeocodingModule } from './geocoding/geocoding.module';
import { HealthModule } from './health/health.module';
import { ListingsModule } from './listings/listings.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Limitation globale du débit : 300 requêtes / minute / IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    // JwtService disponible globalement (utilisé par les guards d'authentification).
    JwtModule.register({ global: true }),
    PrismaModule,
    HealthModule,
    GeocodingModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    MessagesModule,
  ],
  providers: [
    // Ordre d'exécution : vérification d'origine (anti-CSRF) puis rate limiting.
    { provide: APP_GUARD, useClass: OriginCheckGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
