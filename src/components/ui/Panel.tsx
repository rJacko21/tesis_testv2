/**
 * Panel: contenedor con borde y título, inspirado en los marcos de la web
 * original (paneles azul cielo en la cuenta, turquesa en la tienda,
 * pergamino en el canje de códigos), pero sin imágenes de fondo: menos
 * peso y texto siempre legible.
 *
 * El título es un encabezado real (`h2` por defecto) para que la página
 * tenga una estructura navegable por lectores de pantalla.
 */
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

/** Tema del panel según la sección de la web original. */
export type PanelTone = "sky" | "teal" | "parchment" | "plain";

const TONES: Record<PanelTone, { frame: string; header: string }> = {
  sky: { frame: "border-sky-300 bg-sky-100", header: "bg-navy-700 text-white" },
  teal: { frame: "border-teal-700 bg-teal-100", header: "bg-teal-700 text-white" },
  parchment: { frame: "border-gold-500 bg-parchment-50", header: "bg-parchment-300 text-ink-900" },
  plain: { frame: "border-parchment-300 bg-white", header: "bg-parchment-50 text-ink-900" },
};

export interface PanelProps extends Omit<ComponentProps<"section">, "title"> {
  /** Título visible del panel. */
  title?: ReactNode;
  /** Nivel del encabezado del título. */
  headingLevel?: 2 | 3;
  tone?: PanelTone;
}

export function Panel({
  title,
  headingLevel = 2,
  tone = "plain",
  className,
  children,
  ...props
}: PanelProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const styles = TONES[tone];

  return (
    <section
      className={cn("rounded-panel shadow-panel overflow-hidden border", styles.frame, className)}
      {...props}
    >
      {title ? (
        <Heading className={cn("font-display px-4 py-2 text-lg font-bold", styles.header)}>
          {title}
        </Heading>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
