/**
 * Listado de noticias (RF-08).
 *
 * `/es/news`, `/es/news?category=event` y `/es/news?page=2`.
 *
 * El encabezado es estático y se sirve al instante; la lista depende de la
 * URL (filtro y página) y llega en streaming dentro de `<Suspense>`, con un
 * esqueleto del mismo tamaño para no mover el diseño (CLS).
 *
 * La web original servía `/en/post` como texto plano de un solo párrafo,
 * sin fechas ni paginación (F-14).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { isPostCategory } from "@/components/news/categories";
import { CategoryFilter } from "@/components/news/CategoryFilter";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsGridSkeleton } from "@/components/news/NewsGridSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import { languageAlternates } from "@/config/site";
import type { PostCategory } from "@/db/schema/content";
import { getLocale, getTranslator } from "@/i18n/server";
import { listPosts } from "@/lib/news";
import { tryLoad } from "@/lib/safe";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("news.title"),
    description: t("news.description"),
    alternates: { canonical: `/${locale}/news`, languages: languageAlternates("/news") },
  };
}

export default async function NewsPage({ searchParams }: PageProps<"/[locale]/news">) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <h1 className="font-display text-heading text-4xl font-bold">{t("news.title")}</h1>
        <p className="text-ink-600 mt-2 text-lg">{t("news.intro")}</p>
        <Suspense fallback={<NewsGridSkeleton withFilter />}>
          <NewsResults locale={locale} searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

type SearchParams = PageProps<"/[locale]/news">["searchParams"];

/**
 * Lee y valida los parámetros. Una página o categoría no válida da 404 en
 * lugar de una lista vacía: así no se indexan URLs basura.
 */
function parseQuery(query: Awaited<SearchParams>): { page: number; category?: PostCategory } {
  const { page: rawPage, category } = query;
  if (Array.isArray(rawPage) || Array.isArray(category)) notFound();

  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || String(page) !== (rawPage ?? "1")) notFound();
  if (category !== undefined && !isPostCategory(category)) notFound();

  return { page, category };
}

async function NewsResults({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const { page, category } = parseQuery(await searchParams);
  const [t, loaded] = await Promise.all([
    getTranslator(),
    tryLoad("el listado de noticias", () => listPosts(locale, page, category)),
  ]);
  const result = loaded.ok ? loaded.data : null;
  if (result && page > result.pageCount) notFound();

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return `/${locale}/news${search ? `?${search}` : ""}`;
  };

  return (
    <>
      <div className="mt-6">
        <CategoryFilter locale={locale} current={category} t={t} />
      </div>
      {result === null ? (
        <p role="alert" className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border p-4">
          {t("news.unavailable")}
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-6">{t("news.empty")}</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post, index) => (
              <li key={post.slug}>
                <NewsCard post={post} locale={locale} t={t} priority={index === 0} />
              </li>
            ))}
          </ul>
          <Pagination page={page} pageCount={result.pageCount} hrefFor={hrefFor} t={t} />
        </>
      )}
    </>
  );
}
