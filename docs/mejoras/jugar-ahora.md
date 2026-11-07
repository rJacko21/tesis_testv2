# Registro de mejoras: «Jugar ahora» (T-22)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-34 · Landing «Jugar ahora» con registro en la misma página

- **Fallo original:**
  - F-36: la landing cargaba de inicio un vídeo MP4 de fondo.
  - F-21: la landing pedía el correo sin confirmar la contraseña y con otras reglas que el registro oficial, y otro copyright.
  - F-24: el registro llevaba a otro dominio con otro diseño y solo en inglés.
- **Requisito:** RF-03 (registro) · RNF-01 (rendimiento)
- **Cambio** (`/{idioma}/play-now`):
  - **Portada de la landing:** título, motivos para jugar (en escritorio) y, al lado, el formulario de registro en una tarjeta blanca. En móvil los motivos se ocultan y el formulario va justo después del título.
  - **El mismo registro que `/register`:** el formulario se ha sacado a `components/auth/RegisterForm.tsx` y lo usan las dos páginas. Mismas reglas (usuario de 4-16, contraseña de 10 o más, aceptar las condiciones), mismo honeypot y límites, mismo correo de confirmación.
    - Al registrarse, el mensaje de éxito enlaza a «Descargar el juego» (`/download`) en vez de a iniciar sesión, que es lo siguiente que hace quien llega por la landing.
    - Quien ya tiene cuenta tiene un enlace directo a la descarga.
  - **Tres pasos para jugar:** crear la cuenta, descargar e instalar, y entrar al juego, con un botón de descarga.
  - **Sin vídeo:** una sola ilustración decorativa, `loading="lazy"` y solo en escritorio (`alt=""`). El LCP es el título.
  - **URL antigua:** `/lp/style1/PlayNow` ya redirigía aquí con 301 ([seo.md](seo.md), M-15). La página entra en el sitemap en los 7 idiomas, con canónica y `hreflang`.
- **Por qué de esta forma:**
  - **Un solo formulario para las dos páginas:** si cambian las reglas del registro, cambian en los dos sitios a la vez. Así no se repite F-21.
  - **`<img>` en lugar de `next/image`** para la ilustración: `next/image` añade unos 5 KB de JS de cliente a la ruta. La imagen ya está optimizada y no es el LCP.
  - **Sin JavaScript propio** salvo el del formulario de registro, que es el mismo de `/register`.
- **Medición:**
  - **JS** (`pnpm js:budget`): 142 893 bytes, lo mismo que `/register` más nada propio de la landing.
  - **Lighthouse móvil en local** (`/es/play-now`, 3 pasadas): rendimiento 98; accesibilidad, buenas prácticas y SEO 100. LCP 1,5 s, TBT 141-150 ms, CLS 0,001. `/es/register` en la misma sesión: 96-98.
- **Verificación:**
  - `tests/e2e/play-now.spec.ts` (2 pruebas × móvil y escritorio): registro desde la landing con el correo real en Mailpit y el enlace a la descarga, sin vídeo; y las mismas reglas que `/register`.
  - axe sin errores y sin scroll horizontal en los 7 idiomas (`a11y.spec.ts`). Toda la batería e2e: 507 correctas.
- **Fecha:** 2026-11-07
