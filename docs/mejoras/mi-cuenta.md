# Registro de mejoras: «Mi cuenta» (T-18)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-26 · «Mi cuenta» con secciones, historiales con mensaje y «Mis rankings»

- **Fallo original:**
  - F-46: los historiales vacíos solo mostraban la cabecera de la tabla.
  - F-47: la cuenta estaba en otro servicio, en inglés y con avisos en español.
- **Requisito:** RF-04, RF-07 («ir a mi personaje»)
- **Páginas:** todas con `noindex` y con sesión obligatoria (sin sesión, llevan a iniciar sesión y vuelven después).
  - **`/{idioma}/account`:** resumen con nombre de cuenta, correo, si está confirmado y saldo de AP.
  - **`/account/purchases`:** cada pedido con sus objetos, el personaje y el servidor que los recibieron, el total y el estado.
  - **`/account/topups`:** tabla de recargas con fecha, AP, importe en la moneda pagada y estado. En móvil se desplaza dentro de su caja, como el ranking (M-19).
  - **`/account/characters`:** cada personaje con su clase, niveles, gremio, servidor y puesto en el ranking general, de tierra y de mar.
    - Cada puesto enlaza al ranking buscando ese personaje, con su puesto real. Es el «ir a mi personaje» que quedó pendiente en T-16.
  - **Navegación entre secciones** (`AccountShell`): con `aria-current`, en una fila que en móvil se desplaza sin mover la página.
- **Historiales:** paginados de 10 en 10 con el componente común `Pagination`. Una página fuera de rango lleva a la última.
- **Listas vacías:** cada una explica qué aparecerá ahí («Aún no has comprado nada en la tienda. Cuando lo hagas, verás aquí…»). Si ningún personaje está en el ranking, se dice.
- **Fechas:** en UTC y con la zona escrita, porque el servidor no conoce la del jugador.
- **Por qué de esta forma:**
  - **Control de acceso por objeto:** las consultas (`account/queries.ts`) reciben el id del usuario de la sesión, nunca uno que llegue del navegador. Nadie ve los datos de otra cuenta cambiando un parámetro (ASVS V4.2.1).
  - **Sin caché:** son datos privados que cambian con cada compra.
  - **Puesto en el ranking:** se lee de la última foto con el índice `ranking_character_idx`, sin recorrer el ranking.
- **Verificación:** `tests/e2e/account.spec.ts`:
  - sin sesión, lleva a iniciar sesión;
  - una cuenta nueva ve los mensajes de lista vacía;
  - con datos insertados en la base (la tienda y la recarga llegan en T-20 y T-21), se ven el pedido, la recarga y el puesto, y el enlace lleva a la fila del personaje en el ranking;
  - axe sin errores y sin scroll horizontal en las 7 secciones × 7 idiomas, en móvil y escritorio.
- **Fecha:** 2026-11-07

### M-27 · Seguridad: cambiar contraseña y correo, y cerrar sesiones

- **Requisito:** RF-04 · OWASP ASVS V2.1.6, V2.2.3, V3.3.4 y V3.7.1
- **Cambio** (`/{idioma}/account/security`):
  - **Contraseña:**
    - Pide la actual, y la nueva sigue las reglas de M-22 (longitud y no filtrada).
    - Al cambiarla se cierran las demás sesiones y la actual sigue abierta.
    - Se limita a 5 intentos cada 15 minutos, para que con una sesión robada no se puedan probar contraseñas.
  - **Correo:**
    - Pide la contraseña actual.
    - El enlace va al correo nuevo, y la cuenta no cambia hasta abrirlo.
    - Si el correo nuevo ya es de otra cuenta, la respuesta es la misma y no se envía nada, así que no revela cuentas.
  - **Avisos al correo actual** cuando se pide cambiar el correo o cuando cambia la contraseña. Llevan el enlace «No he sido yo: recuperar mi cuenta», porque la recuperación cierra todas las sesiones.
  - **Sesiones:**
    - Lista con navegador y sistema («Chrome · Android», `device.ts`) y última actividad. La actual va marcada.
    - Se puede cerrar cada una o todas las demás, sin JavaScript.
- **Por qué de esta forma:**
  - Better Auth genera y firma los tokens del cambio de correo (`changeEmail`). La web añade la contraseña, los límites y los avisos.
  - El correo del enlace se elige leyendo el tipo del token: el de confirmar un correo nuevo dice otra cosa que el de bienvenida.
- **Fallo encontrado y corregido:**
  - **Problema:** al cambiar la contraseña, la página llevaba a iniciar sesión.
    - Better Auth crea una sesión nueva y borra las demás, y Next vuelve a pintar la página en la misma petición.
    - `getSession` leía la cabecera `Cookie` de la petición, que aún tenía la sesión borrada.
  - **Corrección:** ahora lee `cookies()`, que ya tiene la cookie nueva (`auth/session.ts`).
- **Verificación:** `account.spec.ts`:
  - una contraseña actual errónea da error;
  - la correcta cambia la contraseña, llega el aviso y la sesión de otro navegador deja de valer;
  - «Cerrar las demás sesiones» funciona;
  - el cambio de correo envía el enlace al nuevo y el aviso al actual, y el correo cambia al abrirlo.
  - `device.test.ts` (6 casos).
- **Fecha:** 2026-11-07

### M-28 · Canjear código con límite de fallos

- **Fallo original:** F-45 (el campo del código no tenía `<label>`)
- **Requisito:** RF-13
- **Cambio** (`/{idioma}/account/redeem`):
  - **Código:** campo con etiqueta y pista. Da igual escribirlo en mayúsculas, minúsculas o con espacios.
  - **Personaje:** si la cuenta tiene personajes, un selector elige quién recibe el objeto. Los códigos de AP van al saldo.
  - **Mensajes distintos** para «no existe», «caducado», «ya usado» (criterio de aceptación), «agotado», «elige un personaje» y «no tienes personajes».
  - **Anti fuerza bruta** (criterio de aceptación):
    - tras 10 códigos no válidos en 10 minutos, por cuenta o por IP, hay que esperar;
    - solo cuentan los fallos, así que canjear varios códigos válidos seguidos nunca bloquea (`peekRateLimit`).
- **Por qué de esta forma** (`account/redeem.ts`): todo en una transacción.
  - La fila del código se bloquea (`FOR UPDATE`), así que el límite de usos totales no se supera con canjes simultáneos.
  - La restricción única `(code_id, user_id)` impide canjear dos veces aunque lleguen dos peticiones a la vez.
  - Los AP se apuntan en `ap_ledger` con `applyDelta` y la fila del usuario bloqueada, como una compra.
- **Pendiente:** el objeto se registra en `redeem_uses` con su personaje. La entrega en el juego depende de la integración con el servidor de Giiku, igual que las compras (T-20).
- **Verificación:**
  - `redeem.test.ts` (7 casos);
  - `account.spec.ts`: código de AP que llega al saldo, ya usado, caducado, objeto sin personajes, sin elegir y con personaje, y bloqueo tras 10 fallos incluso con un código válido.
- **Fecha:** 2026-11-07

### M-29 · RGPD: descargar mis datos y borrar la cuenta

- **Requisito:** RF-04, RNF-07 (RGPD, art. 15, 17 y 20)
- **Descargar:** `/api/account/export` devuelve un JSON con todo lo que la web guarda de la cuenta.
  - **Contenido:** cuenta, personajes, pedidos con sus objetos, recargas, movimientos de AP, códigos canjeados, sesiones e intentos de inicio de sesión.
  - **Lo que no incluye:** ni hashes ni tokens.
  - **Protección:** `Cache-Control: no-store`, solo con sesión y como mucho 5 descargas por hora.
- **Borrar:** pide la contraseña y una casilla de confirmación, y explica antes qué se borra y qué se conserva.
  - **Se borran:** la contraseña, las sesiones, los tokens y los intentos de inicio de sesión. Los personajes se desvinculan.
  - **La cuenta se anonimiza:** `deleted_<id>`, sin correo real y con estado `deleted`, que no puede abrir sesión. El nombre y el correo quedan libres.
  - **Se conservan sin datos personales** los pedidos, las recargas y los movimientos de AP. Son registros contables con obligación legal de guardarlos (art. 17.3.b del RGPD; § 147 AO en Alemania).
  - **Después:** lleva a iniciar sesión con el aviso «Tu cuenta se ha borrado».
- **Verificación:** `account.spec.ts`:
  - la descarga trae el correo de la cuenta y ninguna contraseña;
  - sin la casilla, el formulario no se envía;
  - tras borrar, no se puede entrar y el mismo nombre y correo se pueden volver a registrar.
- **Fecha:** 2026-11-07

### Medición

Lighthouse móvil en `/es/register`, en local, que comparte el formulario con las páginas de la cuenta. Las páginas de la cuenta necesitan sesión y Lighthouse CI no las mide.

- Rendimiento 98; accesibilidad, buenas prácticas y SEO 100.
- LCP 1,4-1,5 s y TBT 151-163 ms.
- **JS:** 152 171 bytes. El selector del formulario añade unos 100 bytes; `main` está en 152 077.

### Hallazgo: el presupuesto de JS depende de la precarga

Lighthouse cuenta como JS de la página los chunks de las rutas que precargan los enlaces visibles (`<Link>`). Uno de 6 KB (`next/image`) aparece en unas pasadas y en otras no. Por eso M-25 midió primero 150 435 bytes y luego, con el chunk, 152 077 (corregido en [navegacion.md](navegacion.md)).

Con la precarga incluida quedaban unos 1,4 KB de margen hasta 153 600 bytes.

**Decisión (2026-11-07):** el límite cuenta solo el JS propio de cada página (revisión de ADR-15).

- `pnpm js:budget` lo comprueba en CI. Sin la precarga, la ruta más pesada se queda unos 6 KB por debajo del límite.
- La precarga sigue visible en Lighthouse CI como aviso, sin bloquear.

### Pendiente

- **Recargar AP desde el resumen:** con la recarga (T-21).
- **Entrega en el juego** de los objetos de los códigos: con la integración de compras (T-20).
- **Aviso por correo al borrar la cuenta:** no lo exige el RGPD. Se puede añadir con las demás plantillas si se quiere.
- **Sesiones caducadas e intentos antiguos:** su limpieza periódica sigue en T-28b.
