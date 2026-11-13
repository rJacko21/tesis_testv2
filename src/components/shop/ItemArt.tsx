/**
 * Imagen de un artículo de la tienda.
 *
 * - **Con imagen:** el icono del objeto en el juego. Mide 32 × 32 px, así
 *   que se amplía a un múltiplo exacto (el doble o el triple) con
 *   `image-rendering: pixelated`: ampliado con suavizado se vería borroso.
 *   Va sobre el degradado de su categoría, que hace de marco. Se sirve tal
 *   cual (`unoptimized`): pesa menos de 3 KB y recomprimirlo lo estropearía.
 * - **Sin imagen:** un degradado por categoría y un icono en SVG dentro del
 *   HTML, que no pide ningún archivo.
 *
 * Es decorativa (`alt=""`, `aria-hidden`): el nombre ya está en texto justo
 * al lado. Proporción fija: el hueco se reserva desde el principio y no hay
 * saltos de diseño (CLS).
 *
 * @see RF-06 Tienda · M-45
 */
import Image from "next/image";

import type { ItemImage } from "@/lib/shop-catalog";

const BACKGROUNDS: Record<string, string> = {
  outfits: "from-navy-700 to-navy-950",
  consumables: "from-teal-700 to-navy-900",
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
  image?: ItemImage | null;
  /** Ampliación del icono: siempre un múltiplo exacto de sus 32 px. */
  scale?: 1 | 2 | 3;
  /** Hueco apaisado (tarjetas del listado) en lugar de cuadrado. */
  wide?: boolean;
  className?: string;
}

export function ItemArt({
  category,
  subcategory,
  image,
  scale = 2,
  wide = false,
  className = "",
}: ItemArtProps) {
  const frame = `flex items-center justify-center bg-linear-to-br ${BACKGROUNDS[category] ?? "from-navy-500 to-navy-900"} ${className}`;

  if (image) {
    return (
      <div aria-hidden="true" className={`${frame} ${wide ? "aspect-[2/1]" : "aspect-square"}`}>
        <Image
          src={image.src}
          alt=""
          width={image.width * scale}
          height={image.height * scale}
          unoptimized
          className="pixel-art ring-azure-300/50 rounded-md shadow-[0_6px_16px_rgb(0_0_0/0.5)] ring-1"
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`${frame} aspect-square`}>
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
