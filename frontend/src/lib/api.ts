/**
 * Client API Proximo.
 * - Cookies HTTP-only : aucun token manipulé côté JavaScript.
 * - Rafraîchissement automatique : si une requête échoue en 401,
 *   on tente /auth/refresh une fois puis on rejoue la requête.
 * - Erreurs normalisées en ApiError (message lisible pour l'utilisateur).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  return fallback;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await rawFetch(path, options);

  // Session expirée : tentative de rafraîchissement (une seule fois, hors routes /auth).
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refresh = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refresh.ok) {
      response = await rawFetch(path, options);
    }
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // corps non JSON
    }
    throw new ApiError(
      response.status,
      extractMessage(body, `Erreur ${response.status}`),
    );
  }

  return (await response.json()) as T;
}

export default api;
