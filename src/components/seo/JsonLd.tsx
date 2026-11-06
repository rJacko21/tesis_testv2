/**
 * Inserta datos estructurados JSON-LD (ver `lib/structured-data.ts`).
 * Es un Server Component: no añade JavaScript al navegador.
 */
import { serializeJsonLd } from "@/lib/structured-data";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Contenido escapado por `serializeJsonLd`: no puede cerrar la etiqueta.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
