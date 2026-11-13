/**
 * Vistas previas de un artículo en su ficha: capturas del juego con un
 * personaje que lleva puesto el objeto, como en la tienda oficial.
 *
 * Las tienen los cosméticos (gorros, trajes, accesorios). Un consumible no
 * tiene capturas y su ficha muestra el icono ampliado ({@link ItemArt}).
 *
 * - La primera captura es la imagen principal de la ficha (y su LCP): se
 *   carga con prioridad. La segunda se carga cuando hace falta.
 * - Las capturas oficiales miden 213 × 170 px. Se muestran como mucho al
 *   doble de su tamaño: más grandes se verían borrosas.
 * - El icono del objeto va en una esquina, para reconocerlo en el inventario.
 * - `alt` con el nombre del objeto: aquí la imagen sí aporta información.
 *
 * @see RF-05 Tienda · M-45
 */
import Image from "next/image";

import type { ItemImage } from "@/lib/shop-catalog";

export interface ItemPreviewsProps {
  previews: ItemImage[];
  icon: ItemImage | null;
  /** Texto alternativo de cada captura, en orden. */
  alts: string[];
  className?: string;
}

export function ItemPreviews({ previews, icon, alts, className = "" }: ItemPreviewsProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-1 ${className}`}>
      {previews.map((preview, index) => (
        <div
          key={preview.src}
          className="rim border-parchment-300 rounded-panel shadow-panel bg-navy-950 relative overflow-hidden border"
        >
          <Image
            src={preview.src}
            alt={alts[index] ?? ""}
            width={preview.width}
            height={preview.height}
            sizes="(min-width: 768px) 426px, 50vw"
            priority={index === 0}
            className="h-auto w-full"
          />
          {index === 0 && icon ? (
            <Image
              src={icon.src}
              alt=""
              aria-hidden="true"
              width={icon.width}
              height={icon.height}
              unoptimized
              className="pixel-art ring-azure-300/60 absolute bottom-2 left-2 rounded-md shadow-[0_4px_12px_rgb(0_0_0/0.6)] ring-1"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
