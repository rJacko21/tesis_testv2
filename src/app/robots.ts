/**
 * `robots.txt` (RNF-05).
 *
 * El de la web original no tenía reglas efectivas ni línea `Sitemap` (F-10).
 * Aquí se permite todo salvo la API y se declara el sitemap con URL absoluta.
 */
import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
