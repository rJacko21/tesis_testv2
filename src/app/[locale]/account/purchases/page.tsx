/**
 * «Mi cuenta» › Compras (RF-04): historial paginado de pedidos de la tienda,
 * con cada objeto, su precio y el personaje que lo recibió.
 *
 * Sin compras, explica qué aparecerá aquí: la web original solo mostraba
 * la cabecera de una tabla vacía (F-46).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell, EmptyState } from "@/components/account/AccountShell";
import { DateTime } from "@/components/account/DateTime";
import { Badge, type BadgeTone } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { getLocale, getTranslator } from "@/i18n/server";
import { listOrders, type OrderSummary } from "@/lib/account/queries";
import { accountPath, parsePage, requireSession } from "@/lib/account/session";

export const instant = false;

const STATUS_TONE: Record<OrderSummary["status"], BadgeTone> = {
  completed: "success",
  pending: "info",
  refunded: "neutral",
  failed: "sale",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.purchases.title"), robots: { index: false, follow: false } };
}

export default async function PurchasesPage({
  searchParams,
}: PageProps<"/[locale]/account/purchases">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const session = await requireSession(locale, "purchases");
  const page = parsePage(query.page);
  const result = await listOrders(session.userId, page, locale);
  const href = (n: number) => `${accountPath(locale, "purchases")}${n > 1 ? `?page=${n}` : ""}`;
  if (result.items.length === 0 && page > 1) redirect(href(result.pageCount));

  return (
    <AccountShell
      locale={locale}
      t={t}
      current="purchases"
      title={t("account.purchases.title")}
      intro={result.total > 0 ? t("account.purchases.count", { total: result.total }) : null}
    >
      {result.items.length === 0 ? (
        <EmptyState>{t("account.purchases.empty")}</EmptyState>
      ) : (
        <>
          <ol className="grid gap-4">
            {result.items.map((order) => (
              <li key={order.id}>
                <article
                  aria-labelledby={`order-${order.id}`}
                  className="border-parchment-300 rounded-lg border bg-white p-4 sm:p-5"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id={`order-${order.id}`} className="text-navy-900 text-lg font-bold">
                      {t("account.purchases.order", { id: order.id })}
                    </h2>
                    <Badge tone={STATUS_TONE[order.status]}>
                      {t(`account.purchases.status.${order.status}`)}
                    </Badge>
                  </header>
                  <p className="text-ink-600 text-sm">
                    <DateTime locale={locale} date={order.createdAt} />
                  </p>
                  <ul className="border-parchment-300 mt-3 divide-y border-y">
                    {order.lines.map((line, index) => (
                      <li key={index} className="py-2">
                        <p className="font-semibold">
                          {t("account.purchases.line", {
                            quantity: line.quantity,
                            name: line.name,
                          })}
                        </p>
                        <p className="text-ink-600 text-sm">
                          {t("account.purchases.recipient", {
                            character: line.character,
                            server: line.server,
                          })}{" "}
                          · {t("account.summary.ap", { amount: line.unitPriceAp * line.quantity })}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right font-bold">
                    {t("account.purchases.total", { amount: order.totalAp })}
                  </p>
                </article>
              </li>
            ))}
          </ol>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={href} t={t} />
        </>
      )}
    </AccountShell>
  );
}
