# Registro de mejoras: portada con arte de personajes (T-12, parcial)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

## Origen del arte

Giiku Games GmbH autorizó para la tesis el uso de su nombre, BGM, SFX, diseños de personajes y arte (respuesta Q4, 2026-11-06). Armando aportó la carpeta `Characters`:

- ilustraciones de las 4 clases;
- fichas de las 8 especializaciones;
- iconos de clase de 33 px;
- iconos de nivel de tierra y mar;
- una Magic Knight ya recortada.

Las imágenes originales **no** se suben al repositorio. Solo se guardan las versiones procesadas de `src/assets/`, que el script `scripts/process-character-art.py` genera de forma reproducible.

---

### M-02 · Cabecera sin carrusel y con `h1`

- **Fallo original:** F-27, F-35, F-39 y F-42 (carrusel de 3 JPG de 1,27 MB, texto dentro de imágenes, sin `h1`)
- **Requisito:** RF-01, RNF-01 · **Decisión:** ADR-15, ADR-16
- **Antes:** LCP de 4,3 s en la web original. El carrusel descargaba las 3 imágenes aunque solo se ve una, y no se podía pausar.
- **Cambio:**
  - Una sola ilustración recortada, de 16 KB en AVIF en móvil, con `fetchPriority="high"`.
  - El fondo es un degradado CSS y la ola un SVG en línea.
  - El título es un `h1` de texto y la llamada a la acción usa botones reales.
- **Por qué de esta forma:** el carrusel no aporta información y castiga el LCP y la accesibilidad (WCAG 2.2.2). Una imagen fija conserva la estética (personaje en primer plano sobre cielo azul) con un 98 % menos de bytes.
- **Verificación:**
  - `tests/e2e/home.spec.ts`: una sola imagen prioritaria y el resto con carga diferida.
  - Lighthouse CI en móvil: LCP 1,67 s, CLS 0,001, rendimiento 0,94-0,98, accesibilidad, buenas prácticas y SEO 1.
- **Fecha:** 2026-11-06

### M-03 · Sección de clases ligera y accesible

- **Fallo original:** F-39 y F-42 (24 imágenes de ~75 KB, unos 1,8 MB, cargadas de golpe y sin `alt` ni tamaño)
- **Requisito:** RF-01, RNF-02, RNF-04
- **Antes:** 1,8 MB de imágenes. Los nombres de las especializaciones iban impresos en la imagen, solo en inglés.
- **Cambio:**
  - Se recortan el fondo blanco y el pie impreso. El nombre, el rol y la descripción pasan a ser texto traducido en los 7 idiomas.
  - next/image sirve cada imagen en AVIF o WebP al ancho que ocupa en pantalla, con `width` y `height` (sin saltos de diseño) y carga diferida.
  - Las clases son una lista semántica (`ul`, `h3`). Cada ilustración tiene `alt`. Las miniaturas tienen `alt=""` porque su `figcaption` ya da el nombre.
- **Por qué de esta forma:**
  - El texto real se puede leer, traducir e indexar.
  - Con el fondo transparente, el arte se integra con los colores de cada clase sin fichas blancas.
  - Ajustar `sizes` e `imageSizes` evita servir 256 px donde bastan 128 px.
- **Verificación:**
  - e2e: 4 clases y 8 especializaciones visibles.
  - axe sin errores en los 7 idiomas.
  - Peso total de la portada: 370 KB (presupuesto ≤ 800 KB), frente a más de 3 MB en la original.
- **Fecha:** 2026-11-06

### M-04 · Fuentes: solo se precarga lo imprescindible

- **Fallo original:** F-39 (portada pesada)
- **Requisito:** RNF-01
- **Cambio:**
  - Se precarga solo el subconjunto latino de Nunito.
  - Alegreya, usada solo en títulos, no se precarga y usa `swap` con métricas ajustadas (CLS 0).
  - latin-ext, que incluye los caracteres del turco, sigue declarado con `unicode-range` y se descarga solo cuando hace falta.
- **Por qué:** antes se precargaban 4 archivos de unos 40 KB que competían con la imagen LCP.
- **Verificación:**
  - El CSS generado mantiene el `unicode-range` de latin-ext.
  - e2e en `tr` sin errores.
- **Fecha:** 2026-11-06
