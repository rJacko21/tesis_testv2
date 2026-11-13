/**
 * Página fija (reglas o legal) con índice, fecha de vigencia y versión.
 *
 * - **Índice:** enlaces a cada `h2` (RF-10: "página HTML completa, con
 *   índice y fecha de vigencia"). En la web original `/en/rules` llegaba
 *   como texto plano, sin cabecera ni pie (F-14).
 * - **Respaldo en inglés** con aviso y `lang="en"`, como las noticias.
 * - Si la base de datos falla, se avisa en lugar de romper la página.
 *
 * Las rutas (`/imprint`, `/terms`, `/rules`, `/privacy`, `/cookies`) son
 * ficheros de una línea que llaman a {@link renderStaticPage}.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Container } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES } from "@/config/locales";
import type { PageSlug } from "@/db/seed/pages";
import { getLocale, getTranslator } from "@/i18n/server";
import { formatDate, isoDate } from "@/lib/format";
import { Markdown, tableOfContents } from "@/lib/markdown";
import { getStaticPage } from "@/lib/pages";
import { tryLoad } from "@/lib/safe";

/** Metadatos de una página fija: título del texto y `hreflang` de los 7 idiomas. */
export async function staticPageMetadata(slug: PageSlug): Promise<Metadata> {
  await connection();
  const locale = await getLocale();
  const result = await tryLoad("los metadatos de la página", () => getStaticPage(locale, slug));
  const page = result.ok ? result.data : null;
  const path = `/${slug}`;
  return {
    title: page?.title,
    alternates: {
      // Sin traducción, la canónica es la inglesa (igual que en noticias).
      canonical: `/${page?.contentLocale ?? locale}${path}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((code) => [code, `/${code}${path}`])),
        "x-default": `/${DEFAULT_LOCALE}${path}`,
      },
    },
  };
}

export async function renderStaticPage(slug: PageSlug) {
  // El texto vive en la base de datos: se lee al pedir la página, no en el build.
  await connection();
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const result = await tryLoad("la página fija", () => getStaticPage(locale, slug));
  if (result.ok && !result.data) notFound();

  if (!result.ok || !result.data) {
    return (
      <main className="flex-1 py-8">
        <Container className="max-w-3xl">
          <p role="alert" className="bg-parchment-50 border-gold-500 rounded-lg border p-4">
            {t("legal.unavailable")}
          </p>
        </Container>
      </main>
    );
  }

  const page = result.data;
  const fallback = page.contentLocale !== locale;
  const lang = fallback ? page.contentLocale : undefined;
  const toc = tableOfContents(page.body);

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container className="max-w-3xl">
        <header className="flex flex-col gap-2">
          <h1 lang={lang} className="font-display text-heading text-4xl font-bold">
            {page.title}
          </h1>
          <p className="text-ink-600 text-sm">
            <time dateTime={isoDate(page.updatedAt)}>
              {t("legal.effective", {
                date: formatDate(locale, page.updatedAt),
                version: String(page.version),
              })}
            </time>
          </p>
        </header>

        {fallback ? (
          <aside className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border-l-4 p-4">
            <p className="font-bold">{t("legal.englishOnly")}</p>
            <p className="text-ink-600 text-sm">{t("legal.englishOnlyBody")}</p>
          </aside>
        ) : null}

        {toc.length > 1 ? (
          <nav
            aria-labelledby="toc-title"
            className="rounded-panel shadow-panel bg-surface mt-6 p-4"
          >
            <h2 id="toc-title" className="font-display text-heading text-lg font-bold">
              {t("legal.toc")}
            </h2>
            <ol lang={lang} className="mt-2 list-decimal pl-6">
              {toc.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="text-link inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline sm:min-h-8"
                  >
                    {entry.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div lang={lang} className="prose-news mt-8">
          <Markdown source={page.body} externalLabel={t("nav.externalSite")} headingIds />
        </div>
      </Container>
    </main>
  );
}
