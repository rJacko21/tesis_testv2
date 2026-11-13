/**
 * Lo que hace distinto al juego, en una rejilla de tarjetas (M-44).
 *
 * La tarjeta grande es el sistema de combate doble, que es lo propio de
 * Florensia: dos progresiones separadas, nivel de tierra y nivel de mar,
 * cada una con su ranking. Alrededor van tierra, mar, mazmorras y gremios.
 *
 * - Las escenas son pantallas de carga del cliente del juego (arte de Giiku
 *   Games). Están bajo el pliegue: se piden con carga diferida, a su tamaño
 *   en pantalla y en AVIF o WebP.
 * - Los iconos de nivel son los del juego (19 px), ampliados al doble exacto
 *   con `image-rendering: pixelated`, sobre una placa blanca porque el GIF
 *   trae fondo blanco.
 * - Las tarjetas aparecen al entrar en pantalla y se elevan al pasar el
 *   ratón (`reveal` y `lift`, solo CSS).
 *
 * Sin JavaScript de cliente.
 *
 * @see RF-01 Portada · M-44
 */
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import landIcon from "@/assets/icons/level-land.gif";
import seaIcon from "@/assets/icons/level-sea.gif";
import cityScene from "@/assets/scenes/city.webp";
import dungeonScene from "@/assets/scenes/dungeon.webp";
import dragonScene from "@/assets/scenes/sea-dragon.webp";
import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";

/** Marco común de las tarjetas; el fondo lo pone cada una. */
const CARD =
  "rim lift reveal rounded-panel shadow-panel border-parchment-300 relative overflow-hidden border";

function LevelIcon({ src }: { src: StaticImageData }) {
  return (
    <span className="w-fit rounded-md bg-white p-1.5 ring-1 ring-black/10">
      <Image src={src} alt="" unoptimized className="pixel-art size-[38px]" />
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="text-gold-700 size-10 shrink-0">
      <path
        fill="currentColor"
        d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5l-8-3Zm0 4.2 1.5 3.1 3.4.5-2.5 2.4.6 3.4L12 14l-3 1.6.6-3.4-2.5-2.4 3.4-.5L12 6.2Z"
      />
    </svg>
  );
}

/** Tarjeta pequeña con una escena del juego arriba. */
function SceneCard({
  scene,
  title,
  body,
}: {
  scene: StaticImageData;
  title: string;
  body: string;
}) {
  return (
    <article className={`${CARD} bg-surface flex flex-col`}>
      <Image
        src={scene}
        alt=""
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[5/2] w-full object-cover"
      />
      <div className="flex flex-col gap-2 p-5">
        <h3 className="font-display text-heading text-xl font-bold">{title}</h3>
        <p className="text-ink-600">{body}</p>
      </div>
    </article>
  );
}

export interface FeatureListProps {
  locale: Locale;
  t: Translate;
}

export function FeatureList({ locale, t }: FeatureListProps) {
  return (
    <section aria-labelledby="features-title" className="py-12 sm:py-16">
      <Container>
        <h2
          id="features-title"
          className="font-display text-heading text-3xl font-bold sm:text-4xl"
        >
          {t("home.features.title")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article
            className={`${CARD} bg-navy-950 isolate flex min-h-[26rem] flex-col justify-end text-white sm:col-span-2 lg:row-span-2`}
          >
            <Image
              src={dragonScene}
              alt={t("home.features.dual.artAlt")}
              fill
              sizes="(min-width: 1024px) 800px, 100vw"
              className="-z-20 object-cover"
            />
            <div
              aria-hidden="true"
              className="from-navy-950 via-navy-950/85 to-navy-950/10 absolute inset-0 -z-10 bg-linear-to-t via-55%"
            />
            <div className="flex flex-col gap-3 p-6 sm:p-8">
              <div className="flex gap-2">
                <LevelIcon src={landIcon} />
                <LevelIcon src={seaIcon} />
              </div>
              <h3 className="font-display text-gold-300 text-2xl font-bold sm:text-3xl">
                {t("home.features.dual.title")}
              </h3>
              <p className="text-on-dark max-w-2xl text-lg">{t("home.features.dual.body")}</p>
            </div>
          </article>

          <SceneCard
            scene={cityScene}
            title={t("home.features.land.title")}
            body={t("home.features.land.body")}
          />
          <SceneCard
            scene={dungeonScene}
            title={t("home.features.dungeons.title")}
            body={t("home.features.dungeons.body")}
          />

          <article className={`${CARD} bg-navy-900 flex flex-col gap-3 p-6 text-white`}>
            <LevelIcon src={seaIcon} />
            <h3 className="font-display text-gold-300 text-xl font-bold">
              {t("home.features.sea.title")}
            </h3>
            <p className="text-on-dark">{t("home.features.sea.body")}</p>
          </article>

          <article
            className={`${CARD} bg-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center lg:col-span-2`}
          >
            <ShieldIcon />
            <div className="flex-1">
              <h3 className="font-display text-heading text-xl font-bold">
                {t("home.features.guild.title")}
              </h3>
              <p className="text-ink-600">{t("home.features.guild.body")}</p>
            </div>
            <Link
              href={`/${locale}/rankings`}
              className="text-link inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:no-underline"
            >
              {t("nav.rankings")}
            </Link>
          </article>
        </div>
      </Container>
    </section>
  );
}
