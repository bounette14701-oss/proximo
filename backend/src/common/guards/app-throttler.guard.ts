import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiting basé sur la vraie IP client (derrière nginx) :
 * l'IP est lue depuis X-Forwarded-For, jamais depuis l'adresse du proxy.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: Record<string, any>): Promise<string> {
    const forwarded = request.headers?.['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string' && forwarded.length > 0
        ? forwarded.split(',')[0].trim()
        : request.ip;
    return ip ?? 'unknown';
  }
}
