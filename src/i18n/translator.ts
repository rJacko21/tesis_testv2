/**
 * Traductor: convierte una clave y unos valores en el texto final.
 *
 * Los mensajes usan sintaxis ICU MessageFormat, que resuelve plurales,
 * géneros y formatos de número/fecha según las reglas de cada idioma
 * (por ejemplo, el turco y el francés pluralizan distinto que el inglés).
 * Es una función pura, sin dependencias de Next.js, para poder testearla.
 *
 * @see RNF-04 (pluralización ICU, formatos con Intl)
 */
import { IntlMessageFormat, type PrimitiveType } from "intl-messageformat";

import type { Locale } from "@/config/locales";

import type { MessageKey, Messages } from "./catalog";

/** Valores que se pueden interpolar en un mensaje: `{year}`, `{count}`… */
export type MessageValues = Record<string, PrimitiveType>;

/** Función de traducción ligada a un idioma. */
export type Translate = (key: MessageKey, values?: MessageValues) => string;

/**
 * Obtiene el texto bruto de una clave con puntos.
 *
 * @throws Error si la clave no existe. No debería ocurrir (el tipo
 *   {@link MessageKey} y `i18n:check` lo impiden), pero si pasa se prefiere
 *   un error visible a mostrar un texto vacío al usuario.
 */
function lookup(messages: Messages, key: MessageKey): string {
  let value: unknown = messages;
  for (const part of key.split(".")) {
    value =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof value !== "string") throw new Error(`Falta la traducción "${key}"`);
  return value;
}

/**
 * Crea una función de traducción para un idioma.
 *
 * Cada mensaje se compila una sola vez y se reutiliza, porque compilar ICU
 * es lo más costoso del proceso.
 *
 * @param locale - Idioma que determina las reglas de plural y formato.
 * @param messages - Catálogo de ese idioma.
 * @returns Una función `t(clave, valores?)`.
 */
export function createTranslator(locale: Locale, messages: Messages): Translate {
  const compiled = new Map<MessageKey, IntlMessageFormat>();

  return (key, values) => {
    let format = compiled.get(key);
    if (!format) {
      format = new IntlMessageFormat(lookup(messages, key), locale);
      compiled.set(key, format);
    }
    return String(format.format(values));
  };
}
