/**
 * Consentimiento de cookies: formato de la cookie y reglas.
 *
 * Lo comparten el banner (navegador), la API que guarda la prueba del
 * consentimiento (servidor) y, en el futuro, el cargador de analítica. Es
 * puro y no depende de React ni de Next.
 *
 * Reglas (RGPD art. 7, directiva ePrivacy, guía del CEPD 05/2020):
 * - Las cookies necesarias (idioma, sesión) no piden permiso.
 * - Las demás están **desactivadas por defecto**; nada se carga antes de
 *   que se acepten. La web original decía «al usar el sitio aceptas las
 *   cookies» mientras cargaba Google Tag Manager (F-31, F-37).
 * - Rechazar cuesta lo mismo que aceptar: un clic, con un botón igual.
 * - Si cambia la política (`CONSENT_VERSION`), se vuelve a preguntar.
 *
 * @see RF-11 · ADR-11
 */

/** Nombre de la cookie con la elección del visitante. */
export const CONSENT_COOKIE = "consent";

/** Versión de la política de cookies. Subirla vuelve a mostrar el banner a todos. */
export const CONSENT_VERSION = 1;

/** Duración de la elección: 6 meses, como recomiendan varias autoridades (CNIL, AEPD). */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

/** Categorías opcionales. Las necesarias no se guardan: siempre están activas. */
export const OPTIONAL_CATEGORIES = ["analytics"] as const;
export type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];

export interface ConsentChoice {
  version: number;
  categories: Record<OptionalCategory, boolean>;
}

/** Elección con todo aceptado o todo rechazado. */
export function uniformChoice(accepted: boolean): ConsentChoice {
  return {
    version: CONSENT_VERSION,
    categories: Object.fromEntries(
      OPTIONAL_CATEGORIES.map((c) => [c, accepted]),
    ) as ConsentChoice["categories"],
  };
}

/** Valor de la cookie: compacto y legible, p. ej. `1.analytics:0`. */
export function serializeConsent(choice: ConsentChoice): string {
  const parts = OPTIONAL_CATEGORIES.map((c) => `${c}:${choice.categories[c] ? 1 : 0}`);
  return `${choice.version}.${parts.join(",")}`;
}

/**
 * Lee la cookie. Devuelve `null` si no existe, está mal formada o es de una
 * versión anterior: en los tres casos hay que preguntar de nuevo.
 */
export function parseConsent(value: string | undefined | null): ConsentChoice | null {
  if (!value) return null;
  const match = /^(\d+)\.(.*)$/.exec(value);
  if (!match || Number(match[1]) !== CONSENT_VERSION) return null;
  const entries = new Map(
    match[2]!.split(",").map((part) => part.split(":") as [string, string | undefined]),
  );
  const categories = {} as ConsentChoice["categories"];
  for (const category of OPTIONAL_CATEGORIES) {
    const flag = entries.get(category);
    if (flag !== "0" && flag !== "1") return null;
    categories[category] = flag === "1";
  }
  return { version: CONSENT_VERSION, categories };
}

/** Busca la cookie de consentimiento en `document.cookie` o en una cabecera `Cookie`. */
export function readConsentFromCookieHeader(header: string): ConsentChoice | null {
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(pair ? decodeURIComponent(pair.slice(CONSENT_COOKIE.length + 1)) : null);
}

/** ¿Se puede usar esta categoría? Sin elección guardada, nunca. */
export function isAllowed(choice: ConsentChoice | null, category: OptionalCategory): boolean {
  return choice?.categories[category] ?? false;
}

/**
 * Script en línea para `<head>`: si ya hay cookie de consentimiento, marca
 * `<html data-consent>` y el CSS oculta el banner antes de pintar (sin
 * parpadeo). Son ~90 bytes y no depende de React. Cuando llegue la CSP
 * (T-25) necesitará su hash o un nonce.
 */
export const CONSENT_HIDE_SCRIPT = `if(/(^|;\\s*)${CONSENT_COOKIE}=/.test(document.cookie))document.documentElement.dataset.consent=""`;
