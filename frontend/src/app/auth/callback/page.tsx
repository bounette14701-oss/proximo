'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Page de retour après connexion Google : rafraîchit la session
 * (cookies posés par le callback) puis redirige.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    void refresh().finally(() => {
      router.replace('/');
    });
  }, [refresh, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
      Connexion Google en cours…
    </div>
  );
}
