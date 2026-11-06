/**
 * Cabecera visual de la portada.
 *
 * Mantiene la línea de la web original (cielo y mar azul marino, dorado en
 * los adornos y un personaje en primer plano), pero sin el carrusel de
 * 1,27 MB que retrasaba el LCP a 4,3 s (F-35, F-39) ni texto dentro de
 * imágenes (F-27):
 * - una sola ilustración recortada (35 KB en WebP, menos en AVIF), con
 *   `fetchPriority="high"` porque es el elemento LCP en móvil;
 * - el fondo es un degradado CSS y la ola es un SVG en línea: 0 peticiones;
 * - el título es un `h1` real; la portada original no tenía (F-42).
 *
 * @see RF-01 Portada.
 */
import Image from "next/image";

import heroArt from "@/assets/characters/hero-noble.webp";
import { ButtonLink, Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";

export interface HeroProps {
  locale: Locale;
  t: Translate;
}

export function Hero({ locale, t }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="from-navy-700 via-navy-900 to-navy-950 relative isolate overflow-hidden bg-linear-to-b text-white"
    >
      {/* Halo de luz detrás del personaje, solo decorativo. */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 right-[-20%] -z-10 size-[28rem] rounded-full bg-sky-300/25 blur-3xl lg:right-[5%] lg:size-[36rem]"
      />
      <Container className="grid gap-2 pt-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8 lg:pt-12">
        <div className="flex flex-col gap-5 pb-4 lg:pb-16">
          <p className="border-gold-500/60 text-gold-300 w-fit rounded-full border px-3 py-1 text-sm font-bold tracking-wide uppercase">
            {t("home.hero.eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="font-display text-gold-300 text-5xl font-extrabold tracking-wide drop-shadow-[0_2px_0_rgb(7_29_51)] sm:text-7xl"
          >
            Florensia
          </h1>
          <p className="max-w-xl text-lg text-sky-100 sm:text-xl">{t("home.tagline")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/${locale}/play-now`} size="lg">
              {t("nav.playNow")}
            </ButtonLink>
            <ButtonLink href={`/${locale}/download`} size="lg" variant="onDark">
              {t("nav.download")}
            </ButtonLink>
          </div>
        </div>
        <Image
          src={heroArt}
          alt={t("home.hero.artAlt")}
          fetchPriority="high"
          loading="eager"
          sizes="(min-width: 1024px) 400px, 176px"
          className="mx-auto h-auto w-44 self-end drop-shadow-[0_10px_24px_rgb(0_0_0/0.45)] sm:w-60 lg:w-[25rem]"
        />
      </Container>
      {/* Ola que une la cabecera con el fondo de pergamino de la página. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="text-parchment-100 absolute bottom-0 left-0 h-10 w-full sm:h-16"
      >
        <path
          fill="currentColor"
          d="M0 48c120-26 240-26 360 0s240 26 360 0 240-26 360 0 240 26 360 0v32H0Z"
        />
      </svg>
    </section>
  );
}
