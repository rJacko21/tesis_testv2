/**
 * Pie del sitio con los enlaces legales traducidos.
 *
 * En la web original, el pie de TR y PT seguía en inglés (F-02). Aquí todo
 * texto sale del catálogo del idioma. Las páginas legales se crean en T-14.
 */
import Link from "next/link";

import { getLocale, getTranslator } from "@/i18n/server";

/** Enlaces legales: clave de traducción y ruta (sin idioma). */
const LEGAL_LINKS = [
  { key: "footer.imprint", path: "/imprint" },
  { key: "footer.terms", path: "/terms" },
  { key: "footer.conduct", path: "/rules" },
  { key: "footer.privacy", path: "/privacy" },
] as const;

/**
 * Año para el copyright. Con `"use cache"` se calcula al pre-renderizar y se
 * guarda, en vez de en cada visita: el pie sigue siendo HTML estático y el
 * año se actualiza en el siguiente despliegue o revalidación.
 */
async function getCopyrightYear(): Promise<string> {
  "use cache";
  return String(new Date().getFullYear());
}

export async function SiteFooter() {
  const [locale, t, year] = await Promise.all([getLocale(), getTranslator(), getCopyrightYear()]);

  return (
    <footer className="bg-navy-900 mt-auto text-sm text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("footer.copyright", { year })}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_LINKS.map(({ key, path }) => (
            <li key={path}>
              <Link
                href={`/${locale}${path}`}
                className="inline-block py-2 underline-offset-4 hover:underline"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
