import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';

/**
 * Résultat d'un géocodage.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Extraits du service de géocodage : délais courts, un seul appel par
 * requête entrante, User-Agent conforme aux conditions d'usage d'OSM.
 */
@Injectable()
export class GeocodingService {
  private readonly nominatimBase = 'https://nominatim.openstreetmap.org';
  private readonly timeoutMs = 6_000;
  private readonly userAgent = 'Proximo/0.1 (plateforme d-entraide de voisinage)';

  /**
   * Géocode une adresse libre (ex. « 12 rue des Lilas, Lyon »).
   * @throws BadRequestException si l'adresse est introuvable,
   *         BadGatewayException si le service est indisponible.
   */
  async geocode(address: string): Promise<GeocodeResult> {
    const url = new URL(`${this.nominatimBase}/search`);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const data = await this.fetchJson<Array<Record<string, any>>>(url);
    const first = data?.[0];
    if (!first || typeof first.lat !== 'string' || typeof first.lon !== 'string') {
      throw new BadRequestException(`Adresse introuvable : ${address}`);
    }

    return {
      lat: Number(parseFloat(first.lat).toFixed(6)),
      lng: Number(parseFloat(first.lon).toFixed(6)),
      displayName: this.extractDisplayName(first),
    };
  }

  /**
   * Géocodage inverse : détermine le quartier affichable pour des coordonnées.
   */
  async reverse(lat: number, lng: number): Promise<string> {
    const url = new URL(`${this.nominatimBase}/reverse`);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('zoom', '16');
    url.searchParams.set('addressdetails', '1');

    const data = await this.fetchJson<Record<string, any>>(url);
    const address = data?.address;
    if (!address || typeof address !== 'object') {
      throw new BadRequestException(`Adresse introuvable (lat=${lat}, lng=${lng})`);
    }

    return (
      address.suburb ??
      address.neighbourhood ??
      address.city_district ??
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      'Quartier inconnu'
    );
  }

  /** Extrait un libellé lisible depuis la réponse Nominatim. */
  private extractDisplayName(result: Record<string, any>): string {
    const address = result.address ?? {};
    const parts = [
      address.suburb ?? address.neighbourhood ?? address.city_district,
      address.city ?? address.town ?? address.village,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : String(result.display_name ?? '');
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': this.userAgent, 'Accept-Language': 'fr' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException(
        'Service de géolocalisation indisponible, veuillez réessayer dans un instant',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
