'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage } from '@/components/Feedback';
import api from '@/lib/api';
import type { User } from '@/lib/types';

/**
 * Connexion — les tokens sont posés en cookies HTTP-only par l'API ;
 * le navigateur ne manipule jamais de token.
 */
function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const { setUser, refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      void refresh();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {error && <ErrorMessage message={error} />}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
          Inscrivez-vous
        </Link>
      </p>
    </form>
  );
}

export default function ConnexionPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-center text-2xl font-bold text-slate-900">Connexion</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Suspense>
          <ConnexionForm />
        </Suspense>
      </div>
    </div>
  );
}
