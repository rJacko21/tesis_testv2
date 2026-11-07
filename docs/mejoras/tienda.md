# Registro de mejoras: tienda (T-19)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-30 · Catálogo con categorías, búsqueda, filtros y orden

- **Fallo original:** F-19 (nombres recortados, dos «Price:» sin decir cuál es el rebajado, categoría vacía, sin buscador, filtros ni orden).
- **Requisito:** RF-05
- **Cambio** (`/{idioma}/shop`):
  - **Categorías:** menú de categorías y, debajo de la elegida, sus subcategorías, con `aria-current`. En móvil cada fila se desplaza dentro de su caja.
    - Una categoría sin nada a la venta no aparece (criterio de aceptación).
  - **Búsqueda** por nombre: todas las palabras, en cualquier orden y sin distinguir mayúsculas ni tildes («pocion» encuentra «Poción»).
  - **Filtros:** solo rebajas y precio máximo (1000, 2500 o 5000 AP), sobre el precio final.
  - **Orden:** destacados (el de la tienda), precio de menor a mayor y al revés, y novedades.
  - **Todo en la URL** (`?cat=costumes&sub=outfits&q=…&sale=1&max=2500&sort=price-asc&page=2`): cada vista se puede compartir y la paginación conserva el filtro.
    - Un parámetro no válido, una categoría que no existe o una página fuera de rango dan la página de error.
  - **Tarjeta:**
    - nombre completo en el HTML, recortado a dos líneas con CSS y entero en `title`;
    - duración aparte («Permanente», «30 días»);
    - precio original tachado con «Antes» y «Ahora» para lectores de pantalla, y el rebajado en negrita;
    - insignias con texto: «-30 %», «Edición limitada», «Lote».
  - **Sin JavaScript de cliente:** formulario GET y enlaces, como el ranking (M-19).
- **SEO:**
  - Las categorías se indexan y su canónica conserva categoría y página.
  - Las búsquedas, filtros y órdenes llevan `noindex`, porque duplican las categorías.
  - `/shop` y cada artículo entran en el sitemap en los 7 idiomas.
- **Por qué de esta forma:**
  - **Catálogo en memoria** (`shop.ts` y `shop-catalog.ts`):
    - La tienda tiene decenas o pocos cientos de artículos, así que se lee entera una vez por idioma, en caché (`"use cache"`, etiqueta `shop`, minutos).
    - Filtrar, buscar y ordenar en memoria cuesta microsegundos, sin una consulta por combinación de filtros.
    - Las reglas son funciones puras y se prueban sin base de datos.
  - **Precio vigente fuera de la caché:**
    - Lo que se guarda en caché son todas las filas de `item_prices`.
    - El precio de cada artículo se calcula en cada petición con la hora actual: entre las filas activas gana la que empezó más tarde.
    - Así una campaña empieza y termina a su hora exacta aunque la caché tenga unos minutos, y al acabar vuelve sola el precio normal (F-16).
  - **Textos:** el nombre del artículo, la categoría y la campaña caen al inglés si falta la traducción.
  - **Imagen:** los artículos de demo no tienen foto. Hasta que la tengan (panel, T-23), cada tarjeta lleva un degradado por categoría y un icono SVG dentro del HTML, sin pedir archivos ni añadir JavaScript.
- **Verificación:**
  - `shop-filters.test.ts` (15 casos) y `shop-catalog.test.ts` (11 casos): lectura de la URL, precio vigente, rebajas, categorías vacías, búsqueda sin tildes, orden y páginas.
  - `tests/e2e/shop.spec.ts` (6 pruebas × móvil y escritorio): listado y páginas, categorías, búsqueda y su mensaje vacío, rebajas ordenadas por precio, ficha y página de error.
  - axe sin errores en el listado, un listado filtrado y una ficha en los 7 idiomas, y sin scroll horizontal.
- **Fecha:** 2026-11-07

### M-31 · Ficha de artículo con URL propia

- **Fallo original:** F-44 (los artículos eran `input` con `onclick`, sin enlace ni encabezado y sin URL propia)
- **Requisito:** RF-05
- **Cambio** (`/{idioma}/shop/item/{id}`):
  - El nombre de cada tarjeta es un encabezado con enlace a la ficha. Toda la tarjeta es clicable sin anidar enlaces.
  - **Ficha:** nombre, precio, descuento, descripción, duración y si se puede regalar.
  - **Rebaja con fecha:** «Rebaja del Festival de invierno hasta el 2 dic 2026».
  - **Migas de pan** en la página y en datos estructurados (`BreadcrumbList`).
  - La URL antigua `/shop/detail/index/{id}` redirige aquí con 301.
  - Un artículo que no existe o no está a la venta da la página de error.
- **Medición** (Lighthouse móvil en `/es/shop`, en local):
  - Rendimiento 93-97; accesibilidad, buenas prácticas y SEO 100. CLS 0.
  - Mismo TBT que `/es/rankings` en la misma máquina y la misma sesión.
  - **JS propio** (`pnpm js:budget`): 141 554 bytes, el mismo que las demás páginas sin JS propio. No añade nada al paquete.
- **Fecha:** 2026-11-07

### Fallo conocido de la plataforma

- **Respuesta 200 en la página de error:** con `cacheComponents`, `notFound()` dentro de una página responde 200 con `noindex`, no 404. Lo mismo pasa en el ranking y en las noticias.
  - Los buscadores no la indexan, pero el código no es el correcto.
  - Sigue abierto en el registro general. La URL sin ruta (`/es/no-existe`) sí da 404.

### Pendiente

- **Compra:** cesta, selección de servidor y personaje, y compra con AP en una transacción. Llegan con T-20.
- **Datos de la ficha que pide RF-05 y el esquema aún no tiene:** género, tipo, nivel requerido, apilable y opciones de color. Llegarán con la integración del catálogo del juego.
  - Mientras tanto, la ficha muestra solo lo que existe.
- **Fotos de los artículos:** con el panel y el almacenamiento de imágenes (T-23).
