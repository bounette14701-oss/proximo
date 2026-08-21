import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, GoogleOAuthController],
  providers: [AuthService, TwoFactorService, GoogleOAuthService],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
