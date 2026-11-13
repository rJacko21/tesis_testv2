/**
 * Tarjeta de noticia para el listado y la portada.
 *
 * - Es un `<article>` con su título como encabezado y enlace: el lector de
 *   pantalla puede saltar de noticia en noticia por encabezados.
 * - Toda la tarjeta es clicable (pseudo-elemento `after:` del enlace) sin
 *   anidar enlaces ni repetir "Leer más" en cada tarjeta.
 * - La fecha siempre se ve (F-17) y los eventos terminados se marcan (F-16).
 * - Si el texto está en inglés porque falta la traducción, se avisa y se
 *   marca con `lang="en"` para que el lector de pantalla lo pronuncie bien.
 */
import Link from "next/link";

import { Badge } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { formatDate, isoDate } from "@/lib/format";
import type { PostSummary } from "@/lib/news";

import { CATEGORY_TONE } from "./categories";
import { NewsCover } from "./NewsCover";

export interface NewsCardProps {
  post: PostSummary;
  locale: Locale;
  t: Translate;
  /** Nivel del título según la página: `h2` en el listado, `h3` en la portada. */
  headingLevel?: 2 | 3;
  /** Primera tarjeta visible: su portada es el LCP del listado en móvil. */
  priority?: boolean;
}

export function NewsCard({ post, locale, t, headingLevel = 2, priority = false }: NewsCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const fallback = post.contentLocale !== locale;

  return (
    <article className="rim lift rounded-panel shadow-panel focus-within:outline-gold-500 bg-surface relative flex h-full flex-col overflow-hidden focus-within:outline-3 focus-within:outline-offset-2">
      <NewsCover
        category={post.category}
        priority={priority}
        sizes="(min-width: 1024px) 140px, (min-width: 640px) 120px, 160px"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CATEGORY_TONE[post.category]}>{t(`news.categories.${post.category}`)}</Badge>
          {post.ended && post.expiresAt ? (
            <Badge tone="neutral">
              {t("news.ended", { date: formatDate(locale, post.expiresAt) })}
            </Badge>
          ) : null}
          {fallback ? <Badge tone="neutral">{t("news.englishOnly")}</Badge> : null}
        </div>
        <Heading
          className="font-display text-heading text-xl leading-tight font-bold"
          lang={fallback ? post.contentLocale : undefined}
        >
          {/* `focus:outline-none`: el foco se dibuja en toda la tarjeta (focus-within). */}
          <Link
            href={`/${locale}/news/${post.slug}`}
            className="after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {post.title}
          </Link>
        </Heading>
        <p className="text-ink-600 text-sm">
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(locale, post.publishedAt)}</time>
        </p>
        <p className="text-ink-900" lang={fallback ? post.contentLocale : undefined}>
          {post.excerpt}
        </p>
      </div>
    </article>
  );
}
