'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage, SuccessMessage } from '@/components/Feedback';
import { Spinner } from '@/components/Feedback';
import api from '@/lib/api';
import {
  CATEGORY_LABELS,
  INCIDENT_CATEGORY_LABELS,
  type IncidentCategory,
  type ListingCategory,
} from '@/lib/types';
import { RequireAccount } from '@/components/RequireAccount';

/**
 * Publication unifiée de la résidence :
 * - une annonce (prêt, service, don, avis aux résidents) → POST /listings
 * - un signalement (catégorie « Signalement ») → POST /incidents (pièces
 *   jointes, localisation libre, alerte automatique de l'agence).
 */
type PublishCategory = ListingCategory | 'SIGNALEMENT';

const SIGNALEMENT = 'SIGNALEMENT';

function NewListingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PublishCategory>('TOOL');
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isIncident = category === SIGNALEMENT;

  // Pré-sélection via l'URL (ex. ?categorie=SIGNALEMENT depuis l'accueil).
  useEffect(() => {
    const preset = searchParams.get('categorie');
    if (preset === SIGNALEMENT) setCategory(SIGNALEMENT);
  }, [searchParams]);

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
      if (isIncident) {
        if (!location.trim()) {
          setError('Précisez la localisation (ex. 3e étage, hall A, parking…).');
          setSubmitting(false);
          return;
        }
        const form = new FormData();
        form.set('title', title.trim());
        form.set('category', incidentCategory);
        form.set('description', description.trim());
        form.set('neighborhood', location.trim());
        for (const file of files) form.append('files', file);
        const result = await api<{ incident: { id: string } }>('/incidents', {
          method: 'POST',
          body: form,
        });
        setSuccess('Signalement envoyé à l’agence !');
        setTimeout(() => router.push(`/annonces?categorie=${SIGNALEMENT}`), 700);
        return;
      }

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
          'Indiquez une adresse (recommandé) ou des coordonnées manuelles avec un résidence.',
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
    <RequireAccount>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isIncident ? 'Signaler un incident' : 'Publier dans la résidence'}
        </h1>
        <p className="text-sm text-slate-500">
          Tout se publie au même endroit : choisissez la catégorie, le formulaire s&apos;adapte.
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {isIncident && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              ⚠️ Ce signalement sera envoyé par email à l&apos;agence de la résidence
              (syndic / gestionnaire).
            </div>
          )}

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
              placeholder={
                isIncident ? 'Ex. Fuite d’eau dans le hall B' : 'Ex. Perceuse Bosch à prêter ce week-end'
              }
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
              onChange={(event) => setCategory(event.target.value as PublishCategory)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value={SIGNALEMENT}>🛠️ Signalement (alerte l’agence)</option>
            </select>
          </div>

          {isIncident && (
            <div>
              <label htmlFor="incident-category" className="mb-1 block text-sm font-medium text-slate-700">
                Type de problème
              </label>
              <select
                id="incident-category"
                value={incidentCategory}
                onChange={(event) => setIncidentCategory(event.target.value as IncidentCategory)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {Object.entries(INCIDENT_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              placeholder={
                isIncident
                  ? 'Décrivez le problème : depuis quand, où, les détails utiles à l’intervention…'
                  : 'Décrivez ce que vous proposez : état, disponibilités, conditions…'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {isIncident ? (
            <>
              <div>
                <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">
                  Localisation
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  maxLength={120}
                  placeholder="Ex. 3e étage, escalier B, parking sous-sol…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Précisez où se trouve le problème (l&apos;agence déterminera la résidence).
                </p>
              </div>

              <div>
                <label htmlFor="files" className="mb-1 block text-sm font-medium text-slate-700">
                  Photos / documents (optionnel, max 5 × 5 Mo)
                </label>
                <input
                  id="files"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 focus:border-brand-500 focus:outline-none"
                />
                {files.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{files.length} fichier(s) joint(s)</p>
                )}
              </div>
            </>
          ) : (
            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-medium text-slate-700">
                Localisation (jamais affichée publiquement — seul le résidence l&apos;est)
              </legend>

              <div className="space-y-3">
                <div>
                  <label htmlFor="address" className="mb-1 block text-sm text-slate-600">
                    Adresse ou résidence (recommandé — géolocalisation automatique)
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    placeholder="Résidence affiché"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Les coordonnées manuelles ne servent qu&apos;au calcul des distances : elles ne
                  sont jamais exposées aux autres utilisateurs.
                </p>
              </div>
            </fieldset>
          )}

          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting
              ? 'Envoi…'
              : isIncident
                ? 'Envoyer le signalement à l’agence'
                : 'Publier dans la résidence'}
          </button>
        </form>
      </div>
    </RequireAccount>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<Spinner label="Chargement…" />}>
      <NewListingForm />
    </Suspense>
  );
}
