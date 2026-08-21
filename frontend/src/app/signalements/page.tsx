'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage, Spinner } from '@/components/Feedback';
import api from '@/lib/api';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type Incident,
  type IncidentCategory,
} from '@/lib/types';

/**
 * Signalements d'incidents (syndic / agence) :
 * formulaire avec pièces jointes (JPG/PNG/WEBP/PDF, 5 Mo max/fichier)
 * et historique personnel.
 */
export default function SignalementsPage() {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('WATER_LEAK');
  const [description, setDescription] = useState('');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);

  const load = useCallback(() => {
    api<{ incidents: Incident[] }>('/incidents')
      .then((data) => setIncidents(data.incidents))
      .catch(() => setIncidents([]));
  }, []);

  useEffect(load, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('category', category);
      form.append('description', description);
      if (neighborhood) form.append('neighborhood', neighborhood);
      for (const file of files) form.append('files', file);
      await api('/incidents', { method: 'POST', body: form });
      setTitle('');
      setDescription('');
      setFiles([]);
      setSuccess('Signalement envoyé au syndic. Merci !');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Signalements</h1>
      <p className="mt-1 text-sm text-slate-600">
        Un problème dans la résidence ? Signalez-le, le syndic est prévenu
        automatiquement par email avec vos photos.
      </p>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as IncidentCategory)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
            >
              {Object.entries(INCIDENT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Résidence</label>
            <input
              type="text"
              maxLength={120}
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Fuite d'eau palier 3"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            required
            minLength={10}
            maxLength={3000}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Décrivez le problème (localisation, gravité…)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Pièces jointes (JPG, PNG, WEBP, PDF — 5 Mo max, 5 fichiers)
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          {files.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {files.map((file) => file.name).join(', ')}
            </p>
          )}
        </div>
        <ErrorMessage message={error} />
        {success && <p className="text-sm font-medium text-brand-600">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : 'Envoyer au syndic'}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Mes signalements</h2>
      {!incidents ? (
        <Spinner />
      ) : incidents.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aucun signalement pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {INCIDENT_STATUS_LABELS[incident.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{incident.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{INCIDENT_CATEGORY_LABELS[incident.category]}</span>
                <span>·</span>
                <span>{new Date(incident.createdAt).toLocaleDateString('fr-FR')}</span>
                {incident.attachments.length > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      📎 {incident.attachments.length} pièce
                      {incident.attachments.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/" className="text-brand-600 hover:underline">
          ← Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
