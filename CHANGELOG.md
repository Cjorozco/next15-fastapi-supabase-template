# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **IA generativa con BYOK (cliente):** gateway multi-proveedor (Gemini y Groq) con adaptadores, selección de modelo, fallback automático de modelos Gemini y errores tipados (ADR 002 y 003). La API key del usuario se guarda solo en `localStorage`.
- **Generador de proyectos con IA:** crea proyecto, tareas y subtareas con validación Zod y la mutación atómica `projects.createWithTasks`.
- **Copiloto de refinamiento con IA:** cambios quirúrgicos sobre un proyecto existente mediante `projects.applyAiRefinement`.
- **Subtareas:** `addSubtask`, `toggleSubtask`, `removeSubtask`; la tarea padre se autocompleta cuando todas sus subtareas terminan.
- **Conversión de tarea en subtarea** arrastrando y soltando (`tasks.convertTaskToSubtask`).
- **Tema:** modo claro limpio por defecto con toggle instantáneo a oscuro, y motor de armonía de color dinámico (`themeEngine.ts`) con rediseño SaaS minimalista.
- Mutación `projects.cleanupAll` y reglas/skills para agentes IA.

### Fixed
- **Seguridad:** IDOR entre tenants en `tasks.reorder`; ahora exige ser dueño del proyecto y que cada tarea pertenezca a él.
- Redirección indeseada al dashboard al cambiar de pestaña del navegador (auth).
- Modelos de IA actualizados (Gemini con fallback; Groq con `openai/gpt-oss-120b`, Qwen y compound) y lista de modelos depurada con metadatos en `config.ts`.

### Removed
- Suite E2E de Cypress y sus dependencias. Quedan pruebas unitarias y de componentes con Vitest.

### Changed
- **Arquitectura Domain-Driven en el frontend:** `frontend/domains/` (`projects`, `tasks`, `dashboard`) y `frontend/shared/` (`components/ui`, `components/layout`, `context`, `lib`); rutas en route groups `(auth)` y `(dashboard)`.
- El backend `convex/` conserva rutas planas (`projects.ts`, `tasks.ts`, `users.ts`): la separación en subcarpetas se revirtió para restaurar las rutas `api.*` y los tipos generados. Se mantienen `convex/lib/errors.ts` (`DomainException`, `DomainErrorCode`) y `convex/lib/authorization.ts` (`requireAuthenticatedUser`).
- Mapeo de errores de backend en el frontend con `shared/lib/userFacingError.ts`.
- Reglas para agentes IA en `.agents/rules/` y `AGENTS.md`; `ARCHITECTURE.md` y ADR en `docs/adr/` actualizados.

---

## [1.1.0] - 2026-03-05

### Added
- Gráficas de avance de proyecto con Recharts en el dashboard.
- Suite de pruebas end-to-end con Cypress (4 specs contra ambiente de producción).
- Soporte para Drag & Drop interactivo de tareas con persistencia de orden mediante `@dnd-kit`.
- Notificaciones toast integradas con Sonner.

### Changed
- Migración del backend de FastAPI + SQLAlchemy Postgres a Convex Cloud con live queries.
- Integración de Supabase Auth con Convex mediante emisión de tokens JWT con firma ES256 y verificación JWKS.
