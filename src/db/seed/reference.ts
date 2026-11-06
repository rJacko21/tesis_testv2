/**
 * Datos de referencia: los mismos en desarrollo, demo y producción.
 *
 * Las clases salen de `src/config/class-catalog.ts` y sus textos traducidos, de
 * los catálogos i18n. Así la portada y la base de datos no pueden
 * contradecirse.
 */
import { CLASS_CATALOG, JOB_CHANGE_LEVEL, specializationCode } from "../../config/class-catalog";

/** Roles del panel de administración (RF-12). */
export const ROLE_CODES = ["admin", "editor", "support"] as const;

/** Servidores de juego. Nombres inventados: no hay datos reales (Q4). */
export const SERVER_NAMES = ["Aurora", "Tidewind"] as const;

export interface ClassSeed {
  code: string;
  name: string;
  /** Código de la clase base; nulo si es base. */
  parentCode: string | null;
  requiredLevel: number;
  sortOrder: number;
}

/** 4 clases base y 8 especializaciones, en el orden de la portada. */
export function classSeeds(): ClassSeed[] {
  const seeds: ClassSeed[] = [];
  CLASS_CATALOG.forEach((gameClass, index) => {
    seeds.push({
      code: gameClass.id,
      name: gameClass.name,
      parentCode: null,
      requiredLevel: 1,
      sortOrder: index * 10,
    });
    gameClass.specializations.forEach((specialization, specIndex) => {
      seeds.push({
        code: specializationCode(specialization),
        name: specialization,
        parentCode: gameClass.id,
        requiredLevel: Number(JOB_CHANGE_LEVEL),
        sortOrder: index * 10 + specIndex + 1,
      });
    });
  });
  return seeds;
}
