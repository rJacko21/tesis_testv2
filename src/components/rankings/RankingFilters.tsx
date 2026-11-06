/**
 * Formulario de filtros del ranking (RF-07): área, clase, servidor y
 * búsqueda por nombre de personaje o gremio.
 *
 * Es un `<form method="get">` normal: al enviarlo, el navegador construye
 * la URL (`?area=sea&class=sniper&q=Mi`). Funciona sin JavaScript, no añade
 * nada al paquete del cliente y el resultado es una URL que se puede
 * compartir. Al filtrar se vuelve a la página 1 (el campo `page` no se envía).
 *
 * Las clases van agrupadas por clase base con `<optgroup>`: «Explorer
 * (todas)» incluye a Excavator y Sniper.
 */
import Link from "next/link";

import { buttonStyles } from "@/components/ui";
import { CLASS_CATALOG, specializationCode } from "@/config/class-catalog";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { RANKING_AREAS, RANKING_QUERY_MAX, type RankingFilter } from "@/lib/ranking-filters";

const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-white px-3 focus:border-navy-700";
const LABEL = "text-navy-900 mb-1 block text-sm font-bold";

export interface RankingFiltersProps {
  locale: Locale;
  filter: RankingFilter;
  servers: readonly string[];
  t: Translate;
}

export function RankingFilters({ locale, filter, servers, t }: RankingFiltersProps) {
  const hasFilters = filter.area !== "all" || filter.classCode || filter.server || filter.query;
  return (
    <form
      method="get"
      action={`/${locale}/rankings`}
      aria-label={t("rankings.filters.label")}
      className="bg-parchment-50 border-parchment-300 mt-6 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <div>
        <label htmlFor="ranking-area" className={LABEL}>
          {t("rankings.filters.area")}
        </label>
        <select id="ranking-area" name="area" defaultValue={filter.area} className={FIELD}>
          {RANKING_AREAS.map((area) => (
            <option key={area} value={area}>
              {t(`rankings.areas.${area}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ranking-class" className={LABEL}>
          {t("rankings.filters.class")}
        </label>
        <select
          id="ranking-class"
          name="class"
          defaultValue={filter.classCode ?? ""}
          className={FIELD}
        >
          <option value="">{t("rankings.filters.allClasses")}</option>
          {CLASS_CATALOG.map((base) => (
            <optgroup key={base.id} label={base.name}>
              <option value={base.id}>{t("rankings.filters.classAll", { name: base.name })}</option>
              {base.specializations.map((name) => (
                <option key={name} value={specializationCode(name)}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {servers.length > 1 ? (
        <div>
          <label htmlFor="ranking-server" className={LABEL}>
            {t("rankings.filters.server")}
          </label>
          <select
            id="ranking-server"
            name="server"
            defaultValue={filter.server ?? ""}
            className={FIELD}
          >
            <option value="">{t("rankings.filters.allServers")}</option>
            {servers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="ranking-q" className={LABEL}>
          {t("rankings.filters.search")}
        </label>
        <input
          id="ranking-q"
          name="q"
          type="search"
          defaultValue={filter.query ?? ""}
          maxLength={RANKING_QUERY_MAX}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="ranking-q-hint"
          className={FIELD}
        />
        <p id="ranking-q-hint" className="text-ink-600 mt-1 text-xs">
          {t("rankings.filters.searchHint")}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-3 sm:col-span-2 lg:col-span-1 lg:mt-6 lg:flex-col lg:items-stretch">
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          {t("rankings.filters.apply")}
        </button>
        {hasFilters ? (
          <Link href={`/${locale}/rankings`} className={buttonStyles({ variant: "ghost" })}>
            {t("rankings.filters.reset")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
