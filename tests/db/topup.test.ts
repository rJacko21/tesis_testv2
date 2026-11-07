/**
 * Recarga de AP contra MySQL (`payments/topup.ts` y `payments/webhook.ts`):
 * solo un aviso firmado acredita, y un aviso repetido no acredita dos veces
 * (criterio de aceptación de RF-06), aunque lleguen a la vez.
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { apLedger, payments, topupPackages, users } from "@/db/schema";
import { isConsistent } from "@/db/seed/ledger";
import { signatureHeader } from "@/lib/payments/signature";
import { getPayment, startTopup } from "@/lib/payments/topup";
import { mockGatewayNotify, receiveNotification, webhookSecret } from "@/lib/payments/webhook";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let sequence = 0;
let pack: { id: number; apAmount: number; priceCents: number; currency: string };

async function account({ verified = true } = {}) {
  const name = `p${run}${++sequence}`.slice(0, 32);
  const [user] = await db.insert(users).values({
    username: name,
    name,
    email: `${name}@example.test`,
    emailVerified: verified,
  });
  return user.insertId;
}

/** Pago pendiente nuevo y su vista. */
async function pending(userId: number) {
  const started = await startTopup(userId, pack.id);
  if (!started.ok) throw new Error(started.problem);
  return (await getPayment(userId, started.providerPaymentId))!;
}

const balanceOf = async (userId: number) =>
  (await db.select({ b: users.apBalance }).from(users).where(eq(users.id, userId)))[0]!.b;
const ledgerOf = (userId: number) =>
  db
    .select({ delta: apLedger.delta, balanceAfter: apLedger.balanceAfter })
    .from(apLedger)
    .where(eq(apLedger.userId, userId))
    .orderBy(apLedger.id);

/** Aviso firmado como lo enviaría la pasarela. */
function notification(
  payment: { providerPaymentId: string; amountCents: number; currency: string },
  overrides: Record<string, unknown> = {},
) {
  const body = JSON.stringify({
    provider_payment_id: payment.providerPaymentId,
    status: "paid",
    amount_cents: payment.amountCents,
    currency: payment.currency,
    ...overrides,
  });
  return { body, header: signatureHeader(body, webhookSecret()) };
}

beforeAll(async () => {
  const [row] = await db.select().from(topupPackages).where(eq(topupPackages.isActive, 1)).limit(1);
  if (!row) throw new Error("Faltan paquetes de recarga: ejecuta `pnpm db:seed:demo`.");
  pack = row;
});

afterAll(async () => {
  const client = db.$client as unknown as { end(): Promise<void> };
  await client.end();
});

describe("recarga de AP", () => {
  it("el aviso firmado acredita los AP, apunta el movimiento y marca el pago", async () => {
    const userId = await account();
    const payment = await pending(userId);
    expect(payment.status).toBe("pending");
    expect(await balanceOf(userId)).toBe(0);

    expect(await mockGatewayNotify(payment, "paid")).toEqual({ status: 200, outcome: "credited" });
    expect(await balanceOf(userId)).toBe(pack.apAmount);
    expect((await getPayment(userId, payment.providerPaymentId))!.status).toBe("paid");
    const ledger = await ledgerOf(userId);
    expect(ledger).toEqual([{ delta: pack.apAmount, balanceAfter: pack.apAmount }]);
  });

  it("un aviso repetido acredita una sola vez (CA de RF-06)", async () => {
    const userId = await account();
    const payment = await pending(userId);
    const { body, header } = notification(payment);

    expect(await receiveNotification("mock", body, header)).toMatchObject({ status: 200 });
    expect(await receiveNotification("mock", body, header)).toEqual({
      status: 200,
      outcome: "duplicate",
    });
    expect(await balanceOf(userId)).toBe(pack.apAmount);
  });

  it("cinco avisos iguales a la vez acreditan una sola vez", async () => {
    const userId = await account();
    const payment = await pending(userId);
    const { body, header } = notification(payment);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => receiveNotification("mock", body, header)),
    );
    expect(results.map((r) => r.outcome).sort()).toEqual([
      "credited",
      "duplicate",
      "duplicate",
      "duplicate",
      "duplicate",
    ]);
    expect(await balanceOf(userId)).toBe(pack.apAmount);
    expect(isConsistent(await ledgerOf(userId))).toBe(true);
  });

  it("rechaza una firma falsa, un importe distinto y un pago que no existe", async () => {
    const userId = await account();
    const payment = await pending(userId);
    const { body } = notification(payment);

    expect(await receiveNotification("mock", body, signatureHeader(body, "z".repeat(40)))).toEqual({
      status: 401,
    });
    expect(await receiveNotification("mock", body, null)).toEqual({ status: 401 });
    const cheaper = notification(payment, { amount_cents: 1 });
    expect(await receiveNotification("mock", cheaper.body, cheaper.header)).toMatchObject({
      status: 409,
    });
    const ghost = notification({ ...payment, providerPaymentId: "no-existe" });
    expect(await receiveNotification("mock", ghost.body, ghost.header)).toMatchObject({
      status: 404,
    });
    const broken = notification(payment, { status: "maybe" });
    expect(await receiveNotification("mock", broken.body, broken.header)).toEqual({
      status: 400,
    });
    expect(await balanceOf(userId)).toBe(0);
  });

  it("un pago fallido no acredita y ya no puede pasar a pagado", async () => {
    const userId = await account();
    const payment = await pending(userId);
    expect(await mockGatewayNotify(payment, "failed")).toEqual({ status: 200, outcome: "failed" });
    expect(await mockGatewayNotify(payment, "paid")).toMatchObject({ outcome: "duplicate" });
    expect(await balanceOf(userId)).toBe(0);
    const [row] = await db
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.providerPaymentId, payment.providerPaymentId));
    expect(row!.status).toBe("failed");
  });

  it("sin correo confirmado no se puede empezar una recarga", async () => {
    const userId = await account({ verified: false });
    expect(await startTopup(userId, pack.id)).toEqual({ ok: false, problem: "unverified" });
    expect(await startTopup(await account(), 999_999)).toEqual({ ok: false, problem: "package" });
  });

  it("un jugador no ve el pago de otro", async () => {
    const payment = await pending(await account());
    expect(await getPayment(await account(), payment.providerPaymentId)).toBeNull();
  });
});
