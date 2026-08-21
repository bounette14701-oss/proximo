import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import { TwoFactorService } from '../src/auth/two-factor.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Tests du 2FA TOTP : génération du secret + QR, vérification d'un code
 * réellement généré par otplib (aucun réseau requis).
 */
describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: { user: any };
  let jwtService: JwtService;

  const adminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    totpSecret: null,
    totpEnabled: false,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(adminUser),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...adminUser, ...data })),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('2fa-token'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'admin-1', purpose: '2fa-login' }),
    } as unknown as JwtService;
    service = new TwoFactorService(prisma as unknown as PrismaService, jwtService);
  });

  it('génère un secret TOTP et un QR code (data URL)', async () => {
    const result = await service.setup('admin-1');
    expect(result.secret.length).toBeGreaterThanOrEqual(16);
    expect(result.otpauthUrl).toContain('otpauth://totp/');
    expect(result.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totpSecret: result.secret }),
      }),
    );
  });

  it('refuse le setup pour un non-administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...adminUser, role: 'USER' });
    await expect(service.setup('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('active le 2FA avec un code TOTP valide', async () => {
    const secret = authenticator.generateSecret();
    prisma.user.findUnique.mockResolvedValue({ ...adminUser, totpSecret: secret });
    const code = authenticator.generate(secret);

    const result = await service.confirm('admin-1', code);
    expect(result.enabled).toBe(true);
  });

  it('rejette un code TOTP invalide', async () => {
    const secret = authenticator.generateSecret();
    prisma.user.findUnique.mockResolvedValue({ ...adminUser, totpSecret: secret });

    await expect(service.confirm('admin-1', '000000')).rejects.toThrow('Code incorrect');
  });

  it('valide le login 2FA complet (jeton + code) et retourne le userId', async () => {
    const secret = authenticator.generateSecret();
    prisma.user.findUnique.mockResolvedValue({
      ...adminUser,
      totpSecret: secret,
      totpEnabled: true,
    });
    const code = authenticator.generate(secret);

    const userId = await service.verifyLogin('2fa-token', code);
    expect(userId).toBe('admin-1');
  });

  it('rejette le login 2FA avec un mauvais code', async () => {
    const secret = authenticator.generateSecret();
    prisma.user.findUnique.mockResolvedValue({
      ...adminUser,
      totpSecret: secret,
      totpEnabled: true,
    });

    await expect(service.verifyLogin('2fa-token', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
