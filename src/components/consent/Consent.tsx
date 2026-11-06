/**
 * Envoltorio de servidor del consentimiento: traduce los textos y se los
 * pasa al componente de cliente, para no enviar el catálogo al navegador.
 *
 * @see RF-11
 */
import { getLocale, getTranslator } from "@/i18n/server";

import { ConsentManager, type ConsentTexts } from "./ConsentManager";

const KEYS = [
  "title",
  "body",
  "policyLink",
  "accept",
  "reject",
  "configure",
  "settingsTitle",
  "save",
  "close",
  "necessaryTitle",
  "necessaryBody",
  "analyticsTitle",
  "analyticsBody",
] as const satisfies readonly (keyof ConsentTexts)[];

export async function Consent() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const texts = Object.fromEntries(
    KEYS.map((key) => [key, t(`consent.${key}`)]),
  ) as unknown as ConsentTexts;
  return <ConsentManager texts={texts} policyHref={`/${locale}/cookies`} />;
}
