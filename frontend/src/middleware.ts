import { NextRequest, NextResponse } from 'next/server';

/**
 * Installation initiale : tant qu'aucun administrateur n'existe
 * (GET /api/setup/status → required: true), toutes les pages publiques
 * redirigent vers /install. Une fois l'installation terminée, plus aucun
 * impact (le check ne coûte qu'une requête HTTP interne).
 */
const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://backend:3001/api';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes qui doivent rester accessibles pendant l'installation.
  if (
    pathname === '/install' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch(`${API_INTERNAL}/setup/status`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = (await response.json()) as { required: boolean };
      if (data.required) {
        return NextResponse.redirect(new URL('/install', request.url));
      }
    }
  } catch {
    // Backend injoignable : on laisse passer (l'app affichera ses propres erreurs).
  }

  return NextResponse.next();
}

export const config = {
  // Toutes les routes sauf fichiers statiques (matcher classique Next.js).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
