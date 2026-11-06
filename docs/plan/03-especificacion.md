# 03. Especificación de requisitos de software (SRS)

Estructura según **ISO/IEC/IEEE 29148:2018**, apartado de contenido de la SRS. Describe **qué** hace el sistema y **por qué**, sin decidir tecnología (eso está en 04).

## 1. Introducción

### 1.1 Propósito
Definir los requisitos de la nueva web de Florensia Online, desarrollada como trabajo de tesis, para que sirvan de base al diseño, la implementación y la verificación.

### 1.2 Alcance
El sistema es la web pública y el área de jugador de Florensia: portada, noticias, tienda de objetos pagada con AP, recarga de AP, rankings, descarga, soporte, páginas legales, cuentas de usuario y un panel de administración básico, en 7 idiomas. **Fuera de alcance:** el cliente y el servidor del juego, el cobro con dinero real y la conexión con la base de datos real del juego (no hay acceso; se usan datos sintéticos).

### 1.3 Definiciones
| Término | Definición |
|---|---|
| AP | Moneda virtual de la tienda. Se obtiene con recargas y se gasta en objetos |
| Clase base / especialización | 4 clases iniciales (Mercenary, Explorer, Noble, Saint); a nivel 40 cada una elige 1 de 2 especializaciones |
| Nivel de tierra / mar | Dos progresiones independientes del personaje (sistema de doble combate) |
| CWV | Core Web Vitals: LCP, INP, CLS |
| CA | Criterio de aceptación, redactado como Dado / Cuando / Entonces |

### 1.4 Referencias
ISO/IEC/IEEE 29148:2018; WCAG 2.2; OWASP ASVS 4.0.3; RGPD (UE 2016/679); documentación de Core Web Vitals (web.dev); 01-auditoria.md.

## 2. Descripción general

### 2.1 Perspectiva del producto
Sustituye a la web actual (Rails + Camaleon CMS) e integra las funciones de cuenta que hoy están en un dominio externo (`us.online-games.services`).

### 2.2 Usuarios
**Visitante** (sin sesión, mayoría desde móvil), **Jugador** (con sesión, compra con AP), **Editor** (publica noticias y promociones), **Administrador** (todo, incluida la tienda y los usuarios).

### 2.3 Restricciones
React (Next.js) y MySQL; alojamiento de coste cero (ADR-12); 7 idiomas; sin revisores humanos de traducción (ADR-13); assets oficiales usados con permiso de Giiku Games (BGM, SFX, nombre, diseños de personajes y arte).

### 2.4 Supuestos y dependencias
Los datos de personajes y rankings son sintéticos. La recarga usa Xsolla en sandbox o un proveedor simulado (ADR-09). La auditoría con sesión se completó el 2026-11-06.

## 3. Requisitos específicos

Atributos de cada requisito (29148): **ID**, **prioridad** (MoSCoW: M obligatorio, S debería, C podría), **origen** (función existente o fallo F-xx), **verificación** (T test automático, I inspección, D demostración, A análisis) y criterios de aceptación (CA).

| ID | Requisito | Prioridad | Origen | Verificación |
|---|---|---|---|---|
| RF-01 | Portada | M | Función existente; F-16, F-18, F-22, F-27, F-35 | T |
| RF-02 | Navegación y selector de idioma | M | F-01, F-06, F-29 | T |
| RF-03 | Cuentas | M | Función existente; F-21, F-24, F-32 | T |
| RF-04 | Mi cuenta | M | Función existente; F-46, F-47 | T |
| RF-05 | Tienda con AP | M | Función existente; F-18, F-19 | T |
| RF-06 | Recarga de AP | S | Función existente; F-48, F-49 | T, D |
| RF-13 | Canjear código promocional | M | Función existente | T |
| RF-07 | Rankings | M | Función existente; F-20, F-28, F-38 | T |
| RF-08 | Noticias | M | Función existente; F-14, F-16, F-17 | T |
| RF-09 | Descarga | M | Función existente | T |
| RF-10 | Comunidad y soporte | S | F-21, F-23 | T |
| RF-11 | Legales y consentimiento | M | F-31, F-33 | T, I |
| RF-12 | Administración (núcleo M, ampliaciones C) | M / C | Gestión de contenido | T, D |
| RNF-01..10 | Calidad (sección 3.2) | M | Ver tabla | T, A |

---

### 3.1 Requisitos funcionales

### RF-01 Portada
Como visitante quiero ver de un vistazo qué es Florensia, las novedades y cómo empezar a jugar.
Resuelve: F-16, F-18, F-22, F-27, F-35.
- Hero con una imagen principal (no slider automático) y llamada a la acción "Jugar gratis" + "Descargar". Si se mantienen varias diapositivas, el carrusel no avanza solo, es manejable por teclado y tiene pausa.
- Franja de promociones activas: solo se muestran las que estén dentro de su fecha de inicio y fin; cada una enlaza a su destino concreto.
- Últimas 5 noticias con fecha, categoría y resumen.
- Sección de clases: 4 clases base, cada una con sus 2 especializaciones, explicando la evolución a nivel 40.
- Enlaces a redes sociales y comunidad.

CA:
- Dado una promoción con fecha de fin pasada, cuando cargo la portada, entonces no aparece.
- Dado cualquier idioma, cuando cargo la portada, entonces todos los textos, incluidos menú, footer y cookies, están en ese idioma.
- Dado un móvil de 360 px, cuando cargo la portada, entonces no hay scroll horizontal y el LCP es la imagen del hero.

### RF-02 Navegación global y selector de idioma
Resuelve: F-01, F-06, F-29.
- Cabecera con: Descargar, Tienda, Jugar ahora, Comunidad (Soporte, Reglas, Rankings, Wiki, Liga PvP), Iniciar sesión / Mi cuenta.
- En móvil, menú hamburguesa accesible (foco atrapado, Esc cierra, `aria-expanded`).
- Selector con los **7 idiomas**, cada uno escrito en su propio idioma (English, Português (Brasil), Türkçe, Italiano, Deutsch, Français, Español). Cambiar de idioma mantiene la página actual.
- Primera visita: idioma propuesto según `Accept-Language`; la elección se recuerda en una cookie.

CA:
- Dado que estoy en `/de/rankings/global/sea`, cuando elijo Español, entonces llego a `/es/rankings/global/sea`.
- Dado que solo uso el teclado, cuando navego el menú Comunidad, entonces puedo abrirlo, recorrerlo y cerrarlo.

### RF-03 Cuentas: registro, login, recuperación
Resuelve: F-21, F-24, F-32.
- Registro con usuario, email, contraseña (mín. 10 caracteres, comprobada contra contraseñas filtradas), aceptación explícita de términos y privacidad, protección anti-bots sin fricción (Cloudflare Turnstile o similar).
- Verificación de email antes de poder comprar.
- Login con usuario o email; limitación de intentos; mensajes de error que no revelan si la cuenta existe.
- Recuperar contraseña por enlace de un solo uso con caducidad de 30 min.
- Todo dentro del mismo dominio y diseño, en los 7 idiomas.
- La landing "Jugar ahora" usa el **mismo** formulario y reglas.

CA:
- Dado un email ya registrado, cuando pido recuperar contraseña de un email inexistente o existente, entonces veo el mismo mensaje.
- Dado 5 intentos fallidos en 15 min, cuando intento de nuevo, entonces se me pide esperar.

### RF-04 Mi cuenta
Resuelve: F-24, F-46, F-47.
- Resumen: usuario, saldo de AP y accesos a recargar, historial de compras, historial de recargas, mis rankings y canjear código.
- Historiales paginados con estado vacío explicativo.
- "Mis rankings": posición de cada personaje de la cuenta, con mensaje si ninguno es elegible.
- Ver datos de la cuenta, saldo de AP, historial de compras y recargas.
- Cambiar contraseña y email pidiendo la contraseña actual (con reverificación del email nuevo), cerrar sesiones abiertas. Dentro del mismo dominio e idioma.
- Lista de personajes de la cuenta (si hay datos del juego).
- Exportar mis datos y solicitar la eliminación de la cuenta (RGPD).

### RF-05 Tienda (item shop)
Resuelve: F-18, F-19.
- Catálogo por categorías y subcategorías (Outfits: sombreros, vestidos, accesorios; Premium: almacén, banco y tienda, cajas aleatorias, boda, resets, teletransporte; Eventos especiales; Consumibles: piedras mágicas, pociones, mejoras, sellado, esencias; Mascotas: combate, montura, habilidades, recogida, consumibles; Bundles).
- Tarjeta de artículo con nombre completo (2 líneas máx. con `title`), imagen, precio en AP, precio rebajado claramente marcado (tachado + etiqueta "-25 %"), validez (ilimitado / N días), insignias (bundle, edición limitada, regalo incluido) con texto, no solo icono.
- Buscador, filtro por categoría, precio y "en oferta", ordenación (relevancia, precio, novedad).
- Ficha de artículo con descripción, género, tipo, nivel de tierra/mar requerido, apilable, opciones (color, duración), cantidad, aviso de no reembolso cuando aplique, imágenes, y **selección de servidor y personaje que recibe el objeto**. Cada artículo tiene URL propia enlazada desde el listado (F-44).
- Cesta persistente; compra con saldo de AP en una sola transacción; confirmación y entrada en el historial.
- Las campañas (Halloween, Pirate Party…) son entidades con fecha de inicio y fin.

CA:
- Dado un saldo de 1000 AP y una cesta de 1200 AP, cuando compro, entonces la compra se rechaza, el saldo no cambia y se me ofrece recargar.
- Dado dos compras simultáneas que suman más que mi saldo, entonces solo una se completa.
- Dado una categoría sin artículos, entonces no aparece en el menú.

### RF-06 Recarga de AP
- Paquetes de AP con precio en moneda local, pago a través de Xsolla (sandbox) o del proveedor simulado (ADR-09). Fuera de alcance: cobro real.
- El saldo solo se acredita tras la confirmación firmada de la pasarela (webhook), nunca por la redirección del navegador.
- Recibo por email y en el historial.

CA:
- Dado un webhook repetido dos veces, entonces el saldo se acredita una sola vez (idempotencia).

### RF-13 Canjear código promocional
Origen: función existente (`/en/redeem`).
- El jugador introduce un código; si es válido, no ha caducado y no lo ha usado antes, recibe la recompensa (AP u objeto entregado a un personaje elegido).
- Códigos gestionados en el panel admin: recompensa, usos máximos, uso por cuenta, fechas.
CA:
- Dado un código ya canjeado por mi cuenta, cuando lo vuelvo a introducir, entonces veo "Ya has usado este código" y no recibo nada.
- Dado 10 intentos con códigos inválidos en 10 min, entonces se bloquea temporalmente (anti fuerza bruta).

### RF-07 Rankings
Resuelve: F-20, F-28, F-38.
- Filtros: área (todas, tierra, mar), clase base y especialización; servidor si hay varios.
- Búsqueda por nombre de personaje o gremio.
- Columnas con cabecera textual: posición, tendencia (con texto accesible "sube 3"), personaje, clase, nivel de tierra, nivel de mar, gremio, servidor.
- En móvil, la tabla se transforma en tarjetas o mantiene columnas clave con scroll horizontal propio.
- Paginación con salto a página y "ir a mi personaje" para jugadores con sesión.
- Fecha y hora de la última actualización.
- Filtros reflejados en la URL (compartibles e indexables).

CA:
- Dado el filtro mar + Sniper, cuando cambio de página, entonces el filtro se mantiene y la URL lo refleja.
- Dado que busco "Misaja", entonces veo su fila y su posición.

### RF-08 Noticias
Resuelve: F-14, F-16, F-17.
- Listado paginado con fecha, categoría (Anuncio, Evento, Tienda, Canje, Mantenimiento), imagen y resumen; filtro por categoría.
- Detalle con fecha de publicación y actualización, autor, contenido enriquecido, enlaces relacionados.
- Cada noticia tiene versiones por idioma; si falta una traducción se muestra la inglesa con aviso visible "Disponible solo en inglés" (y `hreflang` correcto).
- Fecha de caducidad opcional para noticias de eventos.

### RF-09 Descarga del juego
- Detecta el sistema operativo y destaca la descarga adecuada; muestra requisitos mínimos y recomendados, tamaño, versión y enlace a Steam.

### RF-10 Comunidad y soporte
Resuelve: F-21, F-23.
- Página de soporte con preguntas frecuentes y formulario de contacto (categorías: cuenta, pagos, migración de personaje, bug, denuncia) en lugar de solo `mailto`. Un único email de soporte por idioma, coherente en todo el sitio.
- Reglas / Código de conducta como página HTML completa, con índice y fecha de vigencia.
- Enlaces externos (Wiki Flandria, Liga PvP, Discord, Steam, redes) marcados como externos.

### RF-11 Páginas legales y consentimiento
Resuelve: F-31, F-33.
- Impressum, Términos, Privacidad, Código de conducta, Cookies, en los 7 idiomas (con texto legal de referencia en alemán/inglés si así lo exige la empresa).
- Banner de consentimiento con **Aceptar**, **Rechazar** y **Configurar** al mismo nivel; ningún script de analítica antes del consentimiento; la elección se puede cambiar desde el footer.

### RF-12 Panel de administración
Núcleo (M): noticias, promociones, tienda y precios, campañas, usuarios, roles. Ampliaciones (C): tickets, traducciones pendientes, estadísticas. Diseñado por módulos para crecer sin rehacer.
- Gestión de noticias (borrador, programada, publicada; traducciones por idioma), promociones/banners con fechas, catálogo de tienda y precios, campañas, paquetes de recarga, usuarios (bloquear, ver historial), tickets de soporte.
- Registro de auditoría de toda acción administrativa.
- Panel de traducciones pendientes: qué contenidos faltan en qué idioma.

---

### 3.2 Requisitos no funcionales

| ID | Requisito | Criterio | Resuelve |
|---|---|---|---|
| RNF-01 | Rendimiento | Presupuesto de 02-constitucion, comprobado en CI | F-35..F-38 |
| RNF-02 | Mobile first y responsive | Sin scroll horizontal de 320 a 2560 px; objetivos táctiles ≥ 24×24 px (WCAG 2.5.8) | F-26 |
| RNF-03 | Accesibilidad | WCAG 2.2 AA; zoom permitido; contraste ≥ 4.5:1; navegación completa por teclado; 0 errores axe | F-26..F-30 |
| RNF-04 | i18n | 7 locales, `hreflang` + `x-default`, formatos de fecha/número/moneda por locale (Intl), pluralización ICU, falta de clave rompe el build | F-01..F-09 |
| RNF-05 | SEO | Título y descripción únicos por página e idioma, canonical, sitemap por idioma, robots válido, datos estructurados (Organization, VideoGame, NewsArticle, BreadcrumbList), Open Graph absoluto | F-10..F-15 |
| RNF-06 | Seguridad | OWASP ASVS L2: cabeceras CSP/HSTS/etc., CSRF, cookies `HttpOnly; Secure; SameSite=Lax`, Argon2id, rate limit, validación de entrada, secretos fuera del repo | F-32, F-34 |
| RNF-07 | Privacidad | RGPD: consentimiento, minimización, exportación y borrado de datos, retención de logs 30 días | F-31, F-33 |
| RNF-08 | Disponibilidad y observabilidad | Logs estructurados, monitorización de errores, métricas reales de usuario (RUM con `web-vitals`), copias de seguridad diarias de MySQL | — |
| RNF-09 | Mantenibilidad | Estándares de 02; cobertura mínima; ADR por decisión | — |
| RNF-10 | Compatibilidad | Últimas 2 versiones de Chrome, Firefox, Safari, Edge; iOS 16+, Android 10+ | — |

## 4. Verificación

Cada CA se automatiza con Playwright (formato Dado/Cuando/Entonces). Los RNF se verifican en CI (Lighthouse CI, axe, comprobador de claves i18n) y con las pruebas de carga de ADR-14. La matriz de trazabilidad está en 05-plan-de-tareas.md.
