"use server";
/**
 * Server Actions de cuenta (RF-03): registro, inicio y cierre de sesión,
 * recuperación de contraseña y reenvío de la verificación.
 *
 * Cada acción sigue el mismo orden:
 * 1. Validar la entrada con Zod (el navegador ya valida, pero no se confía).
 * 2. Aplicar los límites de intentos antes de tocar contraseñas o correos.
 * 3. Llamar a Better Auth (`auth.api.*`).
 * 4. Responder con textos traducidos que no revelan si una cuenta existe.
 *
 * Los formularios funcionan sin JavaScript: el navegador envía el
 * formulario, la acción se ejecuta y la página vuelve con el resultado.
 */
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isLocale, type Locale } from "@/config/locales";
import { catalogLoaders } from "@/i18n/catalog";
import { createTranslator, type Translate } from "@/i18n/translator";

import { auth } from "./auth";
import type { FormState } from "./form-state";
import { loginLockMinutes, recordLoginAttempt } from "./login-guard";
import { isPwnedPassword, PASSWORD_MAX, PASSWORD_MIN } from "./password";
import { consumeRateLimit } from "./rate-limit";
import { safeNext } from "./redirect";
import { clientIp } from "./request";
import { isValidUsername, USERNAME_MAX, USERNAME_MIN } from "./username";

/** Idioma de la página que envió el formulario (campo oculto `locale`). */
async function formLocale(form: FormData): Promise<{ locale: Locale; t: Translate }> {
  const value = form.get("locale");
  const locale: Locale = typeof value === "string" && isLocale(value) ? value : "en";
  return { locale, t: createTranslator(locale, await catalogLoaders[locale]()) };
}

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

/** Comprueba un límite y, si se supera, devuelve el error para el formulario. */
async function limited(key: string, windowSeconds: number, max: number, t: Translate) {
  const result = await consumeRateLimit(key, windowSeconds, max);
  if (result.allowed) return null;
  return {
    status: "error",
    message: t("auth.errors.rateLimited", { minutes: minutes(result.retryAfter) }),
  } satisfies FormState;
}

/** Errores de longitud de la contraseña nueva, o `null`. */
function passwordError(password: string, t: Translate): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return t("auth.errors.passwordLength", { min: PASSWORD_MIN, max: PASSWORD_MAX });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

/**
 * Crea una cuenta y envía el correo de verificación.
 *
 * Con un correo ya registrado responde exactamente igual que con uno nuevo
 * y avisa por correo al dueño (`onExistingUserSignUp`): así el formulario
 * no sirve para averiguar quién tiene cuenta.
 */
export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const username = text(form, "username").trim();
  const email = text(form, "email").trim().toLowerCase();
  const password = text(form, "password");
  const values = { username, email };
  const sent: FormState = { status: "success", message: t("auth.register.sentBody", { email }) };

  // Trampa para bots: un campo oculto que una persona nunca rellena.
  if (text(form, "website") !== "") return sent;

  const fields: Record<string, string> = {};
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    fields.username = t("auth.errors.usernameLength", { min: USERNAME_MIN, max: USERNAME_MAX });
  } else if (!isValidUsername(username)) {
    fields.username = t("auth.errors.usernameFormat");
  }
  if (!z.email().safeParse(email).success) fields.email = t("auth.errors.email");
  const passwordProblem = passwordError(password, t);
  if (passwordProblem) fields.password = passwordProblem;
  if (form.get("terms") !== "on") fields.terms = t("auth.errors.terms");
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: t("auth.errorSummary"), fields, values };
  }

  const ip = await clientIp();
  const blocked = await limited(`signup:ip:${ip}`, 60 * 60, 10, t);
  if (blocked) return { ...blocked, values };

  if (await isPwnedPassword(password)) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { password: t("auth.errors.pwned") },
      values,
    };
  }

  try {
    await auth.api.signUpEmail({
      body: { email, password, name: username, username, displayUsername: username, locale },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USERNAME_IS_ALREADY_TAKEN") {
      return {
        status: "error",
        message: t("auth.errorSummary"),
        fields: { username: t("auth.errors.usernameTaken") },
        values,
      };
    }
    console.error("[auth] Error al registrar:", error);
    return { status: "error", message: t("auth.errors.generic"), values };
  }
  return sent;
}

// ---------------------------------------------------------------------------
// Inicio y cierre de sesión
// ---------------------------------------------------------------------------

/**
 * Inicia sesión con nombre de cuenta o correo.
 *
 * Cualquier fallo (cuenta inexistente, contraseña errónea, cuenta
 * suspendida) da el mismo mensaje. Tras 5 fallos en 15 minutos para la
 * misma cuenta, o 20 desde la misma IP, hay que esperar (RF-03).
 */
export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const identifier = text(form, "identifier").trim();
  const password = text(form, "password");
  const values = { identifier };

  if (identifier === "" || password === "") {
    const fields: Record<string, string> = {};
    if (identifier === "") fields.identifier = t("auth.errors.required");
    if (password === "") fields.password = t("auth.errors.required");
    return { status: "error", message: t("auth.errorSummary"), fields, values };
  }

  const ip = await clientIp();
  const lock = await loginLockMinutes(identifier, ip);
  if (lock > 0) {
    return { status: "error", message: t("auth.errors.locked", { minutes: lock }), values };
  }

  try {
    const requestHeaders = await headers();
    if (identifier.includes("@")) {
      await auth.api.signInEmail({
        body: { email: identifier.toLowerCase(), password },
        headers: requestHeaders,
      });
    } else {
      await auth.api.signInUsername({
        body: { username: identifier, password },
        headers: requestHeaders,
      });
    }
  } catch (error) {
    if (!(error instanceof APIError)) console.error("[auth] Error al iniciar sesión:", error);
    await recordLoginAttempt(identifier, ip, false);
    return { status: "error", message: t("auth.errors.credentials"), values };
  }

  await recordLoginAttempt(identifier, ip, true);
  redirect(safeNext(text(form, "next"), locale));
}

/** Cierra la sesión actual y vuelve a la portada. */
export async function signOutAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Sin sesión no hay nada que cerrar.
  }
  redirect(`/${locale}`);
}

// ---------------------------------------------------------------------------
// Recuperar la contraseña
// ---------------------------------------------------------------------------

/**
 * Envía el enlace de recuperación. Responde siempre lo mismo, exista o no
 * la cuenta (criterio de aceptación de RF-03).
 */
export async function requestPasswordResetAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { t } = await formLocale(form);
  const email = text(form, "email").trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { email: t("auth.errors.email") },
      values: { email },
    };
  }

  const ip = await clientIp();
  const blockedIp = await limited(`reset:ip:${ip}`, 15 * 60, 10, t);
  if (blockedIp) return { ...blockedIp, values: { email } };

  // Al superar el límite de un correo se responde igual que siempre, pero
  // sin enviar nada: un mensaje distinto delataría que ese correo existe o
  // que alguien lo está usando, y así nadie puede llenar el buzón de otro.
  const perEmail = await consumeRateLimit(`reset:email:${email}`, 60 * 60, 3);
  if (perEmail.allowed) {
    try {
      await auth.api.requestPasswordReset({ body: { email }, headers: await headers() });
    } catch (error) {
      console.error("[auth] Error al pedir la recuperación:", error);
    }
  }
  return { status: "success", message: t("auth.forgot.sent") };
}

/** Guarda la contraseña nueva con el token del enlace. */
export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { t } = await formLocale(form);
  const token = text(form, "token");
  const password = text(form, "password");

  const problem = passwordError(password, t);
  if (problem) {
    return { status: "error", message: t("auth.errorSummary"), fields: { password: problem } };
  }
  const ip = await clientIp();
  const blocked = await limited(`reset-confirm:ip:${ip}`, 15 * 60, 10, t);
  if (blocked) return blocked;
  if (await isPwnedPassword(password)) {
    return {
      status: "error",
      message: t("auth.errorSummary"),
      fields: { password: t("auth.errors.pwned") },
    };
  }

  try {
    await auth.api.resetPassword({ body: { newPassword: password, token } });
  } catch (error) {
    if (!(error instanceof APIError))
      console.error("[auth] Error al cambiar la contraseña:", error);
    return { status: "error", message: t("auth.reset.invalid") };
  }
  return { status: "success", message: t("auth.reset.done") };
}

// ---------------------------------------------------------------------------
// Verificación del correo
// ---------------------------------------------------------------------------

/** Vuelve a enviar el enlace de verificación al usuario con sesión. */
export async function resendVerificationAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { t } = await formLocale(form);
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { status: "error", message: t("auth.errors.generic") };

  const blocked = await limited(`verify:user:${session.user.id}`, 60 * 60, 3, t);
  if (blocked) return blocked;
  try {
    await auth.api.sendVerificationEmail({
      body: { email: session.user.email },
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("[auth] Error al reenviar la verificación:", error);
    return { status: "error", message: t("auth.errors.generic") };
  }
  return { status: "success", message: t("auth.account.resent") };
}
