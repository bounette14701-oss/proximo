import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Listing, Prisma } from '@prisma/client';
import { GeocodingService } from '../geocoding/geocoding.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  buildListingWhere,
  distanceSql,
  ListingResponse,
  RawListingRow,
  toListingResponse,
} from './listing.types';

/** Colonnes sélectionnées sans distance (liste simple). */
const baseColumns = Prisma.sql`
  l."id", l."title", l."description", l."category", l."status",
  l."neighborhood", l."createdAt", l."ownerId",
  u."firstName" AS "ownerFirstName", u."neighborhood" AS "ownerNeighborhood"
`;

/** Colonnes sélectionnées avec distance PostGIS (mètres). */
function withDistanceColumns(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`
    l."id", l."title", l."description", l."category", l."status",
    l."neighborhood", l."createdAt", l."ownerId",
    u."firstName" AS "ownerFirstName", u."neighborhood" AS "ownerNeighborhood",
    ${distanceSql(lat, lng)} AS "distanceMeters"
  `;
}

const orderByDistance = Prisma.sql`ORDER BY "distanceMeters" ASC`;
const orderByDateDesc = Prisma.sql`ORDER BY l."createdAt" DESC`;

/**
 * Gestion des annonces d'entraide.
 * Localisation : géocodage (adresse libre) ou coordonnées manuelles ;
 * recherche par périmètre via PostGIS (ST_DWithin), tri par distance.
 */
@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  /** Crée une annonce pour l'utilisateur connecté. */
  async create(ownerId: string, dto: CreateListingDto): Promise<ListingResponse> {
    const location = await this.resolveLocation(dto);

    const listing = await this.prisma.listing.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        neighborhood: location.neighborhood,
        ownerId,
      },
    });

    return this.findOne(listing.id, ownerId);
  }

  /** Recherche paginée, avec périmètre géographique optionnel. */
  async findAll(
    query: QueryListingsDto,
    viewerId?: string,
  ): Promise<{ items: ListingResponse[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const hasGeo =
      typeof query.lat === 'number' &&
      typeof query.lng === 'number' &&
      typeof query.radiusKm === 'number';

    const where = buildListingWhere({
      category: query.category,
      search: query.search,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
    });

    const selectColumns = hasGeo
      ? withDistanceColumns(query.lat as number, query.lng as number)
      : baseColumns;
    const orderBy = hasGeo ? orderByDistance : orderByDateDesc;

    const rows = await this.prisma.$queryRaw<RawListingRow[]>(
      Prisma.sql`
        SELECT ${selectColumns}
        FROM "Listing" l
        JOIN "User" u ON u."id" = l."ownerId"
        ${where}
        ${orderBy}
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `,
    );

    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Listing" l
        JOIN "User" u ON u."id" = l."ownerId"
        ${where}
      `,
    );
    const total = Number(totalRows[0]?.count ?? 0);

    return {
      items: rows.map((row) => toListingResponse(row, viewerId)),
      total,
      page,
      limit,
    };
  }

  /** Détail d'une annonce (les annonces fermées restent visibles sur leur lien direct). */
  async findOne(id: string, viewerId?: string): Promise<ListingResponse> {
    const rows = await this.prisma.$queryRaw<RawListingRow[]>(
      Prisma.sql`
        SELECT ${baseColumns}
        FROM "Listing" l
        JOIN "User" u ON u."id" = l."ownerId"
        WHERE l."id" = ${id}
        LIMIT 1
      `,
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Annonce introuvable');
    }
    return toListingResponse(row, viewerId);
  }

  /** Modifie une annonce — propriétaire uniquement. */
  async update(id: string, ownerId: string, dto: UpdateListingDto): Promise<ListingResponse> {
    const listing = await this.getOwned(id, ownerId);

    let lat = listing.lat;
    let lng = listing.lng;
    let address = listing.address;
    let neighborhood = listing.neighborhood;

    // Si une nouvelle adresse est fournie, on re-géocode.
    if (dto.address?.trim()) {
      const location = await this.resolveLocation(dto);
      lat = location.lat;
      lng = location.lng;
      address = location.address;
      neighborhood = location.neighborhood;
    } else if (dto.lat !== undefined && dto.lng !== undefined && dto.neighborhood?.trim()) {
      lat = dto.lat;
      lng = dto.lng;
      neighborhood = dto.neighborhood.trim();
    }

    await this.prisma.listing.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        category: dto.category,
        status: dto.status,
        lat,
        lng,
        address,
        neighborhood,
      },
    });

    return this.findOne(id, ownerId);
  }

  /** Supprime une annonce — propriétaire uniquement. */
  async remove(id: string, ownerId: string): Promise<void> {
    await this.getOwned(id, ownerId);
    await this.prisma.listing.delete({ where: { id } });
  }

  /** Récupère une annonce et vérifie qu'elle appartient à l'utilisateur. */
  private async getOwned(id: string, ownerId: string): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new NotFoundException('Annonce introuvable');
    }
    if (listing.ownerId !== ownerId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier cette annonce');
    }
    return listing;
  }

  /**
   * Détermine la localisation d'une annonce.
   * Voie 1 : géocodage de l'adresse (quartier déduit par géocodage inverse).
   * Voie 2 (repli) : coordonnées + quartier fournis manuellement.
   */
  private async resolveLocation(dto: {
    address?: string;
    lat?: number;
    lng?: number;
    neighborhood?: string;
  }): Promise<{ lat: number; lng: number; address: string; neighborhood: string }> {
    if (dto.address?.trim()) {
      const address = dto.address.trim();
      const geocoded = await this.geocoding.geocode(address);
      let neighborhood = dto.neighborhood?.trim();
      if (!neighborhood) {
        try {
          neighborhood = await this.geocoding.reverse(geocoded.lat, geocoded.lng);
        } catch {
          neighborhood = geocoded.displayName;
        }
      }
      return {
        lat: geocoded.lat,
        lng: geocoded.lng,
        address,
        neighborhood: neighborhood || geocoded.displayName,
      };
    }

    if (typeof dto.lat === 'number' && typeof dto.lng === 'number' && dto.neighborhood?.trim()) {
      return {
        lat: dto.lat,
        lng: dto.lng,
        address: '',
        neighborhood: dto.neighborhood.trim(),
      };
    }

    throw new BadRequestException(
      'Indiquez une adresse (géolocalisation automatique) ou des coordonnées manuelles avec un quartier',
    );
  }
}
