import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Paiement confirmé — Proximo',
  description: 'Votre souscription Proximo est confirmée.',
};

/**
 * Page de confirmation après paiement Stripe.
 * Le provisionnement (création de l'espace + identifiants) est déclenché par
 * le webhook : l'email d'accès arrive sous quelques minutes.
 */
export default function SouscrireSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Paiement confirmé !</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Merci pour votre souscription. Nous créons maintenant l’espace de votre
          résidence : il sera prêt dans quelques minutes.
        </p>
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          📧 Vous recevrez un email avec vos identifiants de connexion et le QR
          code à afficher dans les parties communes.
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
