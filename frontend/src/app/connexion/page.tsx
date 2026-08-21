'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ErrorMessage } from '@/components/Feedback';
import api from '@/lib/api';
import type { User } from '@/lib/types';

/**
 * Connexion — Sprint 2 :
 * - « Se souvenir de moi » (refresh token longue durée, cookie HTTP-only)
 * - « Continuer avec Google » (OAuth2 / OpenID Connect)
 * - Étape 2FA TOTP pour les administrateurs (code à 6 chiffres)
 */
function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const needsTwoFactor = searchParams.get('2fa') === '1';
  const googleError = searchParams.get('error') === 'google';
  const { setUser, refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(needsTwoFactor);
  const [error, setError] = useState<string | null>(
    googleError ? 'La connexion Google a échoué. Réessayez.' : null,
  );
  const [submitting, setSubmitting] = useState(false);

  // Après le callback Google avec 2FA, le cookie two_factor_token est posé.
  useEffect(() => {
    if (needsTwoFactor) setShowTwoFactor(true);
  }, [needsTwoFactor]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api<{ user: User; requiresTwoFactor?: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (data.requiresTwoFactor) {
        setShowTwoFactor(true);
        return;
      }
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

  const handleTwoFactor = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api<{ user: User }>('/auth/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode }),
      });
      setUser(data.user);
      void refresh();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    // L'API répond par l'URL d'autorisation Google (le state anti-CSRF
    // est posé en cookie HTTP-only côté serveur).
    api<{ url: string }>('/auth/google')
      .then((data) => {
        window.location.href = data.url;
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Google indisponible'));
  };

  if (showTwoFactor) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Double authentification
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Saisissez le code à 6 chiffres de votre application
            d&apos;authentification (Google Authenticator, Authy…).
          </p>
          <form onSubmit={(event) => void handleTwoFactor(event)} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              pattern="\d{6}"
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand-500 focus:outline-none"
            />
            <ErrorMessage message={error} />
            <button
              type="submit"
              disabled={submitting || twoFactorCode.length !== 6}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Vérification…' : 'Vérifier et me connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">Heureux de vous revoir 👋</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          ou avec votre adresse email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={(event) => void handleLogin(event)} className="space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@exemple.fr"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-brand-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Se souvenir de moi (90 jours)
          </label>
          <ErrorMessage message={error} />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="font-semibold text-brand-600 hover:underline">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}
