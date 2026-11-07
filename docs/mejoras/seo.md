# Registro de mejoras: SEO (T-15)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-14 · `robots.txt` y `sitemap.xml` útiles

- **Fallo original:** F-10. El `robots.txt` no tenía reglas efectivas ni línea `Sitemap`. El sitemap pesaba 1,35 MB con 6 881 URLs, incluía páginas internas del CMS, tenía `lastmod` de 2018 y le faltaban las URLs en inglés.
- **Requisito:** RNF-05
- **Cambio:**
  - `robots.txt` (`app/robots.ts`): permite todo salvo `/api/` y declara el sitemap con URL absoluta.
  - `sitemap.xml` (`app/sitemap.ts`): las 9 páginas públicas en los 7 idiomas, cada una con sus `hreflang` y `x-default`.
  - Las noticias aparecen solo en los idiomas a los que están traducidas, con su fecha real de última edición. Ni borradores ni programadas.
  - Con la demo son 138 URLs.
  - Si la base de datos falla, el sitemap se sirve sin las noticias en lugar de dar un error 500.
- **Por qué de esta forma:** el sitemap se genera al pedirlo, a partir de una consulta en caché de horas, así una noticia nueva entra sin recompilar.
- **Verificación:** `tests/e2e/seo.spec.ts`.
- **Fecha:** 2026-11-06

### M-15 · Redirecciones 301 desde las URLs de la web original

- **Fallo original:** F-07 y F-11 (URLs duplicadas o con otro nombre)
- **Requisito:** RNF-05 (conservar el posicionamiento)
- **Cambio:** `LEGACY_PATHS` en `i18n/routing.ts`, aplicado por el proxy:
  - `/{idioma}/post[/{slug}]` → `/{idioma}/news[/{slug}]`;
  - `/{idioma}/lp/style1/PlayNow` → `/{idioma}/play-now`;
  - `/{idioma}/shop/detail/index/{id}` → `/{idioma}/shop/item/{id}`.

  Si además el idioma es antiguo (`/pt/…`), se corrige en el mismo salto: `/pt/post/x` → `/pt-BR/news/x`. Dos 301 seguidos pierden más señal y tiempo que uno.

- ~~**Pendiente:** las rutas de destino de la tienda y de «Jugar ahora» llegan con T-19 y T-22.~~ Hechas en M-30/M-31 ([tienda.md](tienda.md)) y M-34 ([jugar-ahora.md](jugar-ahora.md)).
- **Verificación:** `routing.test.ts` (incluye que `/es/postal` no se confunda con `/post`) y `seo.spec.ts`.
- **Fecha:** 2026-11-06

### M-16 · Open Graph con imagen absoluta

- **Fallo original:** F-12. `og:image` era relativo y en `/en/privacy` apuntaba a la imagen «image-not-found» del CMS.
- **Cambio:**
  - `public/og.png` (1200 × 630, 170 KB) se genera con `scripts/make-og-image.py` a partir del arte de la portada.
  - Next.js la publica como URL absoluta gracias a `metadataBase`. Se añade `twitter:card` grande.
  - El detalle de noticia repite la imagen, porque su `openGraph` sustituye entero al del layout.
- **Verificación:** `seo.spec.ts`.
- **Fecha:** 2026-11-06

### M-17 · Datos estructurados JSON-LD

- **Fallo original:** la web original no tenía ninguno.
- **Requisito:** RNF-05 (Organization, VideoGame, NewsArticle, BreadcrumbList)
- **Cambio:** `lib/structured-data.ts`, con funciones puras y probadas, y `components/seo/JsonLd.tsx`.
  - **Portada:** Organization y VideoGame (gratuito, PC, Windows 10).
  - **Detalle de noticia:** NewsArticle, con el idioma real del texto (el inglés si es el de respaldo), y BreadcrumbList.
  - **Soporte:** FAQPage.
- **Seguridad:** `serializeJsonLd` escapa `<`. Un título de noticia con `</script>` no puede cerrar la etiqueta e inyectar HTML; hay una prueba de ello.
- **Verificación:** `structured-data.test.ts` (5) y `seo.spec.ts` (el JSON de la portada se parsea y tiene los dos tipos).
- **Fecha:** 2026-11-06

También se comprueba que cada página tiene un título propio y traducido (F-08): `seo.spec.ts` recorre 6 páginas en alemán y exige 6 títulos distintos.
