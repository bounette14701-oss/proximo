'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { CATEGORY_LABELS, Listing, ListingCategory, ListingPage } from '@/lib/types';
import { ListingCard } from '@/components/ListingCard';
import { ErrorMessage, Spinner } from '@/components/Feedback';

/**
 * Recherche d'annonces avec périmètre géographique.
 * Localisation : géolocalisation du navigateur (bouton) ou saisie d'une
 * adresse (géocodage via l'API). Sans localisation : annonces récentes.
 */
export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | ListingCategory>('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [locating, setLocating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      if (location) {
        params.set('lat', String(location.lat));
        params.set('lng', String(location.lng));
        params.set('radiusKm', String(radiusKm));
      }
      const data = await api<ListingPage>(`/listings?${params.toString()}`);
      setListings(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, location, radiusKm, page]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  // Géolocalisation via le navigateur.
  const locateMe = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur ce navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          label: 'Ma position actuelle',
        });
        setLocating(false);
      },
      () => {
        setError('Géolocalisation refusée. Saisissez une adresse à la place.');
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  };

  // Géocodage d'une adresse via l'API.
  const geocodeAddress = async () => {
    if (!addressInput.trim()) return;
    setLocating(true);
    setError(null);
    try {
      const result = await api<{ lat: number; lng: number; displayName: string }>(
        `/geocode?q=${encodeURIComponent(addressInput.trim())}`,
      );
      setLocation({ lat: result.lat, lng: result.lng, label: result.displayName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adresse introuvable');
    } finally {
      setLocating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Annonces près de chez moi</h1>

      {/* Filtres */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher (perceuse, garde d'enfant…)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as '' | ListingCategory);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value) || 10)}
            placeholder="Rayon (km)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {locating ? 'Localisation…' : '📍 Me localiser'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={(event) => setAddressInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void geocodeAddress();
            }}
            placeholder="Ou saisissez une adresse / un quartier (ex. Lyon 7e)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void geocodeAddress()}
            disabled={locating || !addressInput.trim()}
            className="rounded-lg border border-brand-600 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            Utiliser cette adresse
          </button>
          {location && (
            <button
              type="button"
              onClick={() => setLocation(null)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              title="Réinitialiser le périmètre"
            >
              ✕ {location.label}
            </button>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Spinner label="Recherche des annonces…" />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {total} annonce{total > 1 ? 's' : ''}
            {location ? ` dans un rayon de ${radiusKm} km` : ''}
          </p>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Aucune annonce ne correspond à votre recherche.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40"
              >
                ← Précédent
              </button>
              <span className="text-sm text-slate-500">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
