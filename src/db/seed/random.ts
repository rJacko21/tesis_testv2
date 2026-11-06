/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * Los datos sintéticos deben ser **reproducibles**: con la misma semilla
 * salen los mismos personajes, así las mediciones de rendimiento de la
 * tesis se pueden repetir sobre datos idénticos (ADR-14).
 */
export interface Random {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number;
  /** Un elemento al azar de una lista no vacía. */
  pick<T>(items: readonly T[]): T;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error("pick() con una lista vacía");
      return items[Math.floor(next() * items.length)]!;
    },
  };
}
