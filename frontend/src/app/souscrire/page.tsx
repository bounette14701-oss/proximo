'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorMessage } from '@/components/Feedback';
import api from '@/lib/api';

/**
 * Tunnel de vente : demande de souscription pour une résidence.
 * Le lead est enregistré côté serveur et notifie les administrateurs
 * par email. Aucun paiement en ligne pour l'instant : Alban recontacte
 * le demandeur sous 24 h pour la mise en service (premier mois offert).
 */

const UNIT_COUNTS = [
  { value: 'LESS_THAN_10', label: 'Moins de 10 logements' },
  { value: 'BETWEEN_10_30', label: '10 à 30 logements' },
  { value: 'BETWEEN_30_100', label: '30 à 100 logements' },
  { value: 'MORE_THAN_100', label: 'Plus de 100 logements' },
];

const ROLES = [
  { value: 'HABITANT', label: 'Un habitant' },
  { value: 'CONSEIL_SYNDICAL', label: 'Le conseil syndical' },
  { value: 'SYNDIC', label: 'Le syndic' },
  { value: 'GESTIONNAIRE', label: 'Un gestionnaire / une agence' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none';

export default function SouscrirePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [residenceName, setResidenceName] = useState('');
  const [city, setCity] = useState('');
  const [unitCount, setUnitCount] = useState('BETWEEN_10_30');
  const [requesterRole, setRequesterRole] = useState('CONSEIL_SYNDICAL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/leads', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          residenceName,
          city,
          unitCount,
          requesterRole,
          message: message || undefined,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Demande envoyée !</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Merci {name.split(' ')[0]} : votre demande pour{' '}
            <strong>{residenceName}</strong> ({city}) est bien enregistrée.
            Nous revenons vers vous sous 24 h pour la mise en service.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Revenir à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Souscrire ma résidence</h1>
        <p className="mt-1 text-sm text-slate-600">
          19 €/mois, tout compris · premier mois offert · sans engagement
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Votre nom complet"
            className={inputClass}
          />
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Votre email"
            className={inputClass}
          />
          <input
            type="text"
            required
            minLength={2}
            maxLength={160}
            value={residenceName}
            onChange={(event) => setResidenceName(event.target.value)}
            placeholder="Nom de la résidence (ex. Follement Gerland)"
            className={inputClass}
          />
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="address-level2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ville"
            className={inputClass}
          />
          <select
            value={unitCount}
            onChange={(event) => setUnitCount(event.target.value)}
            className={inputClass}
          >
            {UNIT_COUNTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={requesterRole}
            onChange={(event) => setRequesterRole(event.target.value)}
            className={inputClass}
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                Je suis : {option.label}
              </option>
            ))}
          </select>
          <textarea
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Un détail à nous donner ? (optionnel)"
            className={`${inputClass} resize-none`}
          />

          {error && <ErrorMessage message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Envoi…' : 'Envoyer ma demande'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Réponse sous 24 h ouvrées · vos coordonnées ne servent qu’à vous recontacter
          </p>
        </form>
      </div>
    </div>
  );
}
