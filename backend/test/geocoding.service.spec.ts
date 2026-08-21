import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { GeocodingService } from '../src/geocoding/geocoding.service';

/**
 * Tests du service de géocodage avec fetch simulé (aucun réseau).
 */
describe('GeocodingService', () => {
  let service: GeocodingService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new GeocodingService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('geocode', () => {
    it('extrait lat/lng et un libellé lisible', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '45.7500000',
            lon: '4.8500000',
            display_name: 'Lyon, Métropole de Lyon, France',
            address: { city: 'Lyon' },
          },
        ],
      });

      const result = await service.geocode('Lyon');
      expect(result).toEqual({
        lat: 45.75,
        lng: 4.85,
        displayName: 'Lyon',
      });
    });

    it('lève une BadRequest si aucun résultat', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
      await expect(service.geocode('xyz')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève une BadGateway si le service est indisponible', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503 });
      await expect(service.geocode('Lyon')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('reverse', () => {
    it('privilégie le quartier (suburb)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          address: { suburb: 'Lyon 7e', city: 'Lyon' },
        }),
      });

      await expect(service.reverse(45.75, 4.85)).resolves.toBe('Lyon 7e');
    });

    it('lève une BadRequest si aucune adresse retournée', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ address: null }) });
      await expect(service.reverse(0, 0)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
