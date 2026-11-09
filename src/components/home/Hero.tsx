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
 * - el título es un `h1` real; la portada original no tenía (F-42);
 * - sin etiqueta sobre el título: repetía el lema y es un recurso de
 *   plantilla. El nombre del juego es el titular, grande, como un logotipo.
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
      {/*
       * Horizonte al atardecer, solo con CSS (0 peticiones): una luna baja
       * detrás del personaje y una línea dorada donde el cielo toca el mar.
       * Es el único adorno de la página; el resto queda sobrio a propósito.
       */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="from-gold-300/35 via-gold-500/10 absolute top-[18%] right-[6%] size-56 rounded-full bg-radial to-transparent to-70% sm:size-80 lg:right-[12%] lg:size-[30rem]" />
        <div className="from-navy-950/0 to-navy-950 absolute inset-x-0 top-[72%] bottom-0 bg-linear-to-b lg:top-[80%]" />
        <div className="via-gold-300/60 absolute inset-x-0 top-[72%] h-px bg-linear-to-r from-transparent to-transparent lg:top-[80%]" />
      </div>
      <Container className="grid gap-2 pt-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8 lg:pt-14">
        <div className="flex flex-col gap-6 pb-4 lg:pb-24">
          <h1
            id="hero-title"
            className="font-display text-gold-300 text-6xl leading-none font-extrabold tracking-tight drop-shadow-[0_3px_0_rgb(7_29_51)] sm:text-8xl lg:text-9xl"
          >
            Florensia
          </h1>
          <p className="max-w-md text-lg text-sky-100 sm:text-xl">{t("home.tagline")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/${locale}/play-now`} size="lg">
              {t("nav.playNow")}
            </ButtonLink>
            <ButtonLink href={`/${locale}/download`} size="lg" variant="onDark">
              {t("nav.download")}
            </ButtonLink>
          </div>
        </div>
        {/* Por encima de la ola (`z-10`): el personaje sale del mar hacia la página. */}
        <Image
          src={heroArt}
          alt={t("home.hero.artAlt")}
          fetchPriority="high"
          loading="eager"
          sizes="(min-width: 1024px) 400px, 176px"
          className="relative z-10 mx-auto h-auto w-44 self-end drop-shadow-[0_10px_24px_rgb(0_0_0/0.45)] sm:w-60 lg:w-[25rem]"
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
