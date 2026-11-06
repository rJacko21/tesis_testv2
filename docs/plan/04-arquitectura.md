# 04. Arquitectura y diseño técnico

Cómo se construye lo especificado en 03. Las razones de cada elección están en [06-decisiones-adr.md](06-decisiones-adr.md).

## 1. Stack

| Capa | Elección | ADR |
|---|---|---|
| Framework | **Next.js (App Router) con React 19**, TypeScript strict | ADR-01 |
| Renderizado | Estático + revalidación (ISR) para portada, noticias, tienda, legales; dinámico en servidor para rankings filtrados y cuenta; React Server Components | ADR-02 |
| Base de datos | **MySQL 8.4 LTS**, motor InnoDB, `utf8mb4_0900_ai_ci` | ADR-03 |
| ORM y migraciones | Drizzle ORM + drizzle-kit | ADR-04 |
| Autenticación | Better Auth (sesiones en MySQL) con Argon2id | ADR-05 |
| i18n | next-intl con mensajes ICU, rutas `/{locale}/...` | ADR-06 |
| Estilos | Tailwind CSS v4 + tokens de diseño en CSS variables; Radix UI para componentes accesibles | ADR-07 |
| Validación | Zod | — |
| Imágenes | `next/image` (AVIF/WebP, `srcset`, `sizes`, lazy) + CDN | ADR-08 |
| Recarga de AP | Xsolla en sandbox o proveedor simulado tras `PaymentProvider`; la tienda se paga solo con AP | ADR-09 |
| Caché | Caché de datos de Next + Redis opcional para rankings | ADR-10 |
| Despliegue | Demo: Vercel Hobby + MySQL gratuito de Aiven. Carga y medición: Docker Compose (Next.js + MySQL 8.4) | ADR-12 |
| Medición | Lighthouse CI, k6 (carga), Playwright + `web-vitals` (CWV bajo carga) | ADR-14 |
| Traducción | Glosario + traducción automática + revisión cruzada + pseudolocalización | ADR-13 |
| Calidad | ESLint, Prettier, Vitest, Playwright, axe, Lighthouse CI, GitHub Actions | 02 |

## 2. Vista general

```
Navegador (móvil primero)
   │  HTML en streaming + islas JS mínimas
   ▼
CDN (caché de estáticos, imágenes optimizadas, HTML ISR)
   ▼
Next.js (Node)
   ├── app/[locale]/…        páginas (Server Components)
   ├── Server Actions        formularios (login, carrito, compra, contacto)
   ├── app/api/webhooks/…    pasarela de pago
   ├── services/             lógica de negocio (tienda, saldo, rankings…)
   └── db/ (Drizzle)         repositorios + migraciones
   ▼
MySQL 8.4  ←  (opcional) importador de rankings desde la BD del juego
```

## 3. Estructura de carpetas

> Actualizado 2026-11-06 (T-05): se usa **una sola aplicación en la raíz** del repositorio con `src/`, en vez de `apps/web`. No hay un segundo paquete que justifique un monorepo (P8 Simplicidad). Las rutas de abajo cuelgan de `src/`.

```
/apps/web
  /app/[locale]/(public)/        portada, noticias, tienda, rankings, descarga, legales
  /app/[locale]/(auth)/          login, registro, recuperar contraseña
  /app/[locale]/(account)/       mi cuenta, recargas, historial
  /app/[locale]/admin/           panel de administración
  /app/api/                      webhooks y endpoints públicos (sitemap, health)
  /components/ui/                primitivas (Button, Dialog, Tabs…)
  /components/features/          por dominio (shop/, rankings/, news/…)
  /services/                     lógica de negocio pura y testeable
  /db/schema/                    esquema Drizzle por dominio
  /db/migrations/
  /i18n/messages/{locale}.json   textos de interfaz
  /lib/                          utilidades (dinero, fechas, seguridad)
/tests/e2e                       Playwright (criterios de aceptación)
/docs                            este plan, ADR, registro de mejoras
```

## 4. Modelo de datos MySQL

Convenciones: claves `BIGINT UNSIGNED`, `created_at`/`updated_at` `DATETIME(3)` en UTC, contenido traducible en tablas `*_translations (entity_id, locale, …)` con PK compuesta, importes en enteros.

**Identidad**
- `users` (id, username único, email único, email_verified_at, password_hash, locale, status, created_at)
- `sessions`, `verification_tokens`, `login_attempts` (para rate limit)
- `roles`, `user_roles`

**Contenido**
- `locales` (code: en, pt-BR, tr, it, de, fr, es; is_default)
- `posts` (id, slug, category, status: draft/scheduled/published, published_at, expires_at, author_id, cover_image_id)
- `post_translations` (post_id, locale, title, excerpt, body, seo_title, seo_description)
- `promotions` (id, image_id, target_url, starts_at, ends_at, sort_order) + `promotion_translations`
- `media` (id, path, width, height, alt por idioma en `media_translations`)
- `pages` + `page_translations` (legales, reglas, FAQ)

**Juego**
- `character_classes` (id, code, parent_id, required_level) + traducciones → 4 base + 8 especializaciones
- `servers`, `guilds`, `characters` (id, user_id NULL, server_id, guild_id, class_id, name, land_level, sea_level)
- `ranking_snapshots` (character_id, area, rank, previous_rank, taken_at) con índices `(area, class_id, rank)`

**Tienda y economía**
- `shop_categories` (id, parent_id, slug, sort_order) + traducciones
- `shop_items` (id, category_id, sku, image_id, validity_days NULL=ilimitado, flags: bundle/limited/gift, is_active) + traducciones
- `item_prices` (item_id, price_ap, sale_price_ap, campaign_id, starts_at, ends_at)
- `campaigns` (Halloween, Pirate Party…; starts_at, ends_at) + traducciones
- `carts`, `cart_items`
- `orders` (id, user_id, total_ap, status), `order_items`
- `ap_ledger` (id, user_id, delta, reason: topup/purchase/refund/admin, reference_id, created_at) → **el saldo es la suma del libro mayor**, con columna cacheada `users.ap_balance` actualizada en la misma transacción con `SELECT … FOR UPDATE`
- `topup_packages` (ap_amount, price_cents, currency) ; `payments` (provider: xsolla_sandbox/mock, provider_payment_id ÚNICO para idempotencia, status)

**Soporte y administración**
- `redeem_codes` (code único, reward_type, reward_ap, reward_item_id, max_uses, per_account, starts_at, ends_at), `redeem_uses` (code_id, user_id, character_id, used_at; único por code+user)
- `order_items` incluye `server_id` y `character_id` de destino (el objeto se entrega a un personaje)
- `support_tickets`, `ticket_messages`
- `consents` (user_id o anon_id, categories, version, given_at)
- `audit_log` (actor_id, action, entity, entity_id, diff JSON, ip, created_at)

Diagrama entidad-relación: generado desde el esquema Drizzle con `pnpm db:er` en [docs/db/modelo-er.md](../db/modelo-er.md) (T-10). CI comprueba que está al día. Datos: `pnpm db:seed` (referencia, idempotente, apto para producción) y `pnpm db:seed:demo` (sintéticos y deterministas, solo contra una base local).

## 5. Rutas e i18n

- Todas las rutas con prefijo: `/{locale}/...` con `locale ∈ {en, pt-BR, tr, it, de, fr, es}`. La raíz `/` redirige (302) al idioma detectado; `x-default` apunta a `/en`.
- Slugs de URL estables en inglés (`/es/shop/category/pets`) para no multiplicar rutas; los títulos sí se traducen. (Alternativa con slugs traducidos descartada por coste, ver ADR-06.)
- Redirecciones 301 desde las URLs antiguas (`/pt/*` → `/pt-BR/*`, `/shop` → `/{locale}/shop`, `/en/post/*` se conserva) para no perder posicionamiento.
- Mensajes de interfaz en JSON por idioma, contenido editorial en BD. Script en CI que compara claves entre idiomas y falla si falta alguna.
- Formatos con `Intl` (fechas, números, monedas). Turco necesita cuidado con mayúsculas (`i/İ`): usar `toLocaleUpperCase('tr')` y nunca transformar texto con CSS `text-transform` en TR sin `lang` correcto.

## 6. Estrategia de rendimiento (cómo se alcanza RNF-01)

| Técnica | Efecto | Fallo |
|---|---|---|
| Hero con una sola imagen AVIF/WebP, `priority` + `fetchpriority="high"`, tamaños por `sizes` | LCP | F-35 |
| Sin slider automático; si hay carrusel, CSS scroll-snap sin librería | LCP, JS | F-27, F-35 |
| Server Components: el HTML llega renderizado y solo hidratan las islas interactivas | INP, JS | — |
| Fuentes autoalojadas con `next/font`, subconjuntos por alfabeto (latín extendido para TR), `font-display: swap` | CLS, LCP | — |
| Dimensiones explícitas en imágenes y reservas de espacio para banners | CLS | — |
| Vídeo de la landing: póster como LCP, vídeo cargado tras interacción o `preload="none"`, desactivado con `prefers-reduced-motion` y ahorro de datos | LCP, peso | F-36 |
| Analítica solo tras consentimiento y cargada con `afterInteractive`/`lazyOnload` | JS de terceros | F-37 |
| Rankings: consulta indexada, paginación por cursor, caché 5 min, iconos de clase en sprite SVG | TTFB, peso | F-38 |
| ISR para páginas de contenido + CDN | TTFB | — |
| RUM con la librería `web-vitals` enviando a un endpoint propio | Medir en campo | — |

## 7. Seguridad (RNF-06)

- Cabeceras: CSP con nonce, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Contraseñas Argon2id; comprobación contra Have I Been Pwned (k-anonimato).
- Sesiones en cookies `HttpOnly; Secure; SameSite=Lax`; rotación al hacer login; CSRF cubierto por Server Actions + comprobación de origen.
- Rate limit en login, registro, recuperación, contacto y búsqueda.
- Compra: transacción con bloqueo de fila del saldo; webhooks verificados por firma e idempotentes.
- Panel admin con roles, 2FA obligatorio y registro de auditoría.
- Dependencias vigiladas con Dependabot y `npm audit` en CI.

## 8. Diseño visual (mantener la esencia)

- Extraer de la web actual: paleta (azules marinos, dorados, pergamino), tipografía de títulos, logo, ilustraciones de las 12 clases, iconografía de la tienda. Se convierten en **tokens** (`--color-primary`, `--radius`, `--font-display`…).
- Modernizar: más espacio en blanco, tarjetas, jerarquía tipográfica clara, modo oscuro opcional (encaja con la estética de fantasía).
- Diseño en Figma (o similar) de 4 pantallas clave a 360 px y 1440 px antes de implementar: portada, tienda, rankings, cuenta.
