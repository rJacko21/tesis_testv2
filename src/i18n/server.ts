/**
 * Acceso a las traducciones desde Server Components.
 *
 * El idioma se lee de la URL con `next/root-params` (el segmento
 * `[locale]` está antes del layout raíz), así que ningún componente tiene
 * que recibir el idioma por props. Ese import solo funciona en el servidor:
 * usarlo en un Client Component falla al compilar.
 *
 * Los Client Components reciben ya traducidos los textos que necesitan, así
 * el navegador no descarga catálogos ni el motor ICU (menos JS, RNF-01).
 */
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { cache } from "react";

import { isLocale, type Locale } from "@/config/locales";

import { catalogLoaders } from "./catalog";
import { createTranslator, type Translate } from "./translator";

/**
 * Idioma de la petición actual.
 *
 * Responde 404 si el segmento no es un idioma admitido, por ejemplo `/xx`.
 */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!isLocale(value)) notFound();
  return value;
}

/**
 * Traductor del idioma actual. `cache` lo memoriza durante la petición:
 * todos los componentes de una misma página comparten los mensajes ya
 * compilados.
 */
export const getTranslator = cache(async (): Promise<Translate> => {
  const locale = await getLocale();
  return createTranslator(locale, await catalogLoaders[locale]());
});
