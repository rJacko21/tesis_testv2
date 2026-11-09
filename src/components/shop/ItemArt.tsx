/**
 * Imagen de un artículo mientras no tenga foto propia.
 *
 * Los artículos de demo no tienen imagen (las fotos llegan con el panel,
 * T-23). En lugar de un hueco, un degradado por categoría y un icono en SVG
 * dentro del HTML: no pide ningún archivo ni añade JavaScript. Es
 * decorativa (`aria-hidden`): el nombre ya está en texto.
 *
 * Proporción fija (`aspect-square`): el hueco se reserva desde el principio
 * y no hay saltos de diseño (CLS).
 */
const BACKGROUNDS: Record<string, string> = {
  costumes: "from-gold-500 to-gold-700",
  boosts: "from-teal-700 to-navy-900",
};

/** Icono por subcategoría (trazos de 24 × 24); el cofre si no hay uno propio. */
const ICONS: Record<string, string> = {
  weapons: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
  outfits: "M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.5 1.7-2 3-4 3s-3.5-1.3-4-3Z",
  experience: "M9 3h6M10 3v5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-10V3M7.5 14h9",
  ships: "M3 17c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0M5 14l1-5h12l1 5M12 3v6M12 3l5 4h-5",
};
const CHEST = "M3 10h18v10H3zM3 10l2-5h14l2 5M10 13h4v3h-4z";

export interface ItemArtProps {
  category: string;
  subcategory: string | null;
  className?: string;
}

export function ItemArt({ category, subcategory, className = "" }: ItemArtProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-square items-center justify-center bg-linear-to-br ${BACKGROUNDS[category] ?? "from-navy-500 to-navy-900"} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-1/2 text-white/85"
      >
        <path d={(subcategory && ICONS[subcategory]) || CHEST} />
      </svg>
    </div>
  );
}
