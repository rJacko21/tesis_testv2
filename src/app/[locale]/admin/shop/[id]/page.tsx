/**
 * Panel › Ficha de artículo (RF-05, RF-12): datos, nombre y descripción por
 * idioma, y precios con su historia.
 *
 * Los precios se leen como una línea de tiempo: futuros, el vigente y los
 * terminados. Uno futuro se puede quitar; el vigente, terminar ahora; los
 * terminados no se tocan.
 *
 * @see RF-05 · RF-12 · M-37
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminNotice, AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { itemFields } from "@/components/admin/shop";
import { DateTime } from "@/components/account/DateTime";
import { Badge, type BadgeTone, buttonStyles } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, LOCALE_NAMES, LOCALES, type Locale } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import {
  getAdminItem,
  listAdminCampaigns,
  listCategoryOptions,
  type ShopProblem,
} from "@/lib/admin/shop";
import {
  addPriceAction,
  endPriceAction,
  saveItemAction,
  saveItemTextAction,
} from "@/lib/admin/shop-actions";
import { PRICE_MAX, priceState } from "@/lib/admin/shop-rules";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { currentPrice } from "@/lib/shop-catalog";

export const instant = false;

const DONE = ["created", "saved", "text", "price", "priceEnded"] as const;
const ERRORS: readonly ShopProblem[] = ["notFound", "notActive"];
const SECTION = "border-parchment-300 rounded-lg border bg-white p-5";
const STATE_TONE: Record<ReturnType<typeof priceState>, BadgeTone> = {
  future: "info",
  active: "success",
  ended: "neutral",
};

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/shop/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getTranslator(), params]);
  return { title: t("admin.shop.editTitle", { id }), robots: { index: false, follow: false } };
}

export default async function AdminItemPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/shop/[id]">) {
  const [locale, t, { id: rawId }, query] = await Promise.all([
    getLocale(),
    getTranslator(),
    params,
    searchParams,
  ]);
  const id = parseId(rawId);
  if (id === null) notFound();
  const staff = await requireStaff(locale, "shop", adminPath(locale, `shop/${id}`));
  const [item, categories, campaigns] = await Promise.all([
    getAdminItem(id),
    listCategoryOptions(locale),
    listAdminCampaigns(locale),
  ]);
  if (!item) notFound();
  await connection();
  const now = new Date();

  const lang: Locale =
    typeof query.lang === "string" && isLocale(query.lang)
      ? query.lang
      : item.translations[locale]
        ? locale
        : DEFAULT_LOCALE;
  const text = item.translations[lang];
  const version = String(item.updatedAt.getTime());
  const done = DONE.find((value) => value === query.done);
  const error = ERRORS.find((value) => value === query.error);
  const current = currentPrice(item.prices, now);
  const name = item.translations[locale]?.name ?? item.translations.en?.name ?? item.sku;
  const openCampaigns = campaigns.filter((campaign) => campaign.endsAt > now);

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="shop"
      title={name}
      intro={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
          <Badge tone={item.isActive ? "success" : "neutral"}>
            {t(item.isActive ? "admin.shop.active" : "admin.shop.inactive")}
          </Badge>
          <span className="font-mono">{item.sku}</span>
          {item.isActive && current ? (
            <Link href={`/${locale}/shop/item/${item.id}`} className="font-semibold underline">
              {t("admin.news.viewPublic")}
            </Link>
          ) : null}
          <Link href={adminPath(locale, "shop")} className="font-semibold underline">
            {t("admin.shop.back")}
          </Link>
        </div>
      }
    >
      {error ? (
        <AdminNotice tone="error">{t(`admin.shop.errors.${error}`)}</AdminNotice>
      ) : done ? (
        <AdminNotice tone="done">{t(`admin.shop.done.${done}`)}</AdminNotice>
      ) : null}
      {item.isActive && !current ? (
        <p className="border-danger-700 mb-6 max-w-2xl rounded-lg border-l-4 bg-white p-4">
          {t("admin.shop.notForSale")}
        </p>
      ) : null}

      <section aria-labelledby="item-data" className={SECTION}>
        <h2 id="item-data" className="text-navy-900 mb-4 text-xl font-bold">
          {t("admin.news.data")}
        </h2>
        <AdminForm
          action={saveItemAction}
          idPrefix="item"
          columns
          hidden={{ locale, id: String(item.id), version }}
          submitLabel={t("admin.news.save")}
          fields={itemFields(t, categories, item)}
        />
      </section>

      <section aria-labelledby="item-texts" className={`${SECTION} mt-6`}>
        <h2 id="item-texts" className="text-navy-900 text-xl font-bold">
          {t("admin.news.texts")}
        </h2>
        <p className="text-ink-600 mt-1">{t("admin.shop.textsHint")}</p>
        <nav
          aria-label={t("admin.news.languages")}
          className="-mx-1 mt-4 overflow-x-auto px-1 pb-1"
        >
          <ul className="flex min-w-max gap-2">
            {LOCALES.map((code) => (
              <li key={code}>
                <Link
                  href={`${adminPath(locale, `shop/${item.id}`)}?lang=${code}`}
                  aria-current={code === lang ? "page" : undefined}
                  lang={code}
                  className="border-parchment-300 text-navy-900 hover:border-navy-700 aria-[current]:bg-navy-900 aria-[current]:border-navy-900 inline-flex min-h-11 items-center gap-2 rounded-full border bg-white px-4 font-semibold aria-[current]:text-white"
                >
                  {LOCALE_NAMES[code]}
                  {item.translations[code] ? null : (
                    <span lang={locale} className="text-xs font-normal">
                      ({t("admin.news.missingShort")})
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <h3 className="text-navy-900 mt-6 text-lg font-bold">
          {t("admin.news.textIn", { language: LOCALE_NAMES[lang] })}
        </h3>
        <div className="mt-4">
          <AdminForm
            key={lang}
            action={saveItemTextAction}
            idPrefix={`item-text-${lang}`}
            hidden={{ locale, id: String(item.id), version, lang }}
            submitLabel={t("admin.news.saveText")}
            fields={[
              {
                name: "name",
                label: t("admin.shop.name"),
                type: "text",
                required: true,
                maxLength: 120,
                defaultValue: text?.name,
                lang,
              },
              {
                name: "description",
                label: t("admin.shop.description"),
                type: "textarea",
                rows: 4,
                maxLength: 2000,
                defaultValue: text?.description,
                lang,
              },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="item-prices" className={`${SECTION} mt-6`}>
        <h2 id="item-prices" className="text-navy-900 text-xl font-bold">
          {t("admin.shop.prices")}
        </h2>
        <p className="text-ink-600 mt-1">{t("admin.shop.pricesHint")}</p>
        {item.prices.length === 0 ? (
          <p className="mt-4">{t("admin.shop.noPrices")}</p>
        ) : (
          <div className="mt-4">
            <AdminTable id="prices-caption" caption={t("admin.shop.prices")} minWidth="44rem">
              <thead className={HEAD}>
                <tr>
                  <th scope="col" className={CELL}>
                    {t("admin.shop.priceAp")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.shop.salePriceAp")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.shop.campaign")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.shop.startsAt")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.shop.endsAt")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.users.status")}
                  </th>
                  <th scope="col" className={CELL}>
                    <span className="sr-only">{t("admin.shop.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-parchment-300 divide-y">
                {item.prices.map((row) => {
                  const state = priceState(row, now);
                  return (
                    <tr key={row.id} className={row.id === current?.id ? "bg-teal-50" : undefined}>
                      <td className={`${CELL} font-semibold`}>
                        {t("account.summary.ap", { amount: row.priceAp })}
                      </td>
                      <td className={CELL}>
                        {row.salePriceAp === null
                          ? "—"
                          : t("account.summary.ap", { amount: row.salePriceAp })}
                      </td>
                      <td className={`${CELL} font-mono`}>{row.campaign ?? "—"}</td>
                      <td className={CELL}>
                        <DateTime locale={locale} date={row.startsAt} />
                      </td>
                      <td className={CELL}>
                        {row.endsAt ? (
                          <DateTime locale={locale} date={row.endsAt} />
                        ) : (
                          t("admin.shop.noEnd")
                        )}
                      </td>
                      <td className={CELL}>
                        <Badge tone={STATE_TONE[state]}>
                          {row.id === current?.id
                            ? t("admin.shop.state.current")
                            : t(`admin.shop.state.${state}`)}
                        </Badge>
                      </td>
                      <td className={CELL}>
                        {state === "ended" ? null : (
                          <form action={endPriceAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="priceId" value={row.id} />
                            <button
                              type="submit"
                              className={buttonStyles({ variant: "ghost", className: "px-3" })}
                            >
                              {t(
                                state === "future"
                                  ? "admin.shop.deletePrice"
                                  : "admin.shop.endPrice",
                                {
                                  amount: row.salePriceAp ?? row.priceAp,
                                },
                              )}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
          </div>
        )}

        <h3 className="text-navy-900 mt-6 text-lg font-bold">{t("admin.shop.addPrice")}</h3>
        <p className="text-ink-600 mt-1">{t("admin.shop.addPriceHint")}</p>
        <div className="mt-4">
          <AdminForm
            action={addPriceAction}
            idPrefix="price"
            columns
            hidden={{ locale, id: String(item.id) }}
            submitLabel={t("admin.shop.addPriceSubmit")}
            fields={[
              {
                name: "priceAp",
                label: t("admin.shop.priceAp"),
                type: "number",
                required: true,
                min: 1,
                max: PRICE_MAX,
                defaultValue: current ? String(current.priceAp) : "",
              },
              {
                name: "salePriceAp",
                label: t("admin.shop.salePriceAp"),
                type: "number",
                min: 1,
                max: PRICE_MAX,
                hint: t("admin.shop.saleHint"),
              },
              {
                name: "campaignId",
                label: t("admin.shop.campaign"),
                type: "select",
                hint: t("admin.shop.campaignHint"),
                options: [
                  { value: "", label: t("admin.shop.noCampaign") },
                  ...openCampaigns.map((campaign) => ({
                    value: String(campaign.id),
                    label: campaign.name,
                  })),
                ],
              },
              {
                name: "startsAt",
                label: t("admin.shop.startsAt"),
                type: "datetime",
                hint: t("admin.shop.startsAtHint"),
              },
              {
                name: "endsAt",
                label: t("admin.shop.endsAt"),
                type: "datetime",
                hint: t("admin.shop.endsAtHint"),
              },
            ]}
          />
        </div>
      </section>
    </AdminShell>
  );
}
