/**
 * Derechos del RGPD sobre la cuenta (RF-04): exportar los datos (art. 15 y
 * 20) y borrar la cuenta (art. 17).
 *
 * **Exportar** reúne en un JSON todo lo que la web guarda de la cuenta:
 * datos de la cuenta, personajes, compras, recargas, movimientos de AP,
 * códigos canjeados, sesiones e intentos de inicio de sesión. No incluye
 * hashes de contraseña ni tokens.
 *
 * **Borrar** no elimina las filas de compras, recargas y movimientos de AP:
 * son registros contables que hay que conservar (art. 17.3.b del RGPD y
 * § 147 AO en Alemania, sede de Giiku). Se hace en su lugar:
 * - la cuenta queda anonimizada (`deleted_<id>`, sin correo real) y con
 *   estado `deleted`, que no puede abrir sesión;
 * - se borran la contraseña, las sesiones, los tokens de correo y los
 *   intentos de inicio de sesión;
 * - los personajes dejan de estar unidos a la cuenta.
 * El nombre de cuenta y el correo quedan libres para otra cuenta.
 *
 * @see RF-04 · RNF-07 (RGPD)
 */
import "server-only";

import { asc, desc, eq, inArray, or } from "drizzle-orm";

import {
  accounts,
  apLedger,
  characters,
  loginAttempts,
  orderItems,
  orders,
  payments,
  redeemCodes,
  redeemUses,
  sessions,
  users,
  verifications,
} from "@/db/schema";

/** Versión del formato del archivo exportado. */
export const EXPORT_FORMAT = 1;

/** Todos los datos de la cuenta, listos para `JSON.stringify`. */
export async function exportAccountData(userId: number) {
  const { db } = await import("@/db/client");
  const [user] = await db
    .select({
      id: users.id,
      username: users.displayUsername,
      login: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      locale: users.locale,
      status: users.status,
      apBalance: users.apBalance,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(asc(orders.createdAt));
  const [lines, userPayments, ledger, codes, userCharacters, userSessions, attempts] =
    await Promise.all([
      userOrders.length
        ? db
            .select()
            .from(orderItems)
            .where(
              inArray(
                orderItems.orderId,
                userOrders.map((o) => o.id),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(asc(payments.createdAt)),
      db.select().from(apLedger).where(eq(apLedger.userId, userId)).orderBy(asc(apLedger.id)),
      db
        .select({
          code: redeemCodes.code,
          characterId: redeemUses.characterId,
          usedAt: redeemUses.usedAt,
        })
        .from(redeemUses)
        .innerJoin(redeemCodes, eq(redeemCodes.id, redeemUses.codeId))
        .where(eq(redeemUses.userId, userId)),
      db
        .select({
          id: characters.id,
          name: characters.name,
          serverId: characters.serverId,
          landLevel: characters.landLevel,
          seaLevel: characters.seaLevel,
        })
        .from(characters)
        .where(eq(characters.userId, userId)),
      db
        .select({
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt,
          expiresAt: sessions.expiresAt,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId)),
      db
        .select({
          identifier: loginAttempts.identifier,
          ip: loginAttempts.ip,
          succeeded: loginAttempts.succeeded,
          attemptedAt: loginAttempts.attemptedAt,
        })
        .from(loginAttempts)
        .where(attemptsOf(user.login, user.email))
        .orderBy(desc(loginAttempts.attemptedAt)),
    ]);

  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date(),
    account: { ...user, login: undefined },
    characters: userCharacters,
    orders: userOrders.map((order) => ({
      ...order,
      items: lines.filter((line) => line.orderId === order.id),
    })),
    payments: userPayments,
    apLedger: ledger,
    redeemedCodes: codes,
    sessions: userSessions,
    loginAttempts: attempts,
  };
}

/** Intentos de inicio de sesión con el nombre de cuenta o el correo. */
function attemptsOf(username: string, email: string) {
  return or(
    eq(loginAttempts.identifier, username.toLowerCase()),
    eq(loginAttempts.identifier, email.toLowerCase()),
  );
}

/** Anonimiza la cuenta y borra lo que no hay obligación de conservar. */
export async function deleteAccount(userId: number): Promise<void> {
  const { db } = await import("@/db/client");
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) return;

    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx
      .delete(verifications)
      .where(or(eq(verifications.identifier, user.email), eq(verifications.value, String(userId))));
    await tx.delete(loginAttempts).where(attemptsOf(user.username, user.email));
    await tx.update(characters).set({ userId: null }).where(eq(characters.userId, userId));
    await tx
      .update(users)
      .set({
        username: `deleted_${userId}`,
        displayUsername: null,
        name: `deleted_${userId}`,
        email: `deleted-${userId}@invalid`,
        emailVerified: false,
        image: null,
        status: "deleted",
      })
      .where(eq(users.id, userId));
  });
}
