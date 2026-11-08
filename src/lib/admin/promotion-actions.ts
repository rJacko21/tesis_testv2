"use server";
/**
 * Server Actions de las promociones del panel (RF-01, RF-12). Roles
 * `admin` y `editor`.
 *
 * Mismo patrón que las noticias y la tienda: errores por campo sin perder
 * lo escrito (salvo el fichero, que el navegador no deja volver a poner) y,
 * si todo va bien, invalidan la caché de la portada
 * (`updateTag("promotions")`) y redirigen con el resultado en la URL.
 *
 * @see RF-01 · RF-12 · M-38
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { LOCALES } from "@/config/locales";
import { formLocale, text } from "@/lib/auth/action-helpers";
import type { FormState } from "@/lib/auth/form-state";
import { clientIp } from "@/lib/auth/request";
import type { Translate } from "@/i18n/translator";
import { processUpload } from "@/lib/media";
import { PROMOTIONS_CACHE_TAG } from "@/lib/promotions";

import { parsePromotion } from "./promotion-rules";
import { deletePromotion, savePromotion } from "./promotions";
import { adminPath, requireStaff } from "./staff";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);
const parseVersion = (value: string) => (/^\d{1,15}$/.test(value) ? Number(value) : null);

const FIELDS = [
  "targetUrl",
  "startsAt",
  "endsAt",
  "sortOrder",
  ...LOCALES.flatMap((code) => [`title-${code}`, `alt-${code}`]),
];

function fieldErrors(
  t: Translate,
  problems: Record<string, string>,
  values: Record<string, string>,
): FormState {
  return {
    status: "error",
    message: t("admin.news.errorSummary"),
    fields: Object.fromEntries(
      Object.entries(problems).map(([field, problem]) => [
        field,
        t(`admin.promotions.problems.${problem}` as Parameters<Translate>[0]),
      ]),
    ),
    values,
  };
}

/** Crea (sin `id`) o guarda una promoción, con su imagen si se ha elegido una. */
export async function savePromotionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const back = id ? adminPath(locale, `promotions/${id}`) : adminPath(locale, "promotions/new");
  const staff = await requireStaff(locale, "promotions", back);
  const values = Object.fromEntries(FIELDS.map((name) => [name, text(form, name)]));

  const parsed = parsePromotion(values, id === null);
  const file = form.get("image");
  const chosen = file instanceof File && file.size > 0 ? file : null;
  const upload = chosen || id === null ? await processUpload(chosen) : null;
  const problems: Record<string, string> = parsed.ok ? {} : { ...parsed.problems };
  if (upload && !upload.ok) problems.image = upload.problem;
  if (!parsed.ok || Object.keys(problems).length) return fieldErrors(t, problems, values);

  const result = await savePromotion({
    actorId: staff.id,
    id,
    input: parsed.value,
    image: upload?.ok ? upload.image : null,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (!result.ok) {
    return { status: "error", message: t(`admin.promotions.errors.${result.problem}`), values };
  }
  updateTag(PROMOTIONS_CACHE_TAG);
  redirect(`${adminPath(locale, `promotions/${result.id}`)}?done=${id ? "saved" : "created"}`);
}

/** Borra una promoción (patrón PRG: vuelve al listado con el resultado). */
export async function deletePromotionAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const id = parseId(text(form, "id"));
  if (!id) redirect(adminPath(locale, "promotions"));
  const staff = await requireStaff(locale, "promotions", adminPath(locale, `promotions/${id}`));
  const result = await deletePromotion({ actorId: staff.id, id, ip: await clientIp() });
  if (!result.ok) redirect(`${adminPath(locale, `promotions/${id}`)}?error=${result.problem}`);
  updateTag(PROMOTIONS_CACHE_TAG);
  redirect(`${adminPath(locale, "promotions")}?done=deleted`);
}
