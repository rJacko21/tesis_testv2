/**
 * Carga los datos de referencia: idiomas, roles, clases, servidores y las
 * páginas fijas (reglas y legales, solo si aún no existen).
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar filas, porque
 * usa `ON DUPLICATE KEY UPDATE`. Es seguro también en producción.
 * Uso: `pnpm db:seed`. Los datos de demo van aparte: `pnpm db:seed:demo`.
 */
import "dotenv/config";

import { readFileSync } from "node:fs";

import { and, eq, like, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from "../src/config/locales";
import {
  characterClasses,
  characterClassTranslations,
  locales,
  pageTranslations,
  pages,
  roles,
  servers,
} from "../src/db/schema";
import { PAGE_SLUGS, PAGE_TEXTS, SAMPLE_MARKERS } from "../src/db/seed/pages";
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

  // Páginas fijas: `INSERT IGNORE` para no pisar nunca un texto editado en el panel.
  // La única excepción son los textos de ejemplo de la primera versión (empiezan
  // por `SAMPLE_MARKERS`): se sustituyen por el texto real o se quitan si ese
  // idioma ya no tiene texto (entonces se ve el inglés con su aviso).
  const isSample = or(...SAMPLE_MARKERS.map((marker) => like(pageTranslations.body, `${marker}%`)));
  for (const slug of PAGE_SLUGS) {
    await db.insert(pages).ignore().values({ slug });
    const [page] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug));
    const texts = PAGE_TEXTS[slug];
    const rows = Object.entries(texts).map(([locale, text]) => ({
      pageId: page!.id,
      locale,
      ...text,
    }));
    await db.insert(pageTranslations).ignore().values(rows);
    for (const row of rows) {
      await db
        .update(pageTranslations)
        .set({ title: row.title, body: row.body })
        .where(
          and(
            eq(pageTranslations.pageId, row.pageId),
            eq(pageTranslations.locale, row.locale),
            isSample,
          ),
        );
    }
    await db
      .delete(pageTranslations)
      .where(
        and(
          eq(pageTranslations.pageId, page!.id),
          notInArray(pageTranslations.locale, Object.keys(texts)),
          isSample,
        ),
      );
  }

  console.log(
    `Referencia cargada: ${LOCALES.length} idiomas, ${ROLE_CODES.length} roles, ` +
      `${SERVER_NAMES.length} servidores, ${seeds.length} clases, ${PAGE_SLUGS.length} páginas.`,
  );
  await connection.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
