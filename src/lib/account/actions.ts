"use server";
/**
 * Server Actions de «Mi cuenta» (RF-04): cambiar la contraseña y el correo,
 * cerrar sesiones abiertas, canjear códigos (RF-13) y borrar la cuenta
 * (RGPD, art. 17).
 *
 * Siguen el orden de `auth/actions.ts`: validar, limitar intentos, llamar a
 * Better Auth y responder con textos traducidos. Además:
 * - **Todas exigen sesión** y actúan solo sobre la cuenta de esa sesión.
 * - **Cambiar el correo o la contraseña pide la contraseña actual.** Quien
 *   use una sesión robada o un ordenador ajeno abierto no puede quedarse
 *   con la cuenta (OWASP ASVS V2.1.6 y V3.7.1).
 * - **El correo actual recibe un aviso** de cada cambio, con un enlace para
 *   recuperar la contraseña si no fue su dueño (ASVS V2.2.3).
 */
import { and, eq, ne } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SITE_URL } from "@/config/site";
import { accounts, sessions } from "@/db/schema";
import type { Locale } from "@/config/locales";
import { formLocale, limited, mismatch, passwordError, text } from "@/lib/auth/action-helpers";
import { auth } from "@/lib/auth/auth";
import type { FormState } from "@/lib/auth/form-state";
import { isPwnedPassword, PASSWORD_MAX, verifyPassword } from "@/lib/auth/password";
import { consumeRateLimit, peekRateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request";
import { sendMail } from "@/lib/mail/send";
import { securityNoticeMessage } from "@/lib/mail/templates";

import { deleteAccount } from "./privacy";
import { redeemCode } from "./redeem";

type SessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/** Destinatario de los avisos: el correo actual de la cuenta. */
function noticeRecipient(user: SessionData["user"], locale: Locale) {
  const display = (user as { displayUsername?: string | null }).displayUsername ?? user.name;
  return { email: user.email, name: display, locale };
}

/** Envía un aviso de seguridad sin que un fallo del correo deshaga el cambio. */
async function notify(
  user: SessionData["user"],
  locale: Locale,
  kind: "emailChange" | "passwordChanged",
  newEmail?: string,
) {
  try {
    const url = `${SITE_URL}/${locale}/forgot-password`;
    await sendMail(await securityNoticeMessage(noticeRecipient(user, locale), kind, url, newEmail));
  } catch (error) {
    console.error("[account] No se pudo enviar el aviso de seguridad:", error);
  }
}

/** Comprueba la contraseña actual contra el hash guardado. */
async function checkCurrentPassword(userId: number, password: string): Promise<boolean> {
  if (password === "" || password.length > PASSWORD_MAX) return false;
  const { db } = await import("@/db/client");
  const [row] = await db
    .select({ hash: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")));
  return row?.hash ? verifyPassword({ hash: row.hash, password }) : false;
}

// ---------------------------------------------------------------------------
// Contraseña
// ---------------------------------------------------------------------------

/**
 * Cambia la contraseña. Pide la actual, aplica las reglas de M-22 a la nueva
 * y cierra las demás sesiones: si alguien más tenía la cuenta abierta,
 * deja de tenerla.
 */
export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { status: "error", message: t("account.errors.session") };

  const current = text(form, "currentPassword");
  const next = text(form, "newPassword");
  const fields: Record<string, string> = {};
  if (current === "") fields.currentPassword = t("auth.errors.required");
  const problem = passwordError(next, t);
  if (problem) fields.newPassword = problem;
  else if (next === current) fields.newPassword = t("account.errors.samePassword");
  const repeated = mismatch(next, text(form, "confirmPassword"), t("auth.errors.passwordMismatch"));
  if (repeated) fields.confirmPassword = repeated;
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: t("auth.errorSummary"), fields };
  }

  // 5 intentos cada 15 minutos: con una sesión robada no se puede probar
  // contraseñas actuales una tras otra.
  const blocked = await limited(`password:user:${session.user.id}`, 15 * 60, 5, t);
  if (blocked) return blocked;
  if (await isPwnedPassword(next)) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { newPassword: t("auth.errors.pwned") },
    };
  }

  try {
    await auth.api.changePassword({
      body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
      return {
        status: "error",
        message: t("auth.errorSummary"),
        fields: { currentPassword: t("account.errors.currentPassword") },
      };
    }
    console.error("[account] Error al cambiar la contraseña:", error);
    return { status: "error", message: t("auth.errors.generic") };
  }

  await notify(session.user, locale, "passwordChanged");
  return { status: "success", message: t("account.security.passwordChanged") };
}

// ---------------------------------------------------------------------------
// Correo
// ---------------------------------------------------------------------------

/**
 * Pide cambiar el correo: envía un enlace al correo nuevo y un aviso al
 * actual. El correo de la cuenta no cambia hasta abrir el enlace.
 *
 * Si el correo nuevo ya es de otra cuenta, Better Auth no envía nada y
 * responde igual: el formulario no sirve para averiguar quién tiene cuenta.
 */
export async function changeEmailAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { status: "error", message: t("account.errors.session") };

  const newEmail = text(form, "newEmail").trim().toLowerCase();
  const password = text(form, "password");
  const values = { newEmail, confirmEmail: text(form, "confirmEmail") };
  const fields: Record<string, string> = {};
  if (!z.email().safeParse(newEmail).success) fields.newEmail = t("auth.errors.email");
  else if (newEmail === session.user.email) fields.newEmail = t("account.errors.sameEmail");
  const repeated = mismatch(
    newEmail,
    text(form, "confirmEmail").trim().toLowerCase(),
    t("account.errors.emailMismatch"),
  );
  if (repeated) fields.confirmEmail = repeated;
  if (password === "") fields.password = t("auth.errors.required");
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: t("auth.errorSummary"), fields, values };
  }

  const blocked = await limited(`email-change:user:${session.user.id}`, 60 * 60, 5, t);
  if (blocked) return { ...blocked, values };
  if (!(await checkCurrentPassword(Number(session.user.id), password))) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { password: t("account.errors.currentPassword") },
      values,
    };
  }

  try {
    await auth.api.changeEmail({ body: { newEmail }, headers: requestHeaders });
  } catch (error) {
    console.error("[account] Error al cambiar el correo:", error);
    return { status: "error", message: t("auth.errors.generic"), values };
  }

  await notify(session.user, locale, "emailChange", newEmail);
  return { status: "success", message: t("account.security.emailSent", { email: newEmail }) };
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

/**
 * Cierra una sesión de la lista, o todas menos la actual (`sessionId` =
 * `others`). Solo borra sesiones de la cuenta de la sesión actual, nunca la
 * actual (para eso está «Cerrar sesión»).
 */
export async function revokeSessionAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const back = `/${locale}/account/security`;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);

  const target = text(form, "sessionId");
  const userId = Number(session.user.id);
  const currentId = Number(session.session.id);
  const { db } = await import("@/db/client");

  if (target === "others") {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, currentId)));
  } else if (/^\d+$/.test(target) && Number(target) !== currentId) {
    await db
      .delete(sessions)
      .where(and(eq(sessions.id, Number(target)), eq(sessions.userId, userId)));
  }
  redirect(`${back}?closed=1#sessions`);
}

// ---------------------------------------------------------------------------
// Canjear código (RF-13)
// ---------------------------------------------------------------------------

/** Códigos no válidos permitidos antes de bloquear (CA de RF-13: 10 en 10 minutos). */
const REDEEM_FAILURES = 10;
const REDEEM_WINDOW_SECONDS = 10 * 60;

/**
 * Canjea un código para la cuenta de la sesión.
 *
 * Solo cuentan los fallos: tras 10 códigos no válidos en 10 minutos, por
 * cuenta o por IP, hay que esperar (anti fuerza bruta). Un código válido no
 * suma, así que canjear varios seguidos nunca bloquea.
 */
export async function redeemCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { status: "error", message: t("account.errors.session") };

  const code = text(form, "code").trim();
  const character = text(form, "character");
  const values = { code, character };
  if (code === "") {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { code: t("auth.errors.required") },
      values,
    };
  }

  const keys = [`redeem:user:${session.user.id}`, `redeem:ip:${await clientIp()}`];
  const checks = await Promise.all(
    keys.map((key) => peekRateLimit(key, REDEEM_WINDOW_SECONDS, REDEEM_FAILURES)),
  );
  const locked = checks.find((check) => !check.allowed);
  if (locked) {
    return {
      status: "error",
      message: t("auth.errors.rateLimited", {
        minutes: Math.max(1, Math.ceil(locked.retryAfter / 60)),
      }),
      values,
    };
  }

  const result = await redeemCode(
    Number(session.user.id),
    code,
    /^\d+$/.test(character) ? Number(character) : null,
    locale,
  );
  if (!result.ok) {
    if (result.problem === "invalid") {
      await Promise.all(
        keys.map((key) => consumeRateLimit(key, REDEEM_WINDOW_SECONDS, REDEEM_FAILURES)),
      );
    }
    // Formulario de un solo campo: el aviso dice ya el motivo. Solo se marca
    // el selector de personaje, cuando existe (si no hay personajes, no se pinta).
    const withSelect = form.has("character");
    const message =
      result.problem === "character" && !withSelect
        ? t("account.redeem.errors.noCharacters")
        : t(`account.redeem.errors.${result.problem}`);
    return {
      status: "error",
      message,
      fields: result.problem === "character" && withSelect ? { character: message } : {},
      values,
    };
  }
  return {
    status: "success",
    message:
      result.reward === "ap"
        ? t("account.redeem.okAp", { amount: result.amount, balance: result.balance })
        : t("account.redeem.okItem", { item: result.item, character: result.character }),
  };
}

// ---------------------------------------------------------------------------
// Borrar la cuenta (RGPD)
// ---------------------------------------------------------------------------

/**
 * Borra la cuenta tras pedir la contraseña y una confirmación expresa.
 * Después lleva a iniciar sesión con un aviso de que se ha borrado.
 */
export async function deleteAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { status: "error", message: t("account.errors.session") };

  const password = text(form, "password");
  const fields: Record<string, string> = {};
  if (password === "") fields.password = t("auth.errors.required");
  if (form.get("confirm") !== "on") fields.confirm = t("account.privacy.errors.confirm");
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: t("auth.errorSummary"), fields };
  }

  const blocked = await limited(`delete:user:${session.user.id}`, 15 * 60, 5, t);
  if (blocked) return blocked;
  const userId = Number(session.user.id);
  if (!(await checkCurrentPassword(userId, password))) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { password: t("account.errors.currentPassword") },
    };
  }

  await deleteAccount(userId);
  redirect(`/${locale}/sign-in?deleted=1`);
}
