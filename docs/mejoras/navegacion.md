# Registro de mejoras: navegación global (T-11, parcial)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-05 · Menú completo, traducido y usable con teclado

- **Fallo original:** F-02 (menú en inglés en otros idiomas), F-06 y F-24 (el login y "Jugar ahora" saltaban a otro dominio solo en inglés), F-23 (soporte con `mailto:`)
- **Requisito:** RF-02 · **Decisión:** ADR-15 (presupuesto de JS)
- **Antes:** menú con textos en inglés fuera de EN. "Comunidad" era un desplegable de Bootstrap con jQuery, y enlaces del menú cambiaban de dominio e idioma.
- **Cambio:**
  - **Escritorio:** "Comunidad" es un `<details>` nativo que se cierra con Escape (y devuelve el foco), al pulsar o tabular fuera y al cambiar de página. El selector de idioma funciona igual. Desde M-25 lo hace `HeaderBehavior`.
  - **Móvil:** el menú es un `<dialog>` modal. El navegador atrapa el foco, vuelve inerte el resto de la página y lo cierra con Escape. El botón lleva `aria-expanded`.
  - **Enlaces:** todos los internos conservan el idioma. Los externos (Flandria, Liga PvP) se marcan con un icono y con texto para lectores de pantalla.
  - **Redes oficiales:** pasan al pie de todas las páginas, como texto y sin scripts de terceros.
- **Por qué de esta forma:**
  - El patrón _disclosure_ (lista de enlaces) es el correcto para navegación; `role="menu"` es para menús de aplicación.
  - `<dialog>` da gratis lo que pide RF-02, sin una librería de diálogos.
  - Las clases de los botones se calculan en el servidor: importarlas en el cliente metía tailwind-merge (unos 8 KB) en el navegador y superaba el presupuesto de 150 KB. Se queda en 149,9 KB.
- **Verificación:** `tests/e2e/navigation.spec.ts`:
  - el menú móvil se abre, mantiene el foco dentro, se cierra con Escape y devuelve el foco, y se cierra al navegar;
  - "Comunidad" se abre, se recorre y se cierra con teclado (criterio de RF-02);
  - todos los enlaces internos de la cabecera mantienen el idioma.

  axe sin errores en los 7 idiomas. Lighthouse móvil: LCP 1,65 s, accesibilidad 1.

- **Pendiente en T-11:** banner de consentimiento de cookies (RF-11), en un PR aparte.
- **Fecha:** 2026-11-06

### M-06 · Consentimiento de cookies real

- **Fallo original:** F-31 (banner de «al usar el sitio aceptas las cookies», sin opción de rechazar, mientras cargaba GTM), F-37 (GTM antes del consentimiento), F-03 (banner turco sin traducir)
- **Requisito:** RF-11 · **Decisión:** ADR-11
- **Antes:** consentimiento implícito e imposible de rechazar o de cambiar después, y scripts de terceros cargados desde el inicio.
- **Cambio:**
  - **Banner propio:** **Aceptar**, **Rechazar** y **Configurar** con el mismo estilo, en los 7 idiomas.
  - **Panel de configuración:** un `<dialog>` con una casilla por categoría. Se abre también desde «Configurar cookies» del pie.
  - **Por defecto:** lo opcional está desactivado y no se carga nada de terceros.
  - **Cookie `consent`:** guarda la elección con su versión y dura 6 meses. Si cambia la política, se vuelve a preguntar.
  - **Prueba del consentimiento:** `POST /api/consent` la guarda en `consents` con un identificador aleatorio, sin IP (RGPD, arts. 5.1.c y 7.1).
- **Por qué de esta forma:**
  - Sin librería de terceros (CMP), así que no hay más JS ni más rastreo.
  - Los botones tienen el mismo peso para evitar patrones engañosos (directrices del CEPD 03/2022).
  - El banner va fijo y aparece tras hidratar: no desplaza el contenido (CLS 0,001) ni pasa a ser el elemento LCP.
- **Verificación:**
  - `src/lib/consent.test.ts`: sin elección no se permite nada; una cookie manipulada o de otra versión obliga a preguntar de nuevo.
  - `tests/e2e/consent.spec.ts`:
    - los tres botones son iguales;
    - rechazar se recuerda tras recargar;
    - la elección se cambia desde el pie;
    - **ninguna petición a terceros** sin elección.
  - Lighthouse móvil: LCP 1,66 s; JS 147,7 KiB, dentro del límite de 150 KiB.
- **Fecha:** 2026-11-06

### M-25 · Cabecera con menos JavaScript: el navegador abre y cierra los menús

- **Requisito:** RF-02 · **Decisiones:** ADR-15 (presupuesto de JS) y ADR-16 (TBT)
- **Motivo:**
  - Tras las cuentas (M-21), `/es/register` cargaba 152 868 bytes de JS, a 700 del límite de 153 600.
  - La tienda (T-19 a T-21) añadirá JavaScript de cliente.
- **Antes:** el menú móvil, «Comunidad» y el selector de idioma eran tres Client Components. Cada uno tenía su estado y sus efectos, y repetía los oyentes de `useDismissableDetails`.
- **Cambio:**
  - **Menú móvil y «Comunidad»:** pasan a ser Server Components.
    - El botón abre el `<dialog>` con `commandfor="mobile-menu" command="show-modal"` (Invoker Commands), y el de cerrar con `command="close"`. El navegador lo hace sin JavaScript propio, incluso antes de hidratar.
    - Pulsar fuera del panel lo cierra con `closedby="any"`.
    - El scroll de fondo se bloquea con CSS: `html:has(#mobile-menu[open]) { overflow: hidden }`.
  - **`HeaderBehavior`:** un solo Client Component que no pinta nada y pone sus oyentes una vez en la cabecera (delegación). Se encarga de:
    - `aria-expanded` del botón del menú;
    - abrir y cerrar el menú donde no hay Invoker Commands (Safari anterior a 26.2) y cerrarlo al pulsar fuera donde no hay `closedby`;
    - cerrar los `<details>` con Escape, devolviendo el foco, o al pulsar o tabular fuera;
    - al navegar, cerrar todo y poner `aria-current="page"` en el enlace de la página actual. Ahora lo llevan también los enlaces de escritorio, que antes no lo tenían.
  - **Selector de idioma:** sigue siendo Client Component, solo para leer la ruta actual con `usePathname`. La cabecera vive en el layout, que Next no vuelve a pintar al navegar, y el enlace a otro idioma debe ser correcto también sin JavaScript.
- **Resultado** (Lighthouse móvil, local, 3 pasadas):
  - **JS en `/es/register`:** de 152 868 a 150 435 bytes, unos 2,4 KB menos. Quedan 3,2 KB de margen.
  - **TBT:** sin cambio medible. En `/es/register` pasa de 167-200 ms a 172-201 ms, y en `/es` de 200-267 ms a 173-209 ms. Las dos horquillas se solapan: es ruido entre pasadas.
- **Hallazgo: el TBT no lo causa la cabecera.**
  - El perfil de la carga muestra que la tarea larga (210-290 ms con CPU 4× más lenta) es el arranque de React y de Next: 71 KB de `react-dom` y 46 KB del enrutador.
  - Hidratar la cabecera son unos pocos milisegundos.
  - La segunda tarea larga (70-190 ms) es leer la carga RSC incluida en el HTML (`self.__next_f`). Crece con el tamaño de la página, por eso el ranking, con 50 filas, tiene la mayor.
  - El código propio que llega al navegador es de unos 8 KB comprimidos de 143 KB. La cabecera era menos de 3 KB.
- **Descartado:** envolver cabecera, contenido y pie del layout en `<Suspense>` para partir la hidratación en tareas más cortas.
  - Mejoraba algo `/es`, pero dentro del ruido.
  - Sacaba la `meta description` del `<head>` en las páginas dinámicas (el mismo fallo que el SEO 92 de M-18).
- **Siguiente palanca, si hace falta:** que llegue menos carga RSC. Por ejemplo, no pasar a Client Components listas grandes como props, y paginar o reducir lo que se serializa.
- **Verificación:** `tests/e2e/navigation.spec.ts` con 3 pruebas nuevas:
  - el menú se cierra al pulsar fuera del panel;
  - funciona sin Invoker Commands (se anula el comando nativo y se quita la API);
  - tras navegar, el enlace actual lleva `aria-current` y el selector de idioma apunta a la página nueva.

  Siguen pasando las pruebas de Escape, del foco atrapado y de cerrar al navegar. axe sin errores en los 7 idiomas.

- **Fecha:** 2026-11-06
