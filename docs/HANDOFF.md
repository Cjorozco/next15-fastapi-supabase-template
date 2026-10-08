# Handoff — Project Manager (Next + Convex)

> La fuente de verdad es este archivo. Hay una copia en Notion (Proyectos / Project Manager (Next + Convex)) que se refresca cuando se pida en la sesión de Claude Code.
>
> **Última actualización:** 2026-10-08 · **Último cambio de código:** `990d109` (2026-09-20); desde entonces solo docs y reglas. Sin push a `origin`.

## 1. Qué es

Gestor de proyectos y tareas en tiempo real. Cada usuario ve solo sus proyectos. Incluye subtareas, drag and drop, gráficas de avance y un copiloto de IA opcional con la API key del propio usuario (BYOK).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn · Convex (backend reactivo) · Supabase Auth (JWT ES256 verificado por JWKS en Convex) · Zod 4 · Vitest.

`backend/` (FastAPI) es archivo muerto: no extender salvo que se pida.

## 2. Flujo de trabajo

- Leer `AGENTS.md` y `.agents/rules/` (working-style, ux-principles, architecture, convex-conventions, ai-validation-zod).
- App viva en `frontend/`. Para Convex, leer antes `frontend/convex/_generated/ai/guidelines.md`.
- Rama única: `master`.
- Comandos (en `frontend/`): `npm run test` (Vitest), `npx tsc --noEmit`.

## 3. Estado actual

- Tests: Vitest 12 archivos / 77 pruebas OK. `tsc --noEmit` sin errores (verificado el 2026-10-08).
- No se corrieron lint ni `next build`, ni se probó la app en vivo.
- `ARCHITECTURE.md` y `CHANGELOG.md` están actualizados con IA, subtareas, tema, fix de seguridad y retiro de Cypress.
- Las reglas de agentes se corrigieron para reflejar el código real (commit `f2699e7` en `master`) y luego se alinearon con la capa común (rama `docs/align-common-layer`, fusionada a `master` por fast-forward; ver sección 6). `master` está varios commits por delante de `origin/master`: **falta hacer push**.

### Mapa del código

- `frontend/convex/`: `projects.ts`, `tasks.ts`, `users.ts` (rutas planas), `schema.ts`, `lib/authorization.ts` (`requireAuthenticatedUser`, `requireProjectOwner`), `lib/errors.ts`.
- `frontend/domains/{projects,tasks,dashboard}`: componentes, hooks y esquemas Zod de IA.
- `frontend/shared/lib/ai/`: gateway multi-proveedor (Gemini, Groq), adaptadores, `config.ts`, `safe-ai-parser.ts`, `ai-errors.ts`, `useAiClient.ts`.
- `frontend/src/proxy.ts`: guards de auth (frontera de red de Next 16).

## 4. Cambios recientes

| Commit | Cambio |
|---|---|
| `990d109` | Fix de seguridad: IDOR entre tenants en `tasks.reorder` (exige dueño del proyecto y tareas del proyecto). |
| `7c856b0` | Lista de modelos Groq depurada y metadatos en `config.ts`. |
| `89a17f4` | Copiloto de refinamiento con IA (`projects.applyAiRefinement`). |
| `0c34c40`, `1a977dd` | Gateway de IA multi-proveedor (Gemini y Groq). |
| `715e7ee`, `bff82f0` | Subtareas con autocompletado del padre y conversión de tarea en subtarea por drag and drop. |
| `1e32028` | Generador de proyectos con IA (`projects.createWithTasks`). |
| `efec9a1`, `5169529` | Tema claro por defecto, toggle a oscuro y motor de armonía de color. |

## 5. Pendientes / deuda conocida

1. Tests de autorización en Convex (el IDOR de `tasks.reorder` mostró que faltan): revisar que toda mutación verifique propiedad del recurso. `convex/example.test.ts` parece un placeholder.
2. Correr lint y `next build`.
3. Probar en navegador los flujos de IA (generador y copiloto) con claves reales.
4. Cypress E2E fue retirado (`5eca517`): no hay pruebas de extremo a extremo.
5. Sin colaboración entre usuarios: cada proyecto tiene un solo dueño.
6. El nombre de la carpeta del repo (`next15-fastapi-supabase-template`) ya no describe el producto.

## 6. Capa común y excepciones

Principios, forma de trabajo, librerías por defecto y UX: [Principios y forma de trabajo](https://app.notion.com/p/3f3aa39f8dab81bc80fadd7c6515a087) (Notion), reflejados en `.agents/rules/`. No se repiten aquí.

Excepciones deliberadas de este proyecto (detalle en `.agents/rules/architecture.md`, sección 3):
- IA con BYOK en el cliente, no en el backend (ADR 002 y 003).
- Convex en rutas planas (`projects.ts`, `tasks.ts`, `users.ts`); las carpetas por dominio rompieron `api.*` (`339a26a`).
- Borrado físico con cascada de proyectos y tareas.
- Se mantienen Recharts, `@dnd-kit` y Supabase Auth (ADR 001). **TanStack Charts** (`@tanstack/charts`) es el default para gráficas nuevas, pero aún **no está en `frontend/package.json`**: instalarlo antes de usarlo y no migrar `ProjectProgressChart` sin pedirlo.
- Solo existe `master`.

Antes de editar `convex/`, leer `frontend/convex/_generated/ai/guidelines.md`.

## 7. Pendientes de la capa de reglas

- `docs/adr/002-ai-response-validation-with-zod.md` sigue describiendo el flujo Action → `internalMutation`. Añadir una nota (o un ADR nuevo) de que lo implementado es BYOK en el cliente.
- Las reglas existen en cuatro copias (`.agents/rules/`, `frontend/.agents/rules/`, `.cursor/rules/`, `frontend/.cursor/rules/`) y hay que mantenerlas sincronizadas a mano. Se decidió mantener las cuatro por ahora.

## 8. Cómo actualizar este documento

Pedirlo en el chat de la sesión: Claude revisa `git log`, el estado del repo y el código, edita este archivo y luego refresca la copia de Notion.
