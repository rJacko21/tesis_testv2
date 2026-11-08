/**
 * Promociones e imágenes contra MySQL (`admin/promotions.ts`, `lib/media.ts`):
 * normalizar y guardar la imagen en la base, crear, editar con versión,
 * cambiar de imagen sin dejar huérfanas y borrar.
 */
import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { auditLog, media, mediaTranslations, promotions, users } from "@/db/schema";
import type { PromotionInput, PromotionTexts } from "@/lib/admin/promotion-rules";
import {
  deletePromotion,
  getAdminPromotion,
  listAdminPromotions,
  savePromotion,
} from "@/lib/admin/promotions";
import { processUpload, readMedia } from "@/lib/media";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let actorId = 0;
const promotionIds: number[] = [];
const DAY = 86_400_000;
// Fechas fijas (en milisegundos enteros) para que guardar dos veces lo mismo sea «sin cambios».
const START = new Date(Math.floor(Date.now() / 1000) * 1000 - DAY);
const END = new Date(START.getTime() + 8 * DAY);

/** Una imagen PNG de verdad, de un color, para subirla. */
async function png(width: number, height: number, seed: number): Promise<File> {
  const data = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: (seed * 53) % 256, g: (seed * 97) % 256, b: 160 },
    },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(data)], "banner.png", { type: "image/png" });
}

async function upload(seed: number) {
  const result = await processUpload(await png(1200, 400, seed));
  if (!result.ok) throw new Error(result.problem);
  return result.image;
}

const input = (over: Partial<PromotionInput & PromotionTexts> = {}) => ({
  targetUrl: "/shop",
  startsAt: START,
  endsAt: END,
  sortOrder: 0,
  titles: { en: `Winter sale ${run}` },
  alts: { en: "Two characters in winter costumes" },
  ...over,
});

beforeAll(async () => {
  const name = `p${run}`.slice(0, 32);
  const [user] = await db
    .insert(users)
    .values({ username: name, name, email: `${name}@example.test` });
  actorId = user.insertId;
});

afterAll(async () => {
  if (promotionIds.length) {
    await db
      .delete(auditLog)
      .where(and(eq(auditLog.entity, "promotion"), inArray(auditLog.entityId, promotionIds)));
    const rows = await db
      .select({ imageId: promotions.imageId })
      .from(promotions)
      .where(inArray(promotions.id, promotionIds));
    await db.delete(promotions).where(inArray(promotions.id, promotionIds));
    if (rows.length) {
      await db.delete(media).where(
        inArray(
          media.id,
          rows.map((row) => row.imageId),
        ),
      );
    }
  }
  await db.delete(users).where(eq(users.id, actorId));
});

describe("processUpload", () => {
  it("normaliza a WebP, limita el ancho y pone nombre con el hash", async () => {
    const result = await processUpload(await png(3000, 1000, 1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.path).toMatch(/^uploads\/[0-9a-f]{32}\.webp$/);
    expect([result.image.width, result.image.height]).toEqual([1600, 533]);
    expect((await sharp(result.image.data).metadata()).format).toBe("webp");
  });

  it("rechaza ficheros vacíos, que no son imágenes o demasiado pequeños", async () => {
    expect(await processUpload(null)).toEqual({ ok: false, problem: "missing" });
    const text = new File(["<svg onload=alert(1)>"], "x.png", { type: "image/png" });
    expect(await processUpload(text)).toEqual({ ok: false, problem: "type" });
    expect(await processUpload(await png(200, 100, 2))).toEqual({
      ok: false,
      problem: "tooSmall",
    });
  });
});

describe("savePromotion", () => {
  it("crea con imagen guardada en la base, textos y auditoría", async () => {
    const image = await upload(10);
    const result = await savePromotion({ actorId, id: null, input: input(), image, ip: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    promotionIds.push(result.id);

    const saved = await getAdminPromotion(result.id);
    expect(saved).toMatchObject({
      imagePath: image.path,
      width: 1200,
      height: 400,
      titles: { en: `Winter sale ${run}` },
      alts: { en: "Two characters in winter costumes" },
    });
    expect((await readMedia(image.path))?.data.equals(image.data)).toBe(true);
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, "promotion"), eq(auditLog.entityId, result.id)));
    expect(entry).toMatchObject({ action: "promotion.create", actorId });

    // Sin imagen no se crea.
    expect(
      await savePromotion({ actorId, id: null, input: input(), image: null, ip: null }),
    ).toEqual({ ok: false, problem: "image" });
  });

  it("al editar exige la versión vista y rechaza guardar sin cambios", async () => {
    const created = await savePromotion({
      actorId,
      id: null,
      input: input(),
      image: await upload(20),
      ip: null,
    });
    if (!created.ok) throw new Error(created.problem);
    promotionIds.push(created.id);
    const before = await getAdminPromotion(created.id);
    const version = before!.updatedAt.getTime();

    expect(
      await savePromotion({
        actorId,
        id: created.id,
        input: input({ targetUrl: "/news" }),
        image: null,
        version: version - 1,
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "changed" });
    expect(
      await savePromotion({
        actorId,
        id: created.id,
        input: input(),
        image: null,
        version,
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "unchanged" });

    const saved = await savePromotion({
      actorId,
      id: created.id,
      input: input({ targetUrl: "/news", titles: { en: `Winter sale ${run}`, es: "Rebajas" } }),
      image: null,
      version,
      ip: null,
    });
    expect(saved).toEqual({ ok: true, id: created.id });
    expect(await getAdminPromotion(created.id)).toMatchObject({
      targetUrl: "/news",
      titles: { es: "Rebajas" },
    });
  });

  it("cambiar de imagen borra la anterior si nadie más la usa", async () => {
    const first = await upload(30);
    const created = await savePromotion({
      actorId,
      id: null,
      input: input(),
      image: first,
      ip: null,
    });
    if (!created.ok) throw new Error(created.problem);
    promotionIds.push(created.id);
    const version = (await getAdminPromotion(created.id))!.updatedAt.getTime();

    const second = await upload(31);
    const result = await savePromotion({
      actorId,
      id: created.id,
      input: input({ alts: { en: "A new banner" } }),
      image: second,
      version,
      ip: null,
    });
    expect(result.ok).toBe(true);
    expect(await readMedia(first.path)).toBeNull();
    expect(await readMedia(second.path)).not.toBeNull();
    const [mediaRow] = await db.select().from(media).where(eq(media.path, second.path));
    const alts = await db
      .select()
      .from(mediaTranslations)
      .where(eq(mediaTranslations.mediaId, mediaRow!.id));
    expect(alts.map((a) => a.alt)).toEqual(["A new banner"]);
  });

  it("dos promociones con la misma imagen la guardan una vez; borrar una no la quita", async () => {
    const image = await upload(40);
    const a = await savePromotion({ actorId, id: null, input: input(), image, ip: null });
    const b = await savePromotion({ actorId, id: null, input: input(), image, ip: null });
    if (!a.ok || !b.ok) throw new Error("no se crearon");
    promotionIds.push(a.id, b.id);
    expect(await db.select().from(media).where(eq(media.path, image.path))).toHaveLength(1);

    expect(await deletePromotion({ actorId, id: a.id, ip: null })).toEqual({ ok: true, id: a.id });
    expect(await readMedia(image.path)).not.toBeNull();
    expect(await deletePromotion({ actorId, id: b.id, ip: null })).toEqual({ ok: true, id: b.id });
    expect(await readMedia(image.path)).toBeNull();
    expect(await deletePromotion({ actorId, id: b.id, ip: null })).toEqual({
      ok: false,
      problem: "notFound",
    });
  });

  it("el listado usa el título del idioma o el inglés y dice qué idiomas tiene", async () => {
    const created = await savePromotion({
      actorId,
      id: null,
      input: input({ titles: { en: `Listed ${run}`, de: `Gelistet ${run}` } }),
      image: await upload(50),
      ip: null,
    });
    if (!created.ok) throw new Error(created.problem);
    promotionIds.push(created.id);
    const de = (await listAdminPromotions("de")).find((row) => row.id === created.id);
    const fr = (await listAdminPromotions("fr")).find((row) => row.id === created.id);
    expect(de).toMatchObject({
      title: `Gelistet ${run}`,
      locales: expect.arrayContaining(["en", "de"]),
    });
    expect(fr?.title).toBe(`Listed ${run}`);
  });
});
