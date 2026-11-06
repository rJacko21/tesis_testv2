/**
 * Carga los datos base imprescindibles (por ahora, los idiomas).
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar filas, porque
 * usa `ON DUPLICATE KEY UPDATE`. Uso: `pnpm db:seed`.
 */
import "dotenv/config";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from "../src/config/locales";
import { locales } from "../src/db/schema";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (copia .env.example a .env)");

  const connection = await mysql.createConnection(url);
  const db = drizzle(connection);

  await db
    .insert(locales)
    .values(
      LOCALES.map((code, index) => ({
        code,
        name: LOCALE_NAMES[code],
        sortOrder: index,
        isDefault: code === DEFAULT_LOCALE,
      })),
    )
    .onDuplicateKeyUpdate({
      set: {
        name: sql`values(${locales.name})`,
        sortOrder: sql`values(${locales.sortOrder})`,
        isDefault: sql`values(${locales.isDefault})`,
      },
    });

  console.log(`Idiomas cargados: ${LOCALES.join(", ")}`);
  await connection.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
