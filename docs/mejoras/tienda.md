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

### M-32 · Cesta y compra con AP en una transacción (T-20)

- **Requisito:** RF-05 (cesta persistente, compra con saldo en una sola transacción, servidor y personaje que reciben el objeto) y RF-03 (comprar exige el correo confirmado)
- **Cambio:**
  - **Añadir a la cesta** desde la ficha, con la cantidad (1-10). Sin sesión, lleva a iniciar sesión y vuelve a la ficha.
  - **Cesta** (`/{idioma}/cart`, `noindex`):
    - **Contenido:** cada artículo con su precio actual, la cantidad y el subtotal. Se puede cambiar la cantidad o quitarlo.
    - **Artículos retirados de la venta:** se marcan y hay que quitarlos antes de pagar.
    - **Resumen:** total, saldo y saldo que queda tras pagar.
    - **Al pagar:** se elige el personaje que recibe los objetos («Misaja (Bergruen)»). El servidor sale del personaje.
  - **Si no se puede pagar, se explica por qué y qué hacer:**
    - falta saldo: «Te faltan 300 AP» y «Recargar AP» (criterio de aceptación);
    - el correo no está confirmado;
    - la cuenta no tiene personajes;
    - hay artículos que ya no se venden.
  - **Tras pagar:** «Compra completada: pedido n.º N», con enlace a «Mis compras». El pedido aparece en el historial de M-26.
  - **Sin JavaScript de cliente:** cada botón es un formulario con una Server Action que vuelve a la cesta con el resultado en la URL (patrón PRG). Recargar la página no repite la compra.
    - `pnpm js:budget`: la cesta queda en 141 554 bytes, igual que las páginas sin JS propio.
- **Por qué de esta forma** (`purchase.ts`):
  - **Todo en una transacción:** pedido, líneas con el precio congelado, movimiento en `ap_ledger` (con `applyDelta`), saldo y vaciado de la cesta. Si algo falla, no cambia nada.
  - **La fila del usuario se bloquea** (`SELECT … FOR UPDATE`) antes de leer el saldo y la cesta:
    - las compras de una cuenta van en fila;
    - con compras simultáneas, la segunda ve el saldo que dejó la primera, así que el saldo nunca queda en negativo;
    - un doble clic encuentra la cesta ya vacía y no cobra dos veces.
  - **El precio se lee de la base de datos al pagar**, no de la caché ni del formulario.
    - El formulario solo envía el total que vio el jugador.
    - Si no coincide (por ejemplo, una rebaja terminó entretanto), no se cobra y la cesta enseña el total nuevo.
  - **El personaje se comprueba contra la cuenta de la sesión**, porque su id llega del formulario (ASVS V4.2.1).
  - **La cesta solo guarda artículo y cantidad**, nunca un precio. La nueva columna `cart_items.created_at` (migración `0005`) da su orden.
- **Pruebas contra MySQL** (`pnpm test:db`, `tests/db/purchase.test.ts`, 8 casos y en CI):
  - una compra completa: pedido, precio congelado, libro mayor coherente y cesta vacía;
  - 1000 AP y una cesta de 1200 AP: se rechaza y nada cambia (criterio de aceptación);
  - dos compras simultáneas que suman más que el saldo: solo una se completa (criterio de aceptación);
  - ocho compras simultáneas de 300 AP con 1000 AP: se completan tres y quedan 100 AP;
  - doble envío de la cesta: un solo cobro;
  - se rechazan un total que cambió, un artículo retirado, el personaje de otra cuenta y una cuenta sin el correo confirmado.
  - **Base real:** van contra MySQL, no contra una simulación, porque lo que se prueba son los bloqueos y las transacciones.
- **Pruebas e2e** (`tests/e2e/cart.spec.ts`, 4 pruebas × móvil y escritorio):
  - sin sesión;
  - compra completa hasta «Mis compras» y el saldo nuevo, con axe en la cesta llena;
  - saldo insuficiente;
  - sin correo confirmado y sin personajes.
- **Fecha:** 2026-11-07

### Fallo conocido de la plataforma

- **Respuesta 200 en la página de error:** con `cacheComponents`, `notFound()` dentro de una página responde 200 con `noindex`, no 404. Lo mismo pasa en el ranking y en las noticias.
  - Los buscadores no la indexan, pero el código no es el correcto.
  - Sigue abierto en el registro general. La URL sin ruta (`/es/no-existe`) sí da 404.

### Pendiente

- ~~**Compra:** cesta, selección de servidor y personaje, y compra con AP en una transacción.~~ Hecho en M-32.
- **Entrega en el juego:** el pedido queda `completed` con el servidor y el personaje de cada línea. Mandar el objeto al servidor de Giiku depende de su integración, como los códigos canjeados (M-28).
- **«Recargar AP»** lleva por ahora al historial de recargas. La compra de AP llega con T-21.
- **Cabecera:** muestra siempre «Iniciar sesión», también con la sesión abierta, porque es estática. Un enlace a la cuenta y a la cesta con sesión es una mejora pendiente.
- **Datos de la ficha que pide RF-05 y el esquema aún no tiene:** género, tipo, nivel requerido, apilable y opciones de color. Llegarán con la integración del catálogo del juego.
  - Mientras tanto, la ficha muestra solo lo que existe.
- **Fotos de los artículos:** con el panel y el almacenamiento de imágenes (T-23).
