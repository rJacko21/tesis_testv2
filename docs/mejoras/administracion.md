# Registro de mejoras: panel de administración (T-23)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

T-23 se entrega por partes, cada una con su PR. Esta primera parte pone la base del panel (acceso por roles y auditoría) y la gestión de cuentas. Noticias y promociones (F-16, F-18), tienda, precios, campañas y paquetes de recarga llegan en las siguientes y usan la misma base.

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

### Pendiente

- **Siguientes partes de T-23:** noticias (borrador, programada, publicada, traducciones), promociones con fechas, tienda y precios, campañas y paquetes de recarga, y ajustes de AP con su movimiento en el libro mayor. Cada una añade sus acciones a la misma auditoría.
- **Aviso al jugador suspendido:** al iniciar sesión ve el mensaje genérico de credenciales. Un mensaje propio («tu cuenta está suspendida, escribe a soporte») solo debería mostrarse tras comprobar la contraseña, para no revelar el estado de cuentas ajenas.
- **Reembolsos de recargas:** en la parte de tienda y recargas del panel ([recarga.md](recarga.md)). **Tickets de soporte:** con T-24.
- **Panel de traducciones pendientes y estadísticas:** ampliaciones (C) de RF-12.
