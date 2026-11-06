# 02. Constitución del proyecto y estándares de código

La constitución son las reglas que toda especificación, plan y tarea debe cumplir. Si una tarea choca con un principio, se cambia la tarea, no el principio (o se registra un ADR que justifique la excepción).

## Principios

| # | Principio | Regla verificable |
|---|---|---|
| P1 | **Mobile first** | Se diseña y se prueba primero a 360 px de ancho. Los estilos base son los de móvil; las media queries solo añaden (`min-width`). |
| P2 | **Rendimiento como requisito** | Presupuesto de rendimiento (abajo) comprobado en CI con Lighthouse CI. Un PR que lo rompa no se fusiona. |
| P3 | **Accesible por defecto** | WCAG 2.2 nivel AA. Tests automáticos con axe en cada página + revisión manual con teclado y lector de pantalla por fase. |
| P4 | **Siete idiomas de primera clase** | en, pt-BR, tr, it, de, fr, es. Ningún texto visible fuera de los ficheros de traducción. Falta de clave = build fallido. |
| P5 | **Seguridad y privacidad desde el diseño** | OWASP ASVS nivel 2 como checklist, RGPD (consentimiento real, minimización de datos). |
| P6 | **Fidelidad a la identidad** | Mismas funciones y misma línea visual (paleta, tipografía de títulos, ilustraciones de clases, ambientación náutica) modernizadas. |
| P7 | **La especificación manda** | Ningún código sin requisito (RF/RNF) asociado; ningún requisito sin test de aceptación. |
| P8 | **Simplicidad** | Se elige la opción más simple que cumpla el requisito. Cada dependencia nueva necesita justificación en el PR. |

## Presupuesto de rendimiento (RNF-01)

Medido en móvil (Lighthouse, Moto G Power, 4G lenta) y en campo (percentil 75):

| Métrica | Objetivo "bueno" de Google | Objetivo del proyecto |
|---|---|---|
| LCP | ≤ 2,5 s | **≤ 2,0 s** |
| INP | ≤ 200 ms | **≤ 150 ms** |
| CLS | ≤ 0,1 | **≤ 0,05** |
| TTFB | ≤ 0,8 s | ≤ 0,6 s |
| JS inicial (comprimido) en portada | — | **≤ 150 KB** en total, de los que **≤ 30 KB** son código propio (ver ADR-15) |
| CSS crítico | — | ≤ 30 KB |
| Peso total de portada | — | ≤ 800 KB |
| Lighthouse Rendimiento / Accesibilidad / Buenas prácticas / SEO | — | ≥ 95 / 100 / 100 / 100 |

## Estándares de código

### Lenguaje y estilo
- **TypeScript en modo `strict`** en todo el proyecto (también `noUncheckedIndexedAccess`). Prohibido `any` salvo justificación con comentario.
- **ESLint** (config flat) con `typescript-eslint` estricto, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`. **Prettier** para formato. Cero warnings en CI.
- Nombres: componentes `PascalCase`, funciones y variables `camelCase`, constantes `UPPER_SNAKE_CASE`, ficheros de componente `PascalCase.tsx`, resto `kebab-case.ts`. Tablas MySQL `snake_case` en plural.
- Funciones pequeñas con una responsabilidad; componentes de ≤ ~150 líneas; lógica de negocio fuera de los componentes (en `services/`).
- Principios SOLID donde aplique, DRY sin abstraer antes de la tercera repetición, y "make illegal states unrepresentable" con tipos discriminados.

### React
- Componentes de servidor por defecto; `"use client"` solo cuando hay interactividad, y lo más abajo posible del árbol (islas pequeñas → menos JS).
- Sin estado global innecesario: estado de servidor con la caché del framework, estado de URL para filtros (rankings, tienda), estado local con `useState`.
- Formularios con Server Actions + validación **Zod** compartida entre cliente y servidor.
- Componentes de UI accesibles basados en primitivas probadas (Radix UI) en lugar de reinventar desplegables, modales o pestañas.

### Datos y backend
- Acceso a MySQL solo a través de la capa de repositorios con ORM tipado (Drizzle). Nada de SQL concatenado.
- Migraciones versionadas en el repositorio; nunca cambios manuales en la base de datos.
- Toda entrada externa se valida con Zod en el borde (acciones, rutas API, webhooks).
- Dinero y AP como enteros (céntimos / unidades), nunca `float`. Operaciones de saldo dentro de transacciones con libro mayor (ledger).

### Tests (pirámide)
| Nivel | Herramienta | Qué cubre | Mínimo |
|---|---|---|---|
| Unitario | Vitest | Servicios, utilidades, validaciones | 80 % de líneas en `services/` y `lib/` |
| Componente | Vitest + Testing Library | Componentes con lógica | Componentes interactivos |
| Integración | Vitest + MySQL en contenedor (Testcontainers) | Repositorios y transacciones | Todas las consultas de escritura |
| Extremo a extremo | Playwright | Cada criterio de aceptación de 03-especificacion | 100 % de criterios |
| Accesibilidad | @axe-core/playwright | Cada página en cada idioma | 0 violaciones |
| Rendimiento | Lighthouse CI | Presupuesto anterior | Bloquea el merge |

Los tests de aceptación se escriben en formato **Dado / Cuando / Entonces**, copiando el criterio de la especificación (P7).

### Git y revisión
- Trunk-based: rama `main` protegida, ramas cortas `feat/RF-07-filtros-ranking`.
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `perf:`, `a11y:`…), validado con commitlint + Husky.
- Cada PR enlaza su RF/RNF/F y tarea, incluye capturas móvil/escritorio si toca UI, y pasa: lint, typecheck, tests, axe, Lighthouse CI, comprobación de claves de traducción.
- Versionado semántico y CHANGELOG generado de los commits.

### Documentación
- README con arranque en 5 minutos (Docker Compose con MySQL).
- ADR para cada decisión no trivial (06-decisiones-adr.md).
- Registro de mejoras (08) rellenado al cerrar cada fallo F-xx: antes, después, métrica, por qué.
- **Código documentado** (petición expresa de Armando):
  - Toda función, hook, componente y tipo exportado lleva un comentario **TSDoc** (`/** … */`) con propósito, parámetros, valor devuelto, errores posibles y el requisito que implementa (`@see RF-05`).
  - Cada módulo de `services/` empieza con un comentario que explica su responsabilidad y sus reglas de negocio.
  - Los comentarios dentro del código explican el *por qué* (decisiones, casos límite, enlaces a ADR), no repiten el *qué*.
  - Referencia de API generada con TypeDoc en CI y publicada junto a la documentación.
  - Idioma del código e identificadores: inglés; comentarios y documentación: español (memoria de la tesis).
