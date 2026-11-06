/**
 * Configuración de drizzle-kit (generación y aplicación de migraciones).
 *
 * Las migraciones se generan a partir de `src/db/schema` y se guardan en
 * `drizzle/` para versionarlas junto al código: nunca se modifica la base
 * de datos a mano (ver 02-constitucion, "Datos y backend").
 */
import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (copia .env.example a .env)");

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
