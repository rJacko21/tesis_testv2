/**
 * Marco común de las páginas de cuenta (iniciar sesión, recuperar la
 * contraseña, contacto con soporte…): título, entradilla y el formulario en
 * una tarjeta estrecha, de una columna también en escritorio, porque los
 * formularios cortos se leen mejor así.
 *
 * En escritorio, la tarjeta comparte marco con un panel azul de Florensia con
 * un personaje del juego y, si se da, una lista breve de lo que ofrece la
 * página (`aside`). Así la página no se queda en un formulario perdido en el
 * fondo y se reconoce como parte del juego, igual que «Jugar ahora». En
 * móvil el panel no se muestra y la imagen no se descarga (`loading="lazy"`
 * con `display: none`).
 */
import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";

import explorer from "@/assets/characters/explorer.webp";
import { Container } from "@/components/ui";

export function AuthPage({
  title,
  intro,
  children,
  footer,
  art = explorer,
  aside,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Personaje del panel de escritorio (decorativo). */
  art?: StaticImageData;
  /** Título y puntos del panel de escritorio. */
  aside?: { title: string; points: readonly string[] };
}) {
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <div className="mx-auto max-w-md lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_28rem] lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-xl">
          <div
            aria-hidden={aside ? undefined : true}
            className="from-navy-700 via-navy-900 to-navy-950 relative hidden overflow-hidden bg-gradient-to-br p-10 text-white lg:flex lg:flex-col"
          >
            {/* Olas del mar de Florensia, el mismo trazo que el pie de la portada. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 400 80"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-20 w-full text-sky-300/15"
            >
              <path
                fill="currentColor"
                d="M0 40c50-20 100-20 150 0s100 20 150 0 75-15 100-10v50H0z"
              />
              <path
                fill="currentColor"
                d="M0 58c60-16 110-16 170 0s100 16 150 0 60-10 80-6v28H0z"
              />
            </svg>
            {aside ? (
              <div className="relative max-w-xs">
                <p className="font-display text-gold-300 text-3xl leading-tight font-bold">
                  {aside.title}
                </p>
                <ul className="mt-5 grid gap-3 text-sky-100">
                  {aside.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="bg-gold-500 mt-2 size-2 shrink-0 rotate-45"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element -- sin next/image: no añade JS al cliente */}
            <img
              src={art.src}
              width={art.width}
              height={art.height}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative mt-auto ml-auto h-80 w-auto drop-shadow-[0_12px_24px_rgb(0_0_0/0.5)]"
            />
          </div>

          <div className="lg:p-10">
            <h1 className="font-display text-navy-900 text-4xl font-bold">{title}</h1>
            {intro ? <p className="text-ink-600 mt-2 text-lg">{intro}</p> : null}
            <div className="border-parchment-300 mt-6 rounded-lg border bg-white p-5 sm:p-6 lg:border-0 lg:p-0">
              {children}
            </div>
            {footer ? <div className="mt-6 flex flex-col gap-2 text-center">{footer}</div> : null}
          </div>
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
