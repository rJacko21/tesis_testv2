# Florensia Online: nueva web (trabajo de tesis)

Reconstrucción de [florensia-online.com](https://www.florensia-online.com) con React (Next.js) y MySQL: mobile first, accesible, en 7 idiomas (en, pt-BR, tr, it, de, fr, es) y con mejores Core Web Vitals que la web original, manteniendo sus funciones y su línea visual.

El proyecto sigue **Spec-Driven Development**: la especificación manda y el código se deriva de ella. Toda la documentación está en [`docs/plan/`](docs/plan/README.md):

| Documento                                                                 | Contenido                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [01-auditoria](docs/plan/01-auditoria.md)                                 | Fallos de la web original (F-xx)                             |
| [02-constitucion-y-estandares](docs/plan/02-constitucion-y-estandares.md) | Principios, presupuesto de rendimiento, estándares de código |
| [03-especificacion](docs/plan/03-especificacion.md)                       | Requisitos (SRS, ISO/IEC/IEEE 29148)                         |
| [04-arquitectura](docs/plan/04-arquitectura.md)                           | Diseño técnico y modelo de datos                             |
| [05-plan-de-tareas](docs/plan/05-plan-de-tareas.md)                       | Tareas (T-xx) y trazabilidad                                 |
| [06-decisiones-adr](docs/plan/06-decisiones-adr.md)                       | Decisiones de arquitectura                                   |

## Arranque en 5 minutos

Requisitos: Node 22+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env          # valores para el MySQL local de docker-compose
docker compose up -d db       # MySQL 8.4
pnpm db:migrate               # aplica las migraciones de drizzle/
pnpm db:seed                  # carga los datos base (idiomas)
pnpm dev                      # http://localhost:3000
```

## Scripts

| Script                              | Qué hace                                         |
| ----------------------------------- | ------------------------------------------------ |
| `pnpm dev`                          | Servidor de desarrollo                           |
| `pnpm build` / `pnpm start`         | Build y servidor de producción                   |
| `pnpm lint`                         | ESLint sin warnings permitidos                   |
| `pnpm typecheck`                    | Genera los tipos de rutas y comprueba TypeScript |
| `pnpm format` / `pnpm format:check` | Prettier                                         |
| `pnpm test`                         | Tests unitarios (Vitest)                         |
| `pnpm db:generate`                  | Crea una migración a partir de `src/db/schema`   |
| `pnpm db:migrate`                   | Aplica las migraciones pendientes                |
| `pnpm db:seed`                      | Carga datos base (idempotente)                   |

## Estructura

```
src/
  app/          rutas de Next.js (App Router)
  config/       configuración compartida (idiomas…)
  db/           cliente y esquema de MySQL (Drizzle)
  lib/          utilidades de servidor (variables de entorno…)
scripts/        tareas de línea de comandos (seed…)
drizzle/        migraciones SQL versionadas
docs/plan/      especificación y documentación de la tesis
```

## Convenciones

- Commits con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `perf:`, `a11y:`, `i18n:`…), comprobados por commitlint.
- Cada PR enlaza su requisito (RF/RNF), fallo (F) y tarea (T); ver la plantilla de PR.
- Código e identificadores en inglés; comentarios TSDoc y documentación en español.
