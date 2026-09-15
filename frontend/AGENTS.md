<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Project Manager SaaS — Guía para Agentes

Documentación de arquitectura completa: [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Reglas del Proyecto

- **Antigravity (Nativo en `.agents/rules/`):**
  - Arquitectura y límites de dominio: [`.agents/rules/architecture.md`](./.agents/rules/architecture.md)
  - Convenciones y seguridad de Convex: [`.agents/rules/convex-conventions.md`](./.agents/rules/convex-conventions.md)
  - Heurísticas UX y frontend: [`.agents/rules/ux-principles.md`](./.agents/rules/ux-principles.md)
  - Validación de IA con Zod (Zero-Trust Boundary): [`../docs/adr/002-ai-response-validation-with-zod.md`](../docs/adr/002-ai-response-validation-with-zod.md)

## Stack Principal
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Backend & DB:** Convex 1.31+.
- **Auth:** Supabase Auth (JWT ES256 → Convex customJwt JWKS).
- **Validación & AI Boundary:** Zod 3.x (`safeParseAIResponse`, `parseAIWithFallback`).
- **Componentes UI:** shadcn/ui + Radix UI + Lucide Icons.
- **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable`.
- **Notificaciones:** Sonner.
- **Gráficas:** Recharts.
- **Testing:** Vitest + Testing Library (Unitario frontend y Convex), Cypress (E2E).
- **Filosofía:** UI tonta / backend fuerte; lógica de negocio, validaciones y autorización en Convex. Límite de Cero Confianza para respuestas de IA (Zod interceptors antes de DB o UI).

## Estructura de Directorios

```text
frontend/
├── convex/
│   ├── schema.ts              # Esquema de users, projects, tasks
│   ├── auth.config.ts         # Verificación JWT Supabase
│   ├── lib/
│   │   ├── authorization.ts   # requireAuthenticatedUser
│   │   └── errors.ts          # DomainException, DomainErrorCode
│   ├── projects/              # mutations.ts, queries.ts
│   ├── tasks/                 # mutations.ts, queries.ts
│   └── users/                 # mutations.ts, queries.ts
├── domains/
│   ├── projects/              # components/, hooks/, types.ts
│   ├── tasks/                 # hooks/, types.ts
│   └── dashboard/             # components/
├── shared/
│   ├── components/
│   │   ├── ui/                # shadcn primitives
│   │   └── layout/            # Header, Sidebar
│   ├── context/               # AuthContext
│   └── lib/                   # convex-provider, supabase, utils, userFacingError
│       └── ai/                # safe-ai-parser (Zod validation & sanitization)
└── src/
    ├── app/
    │   ├── (auth)/            # login, register
    │   ├── (dashboard)/       # page, projects, projects/[id]
    │   ├── layout.tsx
    │   └── globals.css
    ├── proxy.ts               # Network-level boundary Next.js 16 (auth guards)
    └── __tests__/             # Unit tests Vitest (UI, Convex, AI parser)
```
