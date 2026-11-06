# Registro de mejoras: noticias (T-13)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-07 · Listado de noticias paginado, filtrable e indexable

- **Fallo original:** F-14 (`/en/post` llegaba como texto plano con un solo párrafo, sin listado, fechas ni paginación), F-16 (eventos caducados sin fecha), F-17 (noticias sin fecha ni autor)
- **Requisito:** RF-08 y RF-01 (novedades en la portada)
- **Antes:** no había forma de ver noticias anteriores ni de saber de cuándo era una noticia o si un evento seguía activo. El listado no estaba en el menú.
- **Cambio:**
  - **Listado** en `/{idioma}/news`: 9 por página, de la más reciente a la más antigua, con categoría, fecha (`<time datetime>`), portada y resumen.
  - **Filtro por categoría** (Anuncio, Evento, Tienda, Código gratis, Mantenimiento) y **paginación** con enlaces reales (`?category=event`, `?page=2`). Funcionan sin JavaScript y los buscadores los siguen. Una página o categoría inexistente da 404 en lugar de una lista vacía.
  - **Eventos terminados** marcados con «Evento terminado el …». El detalle de un evento activo muestra «Termina el …».
  - **Programación:** una noticia `scheduled` aparece sola cuando llega su `published_at`; los borradores nunca se ven.
  - **Portada:** sección «Últimas noticias» con las tres más recientes. «Noticias» entra en el menú principal.
  - **Categorías de la especificación:** la migración `0002` sustituye `news`/`update` por `announcement`/`shop`/`redeem`, convirtiendo las filas existentes en tres pasos para no perder datos con `sql_mode` estricto.
- **Por qué de esta forma:**
  - Filtro y página en la URL: cada vista se puede compartir, indexar y cachear.
  - Las consultas usan `"use cache"` con la etiqueta `posts` y vida de minutos: se reutilizan entre visitantes y el panel (T-23) las invalidará con `revalidateTag`. Si la noticia programada tarda unos minutos en aparecer no pasa nada.
  - «Terminado» se calcula dentro de la caché y no al renderizar. Leer la hora en un componente impide prerenderizarlo con Cache Components.
  - La portada sigue siendo estática. Solo la sección de noticias se resuelve al pedirla (`connection()`) y llega en streaming con un esqueleto del mismo tamaño (CLS 0). Si la base de datos cae, la portada se sirve igual con un aviso en esa sección.
- **Verificación:** `tests/e2e/news.spec.ts`: 9 tarjetas con fecha, página 2 con 3, ni la programada ni el borrador aparecen, el filtro marca `aria-current`, los eventos terminados se marcan y la portada enlaza las tres últimas. axe sin errores en el listado y el detalle en los 7 idiomas.
- **Fecha:** 2026-11-06

### M-08 · Idioma de respaldo con aviso y `hreflang` honesto

- **Fallo original:** F-03 y F-09 (traducciones a medias sin avisar; `hreflang` incompleto)
- **Requisito:** RF-08 («si falta una traducción se muestra la inglesa con aviso visible»), RNF-04, RNF-05
- **Antes:** el texto sin traducir aparecía mezclado sin ninguna indicación.
- **Cambio:**
  - La consulta une a la vez la traducción del idioma pedido y la inglesa y usa la primera que exista (`coalesce`). Devuelve en qué idioma está el texto (`contentLocale`).
  - Si es la inglesa: insignia «Disponible solo en inglés» en la tarjeta, aviso en el detalle y `lang="en"` en el título y el cuerpo, para que el lector de pantalla y el traductor del navegador lo traten como inglés.
  - El detalle solo declara `hreflang` para los idiomas que tienen traducción (más `x-default`). En la versión de respaldo la URL canónica apunta a `/en/…`, así los buscadores no ven siete copias del mismo texto inglés.
- **Por qué de esta forma:** una sola consulta con dos `LEFT JOIN` en lugar de pedir el idioma y, si falta, volver a consultar. El listado sigue usando el índice `posts_listing_idx`.
- **Verificación:** `news.spec.ts` (`/es/news/redeem-5`: aviso, `lang="en"`, canonical a `/en`, 2 `hreflang`).
- **Fecha:** 2026-11-06

### M-09 · Markdown seguro sin HTML crudo

- **Fallo original:** riesgo nuevo (el contenido lo escribirá el panel de administración, T-23)
- **Requisito:** RF-08 (contenido enriquecido), RNF-06 (seguridad)
- **Cambio:** `src/lib/markdown.tsx` convierte un subconjunto de Markdown (párrafos, títulos, listas, citas, negrita, cursiva, código y enlaces) en **elementos de React**. No hay `dangerouslySetInnerHTML`, así que cualquier `<script>` u `onerror=` se muestra como texto. Los enlaces solo admiten rutas internas, `http(s):` y `mailto:`; `javascript:`, `data:` o `//otro-dominio` se quedan en texto. Los externos llevan `rel="noopener noreferrer"` y «(sitio externo)» para lectores de pantalla. `#` y `##` se muestran como `h2` porque el `h1` es el título.
- **Por qué de esta forma:** una librería de Markdown más un saneador de HTML añadiría unos 40 KB al servidor y una superficie de ataque que mantener. Las noticias solo necesitan este subconjunto, y así la protección contra XSS no depende de una lista de etiquetas prohibidas.
- **Verificación:** `src/lib/markdown.test.tsx` (13 casos, incluidos `<script>`, `<img onerror>`, `javascript:` y `//`).
- **Fecha:** 2026-11-06

### M-10 · Banner de cookies en el HTML inicial (LCP de las páginas de texto)

- **Fallo encontrado:** al medir el detalle de noticia, Lighthouse daba un LCP de unos 3 s. El elemento LCP era el texto del banner de cookies: aparecía tras la hidratación y, en una página sin imagen grande, era lo más grande de la pantalla. En la portada no pasaba porque el LCP es la ilustración. El listado tenía otro problema: la portada de la primera tarjeta se cargaba en diferido.
- **Requisito:** RNF-01 (LCP ≤ 2 s en móvil), RF-11
- **Cambio:**
  - El banner se renderiza ya en el HTML del servidor, así se pinta con el resto de la página.
  - Para quien ya eligió, un script en línea de ~90 bytes en `<head>` (`CONSENT_HIDE_SCRIPT`, en `lib/consent.ts`) marca `<html data-consent>` si existe la cookie, y el CSS oculta el banner antes del primer pintado: sin parpadeo. Después, React lo quita del DOM.
  - La primera tarjeta del listado pide su portada con `fetchPriority="high"` y sin `loading="lazy"`; el resto siguen en diferido.
- **Por qué de esta forma:** leer la cookie en el servidor (`cookies()`) haría dinámica cada página y perderíamos el prerender estático. El script en línea no necesita React ni red. Cuando llegue la CSP (T-25) necesitará su hash o un nonce.
- **Verificación:** `consent.test.ts` (el script solo reacciona a la cookie `consent`, no a `consent_id`), `consent.spec.ts` sin cambios y Lighthouse sobre `/es/news` y `/es/news/shop-8` añadidas a `lighthouserc.json`.
- **Fecha:** 2026-11-06

### Limitaciones conocidas

- **404 en el detalle:** la cabecera se envía en streaming antes de saber si la noticia existe, así que una noticia inexistente responde con estado 200, aunque muestra la página 404 con `<meta name="robots" content="noindex">`. Google la trata como 404 suave y no la indexa. Un 404 real exigiría consultar la base de datos en el proxy y se revisará con el resto del SEO (T-15).
- **Imágenes de portada:** las noticias de demo no tienen fotos (el almacenamiento llega con el panel, T-23). Cada categoría usa un degradado y un personaje del juego, decorativos (`alt=""`) y de tamaño fijo 16:9.
- **Redirecciones desde `/en/post/{slug}`** (URLs de la web original): en T-15.
