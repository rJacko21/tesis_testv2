/**
 * «Mi cuenta» › Recargas (RF-04): historial paginado de recargas de AP con
 * el importe pagado y su estado.
 *
 * Es una tabla: cada fila tiene las mismas columnas. En móvil se desplaza
 * dentro de su caja, como el ranking (M-19).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell, EmptyState } from "@/components/account/AccountShell";
import { DateTime } from "@/components/account/DateTime";
import { Badge, type BadgeTone } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { getLocale, getTranslator } from "@/i18n/server";
import { listTopups, type TopupSummary } from "@/lib/account/queries";
import { accountPath, parsePage, requireSession } from "@/lib/account/session";
import { formatMoney } from "@/lib/format";

export const instant = false;

const STATUS_TONE: Record<TopupSummary["status"], BadgeTone> = {
  paid: "success",
  pending: "info",
  refunded: "neutral",
  failed: "sale",
};

const CELL = "px-3 py-2.5 text-left";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.topups.title"), robots: { index: false, follow: false } };
}

export default async function TopupsPage({ searchParams }: PageProps<"/[locale]/account/topups">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const session = await requireSession(locale, "topups");
  const page = parsePage(query.page);
  const result = await listTopups(session.userId, page);
  const href = (n: number) => `${accountPath(locale, "topups")}${n > 1 ? `?page=${n}` : ""}`;
  if (result.items.length === 0 && page > 1) redirect(href(result.pageCount));

  return (
    <AccountShell locale={locale} t={t} current="topups" title={t("account.topups.title")}>
      {result.items.length === 0 ? (
        <EmptyState>{t("account.topups.empty")}</EmptyState>
      ) : (
        <>
          <div
            role="region"
            aria-labelledby="topups-caption"
            tabIndex={0}
            className="border-parchment-300 bg-surface overflow-x-auto rounded-lg border"
          >
            <table className="w-full min-w-[32rem] text-sm">
              <caption id="topups-caption" className="sr-only">
                {t("account.topups.caption", { page: result.page, count: result.pageCount })}
              </caption>
              <thead className="bg-parchment-100 text-heading">
                <tr>
                  <th scope="col" className={CELL}>
                    {t("account.topups.date")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("account.topups.ap")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("account.topups.paid")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("account.topups.state")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-parchment-300 divide-y">
                {result.items.map((topup) => (
                  <tr key={topup.id}>
                    <td className={CELL}>
                      <DateTime locale={locale} date={topup.createdAt} />
                    </td>
                    <td className={`${CELL} font-semibold`}>
                      {t("account.summary.ap", { amount: topup.apAmount })}
                    </td>
                    <td className={CELL}>
                      {formatMoney(locale, topup.amountCents, topup.currency)}
                    </td>
                    <td className={CELL}>
                      <Badge tone={STATUS_TONE[topup.status]}>
                        {t(`account.topups.status.${topup.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={href} t={t} />
        </>
      )}
    </AccountShell>
  );
}
