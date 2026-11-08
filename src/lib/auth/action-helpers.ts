/**
 * Piezas comunes de las Server Actions de cuenta (`auth/actions.ts` y
 * `account/actions.ts`). Están aparte porque un archivo `"use server"` solo
 * puede exportar acciones.
 */
import "server-only";

import { isLocale, type Locale } from "@/config/locales";
import { catalogLoaders } from "@/i18n/catalog";
import { createTranslator, type Translate } from "@/i18n/translator";

import type { FormState } from "./form-state";
import { PASSWORD_MAX, PASSWORD_MIN } from "./password";
import { consumeRateLimit } from "./rate-limit";

/** Idioma de la página que envió el formulario (campo oculto `locale`). */
export async function formLocale(form: FormData): Promise<{ locale: Locale; t: Translate }> {
  const value = form.get("locale");
  const locale: Locale = typeof value === "string" && isLocale(value) ? value : "en";
  return { locale, t: createTranslator(locale, await catalogLoaders[locale]()) };
}

/** Valor de texto de un campo; cadena vacía si falta o es un archivo. */
export const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

/** Comprueba un límite y, si se supera, devuelve el error para el formulario. */
export async function limited(key: string, windowSeconds: number, max: number, t: Translate) {
  const result = await consumeRateLimit(key, windowSeconds, max);
  if (result.allowed) return null;
  return {
    status: "error",
    message: t("auth.errors.rateLimited", { minutes: minutes(result.retryAfter) }),
  } satisfies FormState;
}

/**
 * Comprueba que el campo de confirmación repite el valor (contraseña o correo
 * nuevos). Si no coinciden, devuelve el error para ese campo.
 */
export function mismatch(value: string, repeated: string, message: string): string | null {
  return value === repeated ? null : message;
}

/** Errores de longitud de la contraseña nueva, o `null`. */
export function passwordError(password: string, t: Translate): string | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return t("auth.errors.passwordLength", { min: PASSWORD_MIN, max: PASSWORD_MAX });
  }
  return null;
}
