/**
 * Campos de los formularios de artículo y de campaña, compartidos por
 * «nuevo» y la ficha.
 *
 * @see M-37
 */
import { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES, type Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { toUtcLocal } from "@/lib/admin/post-rules";
import type { AdminItem } from "@/lib/admin/shop";

import type { AdminField } from "./AdminForm";

const flag = (value: boolean | undefined) => (value ? "1" : "");

export function itemFields(
  t: Translate,
  categories: readonly { id: number; label: string }[],
  item: AdminItem | null,
): AdminField[] {
  return [
    {
      name: "sku",
      label: t("admin.shop.sku"),
      type: "text",
      required: true,
      maxLength: 40,
      defaultValue: item?.sku,
      hint: t("admin.shop.skuHint"),
      mono: true,
    },
    {
      name: "categoryId",
      label: t("admin.shop.category"),
      type: "select",
      defaultValue: item ? String(item.categoryId) : undefined,
      options: categories.map((option) => ({ value: String(option.id), label: option.label })),
    },
    {
      name: "validityDays",
      label: t("admin.shop.validityDays"),
      type: "number",
      min: 1,
      max: 3650,
      defaultValue: item?.validityDays?.toString() ?? "",
      hint: t("admin.shop.validityHint"),
    },
    {
      name: "sortOrder",
      label: t("admin.shop.sortOrder"),
      type: "number",
      min: -32768,
      max: 32767,
      defaultValue: String(item?.sortOrder ?? 0),
      hint: t("admin.shop.sortOrderHint"),
    },
    {
      name: "isGiftable",
      label: t("admin.shop.giftable"),
      type: "checkbox",
      defaultValue: item ? flag(item.isGiftable) : "1",
    },
    {
      name: "isLimited",
      label: t("admin.shop.limited"),
      type: "checkbox",
      defaultValue: flag(item?.isLimited),
    },
    {
      name: "isBundle",
      label: t("admin.shop.bundle"),
      type: "checkbox",
      defaultValue: flag(item?.isBundle),
    },
    {
      name: "isActive",
      label: t("admin.shop.activeField"),
      type: "checkbox",
      defaultValue: flag(item?.isActive),
      hint: t("admin.shop.activeHint"),
    },
  ];
}

/** Campos de una campaña: código, fechas y su nombre en cada idioma. */
export function campaignFields(
  t: Translate,
  campaign: {
    code: string;
    startsAt: Date;
    endsAt: Date;
    names: Partial<Record<Locale, string>>;
  } | null,
): AdminField[] {
  return [
    {
      name: "code",
      label: t("admin.campaigns.code"),
      type: "text",
      required: true,
      maxLength: 60,
      defaultValue: campaign?.code,
      hint: t("admin.campaigns.codeHint"),
      mono: true,
    },
    {
      name: "startsAt",
      label: t("admin.shop.startsAt"),
      type: "datetime",
      required: true,
      defaultValue: toUtcLocal(campaign?.startsAt ?? null),
    },
    {
      name: "endsAt",
      label: t("admin.shop.endsAt"),
      type: "datetime",
      required: true,
      defaultValue: toUtcLocal(campaign?.endsAt ?? null),
      hint: t("admin.campaigns.endsAtHint"),
    },
    ...LOCALES.map((code): AdminField => ({
      name: `name-${code}`,
      label: t("admin.campaigns.nameIn", { language: LOCALE_NAMES[code] }),
      type: "text",
      required: code === DEFAULT_LOCALE,
      maxLength: 80,
      defaultValue: campaign?.names[code] ?? "",
      lang: code,
    })),
  ];
}
