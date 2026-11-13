/**
 * «Mi cuenta» › Personajes y «Mis rankings» (RF-04, RF-07).
 *
 * Cada personaje de la cuenta con su clase, niveles, gremio y servidor, y su
 * puesto en el ranking general, de tierra y de mar de la última foto. Cada
 * puesto enlaza al ranking buscando ese personaje («ir a mi personaje»,
 * pendiente de T-16): se ve su fila con el puesto real.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell, EmptyState } from "@/components/account/AccountShell";
import { GAME_CLASSES } from "@/config/classes";
import { getLocale, getTranslator } from "@/i18n/server";
import { listMyCharacters } from "@/lib/account/queries";
import { requireSession } from "@/lib/account/session";
import { formatDate, formatTime, isoDate } from "@/lib/format";
import { RANKING_AREAS, rankingHref } from "@/lib/ranking-filters";

export const instant = false;

const ICONS = new Map(GAME_CLASSES.map((c) => [c.id as string, c.icon]));

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.characters.title"), robots: { index: false, follow: false } };
}

export default async function CharactersPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const session = await requireSession(locale, "characters");
  const { characters, takenAt } = await listMyCharacters(session.userId);
  const anyRanked = characters.some((c) => c.ranks.all !== null);

  return (
    <AccountShell
      locale={locale}
      t={t}
      current="characters"
      title={t("account.characters.title")}
      intro={
        characters.length > 0 && takenAt ? (
          <time dateTime={isoDate(takenAt)}>
            {t("rankings.updated", {
              date: formatDate(locale, takenAt),
              time: formatTime(locale, takenAt),
            })}
          </time>
        ) : null
      }
    >
      {characters.length === 0 ? (
        <EmptyState>{t("account.characters.empty")}</EmptyState>
      ) : (
        <>
          {anyRanked ? null : <EmptyState>{t("account.characters.noneRanked")}</EmptyState>}
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {characters.map((character) => {
              const icon = ICONS.get(character.baseClassCode);
              return (
                <li key={character.id}>
                  <article
                    aria-labelledby={`character-${character.id}`}
                    className="border-parchment-300 bg-surface h-full rounded-lg border p-4 sm:p-5"
                  >
                    <h2
                      id={`character-${character.id}`}
                      className="text-heading flex items-center gap-2 text-xl font-bold"
                    >
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element -- icono pequeño, como en el ranking (M-20)
                        <img src={icon.src} alt="" width={28} height={28} decoding="async" />
                      ) : null}
                      {character.name}
                    </h2>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-ink-600">{t("rankings.table.class")}</dt>
                        <dd className="font-semibold">{character.className}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-600">{t("rankings.table.server")}</dt>
                        <dd className="font-semibold">{character.server}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-600">{t("rankings.table.land")}</dt>
                        <dd className="font-semibold">{character.landLevel}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-600">{t("rankings.table.sea")}</dt>
                        <dd className="font-semibold">{character.seaLevel}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-ink-600">{t("rankings.table.guild")}</dt>
                        <dd className="font-semibold">
                          {character.guild ?? t("rankings.table.noGuild")}
                        </dd>
                      </div>
                    </dl>

                    <h3 className="text-heading mt-4 font-bold">{t("account.characters.ranks")}</h3>
                    <ul className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                      {RANKING_AREAS.map((area) => {
                        const rank = character.ranks[area];
                        const label = t(`rankings.areas.${area}`);
                        return (
                          <li key={area}>
                            {rank === null ? (
                              <p className="bg-parchment-50 rounded-lg p-2">
                                <span className="text-ink-600 block">{label}</span>
                                <span className="block font-semibold">
                                  {t("account.characters.unranked")}
                                </span>
                              </p>
                            ) : (
                              // Todo el recuadro es el enlace: su nombre es «Tierra n.º 123».
                              <Link
                                href={rankingHref(locale, {
                                  area,
                                  query: character.name,
                                  page: 1,
                                })}
                                className="bg-parchment-50 hover:border-strong block rounded-lg border border-transparent p-2"
                              >
                                <span className="text-ink-600 block">{label}</span>
                                <span className="text-link block text-lg font-bold underline">
                                  {t("account.characters.rank", { rank })}
                                </span>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AccountShell>
  );
}
