/**
 * Contenido editorial: noticias, promociones, páginas fijas y medios.
 *
 * Todo texto visible va en una tabla `*_translations` con clave
 * `(entidad, idioma)`. Así, que falte una traducción es una consulta sencilla
 * (no un campo vacío escondido), y el panel puede avisar de ello. En la web
 * original había traducciones a medias, como el banner turco de cookies
 * con "Cookies Text Ok" (F-03).
 *
 * Las promociones tienen fecha de fin obligatoria: la web original mostraba
 * promociones caducadas sin fecha (F-16) y noticias sin fecha (F-17).
 *
 * @see RF-01 Portada · RF-08 Noticias · RF-11 Legales · 04-arquitectura §4
 */
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, localeCode, timestamps } from "./_columns";
import { users } from "./identity";
import { locales } from "./locales";

/** Imagen subida desde el panel. El fichero vive fuera de la BD (almacenamiento de objetos). */
export const media = mysqlTable("media", {
  id: id(),
  /** Ruta relativa en el almacenamiento (`news/2026/halloween.avif`). */
  path: varchar("path", { length: 255 }).notNull().unique(),
  /** Ancho y alto: necesarios para reservar espacio y evitar CLS (F-42). */
  width: smallint("width", { unsigned: true }).notNull(),
  height: smallint("height", { unsigned: true }).notNull(),
  ...timestamps,
});

/** Texto alternativo de cada imagen en cada idioma (F-42: 42 de 43 imágenes sin `alt`). */
export const mediaTranslations = mysqlTable(
  "media_translations",
  {
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    alt: varchar("alt", { length: 255 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.locale] })],
);

export const posts = mysqlTable(
  "posts",
  {
    id: id(),
    /** Igual en todos los idiomas: `/es/post/halloween-2026` ↔ `/de/post/halloween-2026`. */
    slug: varchar("slug", { length: 120 }).notNull(),
    category: mysqlEnum("category", ["news", "event", "update", "maintenance"]).notNull(),
    status: mysqlEnum("status", ["draft", "scheduled", "published"]).notNull().default("draft"),
    publishedAt: dt("published_at"),
    /** Fin de un evento: pasada esta fecha la noticia se marca como terminada. */
    expiresAt: dt("expires_at"),
    authorId: fk("author_id").references(() => users.id, { onDelete: "set null" }),
    coverImageId: fk("cover_image_id").references(() => media.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("posts_slug_uq").on(t.slug),
    // Listado público: publicadas, de la más reciente a la más antigua.
    index("posts_listing_idx").on(t.status, t.publishedAt),
  ],
);

export const postTranslations = mysqlTable(
  "post_translations",
  {
    postId: fk("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    title: varchar("title", { length: 160 }).notNull(),
    excerpt: varchar("excerpt", { length: 300 }).notNull(),
    /** Markdown. Se convierte a HTML en el servidor y se sanea (sin `<script>`). */
    body: text("body").notNull(),
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.locale] })],
);

export const promotions = mysqlTable(
  "promotions",
  {
    id: id(),
    imageId: fk("image_id")
      .notNull()
      .references(() => media.id),
    /** Ruta interna (`/shop/category/…`) o URL externa. */
    targetUrl: varchar("target_url", { length: 255 }).notNull(),
    startsAt: dt("starts_at").notNull(),
    /** Obligatoria (F-16). */
    endsAt: dt("ends_at").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("promotions_active_idx").on(t.startsAt, t.endsAt)],
);

export const promotionTranslations = mysqlTable(
  "promotion_translations",
  {
    promotionId: fk("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    title: varchar("title", { length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.promotionId, t.locale] })],
);

/** Páginas fijas: reglas, aviso legal, privacidad, términos, FAQ. */
export const pages = mysqlTable("pages", {
  id: id(),
  /** `rules`, `privacy`, `terms`, `imprint`, `conduct`, `faq`. */
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  /** Versión del texto legal: el consentimiento guarda qué versión se aceptó. */
  version: int("version", { unsigned: true }).notNull().default(1),
  ...timestamps,
});

export const pageTranslations = mysqlTable(
  "page_translations",
  {
    pageId: fk("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.locale] })],
);
