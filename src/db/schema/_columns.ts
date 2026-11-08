/**
 * Columnas comunes a todas las tablas (convenciones de 04-arquitectura §4).
 *
 * - Claves `BIGINT UNSIGNED AUTO_INCREMENT`: no se agotan y no son negativas.
 *   En TypeScript se leen como `number`; es seguro hasta 2^53, muy por
 *   encima de cualquier volumen de este proyecto.
 * - Fechas `DATETIME(3)` en UTC con milisegundos. La conexión fija la zona
 *   horaria a UTC (`client.ts`), así el servidor y la base no discrepan.
 * - Importes en enteros (AP, céntimos): nunca coma flotante con dinero.
 */
import { sql } from "drizzle-orm";
import { bigint, customType, datetime, varchar } from "drizzle-orm/mysql-core";

/** Clave primaria numérica autoincremental. */
export const id = () =>
  bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

/** Columna de clave ajena hacia un `id()`. Usar con `.references(...)`. */
export const fk = (name: string) => bigint(name, { mode: "number", unsigned: true });

/** Fecha con milisegundos. */
export const dt = (name: string) => datetime(name, { mode: "date", fsp: 3 });

/** `created_at` y `updated_at` mantenidos por MySQL. */
export const timestamps = {
  createdAt: dt("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: dt("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date()),
};

/** Código de idioma, referencia a `locales.code`. */
export const localeCode = (name = "locale") => varchar(name, { length: 8 });

/**
 * `MEDIUMBLOB` (hasta 16 MB) leído como `Buffer`. Drizzle no trae un tipo
 * BLOB para MySQL; `mysql2` ya devuelve `Buffer` para estas columnas.
 */
export const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "mediumblob",
});
