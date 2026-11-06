/**
 * Punto de entrada del esquema de base de datos.
 *
 * Cada dominio tiene su propio fichero; este módulo los reexporta para
 * Drizzle y drizzle-kit. Diagrama: `docs/db/modelo-er.md`.
 */
export * from "./locales";
export * from "./identity";
export * from "./content";
export * from "./game";
export * from "./shop";
export * from "./support";
