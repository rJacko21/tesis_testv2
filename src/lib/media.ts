/**
 * Imágenes subidas desde el panel, guardadas en MySQL (tabla `media`).
 *
 * Decisión de Armando (2026-11-07): las imágenes van en la propia base, sin
 * servicio externo ni carpeta en el servidor. Así entran en las copias de la
 * base y la demo no depende de nada más que de MySQL.
 *
 * Al subir, cada imagen se **normaliza** con `sharp`:
 * - se gira según su EXIF y se le quitan los metadatos (la ubicación GPS de
 *   una foto no debe llegar a la web);
 * - se reduce a {@link MAX_WIDTH} px de ancho como mucho;
 * - se guarda en WebP. `next/image` la sirve después en AVIF o WebP al
 *   tamaño de cada pantalla.
 *
 * El nombre público lleva el hash del contenido (`uploads/3f9a….webp`): la
 * misma imagen subida dos veces se guarda una sola vez, y la URL se puede
 * cachear para siempre porque nunca cambia de contenido.
 *
 * @see M-38 · F-42 (imágenes sin `alt` ni medidas en la web original)
 */
import "server-only";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import sharp from "sharp";

import { media } from "@/db/schema";

/** Tamaño máximo del fichero subido. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Ancho máximo guardado: el doble del mayor hueco en pantalla (≈800 px). */
export const MAX_WIDTH = 1600;
/** Por debajo de esto la imagen se vería borrosa en un banner. */
export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 160;
/** Formatos de entrada aceptados. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export type UploadProblem = "missing" | "tooLarge" | "type" | "tooSmall";

export interface ProcessedImage {
  path: string;
  width: number;
  height: number;
  data: Buffer;
}

/**
 * Comprueba y normaliza una imagen subida. No toca la base: devuelve lo que
 * hay que guardar, o el motivo por el que no vale.
 */
export async function processUpload(
  file: File | null,
): Promise<{ ok: true; image: ProcessedImage } | { ok: false; problem: UploadProblem }> {
  if (!file || file.size === 0) return { ok: false, problem: "missing" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, problem: "tooLarge" };
  const input = Buffer.from(await file.arrayBuffer());
  // El tipo lo decide el contenido, no el nombre ni lo que diga el navegador.
  let format: string | undefined;
  try {
    // `limitInputPixels` corta imágenes trampa de millones de píxeles.
    format = (await sharp(input, { limitInputPixels: 40_000_000 }).metadata()).format;
  } catch {
    return { ok: false, problem: "type" };
  }
  if (!format || !["jpeg", "png", "webp", "heif"].includes(format)) {
    return { ok: false, problem: "type" };
  }
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  if (info.width < MIN_WIDTH || info.height < MIN_HEIGHT) {
    return { ok: false, problem: "tooSmall" };
  }
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 32);
  return {
    ok: true,
    image: { path: `uploads/${hash}.webp`, width: info.width, height: info.height, data },
  };
}

/** URL pública de una imagen guardada. */
export const mediaUrl = (path: string) => `/media/${path}`;

/** Bytes de una imagen para servirla, o `null` si no existe. */
export async function readMedia(path: string): Promise<{ data: Buffer; mimeType: string } | null> {
  const { db } = await import("@/db/client");
  const [row] = await db
    .select({ data: media.data, mimeType: media.mimeType })
    .from(media)
    .where(eq(media.path, path))
    .limit(1);
  return row?.data ? { data: row.data, mimeType: row.mimeType } : null;
}
