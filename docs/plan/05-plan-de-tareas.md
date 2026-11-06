# 05. Plan de tareas

Calendario comprimido a **10 semanas** (Q1: "lo antes posible"), suponiendo ~25 h/semana (Q10, por confirmar). El orden busca tener **una versión desplegada y demostrable al final de la semana 4** y crecer desde ahí, para que la tesis pueda revisarse antes.

Hitos:
- **H1 (sem. 4):** web pública desplegada en 7 idiomas (portada, noticias, rankings, legales, descarga).
- **H2 (sem. 7):** cuentas, tienda con AP, recarga simulada.
- **H3 (sem. 9):** administración, endurecimiento, mediciones finales.
- **H4 (sem. 10):** memoria redactada.

## Semana 1. Línea base y cimientos

| ID | Tarea | Requisito | Hecho cuando |
|---|---|---|---|
| T-01 | Repositorio, `docs/` con este plan, plantilla de PR con campos RF/F | P7 | Repo creado |
| T-02 | Medir la web original con Lighthouse móvil/escritorio en 5 páginas (5 ejecuciones, mediana) + CrUX si existe. (Auditoría con sesión hecha el 2026-11-06) | 01 §9, ADR-14 | Informes en `docs/baseline/` |
| T-03 | Inventario de assets oficiales (logo, ilustraciones de clases, iconos, BGM/SFX) y tokens de diseño | P6 | Hoja de tokens |
| T-05 | Next.js + TypeScript strict + ESLint/Prettier + Husky/commitlint | 02 | Proyecto arranca |
| T-06 | Docker Compose (Next + MySQL 8.4) para desarrollo y pruebas de carga; Drizzle; primera migración | ADR-03/04/12 | `docker compose up` funciona |

## Semana 2. Infraestructura, i18n y diseño

| ID | Tarea | Requisito |
|---|---|---|
| T-04 | Wireframes de 4 pantallas a 360 y 1440 px | P1, P6 |
| T-07 | CI: lint, typecheck, Vitest, Playwright, axe, Lighthouse CI con presupuesto | RNF-01, RNF-03 |
| T-08 | i18n: 7 locales, glosario, pseudolocalización, comprobador de claves, selector | RF-02, RNF-04, ADR-13 |
| T-09 | Sistema de diseño: tokens, tipografías, componentes base accesibles | RNF-03 |
| T-28a | Despliegue en Vercel Hobby + MySQL gratuito de Aiven, previsualización por PR, despliegue automático desde `main` | ADR-12 |

## Semanas 3-4. Contenido público → **H1**

| ID | Tarea | Requisito |
|---|---|---|
| T-10 | Esquema completo de BD, seeds y datos sintéticos (≈45 000 personajes), diagrama ER | 04 §4 |
| T-11 | Layout: cabecera, menú móvil, footer, consentimiento de cookies | RF-02, RF-11 |
| T-12 | Portada | RF-01 |
| T-13 | Noticias | RF-08 |
| T-14 | Descarga, reglas, legales, FAQ | RF-09, RF-10, RF-11 |
| T-15 | SEO: metadatos, hreflang, canonical, sitemap, robots, JSON-LD, 301 desde URLs antiguas | RNF-05 |
| T-16 | Rankings | RF-07 |

## Semanas 5-7. Cuentas y economía → **H2**

| ID | Tarea | Requisito |
|---|---|---|
| T-17 | Registro, verificación de email, login, recuperación, rate limit, anti-bots | RF-03 |
| T-18 | Mi cuenta, historiales, mis rankings, canjear código | RF-04, RF-13 |
| T-19 | Catálogo de tienda, ficha, búsqueda, filtros | RF-05 |
| T-20 | Cesta y compra con libro mayor de AP (tests de concurrencia) | RF-05 |
| T-21 | Recarga de AP: `PaymentProvider` con Xsolla sandbox o proveedor simulado + webhook idempotente | RF-06, ADR-09 |
| T-22 | Landing "Jugar ahora" | RF-03 |

## Semanas 8-9. Administración, endurecimiento y medición → **H3**

| ID | Tarea | Requisito |
|---|---|---|
| T-23 | Panel admin núcleo: noticias, promociones, campañas, tienda, usuarios, auditoría | RF-12 |
| T-24 | Soporte: formulario de contacto (tickets como ampliación) | RF-10 |
| T-25 | Revisión OWASP ASVS L2 + escaneo con OWASP ZAP | RNF-06 |
| T-26 | Auditoría manual de accesibilidad (teclado, NVDA/VoiceOver) | RNF-03 |
| T-27 | Pasada de calidad de traducciones (revisión cruzada automática + muestreo) | RNF-04, ADR-13 |
| T-28b | RUM, copias de seguridad, monitorización | RNF-08 |
| T-29 | **Medición comparativa**: Lighthouse de ambas webs en las mismas condiciones + pruebas de carga k6 (50 → 500 usuarios) con CWV bajo carga en la web nueva | RNF-01, ADR-14 |

## Semana 10. Tesis → **H4**

| ID | Tarea |
|---|---|
| T-30 | Completar el registro de mejoras (08) para cada F-xx |
| T-31 | Redactar capítulos a partir de 01-06 y resultados de T-29 |

## Qué se recorta si hay retraso (en este orden)

1. Tickets de soporte (queda el formulario de contacto).
2. Xsolla sandbox (queda el proveedor simulado).
3. Ampliaciones del panel admin.
4. Modo oscuro y animaciones decorativas.

Nunca se recortan: los 7 idiomas, la accesibilidad, la tienda con AP ni las mediciones (son el núcleo de la tesis).

## Matriz de trazabilidad (resumen)

| Fallos | Requisito | Tareas |
|---|---|---|
| F-01..F-09 | RF-02, RNF-04 | T-08, T-15, T-27 |
| F-10..F-15 | RNF-05 | T-15 |
| F-16..F-18 | RF-01, RF-08 | T-12, T-13, T-23 |
| F-19, F-43, F-44 | RF-05 | T-19 |
| F-39..F-42, F-48 | RNF-01, RNF-03, RNF-06 | T-07, T-09, T-12, T-29 |
| F-45..F-47, F-49 | RF-04, RF-06, RNF-03 | T-18, T-21 |
| F-20 | RF-07 | T-16 |
| F-21..F-24 | RF-03, RF-10 | T-17, T-22, T-24 |
| F-26..F-30 | RNF-03 | T-09, T-11, T-26 |
| F-31..F-34 | RF-11, RNF-06/07 | T-11, T-25 |
| F-35..F-38 | RNF-01 | T-12, T-16, T-22, T-29 |
