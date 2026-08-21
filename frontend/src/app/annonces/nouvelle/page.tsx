'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage, SuccessMessage } from '@/components/Feedback';
import { Spinner } from '@/components/Feedback';
import api from '@/lib/api';
import { CATEGORY_LABELS, ListingCategory } from '@/lib/types';

/**
 * Création d'une annonce (réservée aux utilisateurs connectés).
 * Localisation par adresse (géocodage automatique) ou, en repli,
 * par coordonnées manuelles + quartier.
 */
export default function NewListingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ListingCategory>('TOOL');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirection si non connecté.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/connexion?next=/annonces/nouvelle');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) return <Spinner label="Vérification de la session…" />;

  const locateManually = () => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non disponible. Saisissez une adresse ou des coordonnées.');
      return;
    }
    setGeocoding(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setGeocoding(false);
      },
      () => {
        setError('Géolocalisation refusée.');
        setGeocoding(false);
      },
      { timeout: 10_000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category,
        description: description.trim(),
      };
      if (address.trim()) {
        payload.address = address.trim();
        if (neighborhood.trim()) payload.neighborhood = neighborhood.trim();
      } else if (lat && lng && neighborhood.trim()) {
        payload.lat = Number(lat);
        payload.lng = Number(lng);
        payload.neighborhood = neighborhood.trim();
      } else {
        setError(
          'Indiquez une adresse (recommandé) ou des coordonnées manuelles avec un quartier.',
        );
        setSubmitting(false);
        return;
      }

      const result = await api<{ listing: { id: string } }>('/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSuccess('Annonce publiée !');
      setTimeout(() => router.push(`/annonces/${result.listing.id}`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publication impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Déposer une annonce</h1>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Titre
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={3}
            maxLength={80}
            placeholder="Ex. Perceuse Bosch à prêter ce week-end"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
            Catégorie
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ListingCategory)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={10}
            maxLength={2000}
            placeholder="Décrivez ce que vous proposez : état, disponibilités, conditions…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-medium text-slate-700">
            Localisation (jamais affichée publiquement — seul le quartier l&apos;est)
          </legend>

          <div className="space-y-3">
            <div>
              <label htmlFor="address" className="mb-1 block text-sm text-slate-600">
                Adresse ou quartier (recommandé — géolocalisation automatique)
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Ex. 12 rue des Lilas, Lyon 7e"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>ou</span>
              <button
                type="button"
                onClick={locateManually}
                disabled={geocoding}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {geocoding ? 'Localisation…' : '📍 Utiliser ma position'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                placeholder="Latitude"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                placeholder="Longitude"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <input
                type="text"
                value={neighborhood}
                onChange={(event) => setNeighborhood(event.target.value)}
                placeholder="Quartier affiché"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400">
              Les coordonnées manuelles ne servent qu&apos;au calcul des distances : elles ne
              sont jamais exposées aux autres utilisateurs.
            </p>
          </div>
        </fieldset>

        {error && <ErrorMessage message={error} />}
        {success && <SuccessMessage message={success} />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Publication…' : 'Publier l’annonce'}
        </button>
      </form>
    </div>
  );
}
