/**
 * Precio de un artículo: el original tachado y el rebajado, o solo el precio.
 *
 * El tachado no basta para un lector de pantalla (`<del>` no se anuncia en
 * todos), así que lleva texto oculto «Antes» y «Ahora». El color tampoco es
 * la única pista: el precio rebajado va en negrita y con la insignia del
 * descuento en la tarjeta (F-28).
 */
import type { Translate } from "@/i18n/translator";
import type { CatalogItem } from "@/lib/shop-catalog";

export interface ItemPriceProps {
  item: Pick<CatalogItem, "priceAp" | "salePriceAp">;
  t: Translate;
  /** Tamaño del precio final: normal en la tarjeta, grande en la ficha. */
  size?: "md" | "lg";
}

export function ItemPrice({ item, t, size = "md" }: ItemPriceProps) {
  const amount = (value: number) => t("shop.price.amount", { amount: value });
  const final = size === "lg" ? "text-3xl" : "text-lg";
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="sr-only">{t("shop.price.label")}:</span>
      {item.salePriceAp !== null ? (
        <>
          <del className="text-ink-600 text-sm">
            <span className="sr-only">{t("shop.price.was")} </span>
            {amount(item.priceAp)}
          </del>
          <strong className={`text-danger-700 font-display ${final} font-bold`}>
            <span className="sr-only">{t("shop.price.now")} </span>
            {amount(item.salePriceAp)}
          </strong>
        </>
      ) : (
        <strong className={`text-navy-900 font-display ${final} font-bold`}>
          {amount(item.priceAp)}
        </strong>
      )}
    </p>
  );
}
