/**
 * Detalle de una noticia (RF-08).
 *
 * - Fechas de publicación y de actualización y autor siempre visibles (F-17).
 * - Si la noticia no está traducida al idioma de la URL se muestra la
 *   versión inglesa con un aviso, el texto lleva `lang="en"` y la URL
 *   canónica apunta a `/en/…` para que los buscadores no la vean duplicada.
 *   `hreflang` solo enumera los idiomas que de verdad tienen traducción.
 * - El cuerpo es Markdown convertido a elementos de React: nunca HTML crudo
 *   (ver `lib/markdown.tsx`).
 *
 * Ruta bloqueante (`instant = false`): se renderiza entera al pedirla, sin
 * esqueleto. El slug solo se conoce en ese momento y, al no haber una
 * cáscara estática ya enviada, una noticia inexistente responde con un 404
 * real (no un 200 con la página de error, que los buscadores indexarían).
 * La consulta está en caché (`lib/news.ts`), así que el bloqueo es corto.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CATEGORY_TONE } from "@/components/news/categories";
import { NewsCover } from "@/components/news/NewsCover";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, Container } from "@/components/ui";
import { DEFAULT_LOCALE, type Locale } from "@/config/locales";
import { OG_IMAGE } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import type { Translate } from "@/i18n/translator";
import { formatDate, isoDate } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { getPost, type PostDetail } from "@/lib/news";
import { tryLoad } from "@/lib/safe";
import { breadcrumbs, newsArticle } from "@/lib/structured-data";

export const instant = false;

type Props = PageProps<"/[locale]/news/[slug]">;

/** Las ediciones de menos de una hora no cuentan como actualización. */
const UPDATE_THRESHOLD_MS = 60 * 60 * 1000;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const result = await tryLoad("los metadatos de la noticia", () => getPost(locale, slug));
  const post = result.ok ? result.data : null;
  if (!post) return {};

  const path = `/news/${post.slug}`;
  const languages = Object.fromEntries(
    post.availableLocales.map((code) => [code, `/${code}${path}`]),
  );
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    alternates: {
      canonical: `/${post.contentLocale}${path}`,
      languages: { ...languages, "x-default": `/${DEFAULT_LOCALE}${path}` },
    },
    // `openGraph` de la página sustituye entero al del layout: se repite la imagen.
    openGraph: {
      type: "article",
      siteName: "Florensia",
      locale,
      images: [OG_IMAGE],
      publishedTime: isoDate(post.publishedAt),
      modifiedTime: isoDate(post.updatedAt),
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getTranslator()]);
  const result = await tryLoad("la noticia", () => getPost(locale, slug));
  // Si falla la base de datos se avisa, en lugar de responder 404 a una
  // noticia que puede existir.
  if (result.ok && !result.data) notFound();
  const post = result.ok ? result.data : null;

  return (
    <main className="flex-1 py-6 sm:py-10">
      <Container className="max-w-3xl">
        <Link
          href={`/${locale}/news`}
          className="text-navy-700 inline-flex min-h-11 items-center font-bold hover:underline"
        >
          <span aria-hidden="true">←&nbsp;</span>
          {t("news.back")}
        </Link>
        {post ? (
          <PostArticle post={post} locale={locale} t={t} />
        ) : (
          <p role="alert" className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border p-4">
            {t("news.unavailable")}
          </p>
        )}
      </Container>
    </main>
  );
}

function PostArticle({ post, locale, t }: { post: PostDetail; locale: Locale; t: Translate }) {
  const fallback = post.contentLocale !== locale;
  const contentLang = fallback ? post.contentLocale : undefined;
  const updated = post.updatedAt.getTime() - post.publishedAt.getTime() > UPDATE_THRESHOLD_MS;

  return (
    <article className="mt-4">
      <JsonLd
        data={[
          newsArticle({
            url: `/${locale}/news/${post.slug}`,
            headline: post.title,
            description: post.excerpt,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            inLanguage: post.contentLocale,
            author: post.author,
          }),
          breadcrumbs([
            ["Florensia", `/${locale}`],
            [t("news.title"), `/${locale}/news`],
            [post.title, `/${locale}/news/${post.slug}`],
          ]),
        ]}
      />
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={CATEGORY_TONE[post.category]}>{t(`news.categories.${post.category}`)}</Badge>
          {post.expiresAt ? (
            <Badge tone="neutral">
              {t(post.ended ? "news.ended" : "news.endsOn", {
                date: formatDate(locale, post.expiresAt),
              })}
            </Badge>
          ) : null}
        </div>
        <h1
          lang={contentLang}
          className="font-display text-navy-900 text-3xl leading-tight font-bold sm:text-4xl"
        >
          {post.title}
        </h1>
        <p className="text-ink-600 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <time dateTime={isoDate(post.publishedAt)}>
            {t("news.published", { date: formatDate(locale, post.publishedAt) })}
          </time>
          {updated ? (
            <time dateTime={isoDate(post.updatedAt)}>
              {t("news.updated", { date: formatDate(locale, post.updatedAt) })}
            </time>
          ) : null}
          <span>{post.author ? t("news.by", { author: post.author }) : t("news.byStaff")}</span>
        </p>
      </header>

      {fallback ? (
        <aside className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border-l-4 p-4">
          <p className="font-bold">{t("news.englishOnly")}</p>
          <p className="text-ink-600 text-sm">{t("news.englishOnlyBody")}</p>
        </aside>
      ) : null}

      <NewsCover
        category={post.category}
        sizes="(min-width: 768px) 260px, 200px"
        priority
        className="rounded-panel mt-6"
      />

      <div lang={contentLang} className="prose-news mt-6">
        <Markdown source={post.body} externalLabel={t("nav.externalSite")} />
      </div>
    </article>
  );
}
