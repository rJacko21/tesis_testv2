/**
 * Las 4 clases y sus 8 especializaciones, en pestañas (M-44).
 *
 * Como en el rediseño: se elige una clase y se ve su ficha con las dos
 * evoluciones del nivel 40. En la web original eran 24 imágenes (~1,8 MB)
 * cargadas de golpe y sin texto alternativo (F-39, F-42). Aquí:
 *
 * - **Pestañas sin JavaScript.** Cada pestaña es un `radio` nativo y el
 *   panel que le toca se muestra con `:has()` (`globals.css`). Se maneja
 *   con el teclado como cualquier grupo de opciones (flechas) y un lector
 *   de pantalla anuncia «Elige tu clase, grupo, Mercenary, 1 de 4».
 * - **Imágenes.** Las de los paneles ocultos no se descargan hasta que se
 *   abre su pestaña (`loading="lazy"` no pide lo que no se pinta). Cada una
 *   se sirve a su tamaño en pantalla, en AVIF o WebP.
 * - Nombre, rol y descripción son texto real y traducido.
 *
 * @see RF-01 Portada con presentación de las clases · M-44
 */
import Image from "next/image";

import { Badge, Container } from "@/components/ui";
import { GAME_CLASSES, JOB_CHANGE_LEVEL, type ClassId } from "@/config/classes";
import type { Translate } from "@/i18n/translator";

/** Halo con el color de cada clase, detrás de la ilustración (decorativo). */
const GLOW: Record<ClassId, string> = {
  mercenary: "from-class-mercenary/30",
  explorer: "from-class-explorer/30",
  noble: "from-class-noble/35",
  saint: "from-class-saint/30",
};

const CARD = "rim rounded-panel shadow-panel border-parchment-300 bg-surface relative border";

export function ClassShowcase({ t }: { t: Translate }) {
  return (
    <section
      aria-labelledby="classes-title"
      className="class-tabs bg-parchment-50 border-parchment-300 border-y py-12 sm:py-16"
    >
      <Container>
        <h2 id="classes-title" className="font-display text-heading text-3xl font-bold sm:text-4xl">
          {t("home.classes.title")}
        </h2>
        <p className="text-ink-600 mt-3 max-w-2xl text-lg">
          {t("home.classes.intro", { level: JOB_CHANGE_LEVEL })}
        </p>

        <fieldset className="mt-8">
          <legend className="sr-only">{t("home.classes.title")}</legend>
          <div className="flex flex-wrap gap-2">
            {GAME_CLASSES.map((gameClass, index) => (
              <label
                key={gameClass.id}
                className="border-parchment-300 bg-surface text-heading has-checked:border-azure-500 has-checked:bg-azure-500 has-checked:text-navy-950 has-focus-visible:outline-gold-500 hover:border-strong flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 font-bold transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2"
              >
                <input
                  type="radio"
                  name="class-tab"
                  id={`class-tab-${gameClass.id}`}
                  defaultChecked={index === 0}
                  className="sr-only"
                />
                <Image src={gameClass.icon} alt="" unoptimized className="size-7" />
                {gameClass.name}
              </label>
            ))}
          </div>
        </fieldset>

        {GAME_CLASSES.map((gameClass) => (
          <div
            key={gameClass.id}
            id={`class-panel-${gameClass.id}`}
            className="class-panel mt-6 gap-5 lg:grid-cols-[3fr_2fr_2fr]"
          >
            <article className={`${CARD} grid overflow-hidden sm:grid-cols-[auto_1fr]`}>
              <div
                className={`flex h-64 items-end justify-center bg-radial-[at_50%_70%] to-transparent to-70% px-6 pt-4 sm:h-80 ${GLOW[gameClass.id]}`}
              >
                <Image
                  src={gameClass.art}
                  alt={t("home.classes.artAlt", { name: gameClass.name })}
                  sizes="(min-width: 640px) 224px, 192px"
                  className="h-full w-auto object-contain"
                />
              </div>
              <div className="flex flex-col gap-3 p-6">
                <p className="text-gold-700 text-xs font-bold tracking-widest uppercase">
                  {t("home.classes.base")}
                </p>
                <h3 className="font-display text-heading text-3xl font-bold">{gameClass.name}</h3>
                <Badge tone="info" className="w-fit">
                  {t(`classes.${gameClass.id}.role`)}
                </Badge>
                <p className="text-ink-600 text-lg">{t(`classes.${gameClass.id}.description`)}</p>
              </div>
            </article>
            {gameClass.specializations.map((specialization) => (
              <article
                key={specialization.name}
                className={`${CARD} flex items-center gap-4 p-4 lg:flex-col lg:justify-end lg:p-6 lg:text-center`}
              >
                <Image
                  src={specialization.image}
                  alt=""
                  sizes="(min-width: 1024px) 160px, 96px"
                  className="h-32 w-auto object-contain lg:h-52"
                />
                <div>
                  <p className="text-gold-700 text-xs font-bold tracking-widest uppercase">
                    {t("home.classes.evolution", { level: JOB_CHANGE_LEVEL })}
                  </p>
                  <h4 className="font-display text-heading mt-1 text-xl font-bold">
                    {specialization.name}
                  </h4>
                </div>
              </article>
            ))}
          </div>
        ))}
      </Container>
    </section>
  );
}
