/**
 * Tierra, mar y gremios: los tres ejes del juego.
 *
 * Tierra y mar son dos mitades de un mismo bloque, una en pergamino y otra
 * en azul marino, porque en Florensia son dos progresiones separadas (nivel
 * de tierra y nivel de mar, con su propio ranking). Así la composición dice
 * lo mismo que el texto, en lugar de tres tarjetas iguales intercambiables.
 * El gremio va debajo, en una franja con enlace a los rankings, donde se ve.
 *
 * Los iconos de nivel son los del juego (19 px), ampliados al doble exacto
 * con `image-rendering: pixelated` para que no se emborronen, sobre una
 * placa blanca porque el GIF trae fondo blanco. Son decorativos
 * (`alt=""`): el título ya lo dice.
 *
 * Sin JavaScript de cliente y sin imágenes nuevas.
 *
 * @see RF-01 Portada.
 */
import Image from "next/image";
import Link from "next/link";

import landIcon from "@/assets/icons/level-land.gif";
import seaIcon from "@/assets/icons/level-sea.gif";
import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";

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

export interface FeatureListProps {
  locale: Locale;
  t: Translate;
}

export function FeatureList({ locale, t }: FeatureListProps) {
  return (
    <section aria-labelledby="features-title" className="py-10 sm:py-16">
      <Container>
        <h2
          id="features-title"
          className="font-display text-navy-900 text-3xl font-bold sm:text-4xl"
        >
          {t("home.features.title")}
        </h2>
        <div className="rounded-panel border-navy-900 mt-6 grid overflow-hidden border-2 sm:grid-cols-2">
          <article className="bg-parchment-50 flex flex-col gap-4 p-6 sm:p-10">
            <span className="ring-navy-900/15 w-fit rounded-md bg-white p-1.5 ring-1">
              <Image
                src={landIcon}
                alt=""
                unoptimized
                className="size-[38px] [image-rendering:pixelated]"
              />
            </span>
            <h3 className="font-display text-navy-900 text-2xl font-bold sm:text-3xl">
              {t("home.features.land.title")}
            </h3>
            <p className="text-ink-600 max-w-sm text-lg">{t("home.features.land.body")}</p>
          </article>
          <article className="bg-navy-900 flex flex-col gap-4 p-6 text-white sm:p-10">
            <span className="ring-navy-900/15 w-fit rounded-md bg-white p-1.5 ring-1">
              <Image
                src={seaIcon}
                alt=""
                unoptimized
                className="size-[38px] [image-rendering:pixelated]"
              />
            </span>
            <h3 className="font-display text-gold-300 text-2xl font-bold sm:text-3xl">
              {t("home.features.sea.title")}
            </h3>
            <p className="max-w-sm text-lg text-sky-100">{t("home.features.sea.body")}</p>
          </article>
          <div className="border-navy-900 bg-parchment-100 flex flex-col gap-4 border-t-2 p-6 sm:col-span-2 sm:flex-row sm:items-center sm:px-10">
            <ShieldIcon />
            <div className="flex-1">
              <h3 className="font-display text-navy-900 text-xl font-bold">
                {t("home.features.guild.title")}
              </h3>
              <p className="text-ink-600">{t("home.features.guild.body")}</p>
            </div>
            <Link
              href={`/${locale}/rankings`}
              className="text-navy-700 inline-flex min-h-11 items-center font-bold underline underline-offset-4 hover:no-underline"
            >
              {t("nav.rankings")}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
