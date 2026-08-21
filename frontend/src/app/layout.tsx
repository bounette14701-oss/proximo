import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Proximo — Entraide de proximité',
  description:
    "Plateforme open source d'entraide et de partage entre voisins : prêt de matériel, services et dons autour de chez vous.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
            Proximo — plateforme open source d&apos;entraide entre voisins ·{' '}
            <a
              href="https://github.com/bounette14701-oss/proximo"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brand-600"
            >
              Code source sur GitHub
            </a>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
