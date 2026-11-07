# Registro de mejoras: rankings (T-16)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-18 · Ranking con filtros, búsqueda y salto de página en la URL

- **Fallo original:** F-20 (sin búsqueda ni fecha de actualización; 905 páginas sin forma de saltar)
- **Requisito:** RF-07
- **Cambio:** `/{idioma}/rankings?area=sea&class=sniper&server=Aurora&q=Mi&page=2`.
  - **Filtros:** área (total, tierra, mar), clase base o especialización (agrupadas con `<optgroup>`) y servidor, que solo aparece si hay más de uno.
  - **Búsqueda** por el principio del nombre de un personaje o de un gremio. El puesto que se muestra es el del ranking completo: quien busca «Misaja» ve su puesto real, no «1 de 1».
  - **Paginación** con Anterior/Siguiente y un campo «Ir a la página».
  - **Fecha y hora** de la foto mostrada, en UTC, dentro de un `<time datetime>`.
  - Todo son formularios `GET` y enlaces, sin JavaScript de cliente. El filtro forma parte de la URL, así que se mantiene al cambiar de página (criterio de aceptación de RF-07) y la vista se puede compartir.
  - **Validación:** un área, clase, servidor o página que no existen muestran la página 404 con `noindex`, nunca una tabla vacía. Un valor vacío (`class=`, que envía «Todas las clases») cuenta como ausente.
  - Las búsquedas llevan `noindex`, porque son combinaciones infinitas sin valor para un buscador. La canónica conserva área, clase, servidor y página.
  - `/rankings` entra en el sitemap (10 páginas públicas × 7 idiomas).
- **Datos:**
  - `buildRankings` genera también un ranking por especialización. Antes solo había global y por clase base. Así cada filtro es un grupo de la clave primaria de `ranking_snapshots`; con la demo son 628 050 filas.
  - La migración `0003` añade índices por nombre a `characters` y `guilds` para la búsqueda con `LIKE 'abc%'`.
- **Por qué de esta forma:**
  - **Sin búsqueda, una página es una lectura por rango de la clave primaria** (`rank > 50·(n−1) LIMIT 50`), sin `OFFSET`. La página 900 cuesta lo mismo que la 1. Es la ventaja que buscaba la paginación por cursor de ADR-10, pero conserva el salto a cualquier página.
  - Los comodines de `LIKE` del texto buscado se escapan (`escapeLike`). Un `%` no convierte la búsqueda en un recorrido de toda la tabla.
  - Las consultas usan `"use cache"` con la etiqueta `rankings` (ADR-10: caché de minutos).
  - La ruta es bloqueante (`instant = false`). Con una cáscara estática y la tabla en streaming, la descripción, la canónica y el `noindex` llegaban dentro del `<body>`, porque dependen de la URL, y Lighthouse daba SEO 92 por «sin meta description». Con las consultas en caché, esperar a los datos cuesta pocos milisegundos.
- **Verificación:**
  - `ranking-filters.test.ts` (12 casos) y `seed.test.ts` (ranking por especialización).
  - `routing.test.ts` (URLs antiguas).
  - `tests/e2e/rankings.spec.ts`: mar + Sniper que se mantiene en la página 2, búsqueda por personaje y por gremio, búsqueda sin resultados, salto a la página 900, filtro no válido y 301.
- **Fecha:** 2026-11-06

### M-19 · Tabla accesible: cabeceras, tendencia con texto y móvil sin romper la página

- **Fallo original:** F-20 (clase y tendencia como imágenes sin `alt`), F-28 (información solo con iconos), F-42
- **Requisito:** RF-07, RNF-03
- **Cambio:**
  - Cabeceras `<th scope="col">` y un `<caption>` que dice qué ranking es y en qué página estás («Ranking de Mar, Sniper. Página 2 de …»).
  - El nombre del personaje es la cabecera de su fila (`<th scope="row">`), así el lector de pantalla lo repite con cada celda.
  - **Tendencia:** la flecha y el número son decorativos (`aria-hidden`) y llevan al lado un texto oculto «Sube 3 puestos» / «Baja 1 puesto» / «Sin cambios», con plural ICU en los 7 idiomas. «Nuevo» se ve como texto.
  - **Clase** escrita con su nombre; el icono es decorativo (`alt=""`).
  - **Móvil:** la tabla conserva todas las columnas y se desplaza en horizontal dentro de su caja, nunca la página.
    - La caja es una región con nombre que recibe el foco, para desplazarla con el teclado (WCAG 2.1.1).
    - El nombre del personaje queda fijo a la izquierda.
    - Un aviso visual indica que hay más columnas.
- **Por qué de esta forma:** convertir la tabla en tarjetas en móvil duplicaría el marcado o perdería la semántica de tabla. Con el desplazamiento propio, el lector de pantalla sigue navegando por filas y columnas.
- **Verificación:**
  - axe sin errores en `/rankings` y en una vista filtrada con búsqueda, en los 7 idiomas y en móvil y escritorio.
  - Sin scroll horizontal de la página en los 7 idiomas.
  - La prueba e2e de móvil comprueba que la caja se desplaza y la página no.
- **Fecha:** 2026-11-06

### M-20 · Página ligera (F-38) y redirección desde las URLs antiguas

- **Fallo original:** F-38 (50 filas con muchas imágenes de icono, unos 33 KB de texto por página), F-11
- **Requisito:** RNF-01, RNF-05
- **Cambio:**
  - **Iconos:** `<img>` simple de 33 px, sin `srcset`. Con `next/image`, cada fila repetía unos 200 bytes de variantes que un icono tan pequeño no necesita.
  - **Celdas:** el relleno se declara una vez en la tabla y cada celda tiene el mínimo de elementos.
  - **Peso:** 25 KB comprimida la página entera, con cabecera, pie y 50 filas.
  - **Redirección 301:** `/{idioma}/rankings/global/{área}/{clase}?page=N` → `/{idioma}/rankings?area=…&class=…&page=N`, en un solo salto. Una clase que no se reconoce se descarta y no da 404: el visitante llega al ranking general.
- **Medición:**
  - Lighthouse móvil en `/es/rankings`, en local y en 3 pasadas: rendimiento 95-96, accesibilidad 100, buenas prácticas 100, SEO 100.
  - LCP 1,6-1,7 s y CLS 0.
  - TBT entre 199 y 236 ms, en el límite de 200 ms como las demás páginas. Es la hidratación de la cabecera, ya identificada en T-14.
  - Añadida a `lighthouserc.json`.
- **Fecha:** 2026-11-06

### Pendiente

- ~~**«Ir a mi personaje»** (RF-07)~~: hecho en «Mi cuenta › Personajes» ([M-26](mi-cuenta.md)).
- **Ranking por servidor:** el filtro de servidor muestra los personajes de ese servidor con su puesto en el ranking de todos los servidores. Si Giiku quiere puestos por servidor, `buildRankings` puede generar ese grupo igual que el de especialización.

### Hallazgo: el 404 de una página con filtros responde 200

En las páginas que dependen de la URL (este ranking y el detalle de noticia), `notFound()` muestra la página 404 con `noindex`, pero el estado HTTP es 200. Las rutas inexistentes (`/es/no-existe`) sí dan 404. El buscador no las indexa por el `noindex`, pero lo correcto es un 404. [noticias.md](noticias.md#limitaciones-conocidas) dice que el detalle responde 404; hoy no es así. Se revisará junto con el [fallo de la 404 vacía](paginas-fijas.md#fallo-encontrado-la-404-llega-vacía-sin-javascript), porque probablemente tienen la misma causa en Next.js.
