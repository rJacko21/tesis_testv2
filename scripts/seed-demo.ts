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

import { isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { LOCALES, type Locale } from "../src/config/locales";
import * as schema from "../src/db/schema";
import { buildDemoPosts } from "../src/db/seed/news";
import { buildRankings } from "../src/db/seed/rankings";
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

/** Textos por idioma de las categorías de la tienda. */
const CATEGORY_NAMES: Record<string, Record<Locale, string>> = {
  costumes: {
    en: "Costumes",
    "pt-BR": "Trajes",
    tr: "Kostümler",
    it: "Costumi",
    de: "Kostüme",
    fr: "Costumes",
    es: "Trajes",
  },
  "costumes-weapons": {
    en: "Weapon skins",
    "pt-BR": "Visuais de arma",
    tr: "Silah görünümleri",
    it: "Aspetti armi",
    de: "Waffen-Skins",
    fr: "Apparences d’armes",
    es: "Aspectos de armas",
  },
  "costumes-outfits": {
    en: "Outfits",
    "pt-BR": "Roupas",
    tr: "Kıyafetler",
    it: "Abiti",
    de: "Outfits",
    fr: "Tenues",
    es: "Atuendos",
  },
  boosts: {
    en: "Boosts",
    "pt-BR": "Bônus",
    tr: "Güçlendirmeler",
    it: "Potenziamenti",
    de: "Boosts",
    fr: "Boosts",
    es: "Potenciadores",
  },
  "boosts-experience": {
    en: "Experience",
    "pt-BR": "Experiência",
    tr: "Deneyim",
    it: "Esperienza",
    de: "Erfahrung",
    fr: "Expérience",
    es: "Experiencia",
  },
  "boosts-ships": {
    en: "Ships",
    "pt-BR": "Navios",
    tr: "Gemiler",
    it: "Navi",
    de: "Schiffe",
    fr: "Navires",
    es: "Barcos",
  },
};

const ITEM_ADJECTIVES = [
  "Ghost",
  "Pirate",
  "Royal",
  "Coral",
  "Storm",
  "Lily",
  "Golden",
  "Frost",
  "Crimson",
  "Moonlit",
] as const;
const ITEM_NOUNS: Record<string, readonly string[]> = {
  "costumes-weapons": ["Steel Sword", "Musket", "Staff", "Lance", "Twin Daggers"],
  "costumes-outfits": ["Coat", "Dress", "Uniform", "Armor Set", "Hat"],
  "boosts-experience": ["EXP Scroll", "Fortune Charm", "Skill Elixir"],
  "boosts-ships": ["Ship Figurehead", "Cannon Set", "Sail Pattern"],
};

const ITEM_DESCRIPTION: Record<Locale, (name: string) => string> = {
  en: (n) => `${n}. Synthetic item for the demo; it does not exist in the game.`,
  "pt-BR": (n) => `${n}. Item sintético para a demonstração; não existe no jogo.`,
  tr: (n) => `${n}. Demo için yapay bir eşya; oyunda bulunmaz.`,
  it: (n) => `${n}. Oggetto sintetico per la demo; non esiste nel gioco.`,
  de: (n) => `${n}. Synthetischer Gegenstand für die Demo; im Spiel gibt es ihn nicht.`,
  fr: (n) => `${n}. Objet fictif pour la démo ; il n’existe pas dans le jeu.`,
  es: (n) => `${n}. Objeto sintético para la demo; no existe en el juego.`,
};

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

  // Tienda: categorías de dos niveles, artículos y precios.
  const now = new Date();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
  const categoryIds = new Map<string, number>();
  for (const slug of Object.keys(CATEGORY_NAMES)) {
    const [parentSlug, childSlug] = slug.split("-") as [string, string | undefined];
    const [result] = await db.insert(schema.shopCategories).values({
      parentId: childSlug ? (categoryIds.get(parentSlug) ?? null) : null,
      slug: childSlug ?? parentSlug,
      sortOrder: categoryIds.size,
    });
    categoryIds.set(slug, result.insertId);
    await db.insert(schema.shopCategoryTranslations).values(
      LOCALES.map((locale) => ({
        categoryId: result.insertId,
        locale,
        name: CATEGORY_NAMES[slug]![locale],
      })),
    );
  }

  const [halloween] = await db
    .insert(schema.campaigns)
    .values({ code: "halloween-2026", startsAt: days(-30), endsAt: days(-5) });
  const [winter] = await db
    .insert(schema.campaigns)
    .values({ code: "winter-2026", startsAt: days(-2), endsAt: days(25) });
  for (const [campaignId, names] of [
    [
      halloween.insertId,
      {
        en: "Halloween",
        "pt-BR": "Halloween",
        tr: "Cadılar Bayramı",
        it: "Halloween",
        de: "Halloween",
        fr: "Halloween",
        es: "Halloween",
      },
    ],
    [
      winter.insertId,
      {
        en: "Winter Festival",
        "pt-BR": "Festival de Inverno",
        tr: "Kış Festivali",
        it: "Festival d’inverno",
        de: "Winterfest",
        fr: "Fête de l’hiver",
        es: "Festival de invierno",
      },
    ],
  ] as const) {
    await db
      .insert(schema.campaignTranslations)
      .values(LOCALES.map((locale) => ({ campaignId, locale, name: names[locale] })));
  }

  const prices: number[] = [];
  let sku = 1;
  for (const [slug, nouns] of Object.entries(ITEM_NOUNS)) {
    for (const noun of nouns) {
      for (const adjective of ITEM_ADJECTIVES.slice(0, 4)) {
        const name = `${adjective} ${noun}`;
        const validityDays = random.next() < 0.5 ? null : random.pick([7, 30, 90]);
        const [item] = await db.insert(schema.shopItems).values({
          categoryId: categoryIds.get(slug)!,
          sku: `DEMO-${String(sku++).padStart(4, "0")}`,
          validityDays,
          isBundle: Number(random.next() < 0.1),
          isLimited: Number(random.next() < 0.15),
          isGiftable: Number(random.next() < 0.5),
          sortOrder: sku,
        });
        await db.insert(schema.shopItemTranslations).values(
          LOCALES.map((locale) => ({
            itemId: item.insertId,
            locale,
            name,
            description: ITEM_DESCRIPTION[locale](name),
          })),
        );
        const priceAp = random.pick([500, 900, 1200, 1500, 2500, 3900, 4900]);
        prices.push(priceAp);
        await db
          .insert(schema.itemPrices)
          .values({ itemId: item.insertId, priceAp, startsAt: days(-90) });
        if (random.next() < 0.25) {
          await db.insert(schema.itemPrices).values({
            itemId: item.insertId,
            priceAp,
            salePriceAp: Math.round((priceAp * 0.7) / 100) * 100,
            campaignId: winter.insertId,
            startsAt: days(-2),
            endsAt: days(25),
          });
        }
      }
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
      `${previous.length + current.length} filas de ranking, ${sku - 1} artículos, ${ledgerRows.length} movimientos de AP.`,
  );
  await connection.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
