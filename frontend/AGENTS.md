<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Project Manager SaaS — Guía para agentes

Documentación: [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Capa de IA

**Común:** `.agents/rules/working-style.md` + `.agents/rules/ux-principles.md`  
(Cursor: `.cursor/rules/working-style.mdc` + `ux-principles.mdc`)

**Este producto:** `.agents/rules/architecture.md` · Convex: `.agents/rules/convex-conventions.md` · IA: `.agents/rules/ai-validation-zod.md`  
Skills Convex en `.agents/skills/` (pertenecen a este frontend).

## Stack

- **Frontend:** Next.js App Router, React 19, TypeScript, Tailwind v4, shadcn
- **Backend & DB:** Convex
- **Auth:** Supabase Auth (JWT ES256 → Convex customJwt JWKS)
- **IA:** Zod (`safeParseAIResponse`, `parseAIWithFallback`) en `shared/lib/ai/`
- **Filosofía:** UI tonta / backend fuerte

`backend/` del monorepo es FastAPI histórico — no es este cwd.
