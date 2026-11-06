# Plan SDD: reconstrucción de la web de Florensia Online

Proyecto de tesis. Rehacer [www.florensia-online.com](https://www.florensia-online.com) con React + MySQL, mobile first, en 7 idiomas, con las mismas funciones que la web oficial, la misma línea visual y mejores Core Web Vitals.

> **Esto es un plan. No contiene código de aplicación.**

## Metodología: Spec-Driven Development (SDD)

SDD significa que la especificación es la fuente de verdad y el código se deriva de ella. Cada cambio sigue el mismo ciclo, inspirado en GitHub Spec Kit:

1. **Constitución**: principios que no se negocian (rendimiento, accesibilidad, i18n, seguridad, calidad). → [02-constitucion-y-estandares.md](02-constitucion-y-estandares.md)
2. **Especificar** (*qué* y *por qué*): historias de usuario y criterios de aceptación verificables, sin hablar de tecnología. → [03-especificacion.md](03-especificacion.md)
3. **Planificar** (*cómo*): arquitectura, modelo de datos, contratos de API. → [04-arquitectura.md](04-arquitectura.md)
4. **Tareas**: lista ordenada y trazable, cada tarea apunta al requisito que cumple. → [05-plan-de-tareas.md](05-plan-de-tareas.md)
5. **Implementar y verificar**: cada criterio de aceptación tiene un test; la tarea se cierra cuando el test pasa.

Las decisiones relevantes se documentan como ADR (Architecture Decision Records) en [06-decisiones-adr.md](06-decisiones-adr.md), que sirve directamente como capítulo de "justificación de decisiones" de la tesis.

## Índice

| Doc | Contenido | Uso en la tesis |
|---|---|---|
| [01-auditoria.md](01-auditoria.md) | Fallos y problemas encontrados en la web actual, con ID (F-xx) | Capítulo "Análisis del estado actual" |
| [02-constitucion-y-estandares.md](02-constitucion-y-estandares.md) | Principios, presupuesto de rendimiento, estándares de código | Capítulo "Metodología y estándares" |
| [03-especificacion.md](03-especificacion.md) | SRS según ISO/IEC/IEEE 29148: requisitos RF/RNF con prioridad, origen, verificación y criterios de aceptación | Capítulo "Especificación de requisitos" |
| [04-arquitectura.md](04-arquitectura.md) | Stack, arquitectura, modelo de datos MySQL, API, i18n, seguridad, rendimiento | Capítulo "Diseño" |
| [05-plan-de-tareas.md](05-plan-de-tareas.md) | Fases, tareas, trazabilidad F → RF → tarea → test | Capítulo "Implementación" y planificación |
| [06-decisiones-adr.md](06-decisiones-adr.md) | Decisiones de arquitectura con alternativas y motivo | Capítulo "Justificación de decisiones" |
| [07-preguntas-abiertas.md](07-preguntas-abiertas.md) | Preguntas a Armando, sus respuestas (2026-11-06) y cómo cambiaron el plan | Gestión del proyecto |
| [08-plantilla-registro-de-mejoras.md](08-plantilla-registro-de-mejoras.md) | Plantilla para documentar cada mejora implementada (antes/después/por qué) | Capítulo "Resultados" |

## Trazabilidad

Cada elemento tiene un ID que conecta todo el documento:

`F-xx` (fallo detectado) → `RF-xx` / `RNF-xx` (requisito que lo resuelve) → `ADR-xx` (decisión técnica) → `T-xx` (tarea) → test automatizado → entrada en el registro de mejoras.

Así, en la defensa se puede demostrar para cada fallo detectado qué se hizo, por qué y cómo se comprobó.

## Estado (2026-11-05)

- Auditoría de páginas públicas: hecha.
- Auditoría de zonas con sesión (cuenta, recarga de AP, historial): **pendiente**. El login no está en florensia-online.com sino en `us.online-games.services` (servicio de cuentas de Giiku Games) y hace falta un navegador real para entrar.
- Medición de Core Web Vitals reales (Lighthouse / PageSpeed): **pendiente**, por el mismo motivo. Ver T-02.
