/**
 * POST /api/consent: guarda la prueba de un consentimiento.
 *
 * El RGPD exige poder **demostrar** que alguien consintió (art. 7.1): qué
 * aceptó, cuándo y con qué versión de la política. La cookie del navegador
 * no basta, porque el visitante puede borrarla. Se guarda una fila en
 * `consents` con un identificador aleatorio (`anon_id`), no con la IP ni
 * con datos que identifiquen a la persona (minimización, art. 5.1.c).
 *
 * Si la base de datos falla, el visitante no lo nota: su elección ya está en
 * la cookie y se respeta igual. Solo se pierde la prueba de esa vez.
 *
 * @see RF-11 · `src/db/schema/support.ts` (`consents`)
 */
import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { CONSENT_MAX_AGE_SECONDS, CONSENT_VERSION, OPTIONAL_CATEGORIES } from "@/lib/consent";

/** Cookie con el identificador anónimo que enlaza las elecciones de un mismo navegador. */
const ANON_COOKIE = "consent_id";

const bodySchema = z.object({
  version: z.literal(CONSENT_VERSION),
  categories: z
    .object(Object.fromEntries(OPTIONAL_CATEGORIES.map((c) => [c, z.boolean()])))
    .strict(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

  const jar = await cookies();
  let anonId = jar.get(ANON_COOKIE)?.value;
  if (!anonId || !z.uuid().safeParse(anonId).success) {
    anonId = randomUUID();
    jar.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      maxAge: CONSENT_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  try {
    // Import diferido: si la base no está configurada, el resto de la web sigue funcionando.
    const [{ db }, { consents }] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema"),
    ]);
    await db.insert(consents).values({
      anonId,
      categories: { necessary: true, ...parsed.data.categories },
      version: parsed.data.version,
      givenAt: new Date(),
    });
  } catch (error) {
    console.error("No se pudo guardar la prueba del consentimiento", error);
    return Response.json({ stored: false }, { status: 202 });
  }
  return Response.json({ stored: true }, { status: 201 });
}
