'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type Incident,
} from '@/lib/types';
import { Spinner } from './Feedback';
import { formatLocation } from '@/lib/format';

/**
 * Derniers signalements publiés (page d'accueil).
 */
export function LatestIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ incidents: Incident[] }>('/incidents')
      .then((data) => setIncidents(data.incidents.slice(0, 3)))
      .catch(() => setError('Impossible de charger les signalements.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Chargement des signalements…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (incidents.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
        Aucun signalement en cours.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {incidents.map((incident) => (
        <li
          key={incident.id}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Link
            href={`/signalements/${incident.id}`}
            className="group flex flex-1 flex-col"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                {INCIDENT_CATEGORY_LABELS[incident.category]}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
            <p className="mt-1.5 line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700">
              {incident.title}
            </p>
            <p className="mt-auto pt-2 text-xs text-slate-400">
              📍{' '}
              {formatLocation(
                undefined,
                incident.neighborhood,
                incident.user?.building,
                incident.user?.floor,
                incident.user?.showDetails,
              )}
            </p>
          </Link>
          {incident._count && incident._count.comments > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                💬 {incident._count.comments} commentaire{incident._count.comments > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
