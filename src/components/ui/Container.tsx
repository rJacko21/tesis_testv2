/**
 * Contenedor de página: ancho máximo y márgenes laterales de 16 px en móvil.
 * Usarlo en todas las páginas evita el scroll horizontal (RNF-02).
 */
import type { ComponentProps } from "react";

import { cn } from "./cn";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}
