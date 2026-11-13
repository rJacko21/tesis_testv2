/**
 * «Ir a la página»: con ~900 páginas, Anterior/Siguiente no bastan (F-20).
 *
 * Formulario GET que repite el filtro en campos ocultos: funciona sin
 * JavaScript y el resultado es la misma URL que da la paginación.
 */
import { buttonStyles } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import type { RankingFilter } from "@/lib/ranking-filters";

export function PageJump({
  locale,
  filter,
  pageCount,
  t,
}: {
  locale: Locale;
  filter: RankingFilter;
  pageCount: number;
  t: Translate;
}) {
  if (pageCount <= 2) return null;
  const hidden = {
    area: filter.area === "all" ? undefined : filter.area,
    class: filter.classCode,
    server: filter.server,
    q: filter.query,
  };
  return (
    <form
      method="get"
      action={`/${locale}/rankings`}
      className="mt-4 flex items-end justify-center gap-2"
    >
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <div>
        <label htmlFor="ranking-page" className="text-heading mb-1 block text-sm font-bold">
          {t("rankings.jump.label")}
        </label>
        <input
          id="ranking-page"
          name="page"
          type="number"
          inputMode="numeric"
          min={1}
          max={pageCount}
          required
          defaultValue={filter.page}
          className="border-parchment-300 bg-surface min-h-11 w-28 rounded-lg border px-3"
        />
      </div>
      <button type="submit" className={buttonStyles({ variant: "secondary" })}>
        {t("rankings.jump.go")}
      </button>
    </form>
  );
}
