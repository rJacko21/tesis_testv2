/**
 * Panel › Promociones (RF-01, RF-12): los banners de la portada, con su
 * imagen, sus fechas y si están en curso. Roles `admin` y `editor`.
 *
 * @see RF-01 · RF-12 · M-38
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { AdminNotice, AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { DateTime } from "@/components/account/DateTime";
import { Badge, type BadgeTone, buttonStyles } from "@/components/ui";
import { LOCALES } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import { promotionState } from "@/lib/admin/promotion-rules";
import { listAdminPromotions } from "@/lib/admin/promotions";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { mediaUrl } from "@/lib/media";

export const instant = false;

const TONE: Record<ReturnType<typeof promotionState>, BadgeTone> = {
  upcoming: "info",
  running: "success",
  ended: "neutral",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.promotions.title"), robots: { index: false, follow: false } };
}

export default async function AdminPromotionsPage({
  searchParams,
}: PageProps<"/[locale]/admin/promotions">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const staff = await requireStaff(locale, "promotions", adminPath(locale, "promotions"));
  const rows = await listAdminPromotions(locale);
  await connection();
  const now = new Date();

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="promotions"
      title={t("admin.promotions.title")}
      intro={t("admin.promotions.intro")}
    >
      {query.done === "deleted" ? (
        <AdminNotice tone="done">{t("admin.promotions.done.deleted")}</AdminNotice>
      ) : null}
      <div className="flex justify-end">
        <Link
          href={adminPath(locale, "promotions/new")}
          className={buttonStyles({ variant: "primary" })}
        >
          {t("admin.promotions.new")}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 max-w-2xl rounded-lg border p-4">
          {t("admin.promotions.empty")}
        </p>
      ) : (
        <div className="mt-4">
          <AdminTable
            id="promotions-caption"
            caption={t("admin.promotions.title")}
            minWidth="48rem"
          >
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.promotions.image")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.promotions.titleField")}
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
                  {t("admin.news.languages")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {rows.map((row) => {
                const state = promotionState(row, now);
                return (
                  <tr key={row.id}>
                    <td className={CELL}>
                      {/* Decorativa aquí: el título de al lado ya dice qué es. */}
                      <Image
                        src={mediaUrl(row.imagePath)}
                        alt=""
                        width={row.width}
                        height={row.height}
                        sizes="128px"
                        className="h-auto w-32 rounded"
                      />
                    </td>
                    <th scope="row" className={`${CELL} font-semibold`}>
                      <Link href={adminPath(locale, `promotions/${row.id}`)} className="underline">
                        {row.title}
                      </Link>
                      <span className="text-ink-600 block font-mono text-xs font-normal break-all">
                        {row.targetUrl}
                      </span>
                    </th>
                    <td className={CELL}>
                      <DateTime locale={locale} date={row.startsAt} />
                    </td>
                    <td className={CELL}>
                      <DateTime locale={locale} date={row.endsAt} />
                    </td>
                    <td className={CELL}>
                      <Badge tone={TONE[state]}>{t(`admin.campaigns.state.${state}`)}</Badge>
                    </td>
                    <td className={CELL}>
                      {t("admin.news.languageCount", {
                        count: row.locales.length,
                        total: LOCALES.length,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        </div>
      )}
    </AdminShell>
  );
}
