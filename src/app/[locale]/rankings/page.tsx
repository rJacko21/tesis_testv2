/**
 * Ranking de personajes (RF-07).
 *
 * `/es/rankings?area=sea&class=sniper&page=2&q=Mi`. Resuelve F-20, F-28 y F-38:
 * - Filtros por área, clase base o especialización y servidor, y búsqueda
 *   por el principio del nombre de un personaje o de un gremio.
 * - Todo en la URL: al cambiar de página el filtro se mantiene, y cada
 *   vista se puede compartir. La búsqueda no se indexa (`noindex`): son
 *   combinaciones infinitas sin valor para un buscador.
 * - Fecha y hora de la foto mostrada, tendencia con texto y salto a página.
 * - Sin JavaScript de cliente: formularios GET y enlaces.
 *
 * «Ir a mi personaje» necesita sesión y llega con las cuentas (T-17).
 *
 * Ruta bloqueante (`instant = false`): todo depende de la URL, incluidos
 * la canónica y el `noindex` de las búsquedas. Si se enviara antes una
 * cáscara estática, esos metadatos llegarían en streaming dentro del
 * `<body>`, donde Lighthouse y algunos buscadores no los leen, y un filtro
 * no válido respondería 200 en lugar de 404. Las consultas están en caché,
 * así que esperar a los datos cuesta pocos milisegundos.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageJump } from "@/components/rankings/PageJump";
import { RankingFilters } from "@/components/rankings/RankingFilters";
import { RankingTable } from "@/components/rankings/RankingTable";
import { Container } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { CLASS_CATALOG, specializationCode } from "@/config/class-catalog";
import type { Locale } from "@/config/locales";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import type { Translate } from "@/i18n/translator";
import { formatDate, formatTime, isoDate } from "@/lib/format";
import { parseRankingQuery, rankingHref, type RankingFilter } from "@/lib/ranking-filters";
import { getRanking, listServers, type RankingPage } from "@/lib/rankings";
import { tryLoad } from "@/lib/safe";

export const instant = false;

type Props = PageProps<"/[locale]/rankings">;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const filter = parseRankingQuery(query);
  // La canónica conserva área, clase, servidor y página, pero no la búsqueda.
  const canonical = filter
    ? rankingHref(locale, { ...filter, query: undefined })
    : `/${locale}/rankings`;
  return {
    title: t("rankings.title"),
    description: t("rankings.description"),
    alternates: { canonical, languages: languageAlternates("/rankings") },
    robots: filter?.query ? { index: false, follow: true } : undefined,
  };
}

export default async function RankingsPage({ searchParams }: Props) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <h1 className="font-display text-navy-900 text-4xl font-bold">{t("rankings.title")}</h1>
        <p className="text-ink-600 mt-2 text-lg">{t("rankings.intro")}</p>
        <RankingResults locale={locale} searchParams={searchParams} />
      </Container>
    </main>
  );
}

/** Nombre visible de una clase por su código, o «Todas las clases». */
function classLabel(code: string | undefined, t: Translate): string {
  if (!code) return t("rankings.filters.allClasses");
  for (const base of CLASS_CATALOG) {
    if (base.id === code) return t("rankings.filters.classAll", { name: base.name });
    const spec = base.specializations.find((name) => specializationCode(name) === code);
    if (spec) return spec;
  }
  return code;
}

async function RankingResults({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Props["searchParams"];
}) {
  const filter = parseRankingQuery(await searchParams);
  if (!filter) notFound();

  const [t, servers, loaded] = await Promise.all([
    getTranslator(),
    tryLoad("los servidores", listServers),
    tryLoad("el ranking", () => getRanking(filter)),
  ]);
  const serverNames = servers.ok ? servers.data : [];
  if (filter.server && servers.ok && !serverNames.includes(filter.server)) notFound();

  const result = loaded.ok ? loaded.data : null;
  if (result && filter.page > result.pageCount) notFound();

  return (
    <>
      <RankingFilters locale={locale} filter={filter} servers={serverNames} t={t} />
      {result === null ? (
        <p role="alert" className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border p-4">
          {t("rankings.unavailable")}
        </p>
      ) : result.takenAt === null ? (
        <p className="mt-6">{t("rankings.noData")}</p>
      ) : (
        <RankingResultsBody
          locale={locale}
          filter={filter}
          result={result}
          takenAt={result.takenAt}
          t={t}
        />
      )}
    </>
  );
}

function RankingResultsBody({
  locale,
  filter,
  result,
  takenAt,
  t,
}: {
  locale: Locale;
  filter: RankingFilter;
  result: RankingPage;
  takenAt: Date;
  t: Translate;
}) {
  const caption = t("rankings.table.caption", {
    area: t(`rankings.areas.${filter.area}`),
    class: classLabel(filter.classCode, t),
    page: result.page,
    count: result.pageCount,
  });
  return (
    <>
      <div className="text-ink-600 mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
        <p role="status">
          <strong className="text-navy-900">
            {t("rankings.results", { total: result.total })}
          </strong>
          {filter.query ? <> · {t("rankings.searchNote", { query: filter.query })}</> : null}
        </p>
        <p>
          <time dateTime={isoDate(takenAt)}>
            {t("rankings.updated", {
              date: formatDate(locale, takenAt),
              time: formatTime(locale, takenAt),
            })}
          </time>
        </p>
      </div>

      {result.items.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 rounded-lg border p-4">
          {filter.query ? t("rankings.empty", { query: filter.query }) : t("rankings.emptyFilter")}
        </p>
      ) : (
        <>
          <p className="text-ink-600 mt-4 text-xs md:hidden" aria-hidden="true">
            {t("rankings.table.scroll")} →
          </p>
          <RankingTable rows={result.items} caption={caption} t={t} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(page) => rankingHref(locale, filter, page)}
            t={t}
          />
          <PageJump locale={locale} filter={filter} pageCount={result.pageCount} t={t} />
        </>
      )}
    </>
  );
}
