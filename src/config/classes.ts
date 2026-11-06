/**
 * Clases jugables con su arte, para la interfaz.
 *
 * Los nombres y el orden vienen de `class-catalog.ts` (sin imágenes); aquí
 * solo se añade el arte. El rol y la descripción traducidos están en
 * `classes.<id>.*` de los catálogos i18n.
 *
 * El arte lo cede Giiku Games para la tesis (Q4). Se procesa con
 * `scripts/process-character-art.py` y se importa de forma estática para
 * que next/image conozca su tamaño (sin saltos de diseño, CLS 0) y genere
 * AVIF/WebP a cada ancho.
 *
 * @see RF-01 Portada con presentación de las clases.
 */
import type { StaticImageData } from "next/image";

import { CLASS_CATALOG, type ClassId } from "./class-catalog";

import courtMagician from "@/assets/characters/court-magician.webp";
import excavator from "@/assets/characters/excavator.webp";
import explorerArt from "@/assets/characters/explorer.webp";
import gladiator from "@/assets/characters/gladiator.webp";
import guardianSwordsman from "@/assets/characters/guardian-swordsman.webp";
import magicKnight from "@/assets/characters/magic-knight.webp";
import mercenaryArt from "@/assets/characters/mercenary.webp";
import nobleArt from "@/assets/characters/noble.webp";
import priest from "@/assets/characters/priest.webp";
import saintArt from "@/assets/characters/saint.webp";
import shaman from "@/assets/characters/shaman.webp";
import sniper from "@/assets/characters/sniper.webp";
import explorerIcon from "@/assets/icons/explorer.png";
import mercenaryIcon from "@/assets/icons/mercenary.png";
import nobleIcon from "@/assets/icons/noble.png";
import saintIcon from "@/assets/icons/saint.png";

/** Especialización a la que se cambia en el nivel 40. */
export interface Specialization {
  /** Nombre oficial del juego (no se traduce). */
  name: string;
  image: StaticImageData;
}

export interface GameClass {
  id: ClassId;
  /** Nombre oficial del juego (no se traduce). */
  name: string;
  /** Icono de clase del juego (33 × 33 px), el mismo que en los rankings. */
  icon: StaticImageData;
  /** Ilustración principal con fondo transparente. */
  art: StaticImageData;
  specializations: readonly [Specialization, Specialization];
}

export { JOB_CHANGE_LEVEL, type ClassId } from "./class-catalog";

const ART: Record<
  ClassId,
  { icon: StaticImageData; art: StaticImageData; specs: [StaticImageData, StaticImageData] }
> = {
  mercenary: { icon: mercenaryIcon, art: mercenaryArt, specs: [gladiator, guardianSwordsman] },
  explorer: { icon: explorerIcon, art: explorerArt, specs: [excavator, sniper] },
  noble: { icon: nobleIcon, art: nobleArt, specs: [courtMagician, magicKnight] },
  saint: { icon: saintIcon, art: saintArt, specs: [priest, shaman] },
};

/** Clases en el orden de la web original, con su arte. */
export const GAME_CLASSES: readonly GameClass[] = CLASS_CATALOG.map(
  ({ id, name, specializations }) => {
    const art = ART[id];
    return {
      id,
      name,
      icon: art.icon,
      art: art.art,
      specializations: [
        { name: specializations[0], image: art.specs[0] },
        { name: specializations[1], image: art.specs[1] },
      ],
    };
  },
);
