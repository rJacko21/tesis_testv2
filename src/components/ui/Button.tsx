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

/** Estilo visual. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/** Tamaño. */
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gold-500 text-navy-950 hover:bg-gold-300",
  secondary: "bg-navy-700 text-white hover:bg-navy-900",
  ghost: "text-navy-700 hover:bg-sky-100",
  danger: "bg-danger-700 text-white hover:bg-navy-950",
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
