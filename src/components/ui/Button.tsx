/**
 * Botón y enlace con aspecto de botón.
 *
 * Reglas de accesibilidad incluidas por defecto:
 * - Altura mínima de 44 px (objetivo táctil cómodo, por encima de los 24 px
 *   que exige WCAG 2.5.8).
 * - Foco visible heredado de `:focus-visible` en `globals.css`.
 * - Estado deshabilitado con `disabled` real (no solo visual).
 *
 * Se separan `Button` (acciones: enviar, añadir a la cesta) y `ButtonLink`
 * (navegación) porque son elementos distintos para el navegador y el
 * lector de pantalla. En la web original, la tienda usaba `<input
 * onclick>` para navegar (F-44).
 *
 * @see RNF-03 · F-44
 */
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "./cn";

/** Estilo visual. `onDark` es el secundario sobre fondos oscuros (portada). */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "onDark";
/** Tamaño. */
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  // Azul celeste del botón «Play» del launcher (M-44). El texto es marino,
  // no blanco: blanco sobre este azul no llega a 4.5:1.
  primary:
    "from-azure-300 to-azure-500 text-navy-950 bg-linear-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.45)] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_0_20px_rgb(14_165_233/0.55)]",
  secondary: "bg-navy-700 text-white hover:bg-navy-900",
  ghost: "text-link hover:bg-sky-100",
  danger: "bg-danger-700 text-white hover:bg-navy-950",
  onDark: "border-2 border-white/80 text-white hover:bg-white/10",
};

const SIZES: Record<ButtonSize, string> = {
  md: "text-base",
  lg: "min-h-13 px-7 text-lg",
};

/**
 * Clases de un botón. Se exporta para reutilizarla en elementos que deben
 * parecer botones sin serlo (p. ej. un `<summary>`).
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Botón para acciones. Por defecto `type="button"`, para no enviar formularios sin querer. */
export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Enlace con aspecto de botón, para llamadas a la acción que navegan. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}
