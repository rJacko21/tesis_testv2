/**
 * Reglas de las promociones del panel (RF-01, RF-12), sin base de datos.
 *
 * Las promociones son los banners de la portada. En la web original
 * seguían anunciadas cuando ya habían caducado y no decían hasta cuándo
 * valían (F-16), y sus imágenes no tenían texto alternativo (F-42). Por eso:
 * - **la fecha de fin es obligatoria** y va después del inicio; sin inicio,
 *   empieza ahora;
 * - **el título y el texto alternativo en inglés son obligatorios**: son el
 *   respaldo de los idiomas sin traducir. En otro idioma, el título sin
 *   texto alternativo usa el inglés;
 * - **el destino** es una ruta de esta web (`/shop?cat=…`) o una URL
 *   `https://`. Nada de `javascript:` ni rutas `//otro-sitio` que el
 *   navegador trataría como externas.
 *
 * @see RF-01 · RF-12 · M-38
 */
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/config/locales";

import { type Parsed, parseUtcLocal } from "./post-rules";

export const PROMOTION_LIMITS = { title: 120, alt: 255, targetUrl: 255 } as const;

export interface PromotionInput {
  targetUrl: string;
  startsAt: Date;
  endsAt: Date;
  sortOrder: number;
}

export interface PromotionTexts {
  titles: Partial<Record<Locale, string>>;
  alts: Partial<Record<Locale, string>>;
}

export type PromotionField =
  "targetUrl" | "startsAt" | "endsAt" | "sortOrder" | `${"title" | "alt"}-${Locale}`;
export type PromotionProblem =
  | "targetUrl"
  | "date"
  | "required"
  | "endsBeforeStart"
  | "past"
  | "sortOrder"
  | "title"
  | "alt"
  | "english";

/** Margen para el tiempo que se tarda en rellenar el formulario. */
const NOW_TOLERANCE_MS = 5 * 60 * 1000;

/** ¿Es un destino válido? Ruta interna o URL `https://` bien formada. */
export function isSafeTarget(value: string): boolean {
  if (value.length === 0 || value.length > PROMOTION_LIMITS.targetUrl) return false;
  if (/\s/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".") && !url.username;
  } catch {
    return false;
  }
}

/**
 * Valida una promoción.
 *
 * @param isNew - Al crearla, el inicio no puede quedar en el pasado. Al
 *   editarla sí, porque una promoción en curso conserva su inicio.
 */
export function parsePromotion(
  fields: Record<string, string>,
  isNew: boolean,
  now = new Date(),
): Parsed<PromotionInput & PromotionTexts, PromotionField, PromotionProblem> {
  const problems: Partial<Record<PromotionField, PromotionProblem>> = {};
  const value = (name: string) => (fields[name] ?? "").trim();

  const targetUrl = value("targetUrl");
  if (!isSafeTarget(targetUrl)) problems.targetUrl = "targetUrl";

  const startsText = parseUtcLocal(value("startsAt"));
  const endsAt = parseUtcLocal(value("endsAt"));
  const startsAt = startsText === null ? now : startsText;
  if (startsAt === undefined) problems.startsAt = "date";
  else if (isNew && startsAt.getTime() < now.getTime() - NOW_TOLERANCE_MS)
    problems.startsAt = "past";
  if (endsAt === undefined) problems.endsAt = "date";
  else if (endsAt === null) problems.endsAt = "required";
  else if (startsAt && endsAt <= startsAt) problems.endsAt = "endsBeforeStart";

  const sortText = value("sortOrder") || "0";
  const sortOrder = /^-?\d{1,5}$/.test(sortText) ? Number(sortText) : NaN;
  if (!(sortOrder >= -32768 && sortOrder <= 32767)) problems.sortOrder = "sortOrder";

  const titles: Partial<Record<Locale, string>> = {};
  const alts: Partial<Record<Locale, string>> = {};
  for (const locale of LOCALES) {
    const title = value(`title-${locale}`);
    const alt = value(`alt-${locale}`);
    if (title.length > PROMOTION_LIMITS.title) problems[`title-${locale}`] = "title";
    else if (title) titles[locale] = title;
    if (alt.length > PROMOTION_LIMITS.alt) problems[`alt-${locale}`] = "alt";
    else if (alt) alts[locale] = alt;
  }
  if (!titles[DEFAULT_LOCALE] && !problems[`title-${DEFAULT_LOCALE}`]) {
    problems[`title-${DEFAULT_LOCALE}`] = "english";
  }
  if (!alts[DEFAULT_LOCALE] && !problems[`alt-${DEFAULT_LOCALE}`]) {
    problems[`alt-${DEFAULT_LOCALE}`] = "english";
  }

  if (Object.keys(problems).length) return { ok: false, problems };
  return {
    ok: true,
    value: { targetUrl, startsAt: startsAt!, endsAt: endsAt!, sortOrder, titles, alts },
  };
}

/** Estado de una promoción en un momento. */
export function promotionState(
  row: { startsAt: Date; endsAt: Date },
  now: Date,
): "upcoming" | "running" | "ended" {
  if (row.startsAt > now) return "upcoming";
  return row.endsAt > now ? "running" : "ended";
}
