/**
 * Catálogos de mensajes de interfaz y su tipo.
 *
 * El inglés es el idioma de origen: su fichero define qué claves existen.
 * El resto de idiomas deben tener exactamente las mismas claves, lo que
 * comprueba `pnpm i18n:check` en CI (falta de clave = build fallido, P4).
 *
 * El contenido editorial (noticias, artículos de la tienda…) no vive aquí,
 * sino en las tablas `*_translations` de MySQL.
 *
 * @see RNF-04 · ADR-06 · ADR-13
 */
import type { Locale } from "@/config/locales";

import type en from "./messages/en.json";

/** Estructura de un catálogo (la del inglés). */
export type Messages = typeof en;

/**
 * Rutas con puntos hasta cada texto de un objeto anidado:
 * `{ a: { b: "…", c: { d: "…" } } }` da `"a.b" | "a.c.d"`.
 */
type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

/**
 * Todas las rutas de clave válidas, en notación con puntos (`"nav.shop"`,
 * `"classes.noble.role"`). Así, una clave mal escrita es un error de
 * TypeScript y no un texto vacío.
 */
export type MessageKey = LeafPaths<Messages>;

/**
 * Carga diferida de cada catálogo: solo se importa el del idioma pedido y
 * nunca se envía al navegador (se usa en Server Components).
 */
export const catalogLoaders: Readonly<Record<Locale, () => Promise<Messages>>> = {
  en: () => import("./messages/en.json").then((m) => m.default),
  "pt-BR": () => import("./messages/pt-BR.json").then((m) => m.default),
  tr: () => import("./messages/tr.json").then((m) => m.default),
  it: () => import("./messages/it.json").then((m) => m.default),
  de: () => import("./messages/de.json").then((m) => m.default),
  fr: () => import("./messages/fr.json").then((m) => m.default),
  es: () => import("./messages/es.json").then((m) => m.default),
};
