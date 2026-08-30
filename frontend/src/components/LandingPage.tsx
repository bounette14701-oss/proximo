import Link from 'next/link';

/**
 * Landing page publique (visiteurs non connectés) :
 * fonctionnement, fonctionnalités, tarifs, FAQ — tunnel vers /souscrire.
 * Positionnement : une initiative des habitants, outil sobre et utile.
 */

const STEPS = [
  {
    icon: '📝',
    title: 'Vous souscrivez',
    text: 'Un formulaire de 2 minutes. Pas d’engagement : premier mois offert.',
  },
  {
    icon: '🚀',
    title: 'On installe pour vous',
    text: 'Résidence en ligne sous 48 h : hébergement, sécurité, mises à jour inclus.',
  },
  {
    icon: '📲',
    title: 'Vos voisins rejoignent',
    text: 'Un QR code à afficher dans les parties communes, et chacun s’inscrit en 1 minute.',
  },
];

const FEATURES = [
  {
    icon: '📦',
    title: 'Annonces entre voisins',
    text: 'Prêt de matériel, service, don, avis aux résidents. Cherchable, avec discussions.',
  },
  {
    icon: '🛠️',
    title: 'Signalements au syndic',
    text: 'Fuite, ascenseur, dégradation : photo, localisation, et alerte automatique au syndic.',
  },
  {
    icon: '💬',
    title: 'Discussions et messagerie',
    text: 'Un fil par annonce et par signalement, plus une messagerie privée entre voisins.',
  },
  {
    icon: '📲',
    title: 'Invitations par QR code',
    text: 'Chaque voisin rejoint en scannant un QR code, sans coordonnées à partager.',
  },
  {
    icon: '🔒',
    title: 'Vie privée protégée',
    text: 'Jamais d’adresse exacte, d’email ou de téléphone exposés aux autres habitants.',
  },
  {
    icon: '🌿',
    title: 'Sobre et fiable',
    text: 'Hébergé en Europe, mises à jour automatiques, support par email sous 24 h.',
  },
];

const FAQ = [
  {
    q: 'Pour qui est Proximo ?',
    a: 'Pour les résidences de 10 à 100 logements : copropriétés, résidences étudiantes, bailleurs sociaux. Un habitant, le conseil syndical ou le syndic peut lancer la souscription.',
  },
  {
    q: 'Combien de temps avant d’être en ligne ?',
    a: 'Comptez 48 h entre la souscription et l’envoi du QR code à afficher. Vous n’avez rien à installer.',
  },
  {
    q: 'Qui héberge et maintient l’application ?',
    a: 'Nous. Hébergement sécurisé, sauvegardes, mises à jour et corrections inclus dans l’abonnement. Vous n’avez aucune technique à gérer.',
  },
  {
    q: 'Quelles sont les données des habitants ?',
    a: 'Adresse exacte, email et téléphone ne sont jamais affichés aux autres habitants. Les données restent en Europe et ne sont jamais revendues.',
  },
  {
    q: 'Peut-on résilier ?',
    a: 'Oui, à tout moment, sans frais. Vous gardez vos données pendant 30 jours après la résiliation, puis elles sont supprimées.',
  },
];

export function LandingPage() {
  return (
    <div className="space-y-16">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-emerald-700 px-6 py-14 text-white shadow-lg sm:px-12">
        <div className="absolute -right-8 -top-8 text-[140px] opacity-15" aria-hidden>
          🏢
        </div>
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-brand-100">Une initiative des habitants</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            La vie de votre résidence, connectée
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-50 sm:text-base">
            Annonces entre voisins, signalements au syndic, invitations par QR code :
            tout ce qui fait vivre votre immeuble, au même endroit. Sans adresse,
            sans téléphone, sans prise de tête.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/souscrire"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow hover:bg-brand-50"
            >
              Souscrire ma résidence
            </Link>
            <a
              href="#fonctionnement"
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Comment ça marche
            </a>
          </div>
          <p className="mt-5 text-xs text-brand-100">
            Premier mois offert · Sans engagement · Résiliable à tout moment
          </p>
        </div>
      </section>

      {/* ─── Fonctionnement ──────────────────────────────────── */}
      <section id="fonctionnement" className="scroll-mt-24">
        <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
          En ligne en 3 étapes
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {step.icon}
                </span>
                <span className="text-xs font-bold text-brand-600">Étape {index + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Fonctionnalités ─────────────────────────────────── */}
      <section id="fonctionnalites" className="scroll-mt-24">
        <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
          Tout ce qu’il faut, rien de superflu
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
            >
              <span className="text-2xl" aria-hidden>
                {feature.icon}
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tarifs ──────────────────────────────────────────── */}
      <section id="tarifs" className="scroll-mt-24">
        <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
          Un tarif simple, tout compris
        </h2>
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative overflow-hidden rounded-3xl border-2 border-brand-600 bg-white shadow-lg">
            <div className="bg-brand-600 px-6 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">
              ⭐ Le plus choisi
            </div>
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-900">Proximo Résidence</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900">19 €</span>
                <span className="text-sm text-slate-500">/ mois</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Soit 190 €/an (2 mois offerts)
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                {[
                  'Installation et mise en ligne sous 48 h',
                  'Hébergement sécurisé et sauvegardes',
                  'Mises à jour et corrections incluses',
                  'Support par email sous 24 h',
                  'Premier mois offert, sans engagement',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/souscrire"
                className="mt-8 block rounded-xl bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white shadow hover:bg-brand-700"
              >
                Souscrire ma résidence
              </Link>
              <p className="mt-3 text-center text-xs text-slate-400">
                Sans engagement · Résiliable à tout moment
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24">
        <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
          Questions fréquentes
        </h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="text-brand-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── CTA final ───────────────────────────────────────── */}
      <section className="rounded-3xl bg-slate-900 px-6 py-12 text-center text-white">
        <h2 className="text-xl font-bold sm:text-2xl">
          Prêt à connecter votre résidence ?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">
          Souscrivez en 2 minutes, on s’occupe de tout. Vos voisins rejoignent
          avec un simple QR code.
        </p>
        <Link
          href="/souscrire"
          className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-400"
        >
          Souscrire ma résidence
        </Link>
      </section>
    </div>
  );
}
