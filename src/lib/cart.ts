/**
 * Cesta de la compra (RF-05): persistente en la base de datos y ligada a la
 * cuenta, así que sigue ahí al cambiar de dispositivo o volver otro día.
 *
 * Todas las funciones reciben el id del usuario de la sesión, nunca uno que
 * llegue del navegador (ASVS V4.2.1).
 *
 * La cesta guarda solo artículo y cantidad. El precio se calcula al
 * mostrarla, con el catálogo y la hora actuales, y otra vez al comprar
 * (`purchase.ts`): nunca se cobra un precio guardado en la cesta.
 *
 * @see RF-05 · M-32
 */
import "server-only";

import { and, count, eq, sql } from "drizzle-orm";

import { cartItems, carts } from "@/db/schema";

/** Unidades máximas de un artículo en la cesta. */
export const CART_MAX_QUANTITY = 10;

/** Artículos distintos que caben en la cesta. */
export const CART_MAX_LINES = 30;

export interface CartLine {
  itemId: number;
  quantity: number;
}

/** Cantidad de un formulario: entero de 0 a `CART_MAX_QUANTITY`, o `null`. */
export function parseQuantity(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d{1,2}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= CART_MAX_QUANTITY ? value : null;
}

/** Líneas de la cesta en el orden en que se añadieron. */
export async function getCartLines(userId: number): Promise<CartLine[]> {
  const { db } = await import("@/db/client");
  return db
    .select({ itemId: cartItems.itemId, quantity: cartItems.quantity })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(eq(carts.userId, userId))
    .orderBy(cartItems.addedAt, cartItems.itemId);
}

/**
 * Añade unidades de un artículo, sin pasar de `CART_MAX_QUANTITY`.
 *
 * @returns `false` si la cesta ya tiene `CART_MAX_LINES` artículos distintos.
 */
export async function addToCart(userId: number, itemId: number, quantity: number) {
  const { db } = await import("@/db/client");
  return db.transaction(async (tx) => {
    // Crea la cesta la primera vez; `user_id` es único.
    await tx.insert(carts).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .for("update");
    const [[lines], [existing]] = await Promise.all([
      tx.select({ total: count() }).from(cartItems).where(eq(cartItems.cartId, cart!.id)),
      tx
        .select({ quantity: cartItems.quantity })
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cart!.id), eq(cartItems.itemId, itemId))),
    ]);
    if (!existing && (lines?.total ?? 0) >= CART_MAX_LINES) return false;

    await tx
      .insert(cartItems)
      .values({ cartId: cart!.id, itemId, quantity: Math.min(quantity, CART_MAX_QUANTITY) })
      .onDuplicateKeyUpdate({
        set: { quantity: sql`least(${cartItems.quantity} + ${quantity}, ${CART_MAX_QUANTITY})` },
      });
    return true;
  });
}

/** Cambia la cantidad de un artículo; con 0 lo quita. */
export async function setCartQuantity(userId: number, itemId: number, quantity: number) {
  const { db } = await import("@/db/client");
  const [cart] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
  if (!cart) return;
  const line = and(eq(cartItems.cartId, cart.id), eq(cartItems.itemId, itemId));
  if (quantity === 0) await db.delete(cartItems).where(line);
  else await db.update(cartItems).set({ quantity }).where(line);
}
