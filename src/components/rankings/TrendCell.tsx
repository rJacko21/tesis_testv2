/**
 * Celda con el cambio de puesto respecto a la foto anterior.
 *
 * La web original lo mostraba con una flecha en imagen sin `alt` (F-20,
 * F-28): un lector de pantalla no decía nada y sin color tampoco se
 * distinguía. Aquí la flecha es decorativa, el número se ve, y el texto
 * completo («Sube 3 puestos») está para los lectores de pantalla.
 */
import type { Translate } from "@/i18n/translator";
import { trendOf } from "@/lib/ranking-filters";

export function TrendCell({
  rank,
  previousRank,
  t,
}: {
  rank: number;
  previousRank: number | null;
  t: Translate;
}) {
  const trend = trendOf(rank, previousRank);
  switch (trend.kind) {
    case "up":
    case "down":
      return (
        <td
          className={`font-bold whitespace-nowrap ${trend.kind === "up" ? "text-success-700" : "text-danger-700"}`}
        >
          <span aria-hidden="true">
            {trend.kind === "up" ? "▲" : "▼"} {trend.places}
          </span>
          <span className="sr-only">
            {t(`rankings.trend.${trend.kind}`, { places: trend.places })}
          </span>
        </td>
      );
    case "new":
      return (
        <td className="text-navy-700 text-xs font-bold uppercase">{t("rankings.trend.new")}</td>
      );
    case "same":
      return (
        <td className="text-ink-600">
          <span aria-hidden="true">–</span>
          <span className="sr-only">{t("rankings.trend.same")}</span>
        </td>
      );
  }
}
