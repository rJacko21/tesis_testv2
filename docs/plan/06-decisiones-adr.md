# 06. Registro de decisiones de arquitectura (ADR)

Formato: contexto → decisión → alternativas → consecuencias. Estado: Propuesta (pendiente de confirmar con Armando) o Aceptada.

## ADR-01 Next.js como framework React — Aceptada (2026-11-06)
**Contexto.** Se pide React, mejores Core Web Vitals y SEO en 7 idiomas. Una SPA pura (React + Vite) entrega HTML vacío: peor LCP y peor indexación.
**Decisión.** Next.js con App Router y React Server Components.
**Alternativas.** React Router v7 en modo framework (válido, menos documentación académica); Astro con islas React (excelente rendimiento pero la parte de cuenta/tienda es muy interactiva y React queda como invitado); SPA con Vite (descartada por SEO/LCP).
**Consecuencias.** HTML renderizado en servidor y menos JS en cliente; dependencia de las convenciones de Next; requiere Node en el servidor.

## ADR-02 Estrategia de renderizado mixta — Propuesta
**Decisión.** Estático con revalidación para contenido que cambia poco (portada, noticias, tienda, legales); dinámico para cuenta, cesta y rankings con búsqueda.
**Por qué.** El HTML estático desde CDN da el mejor TTFB/LCP; lo personal no se puede cachear.

## ADR-03 MySQL 8.4 LTS — Aceptada (requisito)
**Decisión.** MySQL 8.4 LTS, InnoDB, `utf8mb4` (necesario para turco y emojis en nombres de gremio como "¤CryClown¤").
**Consecuencias.** Transacciones ACID para el saldo de AP; funciones de ventana útiles para rankings.

## ADR-04 Drizzle ORM — Propuesta
**Alternativas.** Prisma (más popular, motor más pesado y SQL menos controlable); Kysely (solo query builder); SQL a mano (sin tipos).
**Por qué Drizzle.** Tipado de extremo a extremo, SQL predecible (importa para optimizar rankings), migraciones en el repo, ligero en entornos serverless.

## ADR-05 Autenticación propia con Better Auth — Propuesta
**Contexto.** La web actual delega el login en `us.online-games.services` (otro dominio, otro diseño, solo inglés, F-24). En la tesis no hay acceso a ese servicio.
**Decisión.** Cuentas en la propia MySQL con Better Auth (sesiones en BD, Argon2id, verificación de email, rate limit). Diseñado tras una interfaz `AuthProvider` para poder conectar en el futuro un SSO real.
**Alternativas.** Auth.js (las credenciales con usuario/contraseña son ciudadanas de segunda); implementación propia (más riesgo de seguridad).

## ADR-06 i18n nativa de Next.js + ICU, rutas con prefijo — Aceptada (revisada 2026-11-06, T-08)
**Decisión.** Prefijo de idioma siempre visible (`/{locale}/…`), slugs en inglés, `pt-BR` en vez de `pt` (`/pt/*` → 301). En lugar de next-intl se usa el **patrón nativo de Next.js 16**: segmento `[locale]` como parámetro raíz leído con `next/root-params`, catálogos JSON cargados solo en el servidor y un traductor propio de ~40 líneas sobre `intl-messageformat` (ICU: plurales y géneros correctos en los 7 idiomas).
**Por qué se cambió.** Next.js 16 trae Cache Components y `next/root-params`, que resuelven lo que antes aportaba next-intl (leer el idioma en cualquier componente sin pasarlo por props). La solución nativa es compatible con el pre-renderizado parcial sin configuración extra, no envía catálogos ni motor ICU al navegador (los Client Components reciben los textos ya traducidos, RNF-01) y tiene menos dependencias que mantener (P8).
**Alternativas.** next-intl (más funciones, pero una capa más sobre una versión de Next.js muy reciente); slugs traducidos (multiplican redirecciones y trabajo editorial sin beneficio claro).
**Consecuencias.** Las claves de traducción están tipadas (una clave mal escrita no compila) y `pnpm i18n:check` valida en CI que los 7 catálogos tengan las mismas claves, ICU válido y los mismos marcadores.

## ADR-07 Tailwind CSS + Radix UI — Propuesta
**Por qué.** Tailwind genera solo el CSS usado (CSS pequeño, RNF-01) y favorece mobile first; Radix aporta comportamiento accesible probado (menús, diálogos, pestañas) sin imponer estilos, así se conserva la estética propia.
**Alternativa.** CSS Modules (válido, más CSS manual); bibliotecas con estilos propios (MUI) descartadas porque alejan del diseño original y pesan más.

## ADR-08 Imágenes optimizadas y sin slider automático — Propuesta
**Contexto.** F-35, F-27. Los carruseles automáticos retrasan el LCP, distraen y casi nadie ve las diapositivas 2 y 3.
**Decisión.** Hero de una imagen con prioridad; promociones en una franja desplazable con scroll-snap.

## ADR-09 Recarga de AP con Xsolla (sandbox) o proveedor simulado — Aceptada
**Contexto.** La web oficial vende AP a través de Xsolla. La tesis no puede cobrar dinero real y Armando acepta omitir la pasarela. Las compras de la tienda se pagan siempre con AP.
**Decisión.** Interfaz `PaymentProvider` con dos implementaciones: `XsollaSandboxProvider` (Pay Station en modo sandbox, si la cuenta de comerciante de pruebas se puede crear gratis) y `MockProvider` (pantalla de pago simulada que envía un webhook firmado igual que Xsolla). La acreditación de AP solo ocurre en el webhook, de forma idempotente, para que el flujo sea idéntico al real.
**Alternativas.** Stripe test (se descarta: la web original usa Xsolla y conviene imitar su flujo); omitir la recarga por completo (se pierde la demostración del libro mayor de AP).
**Consecuencias.** La tienda funciona entera con AP; la recarga se demuestra sin dinero real.

## ADR-10 Rankings: snapshots + caché — Propuesta
**Contexto.** ~45 000 personajes (905 páginas × 50). El juego actualiza rankings periódicamente.
**Decisión.** Tabla `ranking_snapshots` regenerada por un job; consultas por índice compuesto; paginación por cursor; caché de 5 min.
**Origen de los datos.** Sin acceso a la BD del juego, se usan datos sintéticos realistas; se documenta el contrato del importador.

## ADR-11 Consentimiento de cookies propio — Propuesta
**Por qué.** F-31. Un banner propio ligero (sin script de terceros) con aceptar/rechazar/configurar, y Google Consent Mode v2 si se usa analítica de Google. Alternativa: analítica sin cookies (Plausible/Umami) que evita el banner para analítica.

## ADR-12 Hosting gratuito — Revisada 2026-11-06 (sin tarjeta)

**Revisión 2026-11-06.** Armando no tiene cuenta ni tarjeta, así que Oracle queda descartado de momento. Nueva decisión, sujeta a cambios:
- **Demo pública:** Vercel plan Hobby (gratuito, sin tarjeta, uso personal/no comercial, encaja con una tesis) + **MySQL 8 gratuito de Aiven** (sin tarjeta; 1 GB) con subdominio `*.vercel.app`.
- **Pruebas de carga y medición (ADR-14):** la pila completa en Docker Compose (Next.js + MySQL 8.4) dentro de un runner gratuito de GitHub Actions o en el PC de Armando. Así las pruebas de carga no dependen de los límites del plan gratuito y son reproducibles.
- El código no cambia entre entornos: solo la cadena de conexión.
- Si más adelante hay tarjeta, se pasa a Oracle Always Free (texto original abajo).

### Propuesta original: Oracle Cloud Always Free + Cloudflare
**Contexto.** Q2: coste cero, válido para la presentación y para pruebas de carga sobre un servidor real.
**Decisión.** Una VM ARM del nivel *Always Free* de Oracle Cloud (hasta 4 vCPU y 24 GB de RAM sin coste) con Docker Compose: Next.js, MySQL 8.4 y Caddy (HTTPS automático con Let's Encrypt). Delante, Cloudflare en plan gratuito como CDN y DNS. Subdominio gratuito (p. ej. DuckDNS) o dominio propio si Armando lo compra.
**Por qué.** Es MySQL real (no una variante compatible), el entorno es idéntico al de desarrollo (Docker), se controla todo el servidor y se le puede someter a pruebas de carga sin violar condiciones de uso de terceros.
**Alternativas.** Vercel Hobby + MySQL gestionado gratuito (TiDB Cloud Serverless o Aiven): menos trabajo de sistemas, pero la BD no es MySQL puro, los límites gratuitos condicionan las pruebas de carga y la latencia entre regiones distorsiona el TTFB. Queda como plan B. Solo local: no sirve para medir en red real.
**Riesgos.** Oracle pide tarjeta para verificar (no cobra) y a veces no hay capacidad ARM en la región; se reintenta en otra región o se usa el plan B. Copia local con Docker para la defensa por si falla la red.

## ADR-13 Traducciones sin revisores humanos — Propuesta
**Contexto.** Q6: nadie revisa las traducciones.
**Decisión.**
1. Reutilizar las traducciones oficiales existentes donde sean correctas (nombres de clases, términos del juego).
2. **Glosario** de términos fijos por idioma (AP, nombres de clases, de islas, de objetos) que nunca se traducen libremente.
3. Traducción automática desde el inglés (DeepL o LLM) con el glosario.
4. Revisión cruzada automática: un segundo modelo retraduce al inglés y marca diferencias de significado.
5. **Pseudolocalización** en CI (textos alargados un 40 % y con acentos) para detectar textos sin traducir y roturas de diseño, sobre todo en alemán y turco.
6. Botón "Informar de un error de traducción" en el footer.
**Consecuencias.** Se declara como limitación en la tesis; la calidad se mide con un muestreo y la tasa de claves sin traducir (objetivo: 0).

## ADR-14 Metodología de medición de Core Web Vitals — Propuesta
**Contexto.** Q2: comparar CWV entre la web original y la nueva, simulando tráfico.
**Aclaración importante.** Los Core Web Vitals se miden en el navegador de cada usuario; la carga del servidor solo influye a través del TTFB, que a su vez retrasa el LCP. Además, **no se puede lanzar una prueba de carga contra la web oficial**: sería un ataque contra un servidor ajeno sin permiso. Por eso cada sitio se mide de forma distinta y justa:
| Medición | Web original | Web nueva |
|---|---|---|
| Laboratorio (Lighthouse, móvil, 4G simulada, 5 ejecuciones, mediana), mismas 5 páginas | Sí | Sí |
| Campo real (CrUX / PageSpeed, percentil 75 de usuarios de Chrome) | Sí, si Google tiene datos | No (sin usuarios reales) |
| Carga simulada: k6 con 50 → 500 usuarios virtuales recorriendo portada, tienda, rankings, noticias y compra con AP | No (prohibido) | Sí |
| CWV bajo carga: mientras k6 genera tráfico, Playwright abre la web en un móvil emulado y recoge LCP, INP y CLS con la librería `web-vitals` | No | Sí |
**Resultado.** Tabla comparativa de laboratorio entre ambas webs y curvas de la web nueva (TTFB, LCP, errores) según aumentan los usuarios. Todo con scripts versionados para que sea reproducible.
