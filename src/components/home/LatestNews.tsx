/**
 * Últimas noticias en la portada (RF-01, RF-08).
 *
 * La portada es estática y se prerenderiza; esta sección se resuelve al
 * pedir la página (`connection()`) y llega en streaming dentro de
 * `<Suspense>`. Así:
 * - el build no necesita base de datos;
 * - una noticia nueva o programada aparece sin recompilar;
 * - si la base de datos falla, la portada se sirve igual, sin esta sección.
 *
 * Las fechas siempre visibles y los eventos terminados marcados evitan el
 * contenido caducado sin fecha de la web original (F-16, F-17).
 */
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { NewsCard } from "@/components/news/NewsCard";
import { NewsGridSkeleton } from "@/components/news/NewsGridSkeleton";
import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { latestPosts } from "@/lib/news";
import { tryLoad } from "@/lib/safe";

export interface LatestNewsProps {
  locale: Locale;
  t: Translate;
}

export function LatestNews({ locale, t }: LatestNewsProps) {
  return (
    <section aria-labelledby="latest-news-title" className="py-10 sm:py-14">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id="latest-news-title"
            className="font-display text-navy-900 text-3xl font-bold sm:text-4xl"
          >
            {t("news.latest")}
          </h2>
          <Link
            href={`/${locale}/news`}
            className="text-navy-700 inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:no-underline"
          >
            {t("news.viewAll")}
          </Link>
        </div>
        <Suspense fallback={<NewsGridSkeleton />}>
          <LatestNewsList locale={locale} t={t} />
        </Suspense>
      </Container>
    </section>
  );
}

async function LatestNewsList({ locale, t }: LatestNewsProps) {
  await connection();
  const result = await tryLoad("las últimas noticias", () => latestPosts(locale));
  if (!result.ok || result.data.length === 0) {
    return <p className="mt-6">{t(result.ok ? "news.empty" : "news.unavailable")}</p>;
  }
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((post) => (
        <li key={post.slug}>
          <NewsCard post={post} locale={locale} t={t} headingLevel={3} />
        </li>
      ))}
    </ul>
  );
}
