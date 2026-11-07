/**
 * `sitemap.xml` con alternativas por idioma (RNF-05).
 *
 * Resuelve F-10: el de la web original pesaba 1,35 MB, tenía páginas
 * internas del CMS, `lastmod` de 2018 y no incluía las URLs en inglés.
 * Aquí:
 * - solo páginas públicas, en los 7 idiomas, cada una con sus
 *   `xhtml:link hreflang` (incluido `x-default`);
 * - las noticias solo en los idiomas a los que están traducidas, con su
 *   fecha de última edición real;
 * - si la base de datos falla, el sitemap se sirve igual con las páginas
 *   fijas (mejor un sitemap parcial que un 500 que el buscador reintenta).
 */
import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/config/locales";
import { SITE_URL } from "@/config/site";
import { listPostsForSitemap } from "@/lib/news";
import { tryLoad } from "@/lib/safe";
import { loadShop } from "@/lib/shop";
import { catalogAt } from "@/lib/shop-catalog";

/** Rutas públicas sin idioma (`""` es la portada). */
const PUBLIC_PATHS = [
  "",
  "/news",
  "/rankings",
  "/shop",
  "/topup",
  "/download",
  "/support",
  "/rules",
  "/terms",
  "/privacy",
  "/cookies",
  "/imprint",
] as const;

function entry(
  path: string,
  locales: readonly Locale[],
  lastModified?: Date,
): MetadataRoute.Sitemap {
  const fallback = locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : locales[0]!;
  const languages = Object.fromEntries([
    ...locales.map((code) => [code, `${SITE_URL}/${code}${path}`]),
    ["x-default", `${SITE_URL}/${fallback}${path}`],
  ]);
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Se genera al pedirlo (lee la base de datos); la consulta está en caché.
  await connection();
  const [posts, shop] = await Promise.all([
    tryLoad("las noticias del sitemap", listPostsForSitemap),
    tryLoad("la tienda del sitemap", () => loadShop(DEFAULT_LOCALE)),
  ]);
  // Los artículos a la venta, en todos los idiomas (el nombre cae al inglés si falta).
  const items = shop.ok ? catalogAt(shop.data, new Date()).items : [];
  return [
    ...PUBLIC_PATHS.flatMap((path) => entry(path, LOCALES)),
    ...(posts.ok
      ? posts.data.flatMap((post) => entry(`/news/${post.slug}`, post.locales, post.updatedAt))
      : []),
    ...items.flatMap((item) => entry(`/shop/item/${item.id}`, LOCALES)),
  ];
}
