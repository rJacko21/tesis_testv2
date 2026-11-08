# Registro de mejoras: cuentas (T-17)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-21 · Registro e inicio de sesión dentro de la web y en 7 idiomas

- **Fallo original:**
  - F-21 y F-24: el registro y el inicio de sesión saltaban a `us.online-games.services`, otro dominio con otro diseño y solo en inglés.
  - F-32: no había ninguna garantía visible sobre las contraseñas.
- **Requisito:** RF-03, ADR-05
- **Páginas nuevas:**
  - `/{idioma}/register`, `/{idioma}/sign-in` y `/{idioma}/forgot-password`.
  - `/{idioma}/reset-password` y `/{idioma}/verify-email`, a las que se llega desde los enlaces del correo.
  - `/{idioma}/account`, una versión inicial que T-18 completa.
- **Registro:**
  - Nombre de cuenta de 4 a 16 caracteres (letras, números y `_`). Es único sin distinguir mayúsculas: se guarda normalizado y se muestra tal como se escribió.
  - Correo y contraseña.
  - Aceptación explícita de los términos y la política de privacidad, con enlaces.
- **Inicio de sesión:** con nombre de cuenta o con correo. Se puede entrar sin haber confirmado el correo; comprar no (RF-05, T-20).
- **Correos:**
  - Se envían en el idioma con el que se registró el jugador, en texto y HTML sencillo, con un solo enlace y su caducidad (24 h para la verificación, 30 min para la recuperación).
  - En local los recoge Mailpit (`docker compose up -d mail`, bandeja en `http://localhost:8025`) y las pruebas e2e leen los enlaces de ahí.
- **Formularios:**
  - Funcionan sin JavaScript: son Server Actions con `useActionState`.
  - Etiquetas reales, pistas y errores enlazados con `aria-describedby`, `aria-invalid` en el campo erróneo y un resumen con `role="alert"`.
  - `autocomplete` correcto, para que el gestor de contraseñas rellene y proponga contraseñas.
  - Se puede pegar en la contraseña.
  - Lo escrito se conserva tras un error, salvo la contraseña.
- **Por qué de esta forma:** Better Auth (ADR-05) resuelve la parte delicada, y la web añade encima sus reglas.
  - **Lo que hace Better Auth:** crear usuarios y credenciales, firmar las cookies, y generar y caducar los tokens.
  - **Sin API HTTP:** la API HTTP de Better Auth (`/api/auth/*`) no se publica. Todo pasa por Server Actions propias, así que hay una sola puerta de entrada que vigilar, y Next.js comprueba el origen de cada acción (CSRF).
- **Verificación:** `tests/e2e/auth.spec.ts` (7 pruebas × móvil y escritorio, con correos reales en Mailpit) y axe sin errores en registro, inicio de sesión y recuperación en los 7 idiomas.
- **Fecha:** 2026-11-06

### M-22 · Contraseñas: Argon2id, longitud y filtradas

- **Requisito:** RF-03 (mínimo 10 caracteres, comprobada contra filtradas), RNF-06, OWASP ASVS V2
- **Cambio:**
  - **Longitud:** de 10 a 128 caracteres, sin reglas de composición. NIST SP 800-63B las desaconseja porque llevan a contraseñas previsibles («Verano2026!»). La pista invita a usar una frase.
  - **Filtradas:** se rechazan las que aparecen en Have I Been Pwned.
    - La consulta usa k-anonimato: solo sale del servidor el principio del SHA-1 (5 caracteres) y se pide relleno (`Add-Padding`).
    - Si el servicio no responde en 2,5 s, se deja pasar. Un servicio externo caído no debe impedir registrarse, y el resto de defensas siguen activas.
  - **Hash:** Argon2id con los parámetros mínimos de OWASP (19 MiB, 2 iteraciones, 1 hilo) en `accounts.password`, en lugar del scrypt por defecto de Better Auth.
  - **Recuperación:** al cambiar la contraseña con el enlace, se cierran todas las sesiones abiertas.
- **Verificación:** `password.test.ts` (6 casos: formato del hash, sal distinta, verificación, k-anonimato, relleno ignorado y fallo de red).
- **Fecha:** 2026-11-06

### M-23 · Límites de intentos y mensajes que no revelan cuentas

- **Requisito:** RF-03 (criterios de aceptación), RNF-06, OWASP ASVS V2.2
- **Inicio de sesión:**
  - Tras **5 fallos en 15 minutos para la misma cuenta**, o 20 desde la misma IP, hay que esperar, y el mensaje dice cuántos minutos.
  - Se cuenta por cuenta para frenar a quien prueba contraseñas contra un jugador desde muchas IP. Se cuenta por IP para frenar a quien prueba muchas cuentas desde una.
  - El bloqueo nunca es permanente: nadie puede dejar a otro sin cuenta.
  - Los intentos van a `login_attempts`, y su IP se borra a los 30 días (`purgeOldLoginAttempts`).
- **Otras acciones:** el registro, la recuperación y el reenvío de la verificación tienen límites por IP, por correo o por usuario.
  - Se guardan en `rate_limits` (MySQL), no en memoria, porque en Vercel cada petición puede ir a una instancia distinta.
  - Contar y comprobar es una sola sentencia (`INSERT … ON DUPLICATE KEY UPDATE`), así que dos peticiones simultáneas no pasan las dos.
- **Mensajes iguales:**
  - Una cuenta inexistente, una contraseña errónea y una cuenta suspendida dan el mismo mensaje.
  - «Recuperar contraseña» responde lo mismo exista o no el correo, y también cuando se supera el límite de ese correo, pero entonces no envía nada (así nadie puede llenar el buzón de otro).
  - Registrarse con un correo ya usado responde igual que un registro nuevo. El dueño del correo recibe un aviso («alguien intentó registrarse con tu correo») con un enlace para iniciar sesión.
  - El nombre de cuenta en uso sí se indica: hace falta para elegir otro. Los nombres de cuenta no son secretos.
- **Anti-bots sin fricción:** un campo trampa oculto que una persona no ve ni alcanza con el tabulador, más los límites por IP.
  - Si un bot lo rellena, se le responde como si se hubiera registrado.
  - No se usa CAPTCHA. Turnstile (RF-03) queda como mejora si aparecen registros automáticos. Necesita una cuenta de Cloudflare y carga un script de terceros, que penaliza el rendimiento y obliga a ajustar la CSP.
- **Redirección segura:** `?next=` solo admite rutas internas del mismo idioma (`safeNext`), y `?next=https://otro-sitio` lleva a «Mi cuenta» (ASVS V5.1.5).
- **IP del cliente:** se toma el primer valor de `X-Forwarded-For`, que Vercel fija con la IP real. Fuera de un proxy de confianza esa cabecera se puede falsificar, y eso queda anotado para el despliegue (T-28a).
- **Verificación:**
  - `auth.spec.ts`: 5 fallos y luego la espera, incluso con la contraseña correcta; mismo mensaje para una cuenta inexistente; mismo mensaje en la recuperación; el enlace solo sirve una vez; la redirección a otro sitio no se sigue.
  - `redirect.test.ts`.
- **Fecha:** 2026-11-06

### M-24 · Modelo de datos de Better Auth y sesiones

- **Requisito:** ADR-05, RNF-06 (ASVS V3)
- **Cambio:** la migración `0004` adapta el esquema de T-10 al modelo de Better Auth.
  - `users` gana `name`, `display_username`, `email_verified` e `image`.
  - La contraseña pasa a `accounts.password`, una fila por forma de entrar: así se puede enlazar en el futuro la cuenta del juego por OAuth sin tocar `users`.
  - `sessions` y `verifications` se rehacen y aparece `rate_limits`.
  - Los ids siguen siendo numéricos (`generateId: "serial"`), así que el libro mayor de AP, la tienda y los personajes siguen apuntando a `users.id`.
  - Las cuentas sintéticas de la demo no tienen fila en `accounts`: no se puede entrar con ellas.
- **Sesión:**
  - Cookie `fl.session_token` (`__Secure-fl.session_token` en HTTPS): `HttpOnly`, `SameSite=Lax` y firmada con HMAC y `BETTER_AUTH_SECRET`.
  - Dura 7 días y se renueva como mucho una vez al día.
  - Una cuenta suspendida o borrada no puede abrir sesión (`databaseHooks.session.create.before`).
  - La cookie se añade a la política de cookies (necesaria), con el nombre tomado del código.
- **Tokens:** los de recuperación se guardan como SHA-256 (`storeIdentifier: "hashed"`) y la verificación del correo es un token firmado. Abrir la página de recuperación no gasta el token, solo guardarlo, para que el antivirus del correo no lo invalide al comprobar el enlace. Las páginas con token usan `Referrer-Policy: no-referrer`.
- **Diferencia con el diseño inicial:** T-10 guardaba el SHA-256 del token de sesión. Better Auth lo guarda tal cual, pero la cookie va firmada: sin el secreto, un volcado de `sessions` no permite fabricar una cookie válida.
- **Configuración nueva** (`.env.example`):
  - `BETTER_AUTH_SECRET`: obligatorio, de al menos 32 caracteres.
  - `SMTP_URL`: sin ella, los correos se escriben en el registro del servidor.
  - `PWNED_CHECK`.
  - CI levanta Mailpit como servicio para las e2e.
- **Fecha:** 2026-11-06

### Medición

Lighthouse móvil en `/es/register`, en local y en 3 pasadas:

- Rendimiento 96-97; accesibilidad, buenas prácticas y SEO 100.
- LCP 1,5 s.
- TBT 182-204 ms.
- 149 KiB de JS (152 868 bytes), dentro del presupuesto de 150 KiB pero ya muy cerca. El formulario añade unos 2 KiB. La siguiente tarea que añada JavaScript de cliente tendrá que reducir antes la hidratación de la cabecera.

### Pendiente

- **Turnstile** (o similar) si aparecen registros automáticos: ver M-23.
- **SMTP en producción:** hace falta un proveedor con plan gratuito (p. ej. Brevo) al desplegar (T-28a).
- ~~**Cambiar correo y contraseña desde la cuenta, cerrar otras sesiones, exportar datos y borrar la cuenta:** T-18 (RF-04).~~ Hecho en [mi-cuenta.md](mi-cuenta.md) (M-27 y M-29).
- **Tarea de limpieza** que borre los intentos de más de 30 días y las sesiones caducadas: con la monitorización y el mantenimiento (T-28b).

### M-40 · Confirmar contraseña y correo, avisos a los dos correos y un solo registro

- **Petición de Armando (2026-11-08)** al probar la web en local.
- **Requisito:** RF-03, RF-04
- **Cambio:**
  - **Repetir la contraseña** al registrarse, al recuperarla y al cambiarla desde «Mi cuenta», y **repetir el correo nuevo** al cambiarlo. Si no coinciden, el servidor marca el segundo campo («Las contraseñas no coinciden.»), además de lo que valide el navegador. Al cambiar el correo se sigue pidiendo la contraseña actual una sola vez: repetirla no protege de nada, porque ya se comprueba contra la guardada.
  - **Avisos por correo:**
    - Al pedir el cambio de correo ya se avisaba al actual y se enviaba el enlace al nuevo (M-27).
    - **Nuevo:** al abrir el enlace, cuando el cambio se hace de verdad, llega un aviso **al correo anterior y al nuevo**. El anterior lleva al formulario de soporte, porque esa dirección ya no sirve para recuperar la cuenta; el nuevo lleva a «Seguridad». Los dos correos salen del propio token de Better Auth, que solo se lee después de comprobar su firma (`lib/auth/email-change.ts`).
    - **Nuevo:** al recuperar la contraseña con el enlace también llega el aviso «Tu contraseña ha cambiado» (`onPasswordReset`), igual que al cambiarla desde «Mi cuenta».
  - **Un solo formulario de registro.** `/register` y «Jugar ahora» ya usaban el mismo componente (`RegisterForm`), pero eran dos páginas con aspecto distinto para lo mismo. Ahora `/register` redirige con 301 a `/play-now`, que tiene además los pasos para empezar a jugar. Tras registrarse ofrece descargar el juego o iniciar sesión.
- **Verificación:** `auth.spec.ts` (contraseñas distintas al recuperarla y aviso), `account.spec.ts` (contraseñas y correos distintos; avisos al correo anterior y al nuevo, comprobados en Mailpit), `play-now.spec.ts` (`/register` lleva a «Jugar ahora») y `routing.test.ts`.
- **Fecha:** 2026-11-08
