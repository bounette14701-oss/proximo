'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage, Spinner } from '@/components/Feedback';
import api from '@/lib/api';
import { CATEGORY_EMOJI, CATEGORY_LABELS, Listing, STATUS_LABELS, User } from '@/lib/types';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  neighborhood: string | null;
  createdAt: string;
  listings: Array<Pick<Listing, 'id' | 'title' | 'category' | 'status' | 'neighborhood' | 'createdAt'>>;
}

/**
 * Profil : informations du compte + gestion des annonces
 * (clôturer / rouvrir / supprimer — propriétaire uniquement).
 */
export default function ProfilPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api<{ user: ProfileData }>('/users/me');
      setProfile(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void loadProfile();
  }, [authLoading, user, loadProfile]);

  const setStatus = async (listingId: string, status: 'RESERVED' | 'CLOSED' | 'OPEN') => {
    try {
      await api(`/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    }
  };

  const remove = async (listingId: string) => {
    if (!window.confirm('Supprimer définitivement cette annonce ?')) return;
    try {
      await api(`/listings/${listingId}`, { method: 'DELETE' });
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    }
  };

  if (authLoading || loading) return <Spinner label="Chargement du profil…" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Connectez-vous pour voir votre profil.</p>
        <Link
          href="/connexion?next=/profil"
          className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (error && !profile) return <ErrorMessage message={error} />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {error && <ErrorMessage message={error} />}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {profile?.firstName} {profile?.lastName}
        </h1>
        <dl className="mt-4 space-y-2 text-sm text-slate-500">
          <div className="flex justify-between gap-4">
            <dt>Email</dt>
            <dd className="font-medium text-slate-700">{profile?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Quartier</dt>
            <dd className="font-medium text-slate-700">{profile?.neighborhood ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Membre depuis</dt>
            <dd className="font-medium text-slate-700">
              {profile
                ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Actualiser
          </button>
          <Link
            href="/annonces/nouvelle"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Nouvelle annonce
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Mes annonces</h2>
        {profile && profile.listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Vous n&apos;avez pas encore d&apos;annonce.
          </div>
        ) : (
          <ul className="space-y-3">
            {profile?.listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/annonces/${listing.id}`}
                    className="font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {CATEGORY_EMOJI[listing.category]} {listing.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CATEGORY_LABELS[listing.category]} · 📍 {listing.neighborhood}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      listing.status === 'OPEN'
                        ? 'bg-green-100 text-green-700'
                        : listing.status === 'RESERVED'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {STATUS_LABELS[listing.status]}
                  </span>
                  {listing.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => void setStatus(listing.id, 'RESERVED')}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                      title="Masquer temporairement"
                    >
                      Réserver
                    </button>
                  )}
                  {listing.status !== 'CLOSED' && (
                    <button
                      type="button"
                      onClick={() => void setStatus(listing.id, 'CLOSED')}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                      Clôturer
                    </button>
                  )}
                  {listing.status !== 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => void setStatus(listing.id, 'OPEN')}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                      Rouvrir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(listing.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile && <p className="sr-only">Profil de {profile.email}</p>}
    </div>
  );
}
