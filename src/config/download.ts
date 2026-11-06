/**
 * Datos de la descarga del juego (RF-09).
 *
 * Los requisitos son los publicados en la ficha oficial de Steam
 * (app 384030), consultada el 2026-11-06. El juego solo existe para Windows.
 *
 * Los nombres de componentes (procesador, gráfica, DirectX) no se
 * traducen; el sistema operativo y la conexión sí (claves `download.*`).
 *
 * @see RF-09 · https://store.steampowered.com/app/384030/Florensia/
 */

export const STEAM_URL = "https://store.steampowered.com/app/384030/Florensia/";

/**
 * Versión del cliente y enlace al instalador directo. Giiku no los ha
 * facilitado todavía: mientras sean `null`, la página ofrece solo Steam y no
 * inventa un número de versión (ver docs/mejoras/descarga.md).
 */
export const CLIENT_VERSION: string | null = null;
export const INSTALLER_URL: string | null = null;

/** Espacio en disco, en GB (igual en mínimos y recomendados). */
export const STORAGE_GB = 20;

export interface Requirements {
  processor: string;
  /** Memoria RAM en MB. */
  memoryMb: number;
  graphics: string;
  directX: string;
}

export const MINIMUM: Requirements = {
  processor: "Pentium 4 1.3 GHz",
  memoryMb: 512,
  graphics: "NVIDIA GTX 500 / AMD HD 7000",
  directX: "9.0",
};

export const RECOMMENDED: Requirements = {
  processor: "Pentium 4 2.4 GHz",
  memoryMb: 2048,
  graphics: "NVIDIA GTX 600 / AMD HD 8000",
  directX: "9.0",
};
