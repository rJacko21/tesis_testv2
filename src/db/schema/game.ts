/**
 * Datos del juego: clases, servidores, gremios, personajes y rankings.
 *
 * Giiku Games no da acceso a sus datos (Q4), así que los personajes son
 * sintéticos (`scripts/seed.ts`), con un volumen parecido al de la web
 * original: unas 905 páginas de 50 filas, unos 45 000 personajes.
 *
 * Los rankings se guardan como «fotos» periódicas (`ranking_snapshots`).
 * Así se calcula la subida o bajada de puesto, que la web original mostraba
 * solo con flechas sin texto (F-20, F-28), y cada página del ranking es una
 * lectura directa por índice, sin calcular posiciones al vuelo.
 *
 * @see RF-07 Rankings · 04-arquitectura §4
 */
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  tinyint,
  uniqueIndex,
  varchar,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, localeCode, timestamps } from "./_columns";
import { users } from "./identity";
import { locales } from "./locales";

/** 4 clases base (`parent_id` nulo) y 8 especializaciones de nivel 40. */
export const characterClasses = mysqlTable("character_classes", {
  id: id(),
  /** `mercenary`, `gladiator`… Coincide con `src/config/classes.ts`. */
  code: varchar("code", { length: 32 }).notNull().unique(),
  /** Nombre oficial, igual en todos los idiomas (glosario). */
  name: varchar("name", { length: 40 }).notNull(),
  parentId: fk("parent_id").references((): AnyMySqlColumn => characterClasses.id),
  /** Nivel en que se puede elegir: 1 en las base, 40 en las especializaciones. */
  requiredLevel: tinyint("required_level", { unsigned: true }).notNull(),
  sortOrder: smallint("sort_order").notNull(),
});

/** Rol y descripción traducidos (el nombre no se traduce). */
export const characterClassTranslations = mysqlTable(
  "character_class_translations",
  {
    classId: fk("class_id")
      .notNull()
      .references(() => characterClasses.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    role: varchar("role", { length: 60 }).notNull(),
    description: varchar("description", { length: 300 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.locale] })],
);

export const servers = mysqlTable("servers", {
  id: id(),
  /** Nombre del servidor de juego (p. ej. «Bergruen»). */
  name: varchar("name", { length: 40 }).notNull().unique(),
  isActive: tinyint("is_active").notNull().default(1),
});

export const guilds = mysqlTable(
  "guilds",
  {
    id: id(),
    serverId: fk("server_id")
      .notNull()
      .references(() => servers.id),
    name: varchar("name", { length: 32 }).notNull(),
  },
  (t) => [uniqueIndex("guilds_server_name_uq").on(t.serverId, t.name)],
);

export const characters = mysqlTable(
  "characters",
  {
    id: id(),
    /** Nulo en personajes sintéticos sin cuenta web asociada. */
    userId: fk("user_id").references(() => users.id, { onDelete: "set null" }),
    serverId: fk("server_id")
      .notNull()
      .references(() => servers.id),
    guildId: fk("guild_id").references(() => guilds.id, { onDelete: "set null" }),
    classId: fk("class_id")
      .notNull()
      .references(() => characterClasses.id),
    name: varchar("name", { length: 24 }).notNull(),
    landLevel: tinyint("land_level", { unsigned: true }).notNull(),
    seaLevel: tinyint("sea_level", { unsigned: true }).notNull(),
    /** Experiencia para desempatar a igual nivel. */
    experience: int("experience", { unsigned: true }).notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("characters_server_name_uq").on(t.serverId, t.name),
    index("characters_user_idx").on(t.userId),
    index("characters_guild_idx").on(t.guildId),
  ],
);

/**
 * Foto del ranking en un momento dado.
 *
 * `area`: `all` (combinado), `land` o `sea`. `class_id` nulo es el ranking de
 * todas las clases. `rank` empieza en 1. El índice principal sirve
 * directamente cada página: `WHERE taken_at = ? AND area = ? AND class_id = ?
 * ORDER BY rank LIMIT 50 OFFSET n`.
 */
export const rankingSnapshots = mysqlTable(
  "ranking_snapshots",
  {
    takenAt: dt("taken_at").notNull(),
    area: mysqlEnum("area", ["all", "land", "sea"]).notNull(),
    /** 0 = todas las clases. No se usa NULL porque forma parte de la clave primaria. */
    classScope: fk("class_scope").notNull(),
    rank: int("rank", { unsigned: true }).notNull(),
    characterId: fk("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    /** Puesto en la foto anterior; nulo si es nuevo en el ranking. */
    previousRank: int("previous_rank", { unsigned: true }),
    /** Valor ordenado (nivel combinado, de tierra o de mar). */
    score: int("score", { unsigned: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.takenAt, t.area, t.classScope, t.rank] }),
    // «Mi posición» (RF-04): buscar un personaje en la última foto.
    index("ranking_character_idx").on(t.characterId, t.takenAt),
  ],
);
