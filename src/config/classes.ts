/**
 * Clases jugables de Florensia y su arte.
 *
 * El juego tiene 4 clases base y cada una elige entre 2 especializaciones
 * al llegar al nivel 40 (auditoría, sección de clases de la portada). Los
 * nombres de clase son nombres propios del juego y no se traducen
 * (glosario); el rol y la descripción sí, en `classes.<id>.*` de los
 * catálogos.
 *
 * El arte lo cede Giiku Games para la tesis (Q4). Se procesa con
 * `scripts/process-character-art.py` y se importa de forma estática para
 * que next/image conozca su tamaño (sin saltos de diseño, CLS 0) y genere
 * AVIF/WebP a cada ancho.
 *
 * @see RF-01 Portada con presentación de las clases.
 */
import type { StaticImageData } from "next/image";

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

/** Identificador estable de una clase base (también clave de traducción). */
export type ClassId = "mercenary" | "explorer" | "noble" | "saint";

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

/** Nivel en el que se elige especialización. Texto: ver la nota de ICU en el glosario. */
export const JOB_CHANGE_LEVEL = "40";

/** Clases en el orden de la web original. */
export const GAME_CLASSES: readonly GameClass[] = [
  {
    id: "mercenary",
    name: "Mercenary",
    icon: mercenaryIcon,
    art: mercenaryArt,
    specializations: [
      { name: "Gladiator", image: gladiator },
      { name: "Guardian Swordsman", image: guardianSwordsman },
    ],
  },
  {
    id: "explorer",
    name: "Explorer",
    icon: explorerIcon,
    art: explorerArt,
    specializations: [
      { name: "Excavator", image: excavator },
      { name: "Sniper", image: sniper },
    ],
  },
  {
    id: "noble",
    name: "Noble",
    icon: nobleIcon,
    art: nobleArt,
    specializations: [
      { name: "Court Magician", image: courtMagician },
      { name: "Magic Knight", image: magicKnight },
    ],
  },
  {
    id: "saint",
    name: "Saint",
    icon: saintIcon,
    art: saintArt,
    specializations: [
      { name: "Priest", image: priest },
      { name: "Shaman", image: shaman },
    ],
  },
];
