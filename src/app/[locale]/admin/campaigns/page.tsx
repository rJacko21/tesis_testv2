/**
 * Panel › Campañas (RF-05, RF-12): rebajas con nombre y fechas de inicio y
 * fin obligatorias (F-16). Solo `admin`.
 *
 * @see RF-05 · RF-12 · M-37
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { DateTime } from "@/components/account/DateTime";
import { Badge, type BadgeTone, buttonStyles } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { listAdminCampaigns } from "@/lib/admin/shop";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

const TONE: Record<"upcoming" | "running" | "ended", BadgeTone> = {
  upcoming: "info",
  running: "success",
  ended: "neutral",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.campaigns.title"), robots: { index: false, follow: false } };
}

export default async function AdminCampaignsPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, "campaigns", adminPath(locale, "campaigns"));
  const campaigns = await listAdminCampaigns(locale);
  await connection();
  const now = new Date();

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="campaigns"
      title={t("admin.campaigns.title")}
      intro={t("admin.campaigns.intro")}
    >
      <div className="flex justify-end">
        <Link
          href={adminPath(locale, "campaigns/new")}
          className={buttonStyles({ variant: "primary" })}
        >
          {t("admin.campaigns.new")}
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 max-w-2xl rounded-lg border p-4">
          {t("admin.campaigns.empty")}
        </p>
      ) : (
        <div className="mt-4">
          <AdminTable id="campaigns-caption" caption={t("admin.campaigns.title")} minWidth="44rem">
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.campaigns.name")}
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
                  {t("admin.campaigns.priceRows")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {campaigns.map((campaign) => {
                const state =
                  campaign.startsAt > now
                    ? "upcoming"
                    : campaign.endsAt > now
                      ? "running"
                      : "ended";
                return (
                  <tr key={campaign.id}>
                    <th scope="row" className={`${CELL} font-semibold`}>
                      <Link
                        href={adminPath(locale, `campaigns/${campaign.id}`)}
                        className="underline"
                      >
                        {campaign.name}
                      </Link>
                      <span className="text-ink-600 block font-mono text-xs font-normal">
                        {campaign.code}
                      </span>
                    </th>
                    <td className={CELL}>
                      <DateTime locale={locale} date={campaign.startsAt} />
                    </td>
                    <td className={CELL}>
                      <DateTime locale={locale} date={campaign.endsAt} />
                    </td>
                    <td className={CELL}>
                      <Badge tone={TONE[state]}>{t(`admin.campaigns.state.${state}`)}</Badge>
                    </td>
                    <td className={CELL}>{campaign.priceRows}</td>
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
