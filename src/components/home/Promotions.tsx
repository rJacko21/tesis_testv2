/**
 * Promociones de la portada (RF-01): los banners en curso, con su fecha de
 * fin a la vista para que nadie vea una oferta caducada como vigente (F-16).
 *
 * Como `LatestNews`, se resuelve al pedir la página y llega en streaming.
 * Va después de las noticias para que, al llegar, no empuje lo que ya se ve
 * en pantalla (CLS). Si no hay ninguna en curso, o la base de datos falla,
 * la sección no aparece.
 *
 * Cada imagen lleva su texto alternativo en el idioma de la página o, si
 * falta, en inglés con `lang="en"` (F-42: la web original no tenía `alt`).
 *
 * @see RF-01 · M-38
 */
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { formatDate, isoDate } from "@/lib/format";
import { activePromotions } from "@/lib/promotions";
import { tryLoad } from "@/lib/safe";

export interface PromotionsProps {
  locale: Locale;
  t: Translate;
}

export function Promotions(props: PromotionsProps) {
  return (
    <Suspense fallback={null}>
      <PromotionList {...props} />
    </Suspense>
  );
}

/** Ruta interna con el idioma delante; una URL externa, tal cual. */
const href = (locale: Locale, target: string) =>
  target.startsWith("/") ? `/${locale}${target}` : target;

async function PromotionList({ locale, t }: PromotionsProps) {
  await connection();
  const result = await tryLoad("las promociones", () => activePromotions(locale));
  if (!result.ok || result.data.length === 0) return null;
  return (
    <section aria-labelledby="promotions-title" className="bg-parchment-50 py-10 sm:py-14">
      <Container>
        <h2
          id="promotions-title"
          className="font-display text-navy-900 text-3xl font-bold sm:text-4xl"
        >
          {t("home.promotions.title")}
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          {result.data.map((promotion) => {
            const external = !promotion.targetUrl.startsWith("/");
            return (
              <li key={promotion.id}>
                <article className="border-parchment-300 relative h-full overflow-hidden rounded-lg border bg-white shadow-sm">
                  <Image
                    src={promotion.src}
                    alt={promotion.alt}
                    lang={promotion.altLocale !== locale ? promotion.altLocale : undefined}
                    width={promotion.width}
                    height={promotion.height}
                    sizes="(min-width: 64rem) 30rem, (min-width: 40rem) 50vw, 100vw"
                    className="h-auto w-full"
                  />
                  <div className="p-4">
                    <h3
                      className="text-navy-900 text-xl font-bold"
                      lang={promotion.titleLocale !== locale ? promotion.titleLocale : undefined}
                    >
                      {/* El enlace cubre toda la tarjeta (::after), con un solo nombre accesible. */}
                      <Link
                        href={href(locale, promotion.targetUrl)}
                        className="after:absolute after:inset-0 hover:underline"
                        rel={external ? "noopener" : undefined}
                      >
                        {promotion.title}
                      </Link>
                    </h3>
                    <p className="text-ink-600 mt-1 text-sm">
                      {t("home.promotions.until")}{" "}
                      <time dateTime={isoDate(promotion.endsAt)}>
                        {formatDate(locale, promotion.endsAt)}
                      </time>
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
