/**
 * Detección del sistema operativo del visitante para la página de descarga
 * (RF-09).
 *
 * Se hace en el servidor con las cabeceras de la petición, así no se envía
 * JavaScript al navegador:
 * - `Sec-CH-UA-Platform` (Client Hints): la mandan por defecto los
 *   navegadores Chromium y es fiable (`"Windows"`, `"macOS"`…).
 * - `User-Agent` como respaldo para Firefox y Safari.
 *
 * Es solo una sugerencia: la página siempre muestra todas las opciones.
 */

export type Platform = "windows" | "mac" | "linux" | "android" | "ios" | "unknown";

const CLIENT_HINTS: Readonly<Record<string, Platform>> = {
  windows: "windows",
  macos: "mac",
  linux: "linux",
  "chrome os": "linux",
  chromeos: "linux",
  android: "android",
  ios: "ios",
};

/**
 * @param userAgent - Cabecera `User-Agent`.
 * @param clientHint - Cabecera `Sec-CH-UA-Platform`, con o sin comillas.
 */
export function detectPlatform(userAgent: string | null, clientHint?: string | null): Platform {
  const hint = clientHint?.replace(/"/g, "").trim().toLowerCase();
  if (hint && CLIENT_HINTS[hint]) return CLIENT_HINTS[hint];

  const ua = userAgent ?? "";
  // El orden importa: Android incluye "Linux" e iPadOS puede decir "Macintosh".
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/windows/i.test(ua)) return "windows";
  if (/macintosh|mac os x/i.test(ua)) return "mac";
  if (/linux|cros/i.test(ua)) return "linux";
  return "unknown";
}
