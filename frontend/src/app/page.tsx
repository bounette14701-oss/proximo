import Link from 'next/link';
import { LatestListings } from '@/components/LatestListings';

/**
 * Page d'accueil : présentation + dernières annonces publiées.
 */
export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-14 text-center text-white shadow-lg sm:px-12">
        <h1 className="text-3xl font-bold sm:text-4xl">
          L&apos;entraide, à portée de quartier
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-brand-50">
          Empruntez une perceuse, proposez un coup de main, donnez ce qui vous
          encombre. Proximo met en relation les voisins, sans jamais révéler
          votre adresse exacte.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/annonces"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 shadow hover:bg-brand-50"
          >
            Voir les annonces près de chez moi
          </Link>
          <Link
            href="/annonces/nouvelle"
            className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10"
          >
            + Déposer une annonce
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900">Dernières annonces</h2>
          <Link href="/annonces" className="text-sm font-medium text-brand-600 hover:underline">
            Tout voir →
          </Link>
        </div>
        <LatestListings />
      </section>
    </div>
  );
}
