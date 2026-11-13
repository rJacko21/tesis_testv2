/**
 * Carga datos sintéticos de demo: usuarios, gremios, ~45 000 personajes,
 * dos fotos de ranking, tienda, campañas, noticias, códigos y movimientos de AP.
 *
 * **Borra antes los datos de demo**, así que solo se ejecuta contra una base
 * local (localhost, 127.0.0.1 o el servicio `db` de Docker). La base de Aiven
 * queda reservada para la demo de la tesis y nunca se toca por accidente.
 *
 * Requiere `pnpm db:seed` antes (idiomas, clases, servidores).
 * Uso: `pnpm db:seed:demo`. Es determinista: misma semilla, mismos datos.
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import sharp from "sharp";

import { LOCALES } from "../src/config/locales";
import * as schema from "../src/db/schema";
import { buildDemoPosts } from "../src/db/seed/news";
import { buildRankings } from "../src/db/seed/rankings";
import {
  SHOP_CAMPAIGNS,
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  itemDescription,
} from "../src/db/seed/shop-items";
import {
  DEFAULT_OPTIONS,
  createRandom,
  generateCharacters,
  generateGuilds,
  generateLedgers,
  generateUsers,
} from "../src/db/seed/synthetic";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

/** Tablas que se vacían, de hijas a padres. Las de referencia no se tocan. */
const DEMO_TABLES = [
  "audit_log",
  "consents",
  "ticket_messages",
  "support_tickets",
  "redeem_uses",
  "redeem_codes",
  "payments",
  "topup_packages",
  "ap_ledger",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "item_prices",
  "shop_item_previews",
  "shop_item_translations",
  "shop_items",
  "campaign_translations",
  "campaigns",
  "shop_category_translations",
  "shop_categories",
  "ranking_snapshots",
  "characters",
  "guilds",
  "post_translations",
  "posts",
  "user_roles",
  "login_attempts",
  "rate_limits",
  "verifications",
  "sessions",
  "accounts",
  "users",
] as const;

/** Inserta en lotes para no superar `max_allowed_packet` de MySQL. */
async function insertInBatches<T>(
  rows: readonly T[],
  size: number,
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (copia .env.example a .env)");
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) || process.env.NODE_ENV === "production") {
    throw new Error(
      `db:seed:demo borra datos: solo se permite contra una base local (host actual: ${host}).`,
    );
  }

  const started = Date.now();
  const connection = await mysql.createConnection({ uri: url, timezone: "Z" });
  const db = drizzle(connection, { schema, mode: "default" });
  const random = createRandom(DEFAULT_OPTIONS.seed);

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of DEMO_TABLES) await connection.query(`TRUNCATE TABLE \`${table}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  // Referencia (cargada por db:seed).
  const serverRows = await db.select().from(schema.servers);
  const classRows = await db.select().from(schema.characterClasses);
  if (serverRows.length === 0 || classRows.length === 0)
    throw new Error("Ejecuta antes `pnpm db:seed`.");
  const serverIds = serverRows.map((s) => s.id);
  const classTree = new Map<number, number[]>();
  for (const c of classRows) if (c.parentId === null) classTree.set(c.id, []);
  for (const c of classRows) if (c.parentId !== null) classTree.get(c.parentId)?.push(c.id);

  // Usuarios, gremios y personajes.
  const users = generateUsers(random, DEFAULT_OPTIONS.users, LOCALES);
  const guilds = generateGuilds(random, serverIds, DEFAULT_OPTIONS.guildsPerServer);
  const characters = generateCharacters(
    random,
    { characters: DEFAULT_OPTIONS.characters, classTree },
    users,
    guilds,
    serverIds,
  );

  // Tienda: categorías de dos niveles y los 28 artículos reales (M-45).
  const now = new Date();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
  const categoryIds = new Map<string, number>();
  for (const [slug, names] of Object.entries(SHOP_CATEGORIES)) {
    const [parentSlug, childSlug] = slug.split("-") as [string, string | undefined];
    const [result] = await db.insert(schema.shopCategories).values({
      parentId: childSlug ? (categoryIds.get(parentSlug) ?? null) : null,
      slug: childSlug ?? parentSlug,
      sortOrder: categoryIds.size,
    });
    categoryIds.set(slug, result.insertId);
    await db
      .insert(schema.shopCategoryTranslations)
      .values(
        LOCALES.map((locale) => ({ categoryId: result.insertId, locale, name: names[locale] })),
      );
  }

  // Una campaña ya terminada (no debe verse como vigente, F-16) y las tres
  // de la tienda oficial, en curso.
  const [halloween] = await db
    .insert(schema.campaigns)
    .values({ code: "halloween-2026", startsAt: days(-30), endsAt: days(-5) });
  await db
    .insert(schema.campaignTranslations)
    .values(
      LOCALES.map((locale) => ({ campaignId: halloween.insertId, locale, name: "Halloween" })),
    );
  const campaignIds = new Map<string, number>();
  for (const [code, name] of Object.entries(SHOP_CAMPAIGNS)) {
    const [campaign] = await db
      .insert(schema.campaigns)
      .values({ code, startsAt: days(-2), endsAt: days(25) });
    campaignIds.set(code, campaign.insertId);
    // Los nombres de las campañas son los oficiales y no se traducen.
    await db
      .insert(schema.campaignTranslations)
      .values(LOCALES.map((locale) => ({ campaignId: campaign.insertId, locale, name })));
  }

  // Los iconos se guardan en `media`, como las imágenes del panel (WebP sin
  // pérdida: son 32 × 32 px y cualquier compresión con pérdida los estropea).
  const mediaIds = new Map<string, number>();
  /** Guarda una imagen en `media` (una sola vez) y devuelve su id. */
  const storeImage = async (image: ReturnType<typeof sharp>) => {
    const { data, info } = await image.toBuffer({ resolveWithObject: true });
    const path = `uploads/${createHash("sha256").update(data).digest("hex").slice(0, 32)}.webp`;
    let mediaId = mediaIds.get(path);
    if (mediaId === undefined) {
      // Varias pociones comparten icono, y `media` no se vacía al recargar
      // la demo (guarda también las imágenes subidas desde el panel): la
      // imagen se guarda una sola vez.
      const [existing] = await db
        .select({ id: schema.media.id })
        .from(schema.media)
        .where(eq(schema.media.path, path));
      mediaId =
        existing?.id ??
        (
          await db
            .insert(schema.media)
            .values({ path, width: info.width, height: info.height, mimeType: "image/webp", data })
        )[0].insertId;
      mediaIds.set(path, mediaId);
    }
    return mediaId;
  };

  const seedFile = (name: string) => new URL(`../src/db/seed/${name}`, import.meta.url);
  const prices: number[] = [];
  for (const [index, item] of SHOP_ITEMS.entries()) {
    const imageId = await storeImage(
      sharp(readFileSync(seedFile(`shop-icons/${item.code}.png`))).webp({ lossless: true }),
    );
    const [row] = await db.insert(schema.shopItems).values({
      categoryId: categoryIds.get(item.category)!,
      sku: item.code,
      imageId,
      validityDays: item.validityDays ?? null,
      isLimited: Number(item.limited ?? false),
      isGiftable: Number(item.kind !== "potion"),
      sortOrder: index,
    });
    await db.insert(schema.shopItemTranslations).values(
      LOCALES.map((locale) => ({
        itemId: row.insertId,
        locale,
        name: item.name,
        description: itemDescription(item, locale),
      })),
    );
    // Capturas del juego con el objeto puesto (tienda oficial): hasta dos
    // por cosmético. Ya vienen comprimidas en JPEG; se pasan a WebP de alta
    // calidad para no degradarlas más.
    const previewIds = new Set<number>();
    for (const view of [1, 2]) {
      const file = seedFile(`shop-previews/${item.code}-${view}.jpg`);
      if (!existsSync(file)) continue;
      previewIds.add(await storeImage(sharp(readFileSync(file)).webp({ quality: 92 })));
    }
    if (previewIds.size) {
      await db.insert(schema.shopItemPreviews).values(
        [...previewIds].map((mediaId, sortOrder) => ({
          itemId: row.insertId,
          mediaId,
          sortOrder,
        })),
      );
    }
    prices.push(item.sale?.priceAp ?? item.priceAp);
    await db
      .insert(schema.itemPrices)
      .values({ itemId: row.insertId, priceAp: item.priceAp, startsAt: days(-90) });
    if (item.sale) {
      await db.insert(schema.itemPrices).values({
        itemId: row.insertId,
        priceAp: item.priceAp,
        salePriceAp: item.sale.priceAp,
        campaignId: campaignIds.get(item.sale.campaign)!,
        startsAt: days(-2),
        endsAt: days(25),
      });
    }
  }

  // Paquetes de recarga (1 Service Coin = 2500 AP, como en la web original).
  const packages = [
    { apAmount: 2500, priceCents: 499 },
    { apAmount: 5500, priceCents: 999 },
    { apAmount: 12_000, priceCents: 1999 },
    { apAmount: 32_500, priceCents: 4999 },
  ];
  await db.insert(schema.topupPackages).values(packages.map((p) => ({ ...p, currency: "EUR" })));

  // Usuarios con su saldo de AP coherente con el libro mayor.
  const ledgers = generateLedgers(
    random,
    users,
    packages.map((p) => p.apAmount),
    prices,
  );
  const balance = new Map(ledgers.map((l) => [l.userId, l.entries.at(-1)?.balanceAfter ?? 0]));
  await insertInBatches(users, 1000, (batch) =>
    db.insert(schema.users).values(
      batch.map((u) => ({
        id: u.id,
        // Sin fila en `accounts`: estas cuentas sintéticas no tienen
        // contraseña y no pueden iniciar sesión.
        username: u.username.toLowerCase(),
        displayUsername: u.username,
        name: u.username,
        email: u.email,
        emailVerified: true,
        locale: u.locale,
        apBalance: balance.get(u.id) ?? 0,
      })),
    ),
  );
  const ledgerRows = ledgers.flatMap((l) =>
    l.entries.map((e) => ({
      userId: l.userId,
      delta: e.delta,
      reason: e.reason,
      balanceAfter: e.balanceAfter,
    })),
  );
  await insertInBatches(ledgerRows, 2000, (batch) => db.insert(schema.apLedger).values(batch));

  await insertInBatches(guilds, 1000, (batch) => db.insert(schema.guilds).values(batch));
  await insertInBatches(characters, 2000, (batch) =>
    db.insert(schema.characters).values(
      // `baseClassId` solo sirve para calcular rankings; no es una columna.
      batch.map((c) => ({
        id: c.id,
        userId: c.userId,
        serverId: c.serverId,
        guildId: c.guildId,
        classId: c.classId,
        name: c.name,
        landLevel: c.landLevel,
        seaLevel: c.seaLevel,
        experience: c.experience,
      })),
    ),
  );

  // Dos fotos de ranking: ayer y hoy, para mostrar subidas y bajadas.
  const yesterday = characters.map((c) => ({
    ...c,
    landLevel: Math.max(1, c.landLevel - random.int(0, 2)),
  }));
  const previous = buildRankings(yesterday);
  const current = buildRankings(characters);
  const previousRank = new Map(
    previous.map((r) => [`${r.area}:${r.classScope}:${r.characterId}`, r.rank]),
  );
  const takenYesterday = days(-1);
  await insertInBatches(previous, 5000, (batch) =>
    db
      .insert(schema.rankingSnapshots)
      .values(batch.map((r) => ({ ...r, takenAt: takenYesterday }))),
  );
  await insertInBatches(current, 5000, (batch) =>
    db.insert(schema.rankingSnapshots).values(
      batch.map((r) => ({
        ...r,
        takenAt: now,
        previousRank: previousRank.get(`${r.area}:${r.classScope}:${r.characterId}`) ?? null,
      })),
    ),
  );

  // Noticias (RF-08): cinco categorías, traducciones incompletas, un evento
  // terminado, una programada y un borrador (ver `src/db/seed/news.ts`).
  for (const demo of buildDemoPosts()) {
    const [post] = await db.insert(schema.posts).values({
      slug: demo.slug,
      category: demo.category,
      status: demo.status,
      publishedAt: demo.publishedInDays === null ? null : days(demo.publishedInDays),
      expiresAt: demo.expiresInDays === null ? null : days(demo.expiresInDays),
      // Sin esto, todas parecerían editadas hoy (la fecha de la carga).
      updatedAt:
        demo.updatedInDays !== null
          ? days(demo.updatedInDays)
          : demo.publishedInDays !== null
            ? days(demo.publishedInDays)
            : undefined,
    });
    await db.insert(schema.postTranslations).values(
      Object.entries(demo.translations).map(([locale, text]) => ({
        postId: post.insertId,
        locale,
        ...text,
      })),
    );
  }

  // Códigos de canje: uno vigente de AP, uno caducado y uno de objeto.
  await db.insert(schema.redeemCodes).values([
    { code: "WELCOME2026", rewardType: "ap", rewardAp: 500, startsAt: days(-30), endsAt: days(60) },
    {
      code: "HALLOWEEN2026",
      rewardType: "ap",
      rewardAp: 300,
      startsAt: days(-30),
      endsAt: days(-5),
    },
    {
      code: "WINTERGIFT",
      rewardType: "item",
      rewardItemId: 1,
      maxUses: 1000,
      startsAt: days(-2),
      endsAt: days(25),
    },
  ]);

  const [{ total }] = (await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.characters)
    .where(isNull(schema.characters.userId))) as [{ total: number }];

  console.log(
    `Demo cargada en ${((Date.now() - started) / 1000).toFixed(1)} s: ${users.length} usuarios, ` +
      `${guilds.length} gremios, ${characters.length} personajes (${total} sin cuenta), ` +
      `${previous.length + current.length} filas de ranking, ${SHOP_ITEMS.length} artículos, ${ledgerRows.length} movimientos de AP.`,
  );
  await connection.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
