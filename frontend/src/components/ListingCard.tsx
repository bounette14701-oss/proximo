import Link from 'next/link';
import { CATEGORY_EMOJI, CATEGORY_LABELS, Listing } from '@/lib/types';
import { formatDistance, formatLocation, formatRelativeDate } from '@/lib/format';

/**
 * Carte d'annonce : catégorie, titre, description tronquée,
 * localisation (résidence + bâtiment/étage selon les préférences du
 * propriétaire) et date de publication.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/annonces/${listing.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          <span aria-hidden>{CATEGORY_EMOJI[listing.category]}</span>
          {CATEGORY_LABELS[listing.category]}
        </span>
        {listing.distanceKm !== undefined && (
          <span className="text-xs font-semibold text-brand-600">
            à {formatDistance(listing.distanceKm)}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
        {listing.title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{listing.description}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>
          📍 {formatLocation(listing.residenceName, listing.neighborhood, listing.owner.building, listing.owner.floor, listing.owner.showDetails)} · {listing.owner.firstName}
        </span>
        <span>{formatRelativeDate(listing.createdAt)}</span>
      </div>
    </Link>
  );
}
