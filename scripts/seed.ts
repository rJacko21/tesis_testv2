/**
 * Carga los datos de referencia: idiomas, roles, clases y servidores.
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar filas, porque
 * usa `ON DUPLICATE KEY UPDATE`. Es seguro también en producción.
 * Uso: `pnpm db:seed`. Los datos de demo van aparte: `pnpm db:seed:demo`.
 */
import "dotenv/config";

import { readFileSync } from "node:fs";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from "../src/config/locales";
import {
  characterClasses,
  characterClassTranslations,
  locales,
  roles,
  servers,
} from "../src/db/schema";
import { ROLE_CODES, SERVER_NAMES, classSeeds } from "../src/db/seed/reference";

type ClassTexts = Record<string, { role: string; description: string }>;

/** Rol y descripción de las clases base, leídos de los catálogos i18n. */
function classTexts(locale: string): ClassTexts {
  const file = new URL(`../src/i18n/messages/${locale}.json`, import.meta.url);
  return (JSON.parse(readFileSync(file, "utf8")) as { classes: ClassTexts }).classes;
}

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

  await db
    .insert(roles)
    .values(ROLE_CODES.map((code) => ({ code })))
    .onDuplicateKeyUpdate({ set: { code: sql`values(${roles.code})` } });

  await db
    .insert(servers)
    .values(SERVER_NAMES.map((name) => ({ name })))
    .onDuplicateKeyUpdate({ set: { name: sql`values(${servers.name})` } });

  // Primero las clases base, para conocer su id al insertar las especializaciones.
  const seeds = classSeeds();
  for (const seed of seeds) {
    const [parent] = seed.parentCode
      ? await db
          .select({ id: characterClasses.id })
          .from(characterClasses)
          .where(eq(characterClasses.code, seed.parentCode))
      : [undefined];
    await db
      .insert(characterClasses)
      .values({
        code: seed.code,
        name: seed.name,
        parentId: parent?.id ?? null,
        requiredLevel: seed.requiredLevel,
        sortOrder: seed.sortOrder,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: seed.name,
          parentId: parent?.id ?? null,
          requiredLevel: seed.requiredLevel,
          sortOrder: seed.sortOrder,
        },
      });
  }

  const baseClasses = await db
    .select({ id: characterClasses.id, code: characterClasses.code })
    .from(characterClasses)
    .where(sql`${characterClasses.parentId} is null`);
  for (const locale of LOCALES) {
    const texts = classTexts(locale);
    for (const { id, code } of baseClasses) {
      const text = texts[code];
      if (!text) throw new Error(`Falta classes.${code} en el catálogo ${locale}`);
      await db
        .insert(characterClassTranslations)
        .values({ classId: id, locale, role: text.role, description: text.description })
        .onDuplicateKeyUpdate({ set: { role: text.role, description: text.description } });
    }
  }

  console.log(
    `Referencia cargada: ${LOCALES.length} idiomas, ${ROLE_CODES.length} roles, ` +
      `${SERVER_NAMES.length} servidores, ${seeds.length} clases.`,
  );
  await connection.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
