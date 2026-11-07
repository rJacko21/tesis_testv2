/**
 * Insignias de un artículo, siempre con texto: descuento, edición limitada
 * y lote. En la web original eran iconos sin texto alternativo (F-28).
 */
import { Badge } from "@/components/ui";
import type { Translate } from "@/i18n/translator";
import type { CatalogItem } from "@/lib/shop-catalog";
import { discountPercent } from "@/lib/shop-filters";

export function ItemBadges({ item, t }: { item: CatalogItem; t: Translate }) {
  const percent = discountPercent(item.priceAp, item.salePriceAp);
  if (percent === null && !item.isLimited && !item.isBundle) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {percent !== null ? <Badge tone="sale">{t("shop.badges.sale", { percent })}</Badge> : null}
      {item.isLimited ? <Badge tone="info">{t("shop.badges.limited")}</Badge> : null}
      {item.isBundle ? <Badge tone="neutral">{t("shop.badges.bundle")}</Badge> : null}
    </div>
  );
}

/** «Permanente» o «30 días». */
export function validityLabel(validityDays: number | null, t: Translate): string {
  return validityDays === null
    ? t("shop.validity.permanent")
    : t("shop.validity.days", { days: validityDays });
}
