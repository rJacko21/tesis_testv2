/**
 * Tabla `locales`: idiomas disponibles para el contenido editorial.
 *
 * Las tablas `*_translations` (noticias, artículos de la tienda, clases…)
 * referencian esta tabla, así MySQL impide guardar una traducción en un
 * idioma que el sitio no admite.
 *
 * @see 04-arquitectura §4 Modelo de datos
 */
import { boolean, mysqlTable, smallint, varchar } from "drizzle-orm/mysql-core";

export const locales = mysqlTable("locales", {
  /** Código BCP 47 (`en`, `pt-BR`…). Clave natural: es estable y legible. */
  code: varchar("code", { length: 8 }).primaryKey(),
  /** Nombre del idioma en ese idioma, para el panel de administración. */
  name: varchar("name", { length: 40 }).notNull(),
  /** Orden en el selector. */
  sortOrder: smallint("sort_order").notNull(),
  /** Exactamente una fila tiene `true`: el idioma de respaldo (`x-default`). */
  isDefault: boolean("is_default").notNull().default(false),
});

/** Fila de `locales` tal como se lee de la base de datos. */
export type LocaleRow = typeof locales.$inferSelect;
