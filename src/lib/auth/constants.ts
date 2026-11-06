/**
 * Nombres de cookies de la sesión, compartidos con la política de cookies
 * (`db/seed/pages.ts`) para que el texto legal no pueda quedarse desfasado.
 */

/** Prefijo de las cookies de Better Auth. */
export const COOKIE_PREFIX = "fl";

/**
 * Cookie de sesión: el token firmado. En HTTPS el navegador la recibe como
 * `__Secure-fl.session_token`. Es necesaria (no requiere consentimiento).
 */
export const SESSION_COOKIE = `${COOKIE_PREFIX}.session_token`;
