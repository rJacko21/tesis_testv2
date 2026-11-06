/**
 * Tres motivos para jugar: tierra, mar y gremios.
 *
 * Los iconos de nivel de tierra y mar son los mismos del juego (se usarán
 * también en los rankings, RF-07). Son decorativos: el título ya lo dice,
 * así que llevan `alt=""` para que el lector de pantalla no lo repita.
 * El juego no tiene icono de gremio, así que ese es un escudo SVG en línea.
 *
 * @see RF-01 Portada.
 */
import Image, { type StaticImageData } from "next/image";

import landIcon from "@/assets/icons/level-land.gif";
import seaIcon from "@/assets/icons/level-sea.gif";
import { Container } from "@/components/ui";
import type { Translate } from "@/i18n/translator";

type FeatureId = "land" | "sea" | "guild";

const FEATURES: readonly { id: FeatureId; icon?: StaticImageData }[] = [
  { id: "land", icon: landIcon },
  { id: "sea", icon: seaIcon },
  { id: "guild" },
];

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="text-gold-300 size-6">
      <path
        fill="currentColor"
        d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5l-8-3Zm0 4.2 1.5 3.1 3.4.5-2.5 2.4.6 3.4L12 14l-3 1.6.6-3.4-2.5-2.4 3.4-.5L12 6.2Z"
      />
    </svg>
  );
}

export function FeatureList({ t }: { t: Translate }) {
  return (
    <section aria-labelledby="features-title" className="py-10 sm:py-14">
      <Container>
        <h2
          id="features-title"
          className="font-display text-navy-900 text-center text-3xl font-bold sm:text-4xl"
        >
          {t("home.features.title")}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ id, icon }) => (
            <li
              key={id}
              className="rounded-panel shadow-panel border-parchment-300 bg-parchment-50 flex gap-4 border p-5"
            >
              <span className="bg-navy-900 grid size-12 shrink-0 place-items-center rounded-full">
                {icon ? (
                  <Image
                    src={icon}
                    alt=""
                    unoptimized
                    className="size-6 [image-rendering:pixelated]"
                  />
                ) : (
                  <ShieldIcon />
                )}
              </span>
              <div>
                <h3 className="font-display text-navy-900 text-xl font-bold">
                  {t(`home.features.${id}.title`)}
                </h3>
                <p className="text-ink-600 mt-1">{t(`home.features.${id}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
