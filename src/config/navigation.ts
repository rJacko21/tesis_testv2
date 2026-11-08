/**
 * Estructura de la navegación global, la misma que en la web original:
 * Descargar, Tienda, Jugar ahora, Comunidad (Soporte, Reglas, Rankings,
 * Flandria, Liga PvP) e Iniciar sesión (con «Recargar AP» al lado, ver
 * `SessionLinks`).
 *
 * Cambios respecto a la original:
 * - Enlace a Noticias (RF-08, F-14).
 * - Soporte ya no es un `mailto:` (F-23); lleva a la página de soporte (RF-10).
 * - Iniciar sesión y Jugar ahora se quedan en este sitio y en el idioma
 *   actual: en la original saltaban a otro dominio solo en inglés (F-06, F-24).
 * - Los enlaces externos se marcan como tales.
 *
 * Las rutas internas no llevan idioma; la cabecera lo antepone.
 *
 * @see RF-02 Navegación global
 */
import type { MessageKey } from "@/i18n/catalog";

export interface NavLink {
  /** Clave del texto visible. */
  label: MessageKey;
  /** Ruta interna sin idioma (`/shop`) o URL externa completa. */
  href: string;
  external?: boolean;
}

/**
 * Enlaces principales, en el orden de la web original. Noticias es nuevo: en
 * la original el listado `/en/post` no estaba enlazado y llegaba como texto
 * plano (F-14).
 */
export const PRIMARY_LINKS: readonly NavLink[] = [
  { label: "nav.news", href: "/news" },
  { label: "nav.download", href: "/download" },
  { label: "nav.shop", href: "/shop" },
];

/** Submenú Comunidad. */
export const COMMUNITY_LINKS: readonly NavLink[] = [
  { label: "nav.support", href: "/support" },
  { label: "nav.rules", href: "/rules" },
  { label: "nav.rankings", href: "/rankings" },
  { label: "nav.wiki", href: "https://flandria.wiki", external: true },
  { label: "nav.pvpLeague", href: "https://www.flo-league.com", external: true },
];

/** Llamada a la acción principal, destacada en dorado. */
export const PLAY_NOW: NavLink = { label: "nav.playNow", href: "/play-now" };

/** Redes oficiales enlazadas desde la web original (pie). */
export const SOCIAL_LINKS = [
  { name: "Discord", href: "https://discord.gg/Florensia" },
  { name: "Facebook", href: "https://facebook.com/FlorensiaOnline" },
  { name: "Instagram", href: "https://www.instagram.com/florensia_online" },
  { name: "YouTube", href: "https://youtube.com/channel/UCy4sOgy_qWSPt6ClncguvYg" },
  { name: "X (Twitter)", href: "https://twitter.com/florensia" },
  { name: "Steam", href: "https://store.steampowered.com/app/384030/Florensia/" },
] as const;

/** Ruta con idioma para un enlace interno; las externas se devuelven igual. */
export function localizedHref(locale: string, link: NavLink): string {
  return link.external ? link.href : `/${locale}${link.href}`;
}
