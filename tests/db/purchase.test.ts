/**
 * Compra con AP contra MySQL (`purchase.ts`): reglas del libro mayor y
 * criterios de aceptación de RF-05, incluidas las compras simultáneas.
 *
 * Cada prueba crea su propia cuenta con saldo, un personaje y artículos con
 * precio fijo, así que no depende de los precios aleatorios de la demo.
 */
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import {
  apLedger,
  cartItems,
  carts,
  characterClasses,
  characters,
  itemPrices,
  orderItems,
  orders,
  servers,
  shopCategories,
  shopItems,
  users,
} from "@/db/schema";
import { isConsistent } from "@/db/seed/ledger";
import { addToCart, getCartLines } from "@/lib/cart";
import { purchase } from "@/lib/purchase";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let sequence = 0;
const itemIds: number[] = [];
let categoryId = 0;
let serverId = 0;
let classId = 0;

/** Un artículo a la venta con precio fijo (y rebaja opcional). */
async function item(priceAp: number, salePriceAp: number | null = null): Promise<number> {
  const [row] = await db.insert(shopItems).values({ categoryId, sku: `T-${run}-${++sequence}` });
  const startsAt = new Date(Date.now() - 86_400_000);
  await db.insert(itemPrices).values({ itemId: row.insertId, priceAp, startsAt });
  if (salePriceAp !== null) {
    await db.insert(itemPrices).values({
      itemId: row.insertId,
      priceAp,
      salePriceAp,
      startsAt: new Date(Date.now() - 3_600_000),
      endsAt: new Date(Date.now() + 86_400_000),
    });
  }
  itemIds.push(row.insertId);
  return row.insertId;
}

/** Cuenta con saldo (apuntado en el libro mayor) y un personaje propio. */
async function account(balance: number, { verified = true } = {}) {
  const name = `t${run}${++sequence}`.slice(0, 32);
  const [user] = await db.insert(users).values({
    username: name,
    name,
    email: `${name}@example.test`,
    emailVerified: verified,
    apBalance: balance,
  });
  const userId = user.insertId;
  if (balance > 0) {
    await db
      .insert(apLedger)
      .values({ userId, delta: balance, reason: "admin", balanceAfter: balance });
  }
  const [character] = await db.insert(characters).values({
    userId,
    serverId,
    classId,
    name: `C${run}${sequence}`.slice(0, 24),
    landLevel: 1,
    seaLevel: 1,
  });
  return { userId, characterId: character.insertId };
}

async function balanceOf(userId: number) {
  const [row] = await db
    .select({ balance: users.apBalance })
    .from(users)
    .where(eq(users.id, userId));
  return row!.balance;
}

async function ledgerOf(userId: number) {
  return db
    .select({ delta: apLedger.delta, balanceAfter: apLedger.balanceAfter })
    .from(apLedger)
    .where(eq(apLedger.userId, userId))
    .orderBy(apLedger.id);
}

beforeAll(async () => {
  const [[category], [server], [characterClass]] = await Promise.all([
    db.select({ id: shopCategories.id }).from(shopCategories).limit(1),
    db.select({ id: servers.id }).from(servers).limit(1),
    db.select({ id: characterClasses.id }).from(characterClasses).limit(1),
  ]);
  if (!category || !server || !characterClass) {
    throw new Error("Faltan datos de demo: ejecuta `pnpm db:seed:demo`.");
  }
  categoryId = category.id;
  serverId = server.id;
  classId = characterClass.id;
});

afterAll(async () => {
  // Los artículos de prueba dejan de estar a la venta; los pedidos se conservan.
  if (itemIds.length) {
    await db.update(shopItems).set({ isActive: 0 }).where(inArray(shopItems.id, itemIds));
  }
  const { pool } = db.$client as unknown as { pool: { end(): Promise<void> } };
  await (pool ?? (db.$client as unknown as { end(): Promise<void> })).end();
});

describe("purchase", () => {
  it("compra la cesta: pedido, precio congelado, libro mayor y cesta vacía", async () => {
    const [sword, hat] = [await item(500), await item(1000, 700)];
    const { userId, characterId } = await account(3000);
    await addToCart(userId, sword, 2);
    await addToCart(userId, hat, 1);

    const result = await purchase({ userId, characterId, expectedTotal: 1700 });
    expect(result).toMatchObject({ ok: true, totalAp: 1700, balance: 1300 });
    if (!result.ok) return;

    const lines = await db
      .select({
        itemId: orderItems.itemId,
        quantity: orderItems.quantity,
        unitPriceAp: orderItems.unitPriceAp,
        characterId: orderItems.characterId,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, result.orderId))
      .orderBy(orderItems.id);
    expect(lines).toEqual([
      { itemId: sword, quantity: 2, unitPriceAp: 500, characterId },
      { itemId: hat, quantity: 1, unitPriceAp: 700, characterId },
    ]);
    expect(await balanceOf(userId)).toBe(1300);
    const ledger = await ledgerOf(userId);
    expect(ledger.at(-1)).toEqual({ delta: -1700, balanceAfter: 1300 });
    expect(isConsistent(ledger)).toBe(true);
    expect(await getCartLines(userId)).toEqual([]);
  });

  it("con 1000 AP y una cesta de 1200 AP se rechaza y nada cambia (CA de RF-05)", async () => {
    const expensive = await item(1200);
    const { userId, characterId } = await account(1000);
    await addToCart(userId, expensive, 1);

    expect(await purchase({ userId, characterId, expectedTotal: 1200 })).toEqual({
      ok: false,
      problem: "insufficient",
    });
    expect(await balanceOf(userId)).toBe(1000);
    expect(await ledgerOf(userId)).toHaveLength(1);
    expect(await getCartLines(userId)).toEqual([{ itemId: expensive, quantity: 1 }]);
    const placed = await db.select().from(orders).where(eq(orders.userId, userId));
    expect(placed).toEqual([]);
  });

  it("dos compras simultáneas que suman más que el saldo: solo una se completa (CA)", async () => {
    const [a, b] = [await item(700), await item(600)];
    const { userId, characterId } = await account(1000);

    const results = await Promise.all([
      purchase({ userId, characterId, expectedTotal: null, lines: [{ itemId: a, quantity: 1 }] }),
      purchase({ userId, characterId, expectedTotal: null, lines: [{ itemId: b, quantity: 1 }] }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, problem: "insufficient" }]);

    const balance = await balanceOf(userId);
    expect([300, 400]).toContain(balance);
    const ledger = await ledgerOf(userId);
    expect(ledger).toHaveLength(2);
    expect(isConsistent(ledger)).toBe(true);
    expect(ledger.at(-1)!.balanceAfter).toBe(balance);
  });

  it("muchas compras a la vez nunca dejan el saldo en negativo", async () => {
    const cheap = await item(300);
    const { userId, characterId } = await account(1000);
    const line = [{ itemId: cheap, quantity: 1 }];

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        purchase({ userId, characterId, expectedTotal: 300, lines: line }),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(await balanceOf(userId)).toBe(100);
    expect(isConsistent(await ledgerOf(userId))).toBe(true);
  });

  it("un doble envío de la cesta cobra una sola vez", async () => {
    const thing = await item(400);
    const { userId, characterId } = await account(1000);
    await addToCart(userId, thing, 1);

    const results = await Promise.all([
      purchase({ userId, characterId, expectedTotal: 400 }),
      purchase({ userId, characterId, expectedTotal: 400 }),
    ]);
    expect(results.map((r) => (r.ok ? "ok" : r.problem)).sort()).toEqual(["empty", "ok"]);
    expect(await balanceOf(userId)).toBe(600);
  });

  it("no cobra si el total cambió, el artículo no se vende o el personaje es de otro", async () => {
    const thing = await item(800, 500);
    const { userId, characterId } = await account(2000);
    const other = await account(0);
    await addToCart(userId, thing, 1);

    // El jugador vio el precio sin rebaja: la rebaja empezó entretanto.
    expect(await purchase({ userId, characterId, expectedTotal: 800 })).toMatchObject({
      problem: "pricesChanged",
    });
    expect(
      await purchase({ userId, characterId: other.characterId, expectedTotal: 500 }),
    ).toMatchObject({ problem: "character" });

    await db.update(shopItems).set({ isActive: 0 }).where(eq(shopItems.id, thing));
    expect(await purchase({ userId, characterId, expectedTotal: 500 })).toMatchObject({
      problem: "unavailable",
    });
    expect(await balanceOf(userId)).toBe(2000);
  });

  it("sin correo confirmado no se puede comprar (RF-03)", async () => {
    const thing = await item(100);
    const { userId, characterId } = await account(1000, { verified: false });
    await addToCart(userId, thing, 1);
    expect(await purchase({ userId, characterId, expectedTotal: 100 })).toMatchObject({
      problem: "unverified",
    });
  });
});

describe("addToCart", () => {
  it("suma unidades sin pasar del máximo", async () => {
    const thing = await item(100);
    const { userId } = await account(0);
    await addToCart(userId, thing, 6);
    await addToCart(userId, thing, 6);
    expect(await getCartLines(userId)).toEqual([{ itemId: thing, quantity: 10 }]);
    const [cart] = await db.select().from(carts).where(eq(carts.userId, userId));
    const rows = await db.select().from(cartItems).where(eq(cartItems.cartId, cart!.id));
    expect(rows).toHaveLength(1);
  });
});
