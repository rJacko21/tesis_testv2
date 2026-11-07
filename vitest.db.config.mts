/**
 * Pruebas contra MySQL de verdad (`pnpm test:db`): transacciones, bloqueos
 * y concurrencia, que con una base de datos simulada no se pueden probar.
 *
 * Necesitan `DATABASE_URL` con el esquema migrado y los datos de demo
 * (`pnpm db:migrate && pnpm db:seed:demo`). En local se leen de `.env`; en
 * CI, del trabajo `base-de-datos`.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // `server-only` falla fuera de Next.js a propósito; aquí no hace falta.
    alias: { "server-only": resolve("tests/db/server-only.ts") },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    // Comparten la base de datos: una prueba detrás de otra.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
