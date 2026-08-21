/**
 * Noms des cookies HTTP-only utilisés par l'API.
 * Le refresh token est restreint au chemin /api/auth : il n'est envoyé
 * par le navigateur que sur les appels d'authentification.
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_DEFAULT = 900; // 15 minutes
export const REFRESH_TOKEN_TTL_DEFAULT = 2_592_000; // 30 jours
