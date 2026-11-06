/**
 * Marco común de las páginas de cuenta: título, entradilla y una tarjeta
 * estrecha (una columna también en escritorio: los formularios cortos se
 * leen mejor así).
 */
import type { ReactNode } from "react";

import { Container } from "@/components/ui";

export function AuthPage({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-navy-900 text-4xl font-bold">{title}</h1>
          {intro ? <p className="text-ink-600 mt-2 text-lg">{intro}</p> : null}
          <div className="border-parchment-300 mt-6 rounded-lg border bg-white p-5 sm:p-6">
            {children}
          </div>
          {footer ? <div className="mt-6 flex flex-col gap-2 text-center">{footer}</div> : null}
        </div>
      </Container>
    </main>
  );
}

/**
 * Inserta elementos de React en un texto traducido. El texto se pide con
 * marcadores (`t("…", { terms: "\u0001" })`) y aquí cada marcador se cambia
 * por su elemento. Así el orden de las palabras lo decide cada idioma
 * («Acepto los términos…», «… kabul ediyorum»).
 */
export function withElements(text: string, elements: Record<string, ReactNode>): ReactNode[] {
  const markers = Object.keys(elements);
  return text.split(/([\u0001-\u0008])/).map((part, i) => {
    const index = part.length === 1 ? part.charCodeAt(0) - 1 : -1;
    const key = markers[index];
    return key !== undefined ? <span key={i}>{elements[key]}</span> : part;
  });
}

/** Marcador para {@link withElements}: el primero es `\u0001`, el segundo `\u0002`… */
export const marker = (n: number) => String.fromCharCode(n + 1);
