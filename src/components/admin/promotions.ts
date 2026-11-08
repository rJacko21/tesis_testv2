/**
 * Campos del formulario de promociones (RF-01, RF-12), compartidos por la
 * página nueva y la ficha.
 *
 * @see M-38
 */
import { LOCALE_NAMES, LOCALES, DEFAULT_LOCALE } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { PROMOTION_LIMITS } from "@/lib/admin/promotion-rules";
import type { AdminPromotion } from "@/lib/admin/promotions";
import { toUtcLocal } from "@/lib/admin/post-rules";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/media";

import type { AdminField } from "./AdminForm";

export function promotionFields(t: Translate, promotion: AdminPromotion | null): AdminField[] {
  return [
    {
      name: "image",
      label: t("admin.promotions.image"),
      type: "file",
      accept: ACCEPTED_TYPES.join(","),
      required: promotion === null,
      hint: t(promotion ? "admin.promotions.imageReplaceHint" : "admin.promotions.imageHint", {
        max: MAX_UPLOAD_BYTES / 1024 / 1024,
      }),
    },
    {
      name: "targetUrl",
      label: t("admin.promotions.targetUrl"),
      type: "text",
      required: true,
      maxLength: PROMOTION_LIMITS.targetUrl,
      mono: true,
      hint: t("admin.promotions.targetUrlHint"),
      defaultValue: promotion?.targetUrl ?? "/shop",
    },
    {
      name: "startsAt",
      label: t("admin.shop.startsAt"),
      type: "datetime",
      hint: t("admin.promotions.startsAtHint"),
      defaultValue: promotion ? toUtcLocal(promotion.startsAt) : "",
    },
    {
      name: "endsAt",
      label: t("admin.shop.endsAt"),
      type: "datetime",
      required: true,
      hint: t("admin.promotions.endsAtHint"),
      defaultValue: promotion ? toUtcLocal(promotion.endsAt) : "",
    },
    {
      name: "sortOrder",
      label: t("admin.shop.sortOrder"),
      type: "number",
      min: -32768,
      max: 32767,
      hint: t("admin.promotions.sortOrderHint"),
      defaultValue: String(promotion?.sortOrder ?? 0),
    },
    ...LOCALES.flatMap((code): AdminField[] => [
      {
        name: `title-${code}`,
        label: t("admin.promotions.titleIn", { language: LOCALE_NAMES[code] }),
        type: "text",
        required: code === DEFAULT_LOCALE,
        maxLength: PROMOTION_LIMITS.title,
        defaultValue: promotion?.titles[code] ?? "",
        lang: code,
      },
      {
        name: `alt-${code}`,
        label: t("admin.promotions.altIn", { language: LOCALE_NAMES[code] }),
        type: "text",
        required: code === DEFAULT_LOCALE,
        maxLength: PROMOTION_LIMITS.alt,
        hint: code === DEFAULT_LOCALE ? t("admin.promotions.altHint") : undefined,
        defaultValue: promotion?.alts[code] ?? "",
        lang: code,
      },
    ]),
  ];
}
