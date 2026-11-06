/**
 * Cliente de base de datos compartido.
 *
 * Usa un pool de conexiones de `mysql2`. En desarrollo, la recarga en
 * caliente de Next.js vuelve a evaluar los módulos; guardar el pool en
 * `globalThis` evita abrir un pool nuevo (y agotar conexiones) en cada
 * recarga.
 *
 * @see ADR-03 MySQL 8.4 · ADR-04 Drizzle ORM
 */
import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/lib/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    uri: env.DATABASE_URL,
    // Pocas conexiones: el plan gratuito de MySQL (ADR-12) limita el total.
    connectionLimit: 10,
    // Las fechas se guardan y leen en UTC (ver `schema/_columns.ts`).
    timezone: "Z",
  });

if (env.NODE_ENV !== "production") globalForDb.mysqlPool = pool;

/** Instancia de Drizzle tipada con todo el esquema. */
export const db = drizzle(pool, { schema, mode: "default" });
