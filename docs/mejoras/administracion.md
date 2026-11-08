# Registro de mejoras: panel de administración (T-23)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

T-23 se entrega por partes, cada una con su PR:

1. Base del panel (acceso por roles y auditoría) y gestión de cuentas: M-35.
2. Noticias: M-36.
3. Tienda, precios y campañas: M-37.
4. Promociones con imagen: M-38.
5. Paquetes de recarga y ajustes de AP: siguiente parte, sobre la misma base.

### M-35 · Panel con roles, gestión de cuentas y auditoría

- **Fallo original:** la web original no tiene panel propio a la vista. Sus contenidos caducados (F-16) muestran que no había forma de programar ni revisar cambios.
- **Requisito:** RF-12 (núcleo: usuarios, roles y auditoría de toda acción administrativa)
- **Cambio** (`/{idioma}/admin`, `noindex` y fuera de `robots.txt`):
  - **Roles** (`admin/permissions.ts`):
    - **admin:** todo, incluidos los roles de otras cuentas y la auditoría;
    - **support:** cuentas (buscar, ver, suspender y reactivar);
    - **editor:** contenido, que llega en la siguiente parte.
    - El menú solo enseña las zonas de los roles de quien entra. «Mi cuenta» enlaza al panel solo a las cuentas del equipo.
  - **Cuentas** (`/admin/users`):
    - búsqueda por nombre, correo o número y filtro por estado, en la URL (formulario GET, como el ranking);
    - tabla con número, cuenta, correo (y si está confirmado), estado, saldo y alta. En móvil se desplaza dentro de su caja.
  - **Ficha de cuenta** (`/admin/users/{id}`):
    - datos, sesiones abiertas, personajes y los 10 últimos movimientos de AP;
    - **suspender** con motivo obligatorio (5-500 caracteres), o **reactivar**;
    - **roles** con casillas, solo para `admin`;
    - su historial en la auditoría (para `admin`).
  - **Auditoría** (`/admin/audit`, solo `admin`): fecha, quién, acción, sobre qué cuenta, valores antes y después («status: active → suspended») e IP. `?user={id}` filtra por cuenta. Es de solo lectura.
  - **Primer administrador:** `pnpm staff:roles <cuenta> admin`. El cambio también queda en la auditoría, como «Terminal».
  - **Sin JavaScript de cliente:** formularios con Server Actions y patrón PRG, como la cesta (M-32). Las cuatro páginas quedan en 141 554 bytes (`pnpm js:budget`).
- **Por qué de esta forma:**
  - **Permisos en una tabla pura** (`permissions.ts`): la página y la Server Action consultan la misma regla, y se prueba sin base de datos.
  - **Cada acción vuelve a comprobar los roles en el servidor**, leídos de la base en ese momento. Ocultar un botón no protege nada, y el id de la cuenta llega del formulario (OWASP ASVS V4.1.1 y V4.2.1). Quitar un rol surte efecto en la página siguiente, sin esperar a que caduque la sesión.
  - **Sin permiso, la página de error** y no «acceso denegado»: el panel no revela que existe ni qué zonas tiene.
  - **Reglas para no quedarse fuera ni escalar:**
    - nadie se suspende a sí mismo;
    - soporte no puede suspender a cuentas del equipo, solo `admin`: un rol de soporte comprometido no deja fuera a los administradores;
    - un `admin` no puede quitarse su propio rol, así siempre queda alguien que pueda deshacer el cambio;
    - una cuenta borrada (RGPD) no se reactiva.
  - **Suspender cierra todas las sesiones** en la misma transacción. El jugador sale en su siguiente página y no puede volver a entrar: `auth.ts` ya rechazaba crear sesiones a cuentas no activas.
  - **Auditoría en la misma transacción que el cambio** (`audit.ts`): si el cambio se deshace, su registro también, y no puede haber un cambio sin registro. Guarda el motivo y cuántas sesiones se cerraron.
  - **La fila de la cuenta se bloquea** (`FOR UPDATE`) antes de leer su estado. Dos personas que suspenden la misma cuenta a la vez no generan dos suspensiones: la segunda ve que ya estaba suspendida.
  - **Búsqueda con `LIKE` escapado:** `%` y `_` se buscan como texto, no como comodines.
  - **Textos del panel en los 7 idiomas**, como el resto de la web (RNF-04). Los nombres de campo y valores de la auditoría se muestran tal como se guardan, para poder buscarlos en la base de datos.
- **Verificación:**
  - `permissions.test.ts` (5 casos) y `diff.test.ts` (2 casos).
  - **Contra MySQL** (`tests/db/admin.test.ts`, 7 casos):
    - suspender: estado, sesiones cerradas y auditoría con el motivo, y reactivar;
    - rechazos sin motivo, sin permiso, a uno mismo, al equipo desde soporte, a una cuenta que no existe y sin cambios. Nada de lo rechazado cambia ni deja auditoría;
    - dos suspensiones simultáneas: una se aplica;
    - roles: dar y quitar con auditoría; soporte no puede, y un admin no se quita el suyo;
    - búsqueda por nombre, correo y número, filtro por estado y comodines escapados;
    - la vista de auditoría filtra por cuenta y dice quién actuó.
  - **e2e** (`tests/e2e/admin.spec.ts`, 4 pruebas × móvil y escritorio):
    - un jugador no ve el enlace y recibe la página de error en las tres rutas;
    - soporte busca y suspende a un jugador, cuya sesión abierta en otro navegador deja de valer y que no puede volver a entrar; al reactivarlo, entra;
    - un admin cambia roles, no puede quitarse el suyo y lo ve en la auditoría;
    - axe sin errores y sin scroll horizontal en las cuatro páginas del panel, en los 7 idiomas.
- **Fecha:** 2026-11-07

### M-36 · Noticias desde el panel: borrador, programada y publicada

- **Fallo original:**
  - F-16: contenido caducado sin fecha y sin forma de programar inicio y fin.
  - F-17: noticias sin fecha ni autor.
  - F-03: traducciones a medias sin que nadie lo viera.
- **Requisito:** RF-08 · RF-12 (gestión de noticias: borrador, programada, publicada; traducciones por idioma)
- **Cambio** (`/{idioma}/admin/news`, roles `editor` y `admin`):
  - **Listado** con todas las noticias, también borradores y programadas, filtro por estado, y los idiomas de cada una («5 de 7», «Faltan: tr, it»).
  - **Nueva noticia:** slug y categoría. Se crea como borrador.
  - **Ficha:**
    - **datos y publicación:** slug, categoría, estado, fecha de publicación y fin del evento (en UTC, como las muestra la web);
    - **textos por idioma:** una pestaña por idioma, con «(falta)» en los que no tienen texto. Título, entradilla, cuerpo en Markdown y título y descripción para buscadores;
    - **vista previa** del texto guardado con el mismo Markdown que la web pública;
    - «Ver en la web» cuando ya es pública, y «Aparece el…» cuando está programada;
    - borrar, solo si es un borrador.
  - **Auditoría:** creada, cambiada (con los campos antes y después), texto añadido, cambiado o quitado, y borrador borrado. La auditoría enlaza a la ficha.
  - **La web pública se actualiza al guardar** (`updateTag("posts")`), sin esperar a que caduque la caché.
- **Por qué de esta forma:**
  - **Reglas de estado en una función pura** (`post-rules.ts`):
    - una noticia programada necesita una fecha futura;
    - publicada sin fecha es «ahora», y con fecha futura no vale (sería programada);
    - el fin del evento va después de la publicación.
    - Son las mismas reglas que usa la web pública para decidir qué se ve (`news.ts`), así que el panel no puede dejar una noticia en un estado que la web interprete de otra forma.
  - **El inglés es obligatorio para publicar o programar, y no se puede quitar:** es el idioma de respaldo cuando falta una traducción. Así ninguna noticia pública queda sin texto en algún idioma.
  - **Bloqueo optimista:** cada formulario envía la versión (`updated_at`) que vio. Si otra persona guardó entretanto, no se guarda nada y se avisa de que hay que recargar. Es mejor que «el último gana», que borraría el trabajo de la otra persona sin avisar. Guardar un texto también cambia la versión.
  - **Solo se borran borradores.** Una noticia pública se retira pasándola a borrador: la URL deja de verse y la auditoría conserva su historia.
  - **Auditoría sin el cuerpo entero:** se guardan los campos que cambiaron y el título antes y después. El cuerpo puede tener 20 000 caracteres por idioma y no aporta a «quién cambió qué».
  - **Formulario con errores por campo sin perder lo escrito** (`AdminForm`): con JavaScript, el error vuelve sin recargar y con los valores. Sin JavaScript también funciona. Los campos se vuelven a montar tras un error porque React restablece el formulario después de la acción y un `<select>` volvía a su valor inicial.
    - Coste: 1137 bytes en las dos páginas con formulario (`pnpm js:budget`: 142 691 B, por debajo de la página más pesada).
  - **Fechas en UTC:** el campo `datetime-local` no tiene zona. Se lee en UTC, como se muestran todas las fechas de la web, y la etiqueta lo dice.
- **Verificación:**
  - `post-rules.test.ts` (9 casos): fechas UTC (incluido el 31 de febrero), estados, fin de evento, slug y textos.
  - **Contra MySQL** (`tests/db/posts.test.ts`, 7 casos):
    - siempre se crea como borrador, con autor y auditoría;
    - publicar exige el inglés (no basta otro idioma), y la auditoría guarda antes y después;
    - una versión antigua se rechaza y no cambia nada;
    - slug repetido y guardado sin cambios;
    - el inglés no se quita y otro idioma sí;
    - solo se borran borradores;
    - el listado incluye borradores y sus idiomas.
  - **e2e** (`tests/e2e/admin-news.spec.ts`): un editor crea un borrador, no puede publicar sin inglés, escribe en inglés y español (con la vista previa), no puede programar en el pasado sin perder lo elegido, programa (no se ve en la web), publica (se ve en la ficha y el listado públicos), la retira y la borra.
    - Publica de verdad, así que va en su propio proyecto de Playwright, después de los demás: si corriera a la vez, cambiaría lo que cuentan las pruebas de noticias.
  - axe sin errores y sin scroll horizontal en el listado, la página nueva y la ficha con vista previa, en los 7 idiomas.
- **Fecha:** 2026-11-07

### M-37 · Tienda desde el panel: artículos, historia de precios y campañas

- **Fallo original:**
  - F-16: rebajas y eventos caducados que seguían anunciados, sin fechas de inicio y fin.
  - En la tienda original, un cambio de precio no deja rastro: no se puede saber qué precio tenía un artículo cuando alguien lo compró.
- **Requisito:** RF-05 · RF-12 (gestión de la tienda: artículos, precios y campañas, con auditoría)
- **Cambio** (`/{idioma}/admin/shop` y `/admin/campaigns`, solo `admin`):
  - **Listado de artículos** con búsqueda por SKU o nombre, filtro por categoría y estado, precio actual (con la rebaja), y los idiomas de cada uno.
  - **Nuevo artículo:** SKU, categoría, duración, orden y marcas (regalo, limitado, pack). Se crea **inactivo**.
  - **Ficha del artículo:**
    - **datos:** los mismos campos y «Activo en la tienda»;
    - **textos por idioma:** nombre y descripción, una pestaña por idioma con «(falta)», como las noticias;
    - **precios:** todas las filas, de la más nueva a la más antigua, con su estado (vigente, futuro, solapado o terminado), la campaña y las fechas. Un precio futuro se borra; uno en curso se termina «ya»;
    - **añadir precio:** precio, rebaja opcional, campaña opcional e inicio y fin;
    - un aviso si está activo pero sin precio actual, porque entonces no aparece en la tienda.
  - **Campañas:** código, inicio y fin (obligatorios) y nombre por idioma. El listado dice si está próxima, en curso o terminada, y cuántos precios tiene.
  - **Auditoría:** artículo creado o cambiado, texto cambiado, precio añadido, borrado o terminado, y campaña creada o cambiada. La auditoría enlaza a cada ficha.
  - **La tienda pública se actualiza al guardar** (`updateTag("shop")`).
- **Por qué de esta forma:**
  - **Los precios no se editan nunca: cada cambio es una fila nueva** (`item_prices`). Manda la fila más reciente que ya empezó, con la misma función que usa la tienda (`currentPrice`). Así:
    - la historia de precios queda entera, y la auditoría y los pedidos pueden explicarse después;
    - una rebaja termina sola en su fecha y vuelve el precio anterior, sin que nadie tenga que acordarse (F-16).
  - **Solo se borra un precio que aún no ha empezado.** Uno en curso se termina poniéndole fin ahora; uno pasado no se toca. Ningún pedido puede quedar apuntando a un precio que ya no existe.
  - **Rebajas dentro de campañas:** si se elige una campaña y se dejan las fechas vacías, la rebaja toma las de la campaña. Las fechas de una rebaja no pueden salirse de su campaña.
  - **Mover una campaña mueve sus precios:** las filas que seguían sus fechas cambian con ella en la misma transacción. Si alguna quedara terminando antes de empezar, no se guarda nada. Una campaña terminada ya no cambia de fechas.
  - **Inactivo al crear, y el inglés es obligatorio para activar:** la tienda usa el inglés cuando falta un idioma, como las noticias (M-36), así que ningún artículo público queda sin nombre.
  - **Bloqueo optimista** en los datos y textos, como las noticias.
  - **SKU y código de campaña únicos**, comprobados en la misma transacción.
  - **Validación en una función pura** (`shop-rules.ts`): enteros de AP sin decimales (1-1 000 000), rebaja menor que el precio, fechas en UTC y sin inicio en el pasado (con 5 minutos de margen para el tiempo de rellenar el formulario).
  - **Mismo formulario que las noticias** (`AdminForm`), con campos numéricos (`inputMode="numeric"`) y casillas. JS de las páginas con formulario: 142 818 B, por debajo de la página más pesada (`pnpm js:budget`).
- **Verificación:**
  - `shop-rules.test.ts` (10 casos): SKU, categoría, duración, orden, precio y rebaja, fechas, campaña (fechas por defecto y fuera de rango) y estado de cada fila.
  - **Contra MySQL** (`tests/db/shop-admin.test.ts`, 7 casos):
    - nace inactivo con auditoría, y activarlo exige el inglés; SKU repetido y versión antigua;
    - un precio futuro se borra, uno en curso se termina y uno terminado no se toca;
    - el listado enseña el precio vigente, con la rebaja activa;
    - campañas: nombre en inglés y código únicos; mover sus fechas mueve sus precios, sin dejar ninguno terminando antes de empezar, y una terminada no se mueve.
  - **e2e** (`tests/e2e/admin-shop.spec.ts`): un admin crea una campaña y un artículo, no puede activarlo sin inglés, escribe el nombre, lo activa (sin precio no se ve en la tienda), le pone precio, no puede poner una rebaja mayor que el precio, añade una rebaja de campaña (la ficha pública enseña la rebaja y el nombre de la campaña), la termina y lo ve en la auditoría.
    - Cambia la tienda de verdad, así que va en el proyecto `publicacion`, después de los demás, y borra el artículo y la campaña al terminar.
  - axe sin errores y sin scroll horizontal en las seis páginas nuevas, en los 7 idiomas.
- **Fecha:** 2026-11-07

### M-38 · Promociones de la portada con imagen, fechas y texto alternativo

- **Fallo original:**
  - F-16: promociones caducadas que seguían anunciadas, sin fecha de fin.
  - F-18: varios banners apuntaban a la portada de la tienda en lugar del producto o la categoría.
  - F-42: 42 de 43 imágenes sin texto alternativo y ninguna con ancho y alto (riesgo de CLS).
- **Requisito:** RF-01 · RF-12 (promociones con fechas de inicio y fin, gestionadas desde el panel)
- **Cambio:**
  - **Panel** (`/{idioma}/admin/promotions`, roles `admin` y `editor`):
    - listado con miniatura, título, enlace, fechas, estado (próxima, en curso o terminada) e idiomas;
    - **nueva y ficha:** imagen, enlace, inicio, fin (obligatorio), orden, y título y descripción de la imagen en los 7 idiomas (el inglés, obligatorio);
    - borrar, con la imagen si nada más la usa.
  - **Portada:** sección «Promociones» con las que están en curso (hasta 4), con su imagen, su título enlazado y «Hasta el…». Va después de las noticias y llega en streaming; sin promociones en curso, no aparece.
  - **Imágenes guardadas en MySQL** (decisión de Armando, ADR-17): `lib/media.ts` las comprueba y normaliza con `sharp`, y `/media/uploads/{hash}.webp` las sirve.
  - **Auditoría:** promoción creada, cambiada (con los campos antes y después) y borrada. La auditoría enlaza a la ficha.
- **Por qué de esta forma:**
  - **La fecha de fin es obligatoria y se muestra.** Una promoción terminada desaparece sola de la portada, sin que nadie tenga que acordarse (F-16).
  - **El texto alternativo es obligatorio en inglés.** Es el idioma de respaldo: ninguna imagen de la portada queda sin descripción. Si falta en el idioma de la página, se usa el inglés marcado con `lang="en"`, para que el lector de pantalla lo pronuncie bien.
  - **El tipo de la imagen se decide por su contenido**, no por su nombre ni por lo que diga el navegador. Un fichero de texto llamado `.png` se rechaza (OWASP ASVS V12.2.1). `limitInputPixels` corta imágenes trampa de millones de píxeles.
  - **Sin metadatos:** la ubicación GPS de una foto no debe acabar publicada.
  - **Ancho y alto guardados:** la imagen reserva su hueco antes de cargar y no mueve la página (CLS, F-42).
  - **Un enlace por promoción** (F-18): cada banner lleva a su propio destino, con la pista de usar la ruta de la categoría (`/shop?cat=…`) en lugar de la portada de la tienda.
  - **Enlaces seguros:** solo rutas de esta web o URLs `https://`. `javascript:`, `data:`, `http://` y `//otro-sitio` se rechazan.
  - **Imágenes huérfanas:** al cambiar o borrar una promoción, su imagen se borra en la misma transacción si nada más la usa (otras promociones, noticias o artículos). Si dos promociones usan la misma imagen, se guarda una sola vez.
  - **El campo de fichero no se puede volver a rellenar tras un error** (el navegador no lo permite), pero el resto de lo escrito sí se conserva.
- **Verificación:**
  - `promotion-rules.test.ts` (6 casos): destinos seguros y peligrosos, fechas por defecto, fin obligatorio y posterior, inicio en el pasado solo al editar, textos en inglés y longitudes.
  - **Contra MySQL** (`tests/db/promotions.test.ts`, 7 casos):
    - la imagen se pasa a WebP, se limita a 1600 px y se nombra con su hash; se rechazan ficheros vacíos, que no son imágenes o demasiado pequeños;
    - crear guarda la imagen en la base, con textos y auditoría; sin imagen no se crea;
    - editar exige la versión vista y rechaza guardar sin cambios;
    - cambiar de imagen borra la anterior; dos promociones con la misma imagen la guardan una vez y solo se borra con la última;
    - el listado usa el título del idioma o el inglés.
  - **e2e** (`tests/e2e/admin-promotions.spec.ts`, proyecto `publicacion`): un editor sube una imagen demasiado pequeña (error sin perder lo escrito), sube una válida, la ve en la ficha, comprueba que `/media` la sirve en WebP e inmutable, la ve en la portada con el título en español y la descripción en inglés marcada como tal, sin errores de axe, sigue el enlace a la tienda y la borra (desaparece de la portada y su imagen da 404).
  - axe sin errores y sin scroll horizontal en las tres páginas del panel, en los 7 idiomas.
- **Fecha:** 2026-11-08

### Pendiente

- **Siguientes partes de T-23:** paquetes de recarga, y ajustes de AP con su movimiento en el libro mayor. Cada una añade sus acciones a la misma auditoría.
- **Imagen de los artículos** (`image_id`) **y portada de las noticias** (`cover_image_id`): la subida de imágenes ya existe (M-38); falta el campo en sus formularios.
- **Categorías de la tienda:** se crean con la semilla; editarlas desde el panel es una ampliación.
- **Una noticia programada aparece con unos minutos de retraso:** el listado público va en caché (`cacheLife("minutes")`) y nada la invalida a la hora exacta. Se podría invalidar con una tarea programada (T-28b).
- **Aviso al jugador suspendido:** al iniciar sesión ve el mensaje genérico de credenciales. Un mensaje propio («tu cuenta está suspendida, escribe a soporte») solo debería mostrarse tras comprobar la contraseña, para no revelar el estado de cuentas ajenas.
- **Reembolsos de recargas:** en la parte de tienda y recargas del panel ([recarga.md](recarga.md)). **Tickets de soporte:** con T-24.
- **Panel de traducciones pendientes y estadísticas:** ampliaciones (C) de RF-12.
