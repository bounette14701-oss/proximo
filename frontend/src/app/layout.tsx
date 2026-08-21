import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Proximo — La vie de votre résidence',
  description:
    "Plateforme open source de vie de résidence : annonces entre voisins, signalements au syndic, invitations de voisinage. Connectez votre immeuble.",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <footer className="hidden border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 md:block">
            Proximo — la vie de votre résidence, entre voisins ·{' '}
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
