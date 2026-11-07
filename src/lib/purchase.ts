/**
 * Compra con AP (RF-05): de la cesta al pedido en una sola transacción.
 *
 * Garantías:
 * - **Todo o nada.** Pedido, líneas, movimiento del libro mayor, saldo y
 *   vaciado de la cesta se escriben en la misma transacción. Si algo falla,
 *   no cambia nada.
 * - **Sin saldo negativo con compras simultáneas.** La fila del usuario se
 *   bloquea (`SELECT … FOR UPDATE`) antes de leer el saldo. Dos compras de
 *   la misma cuenta se ejecutan una detrás de otra, y la segunda ve el saldo
 *   que dejó la primera (criterio de aceptación de RF-05).
 * - **Doble clic sin doble cobro.** La segunda petición espera al bloqueo y
 *   encuentra la cesta vacía.
 * - **El precio se lee de la base de datos**, no de la caché ni del
 *   formulario, con la hora de la compra. El formulario envía el total que
 *   vio el jugador; si no coincide (una rebaja acabó entretanto), no se
 *   cobra y la cesta enseña los precios nuevos.
 * - **Correo confirmado.** Solo compran las cuentas con el correo
 *   confirmado (RF-03), para poder avisar de cada compra y recuperar la
 *   cuenta si alguien entra en ella.
 * - **El personaje es de la cuenta.** El id llega del formulario, así que se
 *   comprueba que pertenece al usuario de la sesión (ASVS V4.2.1).
 *
 * Entrega en el juego: el pedido queda `completed` y sus líneas guardan el
 * servidor y el personaje. Enviar el objeto al servidor de Giiku depende de
 * su integración, igual que los códigos canjeados (M-28).
 *
 * @see RF-05 · 04-arquitectura §4 (`ap_ledger`) · M-32
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { applyDelta, InsufficientApError } from "@/db/seed/ledger";
import {
  apLedger,
  cartItems,
  carts,
  characters,
  itemPrices,
  orderItems,
  orders,
  shopItems,
  users,
} from "@/db/schema";

import { currentPrice } from "./shop-catalog";

export interface PurchaseLine {
  itemId: number;
  quantity: number;
}

export type PurchaseProblem =
  /** El correo de la cuenta no está confirmado (RF-03). */
  | "unverified"
  /** No hay nada que comprar (o ya se compró con otra petición). */
  | "empty"
  /** Algún artículo ya no está a la venta. */
  | "unavailable"
  /** El personaje no existe o no es de la cuenta. */
  | "character"
  /** El total ya no es el que vio el jugador. */
  | "pricesChanged"
  /** El saldo no alcanza. */
  | "insufficient";

export type PurchaseResult =
  | { ok: true; orderId: number; totalAp: number; balance: number }
  | { ok: false; problem: PurchaseProblem };

/** Error que deshace la transacción y se devuelve como resultado. */
class Rejected extends Error {
  constructor(readonly problem: PurchaseProblem) {
    super(problem);
  }
}

export interface PurchaseRequest {
  userId: number;
  characterId: number;
  /** Total en AP que vio el jugador; `null` para no comprobarlo. */
  expectedTotal: number | null;
  /**
   * Qué comprar. Sin líneas, se compra la cesta de la cuenta y se vacía en
   * la misma transacción.
   */
  lines?: readonly PurchaseLine[];
  /** Hora de la compra, para elegir el precio vigente. */
  now?: Date;
}

/** Compra la cesta (o las líneas dadas) con el saldo de AP de la cuenta. */
export async function purchase(request: PurchaseRequest): Promise<PurchaseResult> {
  const { userId, characterId, expectedTotal, now = new Date() } = request;
  const { db } = await import("@/db/client");

  try {
    return await db.transaction(async (tx) => {
      // 1. Bloquear la cuenta: a partir de aquí, sus compras van en fila.
      const [user] = await tx
        .select({ balance: users.apBalance, verified: users.emailVerified, status: users.status })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (!user || user.status !== "active") throw new Rejected("empty");
      // Comprar exige el correo confirmado: así se puede avisar y recuperar la cuenta.
      if (!user.verified) throw new Rejected("unverified");

      // 2. Qué se compra: las líneas dadas o la cesta, leída tras el bloqueo.
      const lines =
        request.lines ??
        (await tx
          .select({ itemId: cartItems.itemId, quantity: cartItems.quantity })
          .from(cartItems)
          .innerJoin(carts, eq(carts.id, cartItems.cartId))
          .where(eq(carts.userId, userId)));
      if (lines.length === 0) throw new Rejected("empty");

      // 3. El personaje, de esta cuenta.
      const [character] = await tx
        .select({ id: characters.id, serverId: characters.serverId })
        .from(characters)
        .where(and(eq(characters.id, characterId), eq(characters.userId, userId)));
      if (!character) throw new Rejected("character");

      // 4. Precio vigente de cada artículo, leído ahora de la base de datos.
      const ids = lines.map((line) => line.itemId);
      const [active, prices] = await Promise.all([
        tx
          .select({ id: shopItems.id })
          .from(shopItems)
          .where(and(inArray(shopItems.id, ids), eq(shopItems.isActive, 1))),
        tx
          .select({
            itemId: itemPrices.itemId,
            priceAp: itemPrices.priceAp,
            salePriceAp: itemPrices.salePriceAp,
            campaignId: itemPrices.campaignId,
            startsAt: itemPrices.startsAt,
            endsAt: itemPrices.endsAt,
          })
          .from(itemPrices)
          .where(inArray(itemPrices.itemId, ids)),
      ]);
      const activeIds = new Set(active.map((row) => row.id));
      const priced = lines.map((line) => {
        const price = activeIds.has(line.itemId)
          ? currentPrice(
              prices.filter((row) => row.itemId === line.itemId),
              now,
            )
          : null;
        if (!price) throw new Rejected("unavailable");
        return { ...line, unitPriceAp: price.salePriceAp ?? price.priceAp };
      });
      const totalAp = priced.reduce((sum, line) => sum + line.unitPriceAp * line.quantity, 0);
      // Un precio 0 sería un error de datos: no se «compra» gratis.
      if (totalAp <= 0) throw new Rejected("unavailable");
      if (expectedTotal !== null && expectedTotal !== totalAp) throw new Rejected("pricesChanged");

      // 5. Cobrar: el libro mayor decide si el saldo alcanza.
      let entry;
      try {
        entry = applyDelta(user.balance, -totalAp);
      } catch (error) {
        if (error instanceof InsufficientApError) throw new Rejected("insufficient");
        throw error;
      }

      // 6. Pedido, líneas con el precio congelado, movimiento y saldo.
      const [order] = await tx.insert(orders).values({ userId, totalAp, status: "completed" });
      await tx.insert(orderItems).values(
        priced.map((line) => ({
          orderId: order.insertId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitPriceAp: line.unitPriceAp,
          serverId: character.serverId,
          characterId: character.id,
        })),
      );
      await tx.insert(apLedger).values({
        userId,
        delta: entry.delta,
        reason: "purchase",
        referenceId: order.insertId,
        balanceAfter: entry.balanceAfter,
      });
      await tx.update(users).set({ apBalance: entry.balanceAfter }).where(eq(users.id, userId));

      // 7. Vaciar la cesta si era lo que se compraba.
      if (!request.lines) {
        const [cart] = await tx
          .select({ id: carts.id })
          .from(carts)
          .where(eq(carts.userId, userId));
        if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      }

      return { ok: true, orderId: order.insertId, totalAp, balance: entry.balanceAfter } as const;
    });
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}
