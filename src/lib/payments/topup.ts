/**
 * Recarga de AP (RF-06): paquetes, pagos y acreditación por aviso firmado.
 *
 * Flujo, igual que con Xsolla (ADR-09):
 * 1. El jugador elige un paquete: se crea un pago `pending` con un id único
 *    en el proveedor, y el navegador va a la pasarela.
 * 2. La pasarela cobra y envía un **aviso firmado** (webhook) al servidor.
 * 3. Solo ese aviso acredita los AP. La vuelta del navegador a la web
 *    (`/topup/return`) solo enseña el estado: no puede acreditar nada,
 *    porque el jugador podría abrirla sin haber pagado (RF-06).
 *
 * El aviso es **idempotente**: la fila del pago se bloquea (`FOR UPDATE`) y
 * solo un pago `pending` puede pasar a `paid`. Un aviso repetido, aunque
 * llegue a la vez que el primero, responde bien y no acredita otra vez
 * (criterio de aceptación de RF-06). La restricción única
 * `(provider, provider_payment_id)` impide además dos pagos con el mismo id.
 *
 * @see RF-06 · ADR-09 · M-33
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { applyDelta } from "@/db/seed/ledger";
import { apLedger, payments, topupPackages, users } from "@/db/schema";

/** Proveedores con aviso firmado. Xsolla sandbox queda preparado en el esquema. */
export type PaymentProvider = "mock";

export interface TopupPackage {
  id: number;
  apAmount: number;
  priceCents: number;
  currency: string;
}

/** Etiqueta de caché de los paquetes, para invalidarla desde el panel. */
export const TOPUP_CACHE_TAG = "topup";

/** Paquetes a la venta, de menor a mayor. En caché: cambian muy poco. */
export async function listPackages(): Promise<TopupPackage[]> {
  "use cache";
  cacheTag(TOPUP_CACHE_TAG);
  cacheLife("hours");

  const { db } = await import("@/db/client");
  return db
    .select({
      id: topupPackages.id,
      apAmount: topupPackages.apAmount,
      priceCents: topupPackages.priceCents,
      currency: topupPackages.currency,
    })
    .from(topupPackages)
    .where(eq(topupPackages.isActive, 1))
    .orderBy(asc(topupPackages.apAmount));
}

export type StartProblem = "unverified" | "package";

/**
 * Crea un pago pendiente para un paquete.
 *
 * @returns el id del pago en el proveedor, o por qué no se puede.
 */
export async function startTopup(
  userId: number,
  packageId: number,
  provider: PaymentProvider = "mock",
): Promise<{ ok: true; providerPaymentId: string } | { ok: false; problem: StartProblem }> {
  const { db } = await import("@/db/client");
  const [[user], [pack]] = await Promise.all([
    db
      .select({ verified: users.emailVerified, status: users.status })
      .from(users)
      .where(eq(users.id, userId)),
    db
      .select()
      .from(topupPackages)
      .where(and(eq(topupPackages.id, packageId), eq(topupPackages.isActive, 1))),
  ]);
  // Como para comprar: solo cuentas activas con el correo confirmado (RF-03).
  if (!user || user.status !== "active" || !user.verified)
    return { ok: false, problem: "unverified" };
  if (!pack) return { ok: false, problem: "package" };

  const providerPaymentId = randomUUID();
  await db.insert(payments).values({
    userId,
    packageId: pack.id,
    provider,
    providerPaymentId,
    status: "pending",
    amountCents: pack.priceCents,
    currency: pack.currency,
  });
  return { ok: true, providerPaymentId };
}

export interface PaymentView {
  id: number;
  providerPaymentId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  apAmount: number;
  amountCents: number;
  currency: string;
  createdAt: Date;
}

/** Un pago de la cuenta por su id en el proveedor; `null` si no es suyo. */
export async function getPayment(
  userId: number,
  providerPaymentId: string,
): Promise<PaymentView | null> {
  if (!/^[0-9a-f-]{36}$/.test(providerPaymentId)) return null;
  const { db } = await import("@/db/client");
  const [row] = await db
    .select({
      id: payments.id,
      providerPaymentId: payments.providerPaymentId,
      status: payments.status,
      apAmount: topupPackages.apAmount,
      amountCents: payments.amountCents,
      currency: payments.currency,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .innerJoin(topupPackages, eq(topupPackages.id, payments.packageId))
    .where(and(eq(payments.providerPaymentId, providerPaymentId), eq(payments.userId, userId)));
  return row ?? null;
}

/** Contenido de un aviso de pago. */
export const notificationSchema = z.object({
  provider_payment_id: z.string().min(1).max(80),
  status: z.enum(["paid", "failed"]),
  amount_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export type PaymentNotification = z.infer<typeof notificationSchema>;

export type NotificationOutcome =
  /** Pago acreditado ahora. */
  | { kind: "credited"; userId: number; paymentId: number; apAmount: number; balance: number }
  /** Pago marcado como fallido. */
  | { kind: "failed" }
  /** El pago ya no estaba pendiente: aviso repetido, no cambia nada. */
  | { kind: "duplicate" }
  /** No existe ese pago. */
  | { kind: "unknown" }
  /** El importe o la moneda no son los del pago. */
  | { kind: "mismatch" };

/** Aplica un aviso de pago ya verificado, una sola vez. */
export async function applyNotification(
  provider: PaymentProvider,
  notification: PaymentNotification,
): Promise<NotificationOutcome> {
  const { db } = await import("@/db/client");
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.provider, provider),
          eq(payments.providerPaymentId, notification.provider_payment_id),
        ),
      )
      .for("update");
    if (!payment) return { kind: "unknown" };
    if (
      payment.amountCents !== notification.amount_cents ||
      payment.currency !== notification.currency
    ) {
      return { kind: "mismatch" };
    }
    if (payment.status !== "pending") return { kind: "duplicate" };

    if (notification.status === "failed") {
      await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
      return { kind: "failed" };
    }

    const [[pack], [user]] = await Promise.all([
      tx
        .select({ apAmount: topupPackages.apAmount })
        .from(topupPackages)
        .where(eq(topupPackages.id, payment.packageId)),
      tx
        .select({ balance: users.apBalance })
        .from(users)
        .where(eq(users.id, payment.userId))
        .for("update"),
    ]);
    const entry = applyDelta(user!.balance, pack!.apAmount);
    await tx.insert(apLedger).values({
      userId: payment.userId,
      delta: entry.delta,
      reason: "topup",
      referenceId: payment.id,
      balanceAfter: entry.balanceAfter,
    });
    await tx
      .update(users)
      .set({ apBalance: entry.balanceAfter })
      .where(eq(users.id, payment.userId));
    await tx.update(payments).set({ status: "paid" }).where(eq(payments.id, payment.id));
    return {
      kind: "credited",
      userId: payment.userId,
      paymentId: payment.id,
      apAmount: pack!.apAmount,
      balance: entry.balanceAfter,
    };
  });
}
