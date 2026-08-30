'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorMessage } from '@/components/Feedback';
import api from '@/lib/api';

/**
 * Tunnel de vente : page de souscription avec présentation complète
 * (à quoi ça sert, fonctionnement, preuve) + formulaire.
 * Le lead est enregistré côté serveur et notifie les administrateurs
 * par email. Premier mois offert, Alban recontacte sous 24 h.
 */

const BENEFITS = [
  {
    icon: '🔧',
    title: 'Prêter, donner, dépanner',
    text: 'Votre voisine a besoin d’une perceuse ? Publiez une annonce, elle vous répond en 2 clics. Un meuble à donner ? Il trouve preneur dans l’immeuble, sans passer par les sites de petites annonces.',
  },
  {
    icon: '🛠️',
    title: 'Signaler au syndic',
    text: 'Fuite dans le hall, ascenseur en panne : une photo, la localisation, et le syndic est alerté automatiquement par email avec les pièces jointes. Fini les mots dans l’escalier.',
  },
  {
    icon: '💬',
    title: 'Discuter entre voisins',
    text: 'Chaque annonce et chaque signalement a son fil de discussion. Et une messagerie privée permet d’échanger directement avec un voisin, sans donner son numéro.',
  },
  {
    icon: '📲',
    title: 'Tout le monde rejoint en 1 minute',
    text: 'Un QR code affiché dans le hall suffit : chaque voisin s’inscrit seul, avec son email. Pas de liste de diffusion, pas de paperasse.',
  },
];

const STEPS = [
  { icon: '📝', title: 'Vous remplissez le formulaire', text: '2 minutes, sans engagement. Premier mois offert.' },
  { icon: '🚀', title: 'On met votre résidence en ligne', text: 'Sous 48 h : installation, hébergement, mises à jour, tout est inclus.' },
  { icon: '📲', title: 'Vos voisins rejoignent', text: 'Le QR code est affiché dans les parties communes, chacun s’inscrit en 1 minute.' },
];

const FAQ = [
  {
    q: 'Qui peut souscrire ?',
    a: 'Un habitant, le conseil syndical, le syndic ou un gestionnaire. Le plus simple : un habitant motivé lance la souscription, puis le conseil syndical décide en AG (coût d’environ 11 € par logement et par an pour 20 lots).',
  },
  {
    q: 'Combien de temps avant d’être en ligne ?',
    a: '48 h après la souscription. Vous n’avez rien à installer : on s’occupe de l’hébergement, du nom de domaine et du QR code.',
  },
  {
    q: 'Peut-on résilier ?',
    a: 'Oui, à tout moment, sans frais. Vos données restent disponibles 30 jours, puis sont supprimées.',
  },
];

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
    <div className="space-y-12">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-emerald-700 px-6 py-12 text-white shadow-lg sm:px-10">
        <div className="absolute -right-8 -top-8 text-[120px] opacity-15" aria-hidden>
          🏢
        </div>
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-brand-100">Souscription résidence</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
            La vie de votre résidence, connectée
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-50">
            Annonces entre voisins, signalements au syndic, messagerie privée :
            tout ce qui fait vivre votre immeuble, au même endroit. Sans adresse,
            sans téléphone, sans prise de tête.
          </p>
          <p className="mt-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            19 €/mois · 190 €/an · 1er mois offert · sans engagement
          </p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        {/* ─── Colonne présentation ─────────────────────────── */}
        <div className="space-y-10">
          {/* À quoi ça sert */}
          <section>
            <h2 className="text-lg font-bold text-slate-900">
              À quoi ça sert, concrètement
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="text-2xl" aria-hidden>
                    {benefit.icon}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">{benefit.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{benefit.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Comment ça marche */}
          <section>
            <h2 className="text-lg font-bold text-slate-900">Comment ça marche</h2>
            <div className="mt-5 space-y-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base">
                    {step.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      <span className="mr-1.5 text-brand-600">Étape {index + 1} ·</span>
                      {step.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Preuve + FAQ */}
          <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <p className="text-sm leading-relaxed text-brand-800">
              🌿 Déjà en service dans une résidence du 7e arrondissement de Lyon.
              Une initiative d’habitants, hébergée en Europe, sans publicité ni
              revente de données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Questions fréquentes</h2>
            <div className="mt-4 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {item.q}
                      <span className="text-brand-600 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Formulaire (colonne droite) ──────────────────── */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-slate-900">Souscrire ma résidence</h2>
            <p className="mt-1 text-xs text-slate-500">
              19 €/mois tout compris · 1er mois offert · sans engagement
            </p>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-3.5">
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
                Réponse sous 24 h ouvrées · vos coordonnées ne servent qu’à vous
                recontacter, elles ne sont jamais revendues
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
