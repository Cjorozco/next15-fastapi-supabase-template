# AGENTS — Project Manager (este repo)

Lee esto **antes** de explorar.

> El nombre de carpeta `next15-fastapi-supabase-template` es histórico. El producto vivo es **Next.js + Convex + Supabase Auth**. FastAPI en `backend/` es referencia, no el backend activo.

## Capa de IA

**Común:** `.agents/rules/working-style.md` + `.agents/rules/ux-principles.md`  
(Cursor: `.cursor/rules/working-style.mdc` + `ux-principles.mdc`)

**Este producto:** `.agents/rules/architecture.md` y `frontend/.agents/rules/architecture.md`  
Convex: `frontend/.agents/rules/convex-conventions.md`  
IA/Zod: `frontend/.agents/rules/ai-validation-zod.md`  
Skills Convex: `frontend/.agents/skills/` (sí pertenecen: este frontend usa Convex)

Si abres **solo** `frontend/` como raíz del IDE, usa `frontend/AGENTS.md` y `frontend/.cursor/rules/`.

## Stack

- Frontend: Next.js (App Router), React 19, TypeScript, Tailwind v4, shadcn
- Backend: Convex (`frontend/convex/`)
- Auth: Supabase Auth (JWT ES256 → Convex JWKS)
- FastAPI `backend/`: no extender salvo que se pida

Documentación: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
