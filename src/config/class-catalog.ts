/**
 * Clases jugables de Florensia, sin imágenes.
 *
 * El juego tiene 4 clases base, y cada una elige entre 2 especializaciones
 * al llegar al nivel 40. Los nombres son nombres propios del juego y no se
 * traducen (glosario).
 *
 * Este módulo no importa imágenes, así que también lo pueden usar los
 * scripts de Node (`scripts/seed.ts`). La versión con arte, para la
 * interfaz, está en `classes.ts`.
 *
 * @see RF-01 · RF-07
 */

/** Identificador estable de una clase base (también es clave de traducción). */
export type ClassId = "mercenary" | "explorer" | "noble" | "saint";

export interface ClassCatalogEntry {
  id: ClassId;
  /** Nombre oficial del juego. */
  name: string;
  /** Nombres oficiales de las 2 especializaciones. */
  specializations: readonly [string, string];
}

/** Nivel en que se elige especialización. Es texto por la nota de ICU del glosario. */
export const JOB_CHANGE_LEVEL = "40";

/** Clases en el orden de la web original. */
export const CLASS_CATALOG: readonly ClassCatalogEntry[] = [
  { id: "mercenary", name: "Mercenary", specializations: ["Gladiator", "Guardian Swordsman"] },
  { id: "explorer", name: "Explorer", specializations: ["Excavator", "Sniper"] },
  { id: "noble", name: "Noble", specializations: ["Court Magician", "Magic Knight"] },
  { id: "saint", name: "Saint", specializations: ["Priest", "Shaman"] },
];

/** Código de una especialización a partir de su nombre: «Court Magician» → `court-magician`. */
export function specializationCode(name: string): string {
  return name.toLowerCase().replaceAll(" ", "-");
}
