/**
 * Tabla del ranking (RF-07).
 *
 * - Cabeceras de texto (`<th scope="col">`) y un `<caption>` que dice qué
 *   ranking es y en qué página estás: un lector de pantalla lo anuncia al
 *   entrar en la tabla.
 * - La clase se escribe con su nombre; el icono es decorativo (`alt=""`).
 *   En la web original era una imagen sin `alt` (F-20).
 * - En móvil la tabla conserva todas sus columnas y se desplaza en
 *   horizontal dentro de su propia caja, nunca la página. La caja puede
 *   recibir el foco para desplazarla con el teclado (WCAG 2.1.1), y el
 *   nombre del personaje queda fijo a la izquierda para no perder la fila.
 * - Sin JavaScript: es un componente de servidor.
 * - Ligera (F-38): el icono es un `<img>` simple de 33 px, sin `srcset`
 *   (con `next/image` cada fila repetía ~200 bytes de variantes que un icono
 *   tan pequeño no necesita), el relleno de las celdas se declara una vez
 *   en la tabla y no en cada `<td>`, y cada celda tiene el mínimo de
 *   elementos: hidratar 50 filas cuesta tiempo de CPU en el móvil (TBT). 50 filas pesan unos 20 KB comprimidas.
 */
import { GAME_CLASSES } from "@/config/classes";
import type { Translate } from "@/i18n/translator";
import type { RankingEntry } from "@/lib/rankings";

import { TrendCell } from "./TrendCell";

const ICONS = new Map(GAME_CLASSES.map((c) => [c.id as string, c.icon]));

const TH = "py-3 text-left text-xs font-bold tracking-wide uppercase";

export interface RankingTableProps {
  rows: readonly RankingEntry[];
  caption: string;
  t: Translate;
}

export function RankingTable({ rows, caption, t }: RankingTableProps) {
  return (
    <div
      role="region"
      aria-labelledby="ranking-caption"
      tabIndex={0}
      className="border-parchment-300 bg-surface mt-4 overflow-x-auto rounded-lg border"
    >
      <table className="w-full min-w-[46rem] border-collapse text-sm tabular-nums [&_td]:px-3 [&_td]:py-2 [&_th]:px-3">
        <caption id="ranking-caption" className="sr-only">
          {caption}
        </caption>
        <thead className="bg-navy-900 text-white">
          <tr>
            <th scope="col" className={`${TH} w-16 text-right`}>
              {t("rankings.table.rank")}
            </th>
            <th scope="col" className={`${TH} w-20`}>
              {t("rankings.table.trend")}
            </th>
            <th scope="col" className={`${TH} bg-navy-900 sticky left-0`}>
              {t("rankings.table.name")}
            </th>
            <th scope="col" className={TH}>
              {t("rankings.table.class")}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {t("rankings.table.land")}
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {t("rankings.table.sea")}
            </th>
            <th scope="col" className={TH}>
              {t("rankings.table.guild")}
            </th>
            <th scope="col" className={TH}>
              {t("rankings.table.server")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const icon = ICONS.get(row.baseClassCode);
            return (
              <tr
                key={row.rank}
                className="border-parchment-300 even:bg-parchment-50 bg-surface border-t"
              >
                <td className="text-heading text-right font-bold">{row.rank}</td>
                <TrendCell rank={row.rank} previousRank={row.previousRank} t={t} />
                {/* Cabecera de la fila: el lector de pantalla la lee con cada celda. */}
                <th
                  scope="row"
                  className="text-heading sticky left-0 bg-inherit py-2 text-left font-bold"
                >
                  {row.name}
                </th>
                <td className="whitespace-nowrap">
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- icono de 33 px: un srcset no aporta nada
                    <img
                      src={icon.src}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                      className="mr-2 inline align-middle"
                    />
                  ) : null}
                  {row.className}
                </td>
                <td className="text-right">{row.landLevel}</td>
                <td className="text-right">{row.seaLevel}</td>
                <td>{row.guild ?? t("rankings.table.noGuild")}</td>
                <td>{row.server}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
