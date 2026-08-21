'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import {
  CATEGORY_LABELS,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type Incident,
  type Listing,
  type ListingCategory,
  type ListingPage,
} from '@/lib/types';
import { ListingCard } from '@/components/ListingCard';
import { ErrorMessage, Spinner } from '@/components/Feedback';
import { RequireAccount } from '@/components/RequireAccount';

/**
 * Fil unifié de la résidence : annonces (prêt, service, don, avis) et
 * signalements — le choix se fait dans la catégorie.
 */
type FilterCategory = '' | ListingCategory | 'SIGNALEMENT';
const SIGNALEMENT = 'SIGNALEMENT';

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FilterCategory>('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [locating, setLocating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const showIncidents = category === SIGNALEMENT;

  // ?categorie=SIGNALEMENT (accès depuis l'accueil / redirections).
  useEffect(() => {
    if (searchParams.get('categorie') === SIGNALEMENT) setCategory(SIGNALEMENT);
  }, [searchParams]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (showIncidents) {
        const data = await api<{ incidents: Incident[] }>('/incidents');
        setIncidents(data.incidents);
        setListings([]);
        setTotal(data.incidents.length);
      } else {
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
        // « Toutes les catégories » : annonces + signalements mélangés.
        const [listingsData, incidentsData] = await Promise.all([
          api<ListingPage>(`/listings?${params.toString()}`),
          category === '' ? api<{ incidents: Incident[] }>('/incidents').catch(() => null) : Promise.resolve(null),
        ]);
        setListings(listingsData.items);
        setIncidents(incidentsData?.incidents ?? []);
        setTotal(listingsData.total + (incidentsData?.incidents.length ?? 0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setListings([]);
      setIncidents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, category, location, radiusKm, page, showIncidents]);

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

  // Géocodage d'une adresse saisie.
  const geocodeAddress = async () => {
    const query = addressInput.trim();
    if (!query) return;
    setLocating(true);
    setError(null);
    try {
      const data = await api<{ lat: number; lng: number; label: string }>(
        `/geocode?q=${encodeURIComponent(query)}`,
      );
      setLocation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adresse introuvable');
    } finally {
      setLocating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** Carte de signalement (réutilisée en filtre « Signalements » et en fil « Toutes »). */
  const renderIncident = (incident: Incident) => (
    <li key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{incident.title}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {INCIDENT_CATEGORY_LABELS[incident.category]} · 📍{' '}
            {incident.neighborhood || 'Non précisée'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            incident.status === 'OPEN'
              ? 'bg-amber-100 text-amber-700'
              : incident.status === 'IN_PROGRESS'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {INCIDENT_STATUS_LABELS[incident.status]}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{incident.description}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {new Date(incident.createdAt).toLocaleDateString('fr-FR')} ·{' '}
          {incident.attachments?.length
            ? `${incident.attachments.length} pièce(s) jointe(s)`
            : 'sans pièce jointe'}
        </p>
        {incident.status !== 'RESOLVED' && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Marquer « ${incident.title} » comme traité ?`)) return;
              api(`/incidents/${incident.id}/resolve`, { method: 'PATCH' })
                .then(() => {
                  setIncidents((current) =>
                    current.map((item) =>
                      item.id === incident.id ? { ...item, status: 'RESOLVED' } : item,
                    ),
                  );
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Action impossible'),
                );
            }}
            className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            ✅ Marquer comme traité
          </button>
        )}
      </div>
    </li>
  );

  return (
    <RequireAccount>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {showIncidents ? 'Signalements de la résidence' : 'Annonces de la résidence'}
            </h1>
            <p className="text-sm text-slate-500">
              {showIncidents
                ? 'Vos signalements envoyés à l’agence et leur suivi.'
                : 'Prêt, service, don, avis — tout ce qui circule dans votre résidence.'}
            </p>
          </div>
          <Link
            href="/annonces/nouvelle"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + {showIncidents ? 'Signaler un incident' : 'Publier'}
          </Link>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher (perceuse, colis, fuite…)"
            className="min-w-52 flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as FilterCategory);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value={SIGNALEMENT}>🛠️ Signalements</option>
          </select>
          {!showIncidents && (
            <>
              <select
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {[1, 2, 5, 10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} km
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={locateMe}
                disabled={locating}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                📍 Me localiser
              </button>
            </>
          )}
        </div>

        {!showIncidents && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void geocodeAddress();
                }
              }}
              placeholder="Ou saisissez une adresse / un résidence (ex. Lyon 7e)"
              className="min-w-52 flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void geocodeAddress()}
              disabled={locating}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Utiliser cette adresse
            </button>
            {location && (
              <span className="text-xs text-slate-500">📍 {location.label}</span>
            )}
          </div>
        )}

        <ErrorMessage message={error} />

        {loading ? (
          <Spinner />
        ) : showIncidents ? (
          incidents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
              Aucun signalement pour le moment.{' '}
              <Link href="/annonces/nouvelle?categorie=SIGNALEMENT" className="font-medium text-brand-600 hover:underline">
                Signaler un problème à l’agence →
              </Link>
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {incidents.map(renderIncident)}
            </ul>
          )
        ) : (
          <>
            {incidents.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">🛠️ Signalements récents</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {incidents.map(renderIncident)}
                </ul>
              </section>
            )}
            {listings.length === 0 && incidents.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
                Rien dans la résidence pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </>
        )}

        {!showIncidents && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="text-sm text-slate-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </RequireAccount>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ListingsContent />
    </Suspense>
  );
}
