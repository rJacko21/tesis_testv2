/**
 * Cálculo de rankings a partir de los personajes.
 *
 * Es una función pura (sin BD) para poder probarla: el script de datos la
 * usa para generar `ranking_snapshots` y la tarea programada de rankings
 * (T-17) usará la misma lógica.
 *
 * @see RF-07 Rankings
 */

/** Lo mínimo de un personaje que hace falta para ordenarlo. */
export interface RankableCharacter {
  id: number;
  classId: number;
  /** Clase base (la propia si ya lo es). Filtrar por «Mercenary» incluye a sus especializaciones. */
  baseClassId: number;
  landLevel: number;
  seaLevel: number;
  experience: number;
}

export type RankingArea = "all" | "land" | "sea";

export interface RankingRow {
  area: RankingArea;
  /** 0 = todas las clases; si no, el id de la clase base. */
  classScope: number;
  rank: number;
  characterId: number;
  score: number;
}

/** Puntuación por área. «all» suma tierra y mar, como el ranking global original. */
export function scoreFor(character: RankableCharacter, area: RankingArea): number {
  if (area === "land") return character.landLevel;
  if (area === "sea") return character.seaLevel;
  return character.landLevel + character.seaLevel;
}

/**
 * Ordena por puntuación descendente; a igualdad, más experiencia primero y,
 * si sigue el empate, el id más bajo (el personaje más antiguo). El orden
 * es total: dos ejecuciones dan siempre el mismo ranking.
 */
function compare(area: RankingArea) {
  return (a: RankableCharacter, b: RankableCharacter) =>
    scoreFor(b, area) - scoreFor(a, area) || b.experience - a.experience || a.id - b.id;
}

/** Genera las filas de ranking de todas las áreas, globales y por clase base. */
export function buildRankings(characters: readonly RankableCharacter[]): RankingRow[] {
  const rows: RankingRow[] = [];
  const baseClasses = [...new Set(characters.map((c) => c.baseClassId))].sort((a, b) => a - b);

  for (const area of ["all", "land", "sea"] as const) {
    for (const classScope of [0, ...baseClasses]) {
      const group =
        classScope === 0 ? [...characters] : characters.filter((c) => c.baseClassId === classScope);
      group.sort(compare(area));
      group.forEach((character, index) => {
        rows.push({
          area,
          classScope,
          rank: index + 1,
          characterId: character.id,
          score: scoreFor(character, area),
        });
      });
    }
  }
  return rows;
}
