# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- **Adopción de Arquitectura Domain-Driven (Blueprint):**
  - Reestructuración de backend `convex/` en módulos de dominio: `projects/`, `tasks/`, `users/` separando `mutations.ts` y `queries.ts`.
  - Creación de infraestructura de errores tipados `convex/lib/errors.ts` (`DomainException`, `DomainErrorCode`).
  - Creación de helpers de autorización `convex/lib/authorization.ts` (`requireAuthenticatedUser`).
  - Reorganización del frontend en carpetas de dominio: `frontend/domains/projects/`, `frontend/domains/tasks/`, `frontend/domains/dashboard/`.
  - Consolidación de UI y utilidades genéricas en `frontend/shared/` (`components/ui`, `components/layout`, `context`, `lib`).
  - Mapeo de errores de backend en el frontend con `shared/lib/userFacingError.ts`.
  - Reorganización de rutas de Next.js App Router en route groups: `src/app/(auth)/` y `src/app/(dashboard)/`.
  - Actualización de reglas para agentes IA en `.agents/rules/` y `AGENTS.md` adaptadas al contexto del proyecto.
  - Documentación de arquitectura técnica en `ARCHITECTURE.md` y ADR sobre Supabase Auth en `docs/adr/`.

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
