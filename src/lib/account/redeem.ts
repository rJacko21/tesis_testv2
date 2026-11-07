/**
 * Canje de códigos promocionales (RF-13).
 *
 * Un código da AP o un objeto. Todo pasa en una transacción:
 * 1. Se bloquea la fila del código (`FOR UPDATE`): dos canjes del mismo
 *    código se hacen uno detrás de otro, así que el límite de usos totales
 *    no se puede pasar con peticiones simultáneas.
 * 2. Se comprueba que está activo, que la cuenta no lo ha usado y que
 *    quedan usos (`redeemProblem`, función pura con pruebas).
 * 3. Se guarda el uso. La restricción única `(code_id, user_id)` impide
 *    canjearlo dos veces aunque todo lo anterior fallase.
 * 4. Si da AP, se apunta en el libro mayor con la fila del usuario
 *    bloqueada, igual que una compra (RF-05).
 *
 * @see RF-13 · 04-arquitectura §4 (`redeem_codes`, `redeem_uses`, `ap_ledger`)
 */
import "server-only";

import { and, count, eq, sql } from "drizzle-orm";

import type { Locale } from "@/config/locales";
import {
  apLedger,
  characters,
  redeemCodes,
  redeemUses,
  shopItemTranslations,
  users,
} from "@/db/schema";
import { applyDelta } from "@/db/seed/ledger";

/** Longitud y caracteres de un código: letras, números y guiones. */
export const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

/** Mayúsculas y sin espacios: «welcome 2026» y «WELCOME2026» son el mismo código. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type RedeemProblem = "invalid" | "expired" | "used" | "exhausted";

export interface CodeState {
  startsAt: Date;
  endsAt: Date | null;
  maxUses: number | null;
  /** Usos de todas las cuentas. */
  totalUses: number;
  /** La cuenta ya lo ha usado. */
  usedByAccount: boolean;
}

/** Por qué no se puede canjear un código, o `null` si se puede. */
export function redeemProblem(code: CodeState | null, now: Date): RedeemProblem | null {
  if (!code || code.startsAt > now) return "invalid";
  if (code.endsAt && code.endsAt <= now) return "expired";
  if (code.usedByAccount) return "used";
  if (code.maxUses !== null && code.totalUses >= code.maxUses) return "exhausted";
  return null;
}

export type RedeemResult =
  | { ok: false; problem: RedeemProblem | "character" }
  | { ok: true; reward: "ap"; amount: number; balance: number }
  | { ok: true; reward: "item"; item: string; character: string };

/** Error que deshace la transacción y se devuelve como resultado. */
class Rejected extends Error {
  constructor(readonly problem: RedeemProblem | "character") {
    super(problem);
  }
}

/**
 * Canjea un código para una cuenta.
 *
 * @param characterId - Personaje que recibe el objeto; solo se usa si el
 *   código da un objeto, y debe ser de la cuenta.
 */
export async function redeemCode(
  userId: number,
  rawCode: string,
  characterId: number | null,
  locale: Locale,
): Promise<RedeemResult> {
  const { db } = await import("@/db/client");
  const code = normalizeCode(rawCode);
  if (!CODE_PATTERN.test(code)) return { ok: false, problem: "invalid" };

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(redeemCodes)
        .where(eq(redeemCodes.code, code))
        .for("update");
      const [[uses], [mine]] = row
        ? await Promise.all([
            tx.select({ total: count() }).from(redeemUses).where(eq(redeemUses.codeId, row.id)),
            tx
              .select({ total: count() })
              .from(redeemUses)
              .where(and(eq(redeemUses.codeId, row.id), eq(redeemUses.userId, userId))),
          ])
        : [[undefined], [undefined]];
      const problem = redeemProblem(
        row
          ? {
              startsAt: row.startsAt,
              endsAt: row.endsAt,
              maxUses: row.maxUses,
              totalUses: uses?.total ?? 0,
              usedByAccount: (mine?.total ?? 0) > 0,
            }
          : null,
        new Date(),
      );
      if (problem || !row) throw new Rejected(problem ?? "invalid");

      // Un objeto necesita un personaje de esta cuenta que lo reciba.
      let character: { id: number; name: string } | undefined;
      if (row.rewardType === "item") {
        [character] = characterId
          ? await tx
              .select({ id: characters.id, name: characters.name })
              .from(characters)
              .where(and(eq(characters.id, characterId), eq(characters.userId, userId)))
          : [];
        if (!character) throw new Rejected("character");
      }

      const [use] = await tx.insert(redeemUses).values({
        codeId: row.id,
        userId,
        characterId: character?.id ?? null,
        usedAt: new Date(),
      });

      if (row.rewardType === "ap") {
        const amount = row.rewardAp ?? 0;
        const [user] = await tx
          .select({ balance: users.apBalance })
          .from(users)
          .where(eq(users.id, userId))
          .for("update");
        const entry = applyDelta(user?.balance ?? 0, amount);
        await tx.insert(apLedger).values({
          userId,
          delta: entry.delta,
          reason: "redeem",
          referenceId: use.insertId,
          balanceAfter: entry.balanceAfter,
        });
        await tx.update(users).set({ apBalance: entry.balanceAfter }).where(eq(users.id, userId));
        return { ok: true, reward: "ap", amount, balance: entry.balanceAfter } as const;
      }

      const [item] = await tx
        .select({ name: shopItemTranslations.name })
        .from(shopItemTranslations)
        .where(
          and(
            eq(shopItemTranslations.itemId, row.rewardItemId ?? 0),
            sql`${shopItemTranslations.locale} in (${locale}, 'en')`,
          ),
        )
        .orderBy(sql`${shopItemTranslations.locale} = 'en'`);
      return {
        ok: true,
        reward: "item",
        item: item?.name ?? "?",
        character: character!.name,
      } as const;
    });
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    // Dos canjes simultáneos de la misma cuenta: el segundo choca con la restricción única.
    if ((error as { cause?: { code?: string } }).cause?.code === "ER_DUP_ENTRY") {
      return { ok: false, problem: "used" };
    }
    throw error;
  }
}
