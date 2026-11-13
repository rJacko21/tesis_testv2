/**
 * Botón de tema claro u oscuro (M-44).
 *
 * Es marcado del servidor: no trae JavaScript propio. El clic lo atiende
 * `HeaderBehavior`, que ya escucha la cabecera, y los dos iconos se alternan
 * con CSS según `data-theme` (`globals.css`). Así el botón no añade ningún
 * componente cliente al presupuesto de JS (ADR-15).
 *
 * El nombre accesible es fijo («Tema oscuro») y `aria-pressed` dice si está
 * activo: un lector de pantalla anuncia «Tema oscuro, botón, pulsado».
 */
import { cn } from "@/components/ui/cn";

export interface ThemeToggleProps {
  /** Nombre accesible, p. ej. «Tema oscuro». */
  label: string;
  className?: string;
}

export function ThemeToggle({ label, className }: ThemeToggleProps) {
  return (
    <button
      type="button"
      data-theme-toggle=""
      aria-pressed="false"
      aria-label={label}
      title={label}
      className={cn("hover:bg-navy-700 size-11 place-items-center rounded", className)}
    >
      {/* Luna: se ve en el tema claro (lleva al oscuro). */}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="theme-icon-dark size-5">
        <path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
      {/* Sol: se ve en el tema oscuro (lleva al claro). */}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="theme-icon-light size-5">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"
        />
      </svg>
    </button>
  );
}
