/**
 * Cabecera visual de la portada.
 *
 * Sigue la distribución del rediseño (M-44), que a su vez sigue al launcher
 * oficial: una escena del juego a todo el ancho, oscurecida hacia la
 * izquierda para que el texto se lea, el titular, dos llamadas a la acción
 * y cuatro datos del juego.
 *
 * Rendimiento (la web original tardaba 4,3 s en pintar su carrusel de
 * 1,27 MB, F-35 y F-39):
 * - la escena es una sola imagen (44 KB en WebP, menos en AVIF) con
 *   `fetchPriority="high"`: es el elemento LCP;
 * - el personaje solo se muestra en escritorio y con carga diferida, así
 *   que en móvil ni se descarga;
 * - nada de lo que hay aquí se anima al entrar: animar el LCP lo retrasa;
 * - el título es un `h1` real y no hay texto dentro de imágenes (F-27, F-42).
 *
 * La escena es la pantalla de carga del puerto, del propio cliente del
 * juego (arte de Giiku Games, cedido para la tesis).
 *
 * @see RF-01 Portada · M-44
 */
import Image from "next/image";

import heroArt from "@/assets/characters/hero-noble.webp";
import portScene from "@/assets/scenes/port.webp";
import { ButtonLink, Container } from "@/components/ui";
import { GAME_CLASSES } from "@/config/classes";
import { CLIENT_VERSION } from "@/config/download";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";

export interface HeroProps {
  locale: Locale;
  t: Translate;
}

/** Clases jugables: las 4 base y sus 8 especializaciones. */
const PLAYABLE_CLASSES = GAME_CLASSES.length * 3;

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="text-azure-300 size-5 shrink-0">
      <path
        fill="currentColor"
        d="M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6Zm-1.2 11.9L5.3 10l1.2-1.2 2.3 2.3 4.7-4.7 1.2 1.2-5.9 6Z"
      />
    </svg>
  );
}

export function Hero({ locale, t }: HeroProps) {
  const facts = [
    t("home.hero.facts.free"),
    t("home.hero.facts.dual"),
    t("home.hero.facts.classes", { count: String(PLAYABLE_CLASSES) }),
    t("home.hero.facts.windows"),
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="bg-navy-950 relative isolate overflow-hidden text-white"
    >
      <Image
        src={portScene}
        alt=""
        fill
        fetchPriority="high"
        loading="eager"
        sizes="100vw"
        className="-z-20 object-cover object-[70%_30%]"
      />
      {/* Velo marino: más denso a la izquierda (texto) y abajo (unión con la página). */}
      <div
        aria-hidden="true"
        className="from-navy-950/95 via-navy-950/70 to-navy-950/10 absolute inset-0 -z-10 bg-linear-to-r"
      />
      <div
        aria-hidden="true"
        className="to-navy-950 absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-b from-transparent"
      />
      <Container className="grid gap-6 py-12 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10 lg:py-20">
        <div className="flex max-w-2xl flex-col gap-6">
          <p className="font-display text-gold-300 text-2xl font-bold tracking-widest uppercase sm:text-3xl">
            Florensia
          </p>
          <h1
            id="hero-title"
            className="font-display text-3xl leading-tight font-bold text-balance sm:text-5xl"
          >
            {t("home.hero.title")}
          </h1>
          <p className="text-on-dark max-w-xl text-lg">{t("home.hero.body")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/${locale}/play-now`} size="lg">
              {t("home.hero.playFree")}
            </ButtonLink>
            <ButtonLink href={`/${locale}/download`} size="lg" variant="onDark">
              {CLIENT_VERSION
                ? t("home.hero.downloadClient", { version: CLIENT_VERSION })
                : t("nav.download")}
            </ButtonLink>
          </div>
          <ul className="border-azure-400/25 text-on-dark grid gap-x-6 gap-y-2 border-t pt-5 text-sm font-semibold sm:grid-cols-2">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <Check />
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <Image
          src={heroArt}
          alt={t("home.hero.artAlt")}
          loading="lazy"
          sizes="288px"
          className="hidden h-auto w-72 self-end drop-shadow-[0_10px_24px_rgb(0_0_0/0.55)] lg:block"
        />
      </Container>
    </section>
  );
}
