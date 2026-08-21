'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Listing, ListingPage } from '@/lib/types';
import { ListingCard } from './ListingCard';
import { Spinner } from './Feedback';

/**
 * Dernières annonces publiées (page d'accueil).
 */
export function LatestListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ListingPage>('/listings?limit=6')
      .then((data) => setListings(data.items))
      .catch(() => setError('Impossible de charger les annonces.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Chargement des annonces…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Aucune annonce pour le moment. Soyez le premier à déposer une annonce !
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
