/**
 * Presentación de las 4 clases y sus 8 especializaciones.
 *
 * En la web original eran 24 imágenes (~1,8 MB) cargadas de golpe y sin
 * texto alternativo (F-39, F-42). Aquí:
 * - cada imagen se pide a su tamaño en pantalla, en AVIF/WebP y con carga
 *   diferida (está bajo el pliegue). Los `sizes` son ajustados a propósito:
 *   con `80px` las miniaturas se servían a 256 px (14 KB); con `64px`, a
 *   128 px. Menos bytes compitiendo con la imagen LCP;
 * - nombre, rol y descripción son texto real y traducido, no texto
 *   incrustado en la imagen, así que se leen, se traducen y se indexan;
 * - las tarjetas son una lista (`ul`), y un lector de pantalla anuncia
 *   "lista, 4 elementos".
 *
 * Sin JavaScript de cliente: todo se renderiza en el servidor.
 *
 * @see RF-01 Portada con presentación de las clases.
 */
import Image from "next/image";

import { Badge, Container } from "@/components/ui";
import { GAME_CLASSES, JOB_CHANGE_LEVEL, type ClassId } from "@/config/classes";
import type { Translate } from "@/i18n/translator";

/** Borde superior y halo con el color de cada clase (decorativos). */
const ACCENTS: Record<ClassId, { border: string; glow: string }> = {
  mercenary: { border: "border-t-class-mercenary", glow: "from-class-mercenary/25" },
  explorer: { border: "border-t-class-explorer", glow: "from-class-explorer/30" },
  noble: { border: "border-t-class-noble", glow: "from-class-noble/30" },
  saint: { border: "border-t-class-saint", glow: "from-class-saint/25" },
};

export function ClassShowcase({ t }: { t: Translate }) {
  return (
    <section
      aria-labelledby="classes-title"
      className="bg-parchment-50 border-parchment-300 border-y py-10 sm:py-14"
    >
      <Container>
        <h2
          id="classes-title"
          className="font-display text-navy-900 text-3xl font-bold sm:text-4xl"
        >
          {t("home.classes.title")}
        </h2>
        <p className="text-ink-600 mt-3 max-w-2xl text-lg">
          {t("home.classes.intro", { level: JOB_CHANGE_LEVEL })}
        </p>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {GAME_CLASSES.map((gameClass) => {
            const accent = ACCENTS[gameClass.id];
            return (
              <li
                key={gameClass.id}
                className={`rounded-panel shadow-panel flex flex-col overflow-hidden border-t-4 bg-white ${accent.border}`}
              >
                <div
                  className={`relative flex h-60 items-end justify-center bg-radial-[at_50%_70%] to-transparent to-70% pt-4 sm:h-72 ${accent.glow}`}
                >
                  <Image
                    src={gameClass.art}
                    alt={t("home.classes.artAlt", { name: gameClass.name })}
                    sizes="(min-width: 640px) 192px, 160px"
                    className="h-full w-auto object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-navy-900 flex items-center gap-2 text-2xl font-bold">
                    <Image src={gameClass.icon} alt="" unoptimized className="size-8" />
                    {gameClass.name}
                  </h3>
                  <Badge tone="info" className="w-fit">
                    {t(`classes.${gameClass.id}.role`)}
                  </Badge>
                  <p className="text-ink-600">{t(`classes.${gameClass.id}.description`)}</p>

                  <div className="border-parchment-300 mt-auto border-t pt-4">
                    <h4 className="text-ink-600 text-sm font-bold">
                      {t("home.classes.specializations", { level: JOB_CHANGE_LEVEL })}
                    </h4>
                    <ul className="mt-3 grid grid-cols-2 gap-3">
                      {gameClass.specializations.map((specialization) => (
                        <li key={specialization.name}>
                          <figure className="flex flex-col items-center gap-2 rounded-lg bg-sky-100 p-2">
                            <Image
                              src={specialization.image}
                              alt=""
                              sizes="64px"
                              className="h-28 w-auto object-contain"
                            />
                            <figcaption className="text-navy-900 flex min-h-10 items-center text-center text-sm font-bold">
                              {specialization.name}
                            </figcaption>
                          </figure>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
