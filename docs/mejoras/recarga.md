# Registro de mejoras: recarga de AP (T-21)

Formato del [registro de mejoras](../plan/08-plantilla-registro-de-mejoras.md).

### M-33 · Recarga de AP con aviso firmado e idempotente

- **Fallo original:**
  - F-48: el widget de Xsolla se cargaba en todas las páginas.
  - F-49: «TopUp» abría la pasarela directamente, sin explicar paquetes, pago ni qué pasa después.
- **Requisito:** RF-06 · ADR-09 (Xsolla sandbox o proveedor simulado)
- **Cambio:**
  - **`/{idioma}/topup`:**
    - los 4 paquetes con sus AP, el precio en euros y los AP extra frente al más pequeño («+9 % de AP», redondeado hacia abajo para no prometer de más);
    - los pasos: elegir, pagar y recibir los AP con el recibo;
    - qué son los AP, que no se reembolsan y que en la demostración la pasarela es simulada.
    - **Sin scripts de la pasarela:** cada paquete es un formulario. La página entra en el sitemap y conserva la URL de la web original.
  - **Pasarela simulada** (`/topup/checkout/{id}`, `noindex`):
    - dice claramente que es una simulación y no cobra dinero;
    - enseña el paquete y el precio, con «Pagar» y «Cancelar»;
    - solo la ve el dueño del pago, y solo mientras está pendiente.
  - **Vuelta** (`/topup/return?payment=`): solo lee el estado («Hecho: se han añadido 2500 AP…», «Esperando la confirmación…» o «El pago no se completó…»).
  - **Recibo por correo** en el idioma del jugador, con el número de recarga, los AP, el precio y el saldo nuevo. La recarga aparece también en «Mi cuenta › Recargas».
  - **«Recargar AP»** del resumen de la cuenta y de la cesta (M-32) lleva aquí.
  - **Requisitos para recargar:** sesión y correo confirmado, como para comprar (RF-03).
  - **Sin JS de cliente:** las cuatro páginas quedan en 141 554 bytes (`pnpm js:budget`).
- **Por qué de esta forma:**
  - **Solo el aviso firmado acredita AP** (`payments/webhook.ts`). La vuelta del navegador no puede acreditar nada, porque cualquiera puede abrir esa URL sin haber pagado (RF-06).
  - **Firma:**
    - HMAC-SHA256 del cuerpo exacto en `Authorization: Signature <hex>`, comparada en tiempo constante.
    - Xsolla usa la misma idea con SHA-1 y la clave del proyecto.
    - La clave es `PAYMENT_WEBHOOK_SECRET`. Si falta, se deriva de `BETTER_AUTH_SECRET`.
  - **Idempotente** (`payments/topup.ts`):
    - la fila del pago se bloquea (`FOR UPDATE`) y solo un pago `pending` pasa a `paid`;
    - un aviso repetido, aunque llegue a la vez, responde 200 y no acredita otra vez (criterio de aceptación);
    - el importe y la moneda del aviso tienen que ser los del pago (409 si no).
  - **El movimiento va al libro mayor:** `ap_ledger` con motivo `topup` y la referencia del pago, en la misma transacción que el saldo.
  - **Proveedor de pago intercambiable:** la ruta es `/api/payments/{proveedor}/webhook`. Xsolla sandbox ya está en el esquema (`provider`) y entraría como otro proveedor con su firma.
  - **La pasarela simulada no hace una petición HTTP a la propia web:** llama a la misma función que la ruta, con el mismo cuerpo firmado. Así no depende de la URL pública del despliegue.
- **Verificación:**
  - **Contra MySQL** (`tests/db/topup.test.ts`, 7 casos):
    - acreditación con su movimiento;
    - aviso repetido (criterio de aceptación);
    - cinco avisos iguales a la vez acreditan una sola vez;
    - firma falsa (401), importe distinto (409), pago inexistente (404) y cuerpo no válido (400);
    - un pago fallido no pasa a pagado;
    - sin correo confirmado no se empieza una recarga;
    - nadie ve el pago de otra cuenta.
  - **Unitarias:** `signature.test.ts` y `bonus.test.ts`.
  - **e2e** (`tests/e2e/topup.spec.ts`, 5 pruebas × móvil y escritorio):
    - la página sin scripts de Xsolla;
    - sin sesión y sin correo confirmado;
    - recarga completa con recibo en Mailpit e historial, y volver a abrir la vuelta no acredita otra vez;
    - cancelar;
    - la ruta HTTP rechaza firmas falsas.
  - axe sin errores en `/topup` (7 idiomas) y en la pasarela.
- **Fecha:** 2026-11-07

### Fallo encontrado y corregido en las pruebas

- **Problema:** la prueba «con datos» de `account.spec.ts` fallaba de vez en cuando.
- **Causa:** buscaba la fila del personaje con una expresión que también encaja con otros nombres que empiezan igual («Zudorliak» y «Zudorliakai»), y comprobaba la primera de esas filas.
- **Corrección:** la fila se busca por el nombre exacto. Ya no falla al repetirla.

### Pendiente

- **Xsolla sandbox:** necesita una cuenta de comerciante de pruebas. El proveedor simulado cubre la demostración (ADR-09).
- **Reembolsos** (`refunded`): desde el panel de administración (T-23).
- **Pagos que se quedan en `pending`:** su limpieza va con las tareas periódicas (T-28b).
