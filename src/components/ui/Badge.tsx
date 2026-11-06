/**
 * Etiqueta corta: "-25 %", "Edición limitada", "Nuevo"…
 *
 * Siempre lleva texto. En la web original, la leyenda de la tienda y los
 * cambios de posición del ranking eran solo iconos sin texto alternativo
 * (F-28, F-42).
 */
import type { ComponentProps } from "react";

import { cn } from "./cn";

export type BadgeTone = "sale" | "info" | "neutral" | "success";

const TONES: Record<BadgeTone, string> = {
  sale: "bg-danger-700 text-white",
  info: "bg-navy-700 text-white",
  neutral: "bg-parchment-300 text-ink-900",
  success: "bg-success-700 text-white",
};

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
