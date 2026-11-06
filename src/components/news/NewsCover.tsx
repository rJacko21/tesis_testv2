/**
 * Portada decorativa de una noticia cuando no tiene imagen propia.
 *
 * Las noticias de demo no tienen fotos (el almacenamiento de imágenes llega
 * con el panel, T-23). En lugar de un hueco gris, cada categoría usa un
 * degradado y un personaje del juego. Es decorativa (`alt=""`): el título y
 * la categoría ya están en texto.
 *
 * Tamaño fijo con `aspect-[16/9]`: el espacio se reserva antes de que llegue
 * la imagen y no hay saltos de diseño (CLS, F-42).
 */
import Image, { type StaticImageData } from "next/image";

import courtMagician from "@/assets/characters/court-magician.webp";
import excavator from "@/assets/characters/excavator.webp";
import explorer from "@/assets/characters/explorer.webp";
import guardianSwordsman from "@/assets/characters/guardian-swordsman.webp";
import priest from "@/assets/characters/priest.webp";
import type { PostCategory } from "@/db/schema/content";

const COVERS: Record<PostCategory, { art: StaticImageData; background: string }> = {
  announcement: { art: guardianSwordsman, background: "from-navy-500 to-navy-900" },
  event: { art: explorer, background: "from-teal-700 to-navy-900" },
  shop: { art: courtMagician, background: "from-gold-500 to-gold-700" },
  redeem: { art: priest, background: "from-class-saint to-navy-900" },
  maintenance: { art: excavator, background: "from-ink-600 to-navy-950" },
};

export interface NewsCoverProps {
  category: PostCategory;
  /** `sizes` de la imagen según el ancho de la tarjeta en pantalla. */
  sizes: string;
  /**
   * Imagen candidata a LCP (sobre el pliegue): se pide con prioridad alta y
   * sin carga diferida. Solo la primera tarjeta del listado y el detalle.
   */
  priority?: boolean;
  className?: string;
}

export function NewsCover({ category, sizes, priority = false, className = "" }: NewsCoverProps) {
  const cover = COVERS[category];
  return (
    <div
      className={`relative flex aspect-[16/9] items-end justify-end overflow-hidden bg-linear-to-br ${cover.background} ${className}`}
    >
      <Image
        src={cover.art}
        alt=""
        sizes={sizes}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        className="h-[115%] w-auto translate-y-[8%] object-contain pr-[6%] drop-shadow-lg"
      />
    </div>
  );
}
