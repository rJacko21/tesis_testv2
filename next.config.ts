import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las imágenes del panel se suben con una Server Action (`lib/media.ts`
    // admite hasta 5 MB); el límite por defecto es 1 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Imágenes subidas desde el panel, guardadas en MySQL (`app/media`).
    localPatterns: [{ pathname: "/media/uploads/**" }, { pathname: "/_next/static/**" }],
    // AVIF primero (≈30 % menos que WebP); WebP para navegadores antiguos.
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Anchos intermedios (160, 192, 320, 480) para que cada imagen se sirva
    // cerca de su tamaño real en pantalla × densidad, sin saltar al siguiente
    // escalón (la cabecera en móvil pasaba de 420 px necesarios a 640 px).
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 192, 256, 320, 384, 480],
    // Las imágenes importadas llevan hash en el nombre: se pueden cachear un mes.
    minimumCacheTTL: 2678400,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
