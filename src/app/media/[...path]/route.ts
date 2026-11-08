/**
 * Sirve las imágenes guardadas en MySQL (`lib/media.ts`).
 *
 * El nombre lleva el hash del contenido, así que la respuesta se cachea un
 * año como inmutable: el navegador, la CDN y `next/image` solo la piden una
 * vez. `nosniff` impide que un navegador la interprete como otra cosa.
 */
import { readMedia } from "@/lib/media";

const PATH_PATTERN = /^uploads\/[0-9a-f]{32}\.webp$/;

export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const path = (await params).path.join("/");
  const image = PATH_PATTERN.test(path) ? await readMedia(path) : null;
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
