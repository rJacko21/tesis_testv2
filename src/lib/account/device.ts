/**
 * Describe el dispositivo de una sesión a partir de su `User-Agent`, para
 * la lista de sesiones abiertas (RF-04): «Chrome · Android».
 *
 * Solo distingue los navegadores y sistemas habituales. No intenta ser
 * exacto: sirve para que el jugador reconozca sus dispositivos y detecte
 * uno que no es suyo. Los nombres son marcas y no se traducen.
 */

export interface Device {
  browser: string | null;
  os: string | null;
}

// El orden importa: Edge y Opera también dicen «Chrome», y Chrome dice «Safari».
const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

const first = (list: [RegExp, string][], ua: string) =>
  list.find(([pattern]) => pattern.test(ua))?.[1] ?? null;

/** Navegador y sistema de un `User-Agent`; `null` en lo que no se reconoce. */
export function describeDevice(userAgent: string | null | undefined): Device {
  if (!userAgent) return { browser: null, os: null };
  return { browser: first(BROWSERS, userAgent), os: first(SYSTEMS, userAgent) };
}
