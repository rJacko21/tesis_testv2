"use server";
/**
 * Server Actions de la tienda en el panel (RF-05, RF-12): artículos, textos,
 * precios y campañas. Solo `admin`.
 *
 * Mismo patrón que las noticias (M-36): los formularios devuelven errores
 * por campo sin perder lo escrito; si todo va bien, invalidan la caché de
 * la tienda (`updateTag("shop")`) y redirigen con el resultado en la URL.
 *
 * @see RF-05 · RF-12 · M-37
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { isLocale, LOCALES, type Locale } from "@/config/locales";
import { formLocale, text } from "@/lib/auth/action-helpers";
import type { FormState } from "@/lib/auth/form-state";
import { clientIp } from "@/lib/auth/request";
import type { Translate } from "@/i18n/translator";
import { SHOP_CACHE_TAG } from "@/lib/shop";

import {
  addPrice,
  endOrDeletePrice,
  listAdminCampaigns,
  listCategoryOptions,
  saveCampaign,
  saveItem,
  saveItemTranslation,
  type ShopResult,
} from "./shop";
import { parseCampaign, parseItem, parsePrice } from "./shop-rules";
import { adminPath, requireStaff } from "./staff";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);
const parseVersion = (value: string) => (/^\d{1,15}$/.test(value) ? Number(value) : null);
const itemPath = (locale: Locale, id: number) => adminPath(locale, `shop/${id}`);

/** Formulario con errores por campo, traducidos con el prefijo dado. */
function fieldErrors(
  t: Translate,
  problems: Record<string, string>,
  values: Record<string, string>,
): FormState {
  return {
    status: "error",
    message: t("admin.news.errorSummary"),
    fields: Object.fromEntries(
      Object.entries(problems).map(([field, problem]) => [
        field,
        t(`admin.shop.problems.${problem}` as Parameters<Translate>[0]),
      ]),
    ),
    values,
  };
}

const failure = (
  t: Translate,
  result: Extract<ShopResult, { ok: false }>,
  values: Record<string, string>,
): FormState => ({
  status: "error",
  message: t(`admin.shop.errors.${result.problem}`),
  values,
});

const ITEM_FIELDS = [
  "sku",
  "categoryId",
  "validityDays",
  "sortOrder",
  "isBundle",
  "isLimited",
  "isGiftable",
  "isActive",
] as const;

/** Crea (sin `id`) o guarda un artículo. */
export async function saveItemAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const staff = await requireStaff(
    locale,
    "shop",
    id ? itemPath(locale, id) : adminPath(locale, "shop/new"),
  );
  const values = Object.fromEntries(ITEM_FIELDS.map((name) => [name, text(form, name)])) as Record<
    (typeof ITEM_FIELDS)[number],
    string
  >;
  const categories = new Set((await listCategoryOptions(locale)).map((option) => option.id));
  const parsed = parseItem(values, categories);
  if (!parsed.ok) return fieldErrors(t, parsed.problems, values);
  const result = await saveItem({
    actorId: staff.id,
    id,
    input: parsed.value,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (!result.ok) return failure(t, result, values);
  updateTag(SHOP_CACHE_TAG);
  redirect(`${itemPath(locale, result.id)}?done=${id ? "saved" : "created"}`);
}

/** Guarda el nombre y la descripción en un idioma. */
export async function saveItemTextAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const lang = text(form, "lang");
  if (!id || !isLocale(lang)) redirect(adminPath(locale, "shop"));
  const staff = await requireStaff(locale, "shop", itemPath(locale, id));
  const values = {
    name: text(form, "name").trim(),
    description: text(form, "description").replace(/\r\n/g, "\n").trim(),
  };
  const problems: Record<string, string> = {};
  if (!values.name || values.name.length > 120) problems.name = "name";
  if (values.description.length > 2000) problems.description = "description";
  if (Object.keys(problems).length) return fieldErrors(t, problems, values);
  const result = await saveItemTranslation({
    actorId: staff.id,
    itemId: id,
    locale: lang,
    ...values,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (!result.ok) return failure(t, result, values);
  updateTag(SHOP_CACHE_TAG);
  redirect(`${itemPath(locale, id)}?lang=${lang}&done=text`);
}

const PRICE_FIELDS = ["priceAp", "salePriceAp", "campaignId", "startsAt", "endsAt"] as const;

/** Añade una fila de precio. */
export async function addPriceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  if (!id) redirect(adminPath(locale, "shop"));
  const staff = await requireStaff(locale, "shop", itemPath(locale, id));
  const values = Object.fromEntries(PRICE_FIELDS.map((name) => [name, text(form, name)])) as Record<
    (typeof PRICE_FIELDS)[number],
    string
  >;
  const parsed = parsePrice(values, await listAdminCampaigns(locale), new Date());
  if (!parsed.ok) return fieldErrors(t, parsed.problems, values);
  const result = await addPrice({
    actorId: staff.id,
    itemId: id,
    input: parsed.value,
    ip: await clientIp(),
  });
  if (!result.ok) return failure(t, result, values);
  updateTag(SHOP_CACHE_TAG);
  redirect(`${itemPath(locale, id)}?done=price`);
}

/** Termina una fila de precio activa o borra una que aún no ha empezado. */
export async function endPriceAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const priceId = parseId(text(form, "priceId"));
  if (!id || !priceId) redirect(adminPath(locale, "shop"));
  const staff = await requireStaff(locale, "shop", itemPath(locale, id));
  const result = await endOrDeletePrice({
    actorId: staff.id,
    itemId: id,
    priceId,
    ip: await clientIp(),
  });
  if (result.ok) updateTag(SHOP_CACHE_TAG);
  redirect(`${itemPath(locale, id)}?${result.ok ? "done=priceEnded" : `error=${result.problem}`}`);
}

/** Crea o guarda una campaña con sus nombres en los 7 idiomas. */
export async function saveCampaignAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const back = id ? adminPath(locale, `campaigns/${id}`) : adminPath(locale, "campaigns/new");
  const staff = await requireStaff(locale, "campaigns", back);
  const values: Record<string, string> = {
    code: text(form, "code"),
    startsAt: text(form, "startsAt"),
    endsAt: text(form, "endsAt"),
  };
  const names: Partial<Record<Locale, string>> = {};
  for (const code of LOCALES) {
    values[`name-${code}`] = text(form, `name-${code}`);
    const name = values[`name-${code}`]!.trim();
    if (name.length > 80) return fieldErrors(t, { [`name-${code}`]: "campaignName" }, values);
    if (name) names[code] = name;
  }
  const parsed = parseCampaign({
    code: values.code!,
    startsAt: values.startsAt!,
    endsAt: values.endsAt!,
  });
  if (!parsed.ok) return fieldErrors(t, parsed.problems, values);
  const result = await saveCampaign({
    actorId: staff.id,
    id,
    input: parsed.value,
    names,
    ip: await clientIp(),
  });
  if (!result.ok) {
    if (result.problem === "english")
      return fieldErrors(t, { "name-en": "campaignEnglish" }, values);
    return failure(t, result, values);
  }
  updateTag(SHOP_CACHE_TAG);
  redirect(`${adminPath(locale, `campaigns/${result.id}`)}?done=${id ? "saved" : "created"}`);
}
