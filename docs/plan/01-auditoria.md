# 01. Auditoría de la web actual

Fecha de la auditoría: 2026-11-05. Alcance: páginas públicas de www.florensia-online.com en los 7 idiomas, tienda, rankings, noticias, landing "Play Now", páginas legales, robots/sitemap y el flujo de login/registro.

Actualizada el 2026-11-06 con la auditoría con sesión iniciada (sección 10), hecha en el navegador de Armando solo leyendo. Falta un informe Lighthouse formal (ver sección 9).

Severidad: **Alta** (rompe una función, afecta a SEO/seguridad/legal o a muchos usuarios), **Media** (degrada la experiencia), **Baja** (pulido).

## 1. Mapa funcional de la web actual (lo que hay que replicar)

| Área | URL actual | Qué hace |
|---|---|---|
| Inicio | `/`, `/{lang}` | Slider hero (3 imágenes), franja de promociones (banners), 5 últimas noticias, sección de clases (4 clases base × 3 ramas = 12), texto descriptivo del juego, redes sociales, footer legal |
| Descarga | `/download` | Descarga del cliente del juego (no se pudo leer, ver F-25) |
| Tienda | `/en/shop`, `/en/shop/category/{padre}/{hijo}`, `/en/shop/detail/index/{id}` | Item shop con precios en AP: categorías (Outfits, Premium, Consumibles, Mascotas, Bundles, Eventos especiales…), precio normal y rebajado, validez (ilimitado/limitado), cesta, "Select", "Details", "Buy" |
| Recarga | `/en/topup` | Compra de AP con dinero real (requiere sesión) |
| Jugar ahora | `/en/lp/style1/PlayNow` | Landing de captación: vídeo de fondo + formulario de registro |
| Comunidad | menú desplegable | Soporte (mailto), Reglas, Rankings, Wiki Flandria (externa), Liga PvP (externa) |
| Rankings | `/en/rankings/global/{area}/{clase}?page=N` | Ranking de personajes: filtros por área (todo/tierra/mar) y clase (grupo o subclase), 50 filas por página, ~905 páginas. Columnas: posición, cambio, nombre, clase, nivel tierra, nivel mar, gremio, servidor |
| Noticias | `/en/post`, `/en/post/{slug}` | Listado y detalle de noticias ([SHOP], [EVENT], [REDEEM], [Announcement]…) |
| Reglas | `/en/rules` | Código de conducta |
| Legales | `/en/privacy`, Impressum, Términos, Código de conducta | Textos legales (empresa alemana: Impressum obligatorio) |
| Cuenta | `us.online-games.services/en/users/sign_in`, `/sign_up`, `/password/new` | Login, registro y recuperar contraseña en un dominio externo (servicio de usuarios de Giiku Games) |
| Idiomas | `/en`, `/de`, `/es`, `/fr`, `/tr`, `/it`, `/pt` | 7 versiones, pero el selector solo muestra EN y DE |

Tecnología detectada: Ruby on Rails (token CSRF `authenticity_token`) con **Camaleon CMS** (rutas `/assets/camaleon_cms/...`), Google Tag Manager, CDN bunny.net, hosting OVH (según la política de privacidad).

## 2. Internacionalización (i18n)

| ID | Sev. | Hallazgo |
|---|---|---|
| F-01 | Alta | El selector de idioma solo ofrece **EN y DE** aunque existen `/es`, `/fr`, `/tr`, `/it`, `/pt`. Esas 5 versiones son inalcanzables desde la interfaz. |
| F-02 | Alta | Traducciones incompletas en todos los idiomas salvo EN: menú ("DOWNLOAD", "COMMUNITY", "Rules", "Rankings", "Support", "LOGIN", "Promo"), footer ("Code of Conduct", en TR y PT el footer entero), títulos y resúmenes de noticias en inglés. **PT es el menos traducido** (descripciones de clases y del juego en inglés). |
| F-03 | Alta | **TR**: el banner de cookies muestra literalmente `Cookies Text Ok [Learn More]` (clave de traducción sin rellenar). |
| F-04 | Media | Nombres de clases mezclados entre idioma local e inglés (ES, FR, IT con minúsculas en inglés, DE). |
| F-05 | Media | Errores ortográficos: DE "wervolle", "unabhändig"; FR "entrainement", "leur capacités", "le Pouvoir le la Lumière", "entre dans a bataille", "ont suivis", "Likez"; TR "Gladitor'ler", "saldılarabilir", "hücüm"; IT "misteriore"; EN "Mercenarie's", "glistening cariads", "not limited:" (falta "to"). |
| F-06 | Media | Enlaces que pierden el idioma: banners de DE apuntan a `/shop` o `/en/post/...`; login, registro y recarga solo en inglés y sin selector. |
| F-07 | Media | El portugués es genérico (`/pt`) en vez de **pt-BR**, que es lo pedido y el público real. |
| F-08 | Media | `<title>` es "Florensia" en todos los idiomas (no traducido ni por página). |
| F-09 | Media | Hay `hreflang` para los 7 idiomas, pero usa `pt` en vez de `pt-BR`, falta `x-default` y **no hay `canonical`** (verificado en el HTML el 2026-11-06). |

## 3. SEO

| ID | Sev. | Hallazgo |
|---|---|---|
| F-10 | Alta | `robots.txt` vacío de reglas efectivas y sin línea `Sitemap`. `/sitemap.xml` existe (corrección del 2026-11-06) pero pesa 1,35 MB con 6 881 URLs, incluye páginas internas del CMS (`/es/promo-banner-1`), `lastmod` de 2018 y **no incluye las URLs en inglés**. |
| F-11 | Media | Contenido duplicado: la raíz `/` sirve inglés pero `og:url` apunta a `/en`; la tienda existe en `/shop`, `/shop/` y `/en/shop`. |
| F-12 | Media | `og:image` / `twitter:image` relativos (`/media/1/layout/logo.png`); en `/en/privacy` apuntan a la imagen placeholder `image-not-found` del CMS. |
| F-13 | Baja | `meta keywords` (ignorado por buscadores) con coma final y términos duplicados; `revisit-after` obsoleto. |
| F-14 | Media | `/en/post` (listado de noticias) se sirve como texto plano con un solo párrafo de Black Friday; no hay listado, fechas ni paginación indexables. `/en/rules` también llega como texto plano sin cabecera ni footer. |
| F-15 | Baja | Enlace interno en `http://` (no https) dentro de la noticia de migración de personajes. |

## 4. Contenido y UX

| ID | Sev. | Hallazgo |
|---|---|---|
| F-16 | Alta | **Contenido caducado sin fecha**: banners de Halloween, Pirate Party, Traveler Sale y Black Friday visibles sin fecha de fin; noticias sin fecha ("yesterday's rewards"). No hay programación de inicio/fin. |
| F-17 | Media | Noticias sin fecha ni autor visibles. |
| F-18 | Media | Varios banners de promoción apuntan todos a la portada de la tienda en lugar del producto o categoría. |
| F-19 | Media | Tienda: nombres de artículo truncados ("Ghost Steel Sti..."), un artículo repetido ("Poor Pirate Bun..." dos veces), dos líneas "Price:" sin indicar cuál es la rebajada, categoría Bundles vacía, sin buscador ni filtros ni ordenación. |
| F-20 | Media | Rankings: las cabeceras existen (Rank, Name, Class, Land, Sea, Guild, Server) pero la clase y la tendencia son imágenes sin `alt`; sin fecha de actualización, sin búsqueda por nombre de personaje o gremio, 905 páginas sin forma de saltar. |
| F-21 | Media | Incoherencias: email de soporte `help@` en el menú y `support@` en las reglas; copyright 2015-2019 en la landing y 2017-2026 en el resto; la landing pide email sin confirmar contraseña y el registro oficial pide confirmación. |
| F-22 | Media | Texto de la sección de clases: dice "ocho clases extendidas" pero muestra 8 ramas + 4 base = 12 tarjetas sin explicar la diferencia. |
| F-23 | Media | Soporte solo por `mailto:`; la migración de personajes exige "abrir un ticket" pero no hay sistema de tickets en la web. Explicación confusa (15 000 AP vs "6 tokens"). |
| F-24 | Media | Experiencia partida entre dos dominios (florensia-online.com y us.online-games.services) con diseños y títulos distintos ("Giiku Games UserService"): rompe la confianza y la marca. |
| F-25 | Media | `/download` no es una página: redirige directamente a una descarga, sin requisitos del sistema, tamaño, versión ni alternativa de Steam. |

## 5. Accesibilidad (WCAG 2.2)

| ID | Sev. | Hallazgo |
|---|---|---|
| F-26 | Alta | `viewport` con `maximum-scale=1.0, user-scalable=no`: **impide hacer zoom en móvil** (incumple WCAG 1.4.4 Resize Text). |
| F-27 | Media | Slider hero con controles "previous/next" y sin pausa conocida (WCAG 2.2.2); el texto del hero va dentro de imágenes. |
| F-28 | Media | Información transmitida solo con iconos (cambio de posición en rankings, nivel de mar, leyenda de la tienda). |
| F-29 | Media | Menú "COMMUNITY" es un enlace `#` que abre un desplegable (patrón no accesible con teclado si no usa `button` + `aria-expanded`; verificar). |
| F-30 | Baja | GIF animado "Visit us!" sin enlace ni propósito; animación no detenible. |

## 6. Seguridad y legal

| ID | Sev. | Hallazgo |
|---|---|---|
| F-31 | Alta | Banner de cookies "al usar nuestros servicios aceptas las cookies" mientras GTM/Google Analytics dependen de consentimiento según su propia política: no es un consentimiento válido según RGPD/ePrivacy (no hay opción de rechazar). |
| F-32 | Media | Formulario de registro sin captcha ni protección anti-bots visible, y sin casilla de aceptación de términos en el registro oficial. |
| F-33 | Media | Email de privacidad escrito de tres formas distintas en la misma política. |
| F-34 | Media | Cabeceras (verificado 2026-11-06): hay `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, pero **no hay CSP, ni HSTS, ni Permissions-Policy**; `X-XSS-Protection` está obsoleta. |

## 7. Rendimiento (indicios, sin medición aún)

| ID | Sev. | Hallazgo |
|---|---|---|
| F-35 | Alta | Slider de 3 JPG grandes en el hero: candidato típico a LCP lento. Imágenes `.jpg/.png/.gif`, sin indicios de AVIF/WebP ni `srcset`. |
| F-36 | Media | Landing con vídeo MP4 de fondo (`flo-mov-1.mp4`) cargado de inicio. |
| F-37 | Media | GTM cargado en todas las páginas antes del consentimiento (coste de JS de terceros + F-31). |
| F-38 | Media | Rankings: 50 filas renderizadas en servidor con muchas imágenes de icono; ~33 KB de texto por página. |

## 8. Lo que funciona bien y se conserva

- Estructura de navegación simple (Descarga, Tienda, Jugar, Comunidad, Login).
- Rankings con filtros por área y clase, y URLs limpias y compartibles.
- Tienda organizada por categorías y subcategorías, con leyenda y precios rebajados.
- Rutas con prefijo de idioma (`/{lang}/...`), buena base para SEO multilingüe.
- Identidad visual de anime/fantasía náutica, ilustraciones de clases y logo: se mantienen como línea de diseño. Tipografías actuales: **Alegreya** (títulos) y **Nunito** (texto). Cabecera con marco azul ornamentado y banda de ilustraciones; paneles turquesa y pergamino en la tienda y el canje.
- Selección de servidor y personaje al comprar: imprescindible y se conserva.

## 9. Pendiente de auditar

| Qué | Por qué falta | Cómo se hará (T-02) |
|---|---|---|
| Informe Lighthouse formal (móvil y escritorio, 5 ejecuciones) y datos de campo CrUX | La extensión no ejecuta Lighthouse; sí se tomaron tiempos reales en el navegador (F-39) | Se ejecutará en CI con Lighthouse contra la web original a baja frecuencia (T-02) y se guardarán los JSON en `docs/baseline/` |

## 10. Auditoría con sesión iniciada y técnica (2026-11-06)

Hecha en el navegador de Armando con su cuenta de prueba, **solo lectura** (no se envió ningún formulario ni se compró nada).

### 10.1 Funciones del área de jugador (a replicar)
| Función | URL | Contenido |
|---|---|---|
| Menú ACCOUNT | desplegable | View Account, My Rankings, Redeem your code, Purchase History, TopUp History, Logout |
| Mi cuenta | `/en/users/account` | Login, saldo de AP y botones TopUp History, Purchase History, Edit |
| Editar cuenta | `us.online-games.services/users/edit` | Email, nueva contraseña + confirmación, contraseña actual obligatoria (en el dominio externo) |
| Mis rankings | `/en/rankings/me` | Tabla con los personajes de la cuenta; mensaje si ninguno es elegible |
| Canjear código | `/en/redeem` | Campo de código promocional (eventos [REDEEM] de las noticias) |
| Historial de compras | `/en/users/purchases` | Tabla Fecha, Artículo(s), Cantidad, Importe |
| Historial de recargas | `/en/users/topups` | Tabla Fecha, Descripción, Importe |
| Recarga de AP | `/en/topup` | Abre **Xsolla PayStation 3** (`secure.xsolla.com`), con el widget `paystation/1.0.7` cargado en todas las páginas |
| Tienda con sesión | `/en/shop` | Usuario y saldo de AP, botones "Get AP!" y "Purchases", contador de la cesta |
| Ficha de artículo | `/en/shop/detail/index/{id}` | Género, tipo, nivel de tierra y mar requeridos, apilable, duración, **cantidad**, precio, aviso de no reembolso y **selección de servidor y personaje** que recibe el objeto, "Añadir a la cesta" |
| Cesta | `/en/shop/cart/list` | Lista de artículos, "Continuar comprando" |

### 10.2 Nuevos hallazgos
| ID | Sev. | Hallazgo |
|---|---|---|
| F-39 | Alta | **Portada pesada**: el slider descarga 3 JPG (522 + 410 + 339 KB = 1,27 MB) aunque solo se ve uno, y las 12 clases cargan 24 imágenes (~75 KB cada una, ~1,8 MB) sin carga diferida. Banners PNG de 130-195 KB y un GIF de 118 KB. Medido en el navegador de Armando: **LCP 4,3 s con TTFB 4,2 s** en una carga y LCP 10,6 s en otra (pestaña en segundo plano). En rankings: TTFB 0,38 s y LCP 0,47 s. El servidor es irregular. |
| F-40 | Alta | Librerías antiguas: **jQuery 2.2.4** (vulnerabilidades XSS conocidas, CVE-2020-11022/11023), Bootstrap 4.3.1, jquery-ujs, Magnific Popup, toastr cargado con la versión `latest` (sin fijar, riesgo de cadena de suministro) y **dos versiones de Font Awesome** (5.11.2 y 4.x en la tienda). Todo bloquea el renderizado desde cdnjs. |
| F-41 | Media | El HTML de las páginas públicas se sirve con `Cache-Control: private, max-age=0`: ni el CDN ni el navegador pueden reutilizarlo. |
| F-42 | Alta | Accesibilidad de imágenes: 42 de 43 imágenes de la portada, las 26 de la tienda y las 164 de rankings **no tienen `alt`**; ninguna tiene `width`/`height` (riesgo de CLS). La portada **no tiene `<h1>`**. |
| F-43 | Alta | La tienda no es responsive: su hoja de estilos (199 reglas) no tiene ni una media query. El área de cuenta usa texto muy pequeño y de bajo contraste sobre gris. |
| F-44 | Media | Artículos de la tienda sin enlaces ni encabezados: los botones son `input` con `onclick` (no hay URL por artículo desde el listado, no es indexable ni navegable con teclado de forma fiable). |
| F-45 | Media | Formularios sin `<label>` asociado (canjear código, entre otros). |
| F-46 | Media | Historiales vacíos sin mensaje ("Aún no has hecho compras"): solo se ve la cabecera de la tabla. |
| F-47 | Media | Mezcla de idiomas en el servicio de cuentas: la página está en inglés y el aviso dice "Sesión iniciada." en español; `redirect_uri` vacío al volver. |
| F-48 | Media | El widget de Xsolla (`widget.min.js`) se carga en **todas** las páginas, aunque solo se use en la recarga. |
| F-49 | Baja | El enlace "TopUp" lleva directamente a la pasarela, sin página propia que explique los paquetes de AP, los métodos de pago o qué pasa después. |

**Aclaración sobre F-23:** la migración de personajes cuesta 6 "Service Coin" de 2 500 AP (= 15 000 AP). La cuenta es correcta, pero la web no la explica.
