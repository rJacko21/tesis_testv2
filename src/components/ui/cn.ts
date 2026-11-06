/**
 * Combina clases de Tailwind resolviendo conflictos: `cn("px-2", "px-4")`
 * devuelve `"px-4"`. Permite que un componente acepte `className` para
 * ajustes puntuales sin romper sus estilos base.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
