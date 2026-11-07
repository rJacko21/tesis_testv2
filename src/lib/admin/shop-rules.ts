/**
 * Reglas de la tienda en el panel (RF-05, RF-12), sin base de datos.
 *
 * **Precios.** Cada artículo tiene filas de precio con su ventana de
 * vigencia; en cada momento gana la activa que empezó más tarde
 * (`currentPrice`). Por eso una rebaja es una fila más que se superpone al
 * precio normal y, al acabar, vuelve sola el precio normal (F-16). El panel:
 * - no reescribe el pasado: una fila nueva empieza ahora o después, y una
 *   fila que ya empezó no se borra, solo se termina («terminar ahora»);
 * - exige que la rebaja sea menor que el precio;
 * - si la fila es de una campaña, la encaja en las fechas de la campaña.
 *
 * Las fechas de los formularios son UTC, como en las noticias.
 *
 * @see RF-05 · RF-12 · M-37
 */
import { type Parsed, parseUtcLocal } from "./post-rules";

/** Precio máximo admitido (AP): evita errores de un cero de más. */
export const PRICE_MAX = 1_000_000;
/** Margen para «ahora»: el formulario tarda unos segundos en enviarse. */
const NOW_TOLERANCE_MS = 5 * 60_000;

export const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
export const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const int = (value: string) => (/^\d{1,9}$/.test(value.trim()) ? Number(value.trim()) : null);

export interface ItemInput {
  sku: string;
  categoryId: number;
  validityDays: number | null;
  isBundle: boolean;
  isLimited: boolean;
  isGiftable: boolean;
  isActive: boolean;
  sortOrder: number;
}
export type ItemField = "sku" | "categoryId" | "validityDays" | "sortOrder";
export type ItemProblem = "sku" | "category" | "validity" | "sortOrder";

/** Valida los datos de un artículo. `categories` son los ids que existen. */
export function parseItem(
  fields: Record<
    | "sku"
    | "categoryId"
    | "validityDays"
    | "sortOrder"
    | "isBundle"
    | "isLimited"
    | "isGiftable"
    | "isActive",
    string
  >,
  categories: ReadonlySet<number>,
): Parsed<ItemInput, ItemField, ItemProblem> {
  const problems: Partial<Record<ItemField, ItemProblem>> = {};
  const sku = fields.sku.trim().toUpperCase();
  if (!SKU_PATTERN.test(sku) || sku.length < 2 || sku.length > 40) problems.sku = "sku";
  const categoryId = int(fields.categoryId);
  if (categoryId === null || !categories.has(categoryId)) problems.categoryId = "category";
  const validity = fields.validityDays.trim() === "" ? null : int(fields.validityDays);
  if (fields.validityDays.trim() !== "" && (validity === null || validity < 1 || validity > 3650)) {
    problems.validityDays = "validity";
  }
  const sortText = fields.sortOrder.trim() || "0";
  const sortOrder = /^-?\d{1,5}$/.test(sortText) ? Number(sortText) : NaN;
  if (!(sortOrder >= -32768 && sortOrder <= 32767)) problems.sortOrder = "sortOrder";

  if (Object.keys(problems).length) return { ok: false, problems };
  const on = (value: string) => value === "1";
  return {
    ok: true,
    value: {
      sku,
      categoryId: categoryId!,
      validityDays: validity,
      isBundle: on(fields.isBundle),
      isLimited: on(fields.isLimited),
      isGiftable: on(fields.isGiftable),
      isActive: on(fields.isActive),
      sortOrder,
    },
  };
}

export interface PriceInput {
  priceAp: number;
  salePriceAp: number | null;
  campaignId: number | null;
  startsAt: Date;
  endsAt: Date | null;
}
export type PriceField = "priceAp" | "salePriceAp" | "campaignId" | "startsAt" | "endsAt";
export type PriceProblem =
  "price" | "sale" | "campaign" | "date" | "past" | "endsBeforeStart" | "outsideCampaign";

export interface CampaignWindow {
  id: number;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Valida una fila de precio nueva. Sin inicio, empieza ahora. Con campaña y
 * sin fechas, toma las de la campaña.
 */
export function parsePrice(
  fields: Record<PriceField, string>,
  campaigns: readonly CampaignWindow[],
  now: Date,
): Parsed<PriceInput, PriceField, PriceProblem> {
  const problems: Partial<Record<PriceField, PriceProblem>> = {};
  const priceAp = int(fields.priceAp);
  if (priceAp === null || priceAp < 1 || priceAp > PRICE_MAX) problems.priceAp = "price";
  const saleText = fields.salePriceAp.trim();
  const salePriceAp = saleText === "" ? null : int(saleText);
  if (
    saleText !== "" &&
    (salePriceAp === null || salePriceAp < 1 || (priceAp !== null && salePriceAp >= priceAp))
  ) {
    problems.salePriceAp = "sale";
  }

  const campaignText = fields.campaignId.trim();
  const campaign =
    campaignText === "" ? null : campaigns.find((c) => String(c.id) === campaignText);
  if (campaign === undefined) problems.campaignId = "campaign";

  let startsAt = parseUtcLocal(fields.startsAt);
  let endsAt = parseUtcLocal(fields.endsAt);
  if (startsAt === undefined) problems.startsAt = "date";
  if (endsAt === undefined) problems.endsAt = "date";
  if (campaign) {
    if (startsAt === null) startsAt = campaign.startsAt > now ? campaign.startsAt : now;
    if (endsAt === null) endsAt = campaign.endsAt;
  }
  if (startsAt === null) startsAt = now;

  if (startsAt && startsAt.getTime() < now.getTime() - NOW_TOLERANCE_MS) problems.startsAt = "past";
  if (startsAt && endsAt && endsAt <= startsAt) problems.endsAt = "endsBeforeStart";
  if (campaign && startsAt && !problems.startsAt) {
    if (startsAt.getTime() < campaign.startsAt.getTime() - NOW_TOLERANCE_MS) {
      problems.startsAt = "outsideCampaign";
    }
    if (endsAt && !problems.endsAt && endsAt > campaign.endsAt) problems.endsAt = "outsideCampaign";
  }

  if (Object.keys(problems).length) return { ok: false, problems };
  return {
    ok: true,
    value: {
      priceAp: priceAp!,
      salePriceAp,
      campaignId: campaign?.id ?? null,
      startsAt: startsAt!,
      endsAt: endsAt ?? null,
    },
  };
}

/** Estado de una fila de precio en un momento. */
export function priceState(
  row: { startsAt: Date; endsAt: Date | null },
  now: Date,
): "future" | "active" | "ended" {
  if (row.startsAt > now) return "future";
  return row.endsAt === null || row.endsAt > now ? "active" : "ended";
}

export interface CampaignInput {
  code: string;
  startsAt: Date;
  endsAt: Date;
}
export type CampaignField = "code" | "startsAt" | "endsAt";
export type CampaignProblem = "code" | "date" | "required" | "endsBeforeStart";

/** Valida los datos de una campaña. Las dos fechas son obligatorias (F-16). */
export function parseCampaign(
  fields: Record<CampaignField, string>,
): Parsed<CampaignInput, CampaignField, CampaignProblem> {
  const problems: Partial<Record<CampaignField, CampaignProblem>> = {};
  const code = fields.code.trim().toLowerCase();
  if (!CODE_PATTERN.test(code) || code.length < 3 || code.length > 60) problems.code = "code";
  const startsAt = parseUtcLocal(fields.startsAt);
  const endsAt = parseUtcLocal(fields.endsAt);
  if (startsAt === undefined) problems.startsAt = "date";
  else if (startsAt === null) problems.startsAt = "required";
  if (endsAt === undefined) problems.endsAt = "date";
  else if (endsAt === null) problems.endsAt = "required";
  if (startsAt && endsAt && endsAt <= startsAt) problems.endsAt = "endsBeforeStart";
  if (Object.keys(problems).length) return { ok: false, problems };
  return { ok: true, value: { code, startsAt: startsAt!, endsAt: endsAt! } };
}
