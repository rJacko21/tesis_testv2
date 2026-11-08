# Guía para probar la web en local

Esta guía levanta la web completa en tu ordenador, con su base de datos y una bandeja de correo de pruebas, y recorre lo que hay que comprobar: el panel de administración (altas, bajas y modificaciones) y las compras con AP.

Nada de esto toca Aiven ni Vercel: la base de datos es un MySQL en Docker y los correos no salen de tu máquina.

Las secciones de promociones (4) y contacto con soporte (6) necesitan los PR #25 y #26 fusionados en `main`.

## 1. Requisitos

- **Node.js 22** o superior.
- **pnpm 10**: si no lo tienes, `corepack enable` lo activa.
- **Docker Desktop**, abierto antes de empezar.
- **Git**.

## 2. Arranque

```bash
git clone https://github.com/rJacko21/tesis_testv2.git
cd tesis_testv2
pnpm install
cp .env.example .env
```

Abre `.env` y cambia `BETTER_AUTH_SECRET` por un valor propio de 32 caracteres o más (por ejemplo, la salida de `openssl rand -base64 32`). El resto ya apunta a los servicios de Docker.

```bash
docker compose up -d       # MySQL (puerto 3306) y Mailpit (puertos 1025 y 8025)
pnpm db:migrate            # crea las tablas
pnpm db:seed               # idiomas, clases, servidores y textos legales
pnpm db:seed:demo          # demo: jugadores, rankings, tienda, paquetes de AP, noticias, códigos
pnpm build                 # compila como en producción (2 o 3 minutos)
pnpm start                 # http://localhost:3000
```

`pnpm dev` también sirve y recarga al cambiar el código, pero es más lento al abrir cada página por primera vez. Para medir y para la demo, usa `build` y `start`.

Las direcciones que vas a usar:

| Qué                         | Dirección                      |
| --------------------------- | ------------------------------ |
| La web                      | http://localhost:3000/es       |
| Bandeja de correo (Mailpit) | http://localhost:8025          |
| Panel de administración     | http://localhost:3000/es/admin |

## 3. Cuentas de prueba

Los jugadores de la demo no tienen contraseña conocida, así que crea tus propias cuentas. Te conviene tener dos: una de **administrador** y otra de **jugador**.

1. Entra en http://localhost:3000/es/register y crea la cuenta (por ejemplo `armando_admin`).
2. Abre Mailpit (http://localhost:8025), abre el correo «Confirma tu cuenta» y pulsa el enlace.
3. Inicia sesión.

Para que una cuenta sea administradora, en otra terminal:

```bash
pnpm staff:roles armando_admin admin
```

Los roles son `admin` (todo), `editor` (noticias, promociones y tienda) y `support` (usuarios y auditoría). Puedes dar varios: `pnpm staff:roles cuenta editor support`. Sin roles, se los quita todos. Después, recarga la página: en «Mi cuenta» aparece el enlace «Panel de administración».

Repite los pasos 1 a 3 con la cuenta de jugador (por ejemplo `armando_jugador`), sin darle roles.

## 4. Panel de administración (ABM)

Con la cuenta de administrador, en http://localhost:3000/es/admin. Cada cambio queda en **Auditoría**, con quién, cuándo, desde qué IP y qué cambió.

### Noticias

1. **Noticias › Nueva noticia**: título, categoría y texto en Markdown. Guarda como borrador.
2. Añade una traducción y prográmala para dentro de unos minutos o publícala ya.
3. Comprueba que sale en http://localhost:3000/es/news y en la portada.
4. Retírala y bórrala. Comprueba que ya no aparece.

### Tienda y campañas

1. **Campañas › Nueva campaña**: código, inicio y fin (en UTC) y el nombre en inglés.
2. **Tienda › Nuevo artículo**: SKU y categoría. Se crea **inactivo**.
3. Escribe su nombre en inglés (obligatorio para activarlo) y, si quieres, en otros idiomas.
4. Márcalo como activo. Mientras no tenga precio, el panel avisa de que no se vende y la ficha pública da 404.
5. Añade un precio (por ejemplo 500 AP). Ya se ve en la tienda.
6. Añade una rebaja dentro de la campaña (por ejemplo 300 AP). La tienda enseña el precio rebajado y el nombre de la campaña.
7. Termina la rebaja con «Terminar ya». Vuelve el precio normal, y el anterior queda en el historial de precios.

Prueba también los errores: un SKU repetido, una rebaja más cara que el precio, o guardar a la vez desde dos pestañas (la segunda avisa de que alguien cambió el artículo entretanto).

### Promociones de la portada

1. **Promociones › Nueva promoción**: sube una imagen (JPEG, PNG, WebP o AVIF, hasta 5 MB y al menos 320 × 160 px), el enlace, la fecha de fin, el título y la descripción de la imagen en inglés.
2. Comprueba que sale en la portada con su fecha de fin.
3. Cambia la imagen y bórrala. La imagen se guarda en MySQL (tabla `media`) y se borra cuando nada la usa.

### Usuarios

1. **Usuarios**: busca la cuenta de jugador.
2. Suspéndela con un motivo: se cierran sus sesiones. Comprueba que ya no puede entrar.
3. Reactívala. Cambia sus roles y vuelve a quitárselos.

## 5. Compras con AP

Con la cuenta de **jugador**. Para comprar hacen falta tres cosas: el correo confirmado, saldo de AP y un personaje que reciba el objeto.

### Personajes

En la web real los personajes los crea el servidor del juego. En local, dale a tu cuenta personajes de la demo:

```bash
pnpm demo:characters armando_jugador 2
```

Aparecen en **Mi cuenta › Personajes**, con su puesto en los rankings.

### Recargar AP

1. Ve a **Recargar AP** (http://localhost:3000/es/topup) y elige un paquete.
2. Te lleva a una **pasarela de pago simulada**: no cobra nada y lo dice. Pulsa «Pagar».
3. Al volver, el saldo ha subido y llega un recibo a Mailpit. El movimiento aparece en **Mi cuenta › Recargas**.
4. Repite y pulsa «Cancelar»: el pago no se completa y el saldo no cambia.

Los AP solo los acredita el aviso firmado de la pasarela, nunca la página de vuelta. Las pruebas automáticas comprueban que un aviso repetido no acredita dos veces y que uno sin firma válida se rechaza.

También puedes canjear códigos de la demo en **Mi cuenta › Canjear código**: `WELCOME2026` da 500 AP, `HALLOWEEN2026` está caducado y `WINTERGIFT` da un objeto.

### Comprar

1. En la **Tienda**, añade uno o varios artículos a la cesta.
2. En la **Cesta**, elige el servidor y el personaje que lo recibe, y pulsa «Comprar».
3. El saldo baja exactamente el total, la cesta se vacía y el pedido aparece en **Mi cuenta › Compras**.

Casos que conviene probar:

- **Saldo insuficiente:** no se cobra nada y la cesta se queda como estaba.
- **Doble clic en «Comprar»:** se cobra una sola vez.
- **El precio cambia mientras compras:** con la cesta abierta, termina una rebaja desde el panel (en otra ventana, con la cuenta de administrador). Al comprar, la web avisa del precio nuevo y no cobra hasta que lo confirmas.
- **Correo sin confirmar:** con una cuenta recién creada sin confirmar, la compra se bloquea y la web explica por qué.

Para mirar el libro mayor directamente en la base de datos:

```bash
docker compose exec db mysql -uflorensia -pflorensia florensia \
  -e "SELECT created_at, delta, reason, balance_after FROM ap_ledger
      WHERE user_id = (SELECT id FROM users WHERE username = 'armando_jugador')
      ORDER BY id"
```

Cada fila es un movimiento (recarga, compra, canje, ajuste) y `balance_after` debe coincidir con el saldo que enseña la web.

## 6. Contacto con soporte

1. En **Soporte** (http://localhost:3000/es/support), pulsa «Escribir a soporte».
2. Rellena el formulario y envíalo.
3. En Mailpit aparece el mensaje dirigido a `tigremorado4@gmail.com`, con el motivo, el idioma y la cuenta si tenías la sesión iniciada. Al pulsar «Responder», se responde al correo del jugador.

En local el correo **no sale de tu máquina**. Para que llegue de verdad a Gmail, pon en `SMTP_URL` un servidor SMTP real (por ejemplo, el de Gmail con una contraseña de aplicación). Guárdalo solo en tu `.env`, nunca en el repositorio.

## 7. Pruebas automáticas

Con Docker levantado y los datos de demo cargados:

```bash
pnpm test        # unitarias (Vitest)
pnpm test:db     # contra MySQL: compras simultáneas, precios, auditoría…
pnpm test:e2e    # navegador (Playwright): unos 7 minutos, arranca `pnpm start` si no está en marcha
```

Las pruebas e2e del panel crean y borran sus propios artículos, campañas, noticias y promociones, así que la base queda como estaba.

## 8. Problemas frecuentes

- **`Error: connect ECONNREFUSED 127.0.0.1:3306`:** Docker no está abierto, o MySQL aún está arrancando. Espera unos segundos tras `docker compose up -d`.
- **El puerto 3306 o 3000 está ocupado:** cierra el otro MySQL o servidor, o cambia el puerto en `docker-compose.yml` y en `DATABASE_URL`.
- **No llega el correo de confirmación:** comprueba que `SMTP_URL=smtp://localhost:1025` está en `.env` y que Mailpit está en marcha.
- **El registro se queda pensando sin Internet:** la contraseña se comprueba contra las filtradas (Have I Been Pwned). Sin conexión, pon `PWNED_CHECK=off` en `.env`.
- **Empezar de cero:** `docker compose down -v` borra la base de datos. Después, repite desde `docker compose up -d`.
