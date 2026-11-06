# Registro de mejoras: navegación global (T-11, parcial)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-05 · Menú completo, traducido y usable con teclado

- **Fallo original:** F-02 (menú en inglés en otros idiomas), F-06 y F-24 (el login y "Jugar ahora" saltaban a otro dominio solo en inglés), F-23 (soporte con `mailto:`)
- **Requisito:** RF-02 · **Decisión:** ADR-15 (presupuesto de JS)
- **Antes:** menú con textos en inglés fuera de EN. "Comunidad" era un desplegable de Bootstrap con jQuery, y enlaces del menú cambiaban de dominio e idioma.
- **Cambio:**
  - **Escritorio:** "Comunidad" es un `<details>` nativo. `useDismissableDetails` lo cierra con Escape (y devuelve el foco), al pulsar o tabular fuera y al cambiar de página. El selector de idioma usa el mismo hook.
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
