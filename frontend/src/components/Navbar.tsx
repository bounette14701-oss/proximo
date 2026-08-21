'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Conversation } from '@/lib/types';
import { useAuth } from './AuthProvider';

/**
 * Barre de navigation : liens principaux, badge de messages non lus,
 * menu de session (connexion / inscription / profil / déconnexion).
 */
export function Navbar() {
  const { user, loading, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  // Badge de messages non lus (mis à jour à la navigation).
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    api<{ conversations: Conversation[] }>('/messages')
      .then((data) => {
        if (active) {
          setUnread(data.conversations.reduce((sum, c) => sum + c.unreadCount, 0));
        }
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => {
      active = false;
    };
  }, [user, pathname]);

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span aria-hidden>🤝</span>
          Proximo
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/annonces" className={linkClass('/annonces')}>
            Annonces
          </Link>
          {user && (
            <Link href="/annonces/nouvelle" className={linkClass('/annonces/nouvelle')}>
              + Déposer
            </Link>
          )}
          {user && (
            <Link href="/messages" className={linkClass('/messages')}>
              Messages
              {unread > 0 && (
                <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unread}
                </span>
              )}
            </Link>
          )}
          {user && (
            <Link href="/signalements" className={linkClass('/signalements')}>
              Signalements
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={linkClass('/admin')}>
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Link href="/profil" className={linkClass('/profil')}>
                {user.firstName}
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
