# Registro de mejoras: descarga, soporte, reglas y legales (T-14)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-11 · Descarga que sabe qué equipo tienes

- **Fallo original:** F-24 (la descarga y el registro saltaban a otro dominio, solo en inglés)
- **Requisito:** RF-09
- **Antes:** un botón de descarga sin requisitos, tamaño ni aviso de que el juego solo funciona en Windows.
- **Cambio:**
  - `/{idioma}/download` detecta el sistema **en el servidor** (`lib/platform.ts`). Usa primero la cabecera `Sec-CH-UA-Platform` y, si no llega, el `User-Agent`.
  - El mensaje cambia según el sistema. En Windows dice «puedes jugar»; en Mac o Linux, que hace falta Windows; en el móvil, que es un juego de PC y que puede añadirlo ya a su biblioteca de Steam. El botón de Steam se muestra siempre, porque la detección puede fallar.
  - Los requisitos mínimos y recomendados van en una tabla real (`<th scope>`), con los datos de la ficha oficial de Steam, consultada el 2026-11-06 (`config/download.ts`).
  - Hay tres pasos de instalación.
- **Por qué de esta forma:** detectar el sistema en el servidor no envía JavaScript. La página es estática y solo la recomendación llega en streaming; mientras tanto se ve el texto genérico, del mismo tamaño, sin salto de diseño.
- **Pendiente (pregunta para Armando):** Giiku no ha facilitado la versión del cliente ni un instalador directo. `CLIENT_VERSION` e `INSTALLER_URL` siguen en `null` y la página no se inventa esos datos.
- **Verificación:** `platform.test.ts` (7 casos) y `download-support.spec.ts` (Windows, Mac y tabla). axe sin errores en los 7 idiomas.
- **Fecha:** 2026-11-06

### M-12 · Soporte con preguntas frecuentes en lugar de un `mailto:`

- **Fallo original:** F-23 («Soporte» era un `mailto:`), F-21
- **Requisito:** RF-10
- **Cambio:** `/{idioma}/support` responde seis preguntas frecuentes en los 7 idiomas: gratuidad, equipo necesario, AP, contraseña, denuncias y migración de personaje. Cada pregunta es un `<details>` nativo: se abre con teclado sin JavaScript, y el texto está en el HTML, así que los buscadores lo indexan. Al final enlaza al Discord oficial.
- **Pendiente:** el formulario de contacto con categorías (RF-10) guarda tickets ligados a la cuenta; llega con T-17/T-18.
- **Verificación:** `download-support.spec.ts` (se abre con Enter; no queda ningún `mailto:` en la página).
- **Fecha:** 2026-11-06

### M-13 · Reglas y legales como páginas completas, con índice, vigencia y versión

- **Fallo original:** F-14 (`/en/rules` llegaba como texto plano sin cabecera ni pie), F-33
- **Requisito:** RF-10, RF-11
- **Cambio:**
  - `/imprint`, `/terms`, `/rules`, `/privacy` y `/cookies` salen de las tablas `pages` y `page_translations`. `db:seed` carga el texto inicial con `INSERT IGNORE`, así que nunca pisa un texto editado.
  - Cada página muestra un **índice** generado a partir de los `##` (`tableOfContents` en `lib/markdown.tsx`, con `id` legibles y sin acentos), la **fecha de vigencia** y la **versión**. El consentimiento guarda qué versión se aceptó.
  - Sin traducción, se muestra el inglés con aviso, `lang="en"` y la canónica a `/en/…`, como las noticias (M-08).
  - El pie enlaza las cinco páginas; «Política de cookies» es nueva.
- **Textos:**
  - **Aviso legal, código de conducta (`/rules`) y privacidad:** desde el 2026-11-07 son los **textos oficiales** de Giiku Games GmbH que Armando facilitó. En la web original el aviso legal y el código de conducta iban juntos en una sola página; aquí cada uno va en su ruta, porque el pie ya enlaza las dos por separado y así cada uno tiene su índice, su fecha y su versión. La redacción no se ha tocado: solo se han puesto encabezados y listas para generar el índice. Están solo en inglés, como en la original, y en los otros idiomas se ven con el aviso «Disponible solo en inglés».
  - **La política de privacidad describe la web original, no esta:** habla de Google Analytics, del hosting en OVH y de la CDN bunny.net, que este sitio no usa (no carga analítica sin permiso, M-06). Se ha cargado tal cual porque es el texto oficial; la política de cookies sí describe este sitio. Si la demo se publica, conviene que Giiku la adapte.
  - **Términos:** siguen siendo **textos de ejemplo** en inglés y español, y lo dicen en su primera línea. `db:seed` sustituye un texto de ejemplo por el real en cuanto este existe (y quita los idiomas de ejemplo que el real no tiene), sin tocar nunca un texto editado. La excepción es la política de cookies, que describe este sitio tal como es: los nombres salen del código y una prueba e2e comprueba que toda cookie que pone el sitio aparece en la política. Esa prueba encontró un error: el texto decía `locale` y la cookie real se llama `NEXT_LOCALE`.
- **Verificación:** `legal.spec.ts` (índice navegable, aviso de inglés, canónica y enlaces del pie) y `markdown.test.tsx` (índice e `id`).
- **Fecha:** 2026-11-06

### Fallo encontrado: la 404 llega vacía sin JavaScript

- **Qué pasa:** con `cacheComponents` y el layout raíz en `[locale]`, Next.js 16.4.5 responde a `notFound()` con el estado 404 y `noindex`, que es correcto. Pero el HTML inicial es `<html id="__next_error__">` sin `lang` ni contenido, y la página 404 traducida la pinta el JavaScript al hidratar. Con JS, el usuario ve la 404 traducida, `lang` correcto y axe sin errores; sin JS o para un rastreador, la página está vacía.
- **Qué se probó:** un layout mínimo sin cabecera, pie ni scripts y una `not-found.tsx` estática; quitar `generateMetadata` y `generateStaticParams`; y `global-not-found.tsx`. En todos los casos ocurre lo mismo, así que es el comportamiento del framework con esta estructura, no un fallo del código.
- **Impacto:** bajo. Las 404 no se indexan (`noindex`) y los usuarios con JS ven la página correcta.
- **Siguiente paso:** reproducirlo en un proyecto mínimo y abrir una incidencia en Next.js, o revisarlo al actualizar Next (T-15).
