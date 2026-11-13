/**
 * Panel › Ficha de promoción (RF-01, RF-12): la imagen actual, sus datos y
 * textos en los 7 idiomas, y borrarla.
 *
 * @see M-38
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminNotice, AdminShell } from "@/components/admin/AdminShell";
import { promotionFields } from "@/components/admin/promotions";
import { DateTime } from "@/components/account/DateTime";
import { Badge, buttonStyles } from "@/components/ui";
import { DEFAULT_LOCALE } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import { deletePromotionAction, savePromotionAction } from "@/lib/admin/promotion-actions";
import { promotionState } from "@/lib/admin/promotion-rules";
import { getAdminPromotion } from "@/lib/admin/promotions";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { mediaUrl } from "@/lib/media";

export const instant = false;

const DONE = ["created", "saved"] as const;
const ERRORS = ["notFound", "changed", "unchanged", "image"] as const;
const SECTION = "border-parchment-300 max-w-3xl rounded-lg border bg-surface p-5";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/promotions/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getTranslator(), params]);
  return {
    title: t("admin.promotions.editTitle", { id }),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPromotionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/promotions/[id]">) {
  const [locale, t, { id: idText }, query] = await Promise.all([
    getLocale(),
    getTranslator(),
    params,
    searchParams,
  ]);
  const staff = await requireStaff(locale, "promotions", adminPath(locale, `promotions/${idText}`));
  const id = parseId(idText);
  const promotion = id ? await getAdminPromotion(id) : null;
  if (!promotion) notFound();
  await connection();
  const state = promotionState(promotion, new Date());
  const done = DONE.find((value) => value === query.done);
  const error = ERRORS.find((value) => value === query.error);

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="promotions"
      title={promotion.titles[DEFAULT_LOCALE] ?? t("admin.promotions.editTitle", { id: idText })}
      intro={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
          <Badge tone={state === "running" ? "success" : state === "upcoming" ? "info" : "neutral"}>
            {t(`admin.campaigns.state.${state}`)}
          </Badge>
          <span>
            {t("admin.promotions.until")} <DateTime locale={locale} date={promotion.endsAt} />
          </span>
          <Link href={adminPath(locale, "promotions")} className="font-semibold underline">
            {t("admin.promotions.back")}
          </Link>
        </div>
      }
    >
      {error ? (
        <AdminNotice tone="error">{t(`admin.promotions.errors.${error}`)}</AdminNotice>
      ) : done ? (
        <AdminNotice tone="done">{t(`admin.promotions.done.${done}`)}</AdminNotice>
      ) : null}

      <figure className={`${SECTION} mb-6`}>
        <Image
          src={mediaUrl(promotion.imagePath)}
          alt={promotion.alts[DEFAULT_LOCALE] ?? ""}
          lang={DEFAULT_LOCALE}
          width={promotion.width}
          height={promotion.height}
          sizes="(min-width: 48rem) 46rem, 100vw"
          className="h-auto w-full rounded"
          priority
        />
        <figcaption className="text-ink-600 mt-2 text-sm">
          {t("admin.promotions.imageSize", { width: promotion.width, height: promotion.height })}
        </figcaption>
      </figure>

      <section aria-labelledby="promotion-data" className={SECTION}>
        <h2 id="promotion-data" className="text-heading mb-4 text-xl font-bold">
          {t("admin.news.data")}
        </h2>
        <AdminForm
          action={savePromotionAction}
          idPrefix="promotion"
          columns
          hidden={{
            locale,
            id: String(promotion.id),
            version: String(promotion.updatedAt.getTime()),
          }}
          submitLabel={t("admin.news.save")}
          fields={promotionFields(t, promotion)}
        />
      </section>

      <section aria-labelledby="promotion-delete" className={`${SECTION} mt-6`}>
        <h2 id="promotion-delete" className="text-heading text-xl font-bold">
          {t("admin.promotions.deleteTitle")}
        </h2>
        <p className="text-ink-600 mt-1">{t("admin.promotions.deleteHint")}</p>
        <form action={deletePromotionAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={promotion.id} />
          <button type="submit" className={buttonStyles({ variant: "danger" })}>
            {t("admin.promotions.delete")}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
