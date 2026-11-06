/**
 * Bloqueo temporal tras fallos de inicio de sesión (criterio de
 * aceptación de RF-03: 5 intentos fallidos en 15 minutos → esperar).
 *
 * Se cuenta **por cuenta** (lo que se escribió en «usuario o correo») y
 * **por IP**. Por cuenta frena a quien prueba contraseñas contra un jugador
 * desde muchas IP; por IP, a quien prueba muchas cuentas desde una. El
 * bloqueo dura lo que tarda en salir de la ventana el fallo más antiguo:
 * nunca es permanente, para que nadie pueda bloquear la cuenta de otro.
 *
 * Los intentos se guardan en `login_attempts`; la IP se borra a los 30 días
 * (RGPD, minimización).
 */
import "server-only";

import { and, count, eq, gte, lt, min, sql } from "drizzle-orm";

import { loginAttempts } from "@/db/schema";

/** Fallos permitidos por cuenta en la ventana. */
export const MAX_FAILURES_PER_ACCOUNT = 5;
/** Fallos permitidos por IP (más alto: una IP puede ser compartida, p. ej. un cibercafé). */
export const MAX_FAILURES_PER_IP = 20;
/** Ventana, en minutos. */
export const FAILURE_WINDOW_MINUTES = 15;

/** Normaliza lo escrito para que «Misaja» y «misaja » cuenten igual. */
export function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase().slice(0, 254);
}

/**
 * Minutos que hay que esperar antes de volver a intentarlo, o 0 si se puede.
 */
export async function loginLockMinutes(identifier: string, ip: string): Promise<number> {
  const { db } = await import("@/db/client");
  const since = sql`now(3) - interval ${FAILURE_WINDOW_MINUTES} minute`;
  const failed = and(eq(loginAttempts.succeeded, 0), gte(loginAttempts.attemptedAt, since));
  const [byAccount, byIp] = await Promise.all([
    db
      .select({ n: count(), oldest: min(loginAttempts.attemptedAt) })
      .from(loginAttempts)
      .where(and(failed, eq(loginAttempts.identifier, normalizeIdentifier(identifier)))),
    db
      .select({ n: count(), oldest: min(loginAttempts.attemptedAt) })
      .from(loginAttempts)
      .where(and(failed, eq(loginAttempts.ip, ip))),
  ]);

  const locked = [
    byAccount[0] && byAccount[0].n >= MAX_FAILURES_PER_ACCOUNT ? byAccount[0].oldest : null,
    byIp[0] && byIp[0].n >= MAX_FAILURES_PER_IP ? byIp[0].oldest : null,
  ].filter((d): d is Date => d instanceof Date);
  if (locked.length === 0) return 0;

  const releaseAt = Math.max(...locked.map((d) => d.getTime())) + FAILURE_WINDOW_MINUTES * 60_000;
  return Math.max(1, Math.ceil((releaseAt - Date.now()) / 60_000));
}

/** Guarda el resultado de un intento. Un acierto no borra los fallos: caducan solos. */
export async function recordLoginAttempt(identifier: string, ip: string, succeeded: boolean) {
  const { db } = await import("@/db/client");
  await db.insert(loginAttempts).values({
    identifier: normalizeIdentifier(identifier),
    ip,
    succeeded: succeeded ? 1 : 0,
    attemptedAt: new Date(),
  });
}

/** Borra los intentos de más de 30 días (RGPD). Lo llamará la tarea de limpieza. */
export async function purgeOldLoginAttempts() {
  const { db } = await import("@/db/client");
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, sql`now(3) - interval 30 day`));
}
