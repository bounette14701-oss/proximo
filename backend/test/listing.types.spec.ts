import { toListingResponse, RawListingRow } from '../src/listings/listing.types';

/**
 * Tests du mapping des annonces : la vie privée est non négociable —
 * lat/lng/address ne doivent JAMAIS sortir de l'API.
 */
describe('toListingResponse', () => {
  const row: RawListingRow = {
    id: 'a',
    title: 'Perceuse à prêter',
    description: 'Perceuse Bosch en bon état',
    category: 'TOOL',
    status: 'OPEN',
    neighborhood: 'Lyon 7e',
    createdAt: new Date('2026-08-01T10:00:00Z'),
    ownerId: 'owner-1',
    ownerFirstName: 'Claire',
    ownerNeighborhood: 'Lyon 7e',
    distanceMeters: 1234,
  };

  it('n’expose jamais lat, lng ni address', () => {
    const response = toListingResponse(row);
    expect(response).not.toHaveProperty('lat');
    expect(response).not.toHaveProperty('lng');
    expect(response).not.toHaveProperty('address');
  });

  it('convertit la distance en kilomètres arrondis au dixième', () => {
    const response = toListingResponse(row);
    expect(response.distanceKm).toBe(1.2);
  });

  it('signale si l’utilisateur est le propriétaire', () => {
    expect(toListingResponse(row, 'owner-1').isOwner).toBe(true);
    expect(toListingResponse(row, 'other').isOwner).toBe(false);
    expect(toListingResponse(row).isOwner).toBe(false);
  });

  it('reste valide sans distance (vue sans périmètre)', () => {
    const withoutDistance = { ...row, distanceMeters: undefined };
    const response = toListingResponse(withoutDistance);
    expect(response.distanceKm).toBeUndefined();
    expect(response.neighborhood).toBe('Lyon 7e');
    expect(response.owner.firstName).toBe('Claire');
  });
});
