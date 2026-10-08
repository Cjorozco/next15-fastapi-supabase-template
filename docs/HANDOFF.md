# Handoff — Project Manager (Next + Convex)

> La fuente de verdad es este archivo. Hay una copia en Notion (Proyectos / Project Manager (Next + Convex)) que se refresca cuando se pida en la sesión de Claude Code.
>
> **Última actualización:** 2026-10-08 · **Último commit en `master`:** `990d109` (2026-09-20).

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
- Las reglas de agentes (`architecture`, `convex-conventions`, `ai-validation-zod`) se corrigieron para reflejar el código real (sección 8).
- Todos estos cambios y este archivo siguen **sin commit**; verificar con `git status`.

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

## 6. Principios de desarrollo (de `.agents/rules/`)

**Antes de tocar código:** leer `AGENTS.md` y `architecture.md`; usar el stack de `package.json`; no inventar alcance, tablas ni features "por si acaso"; ante duda no cubierta, preguntar.

**Arquitectura (no negociable)**
- Entidades acotadas: `users`, `projects`, `tasks`. Si parece hacer falta otra tabla, validar con el usuario.
- UI tonta, backend fuerte: negocio, validaciones y autorización viven en Convex; React solo renderiza y dispara mutations.
- Toda mutation/query protegida llama a `requireAuthenticatedUser(ctx)`; además se verifica propiedad del recurso (`requireProjectOwner`).
- Errores con `DomainException` + `DomainErrorCode`; en el frontend se mapean con `mapErrorToUserMessage()` (`shared/lib/userFacingError.ts`).
- Auth: Supabase ES256 + JWKS en Convex. No alterar sin consultar. Sin sobreingeniería.
- Convex: `.withIndex()` siempre (evitar `.filter()` sobre `.collect()`); al borrar un proyecto se borran sus tareas; no modificar `schema.ts` sin evaluar impacto en producción.

**Código y UX**
- TypeScript estricto, sin `any` en código nuevo. Copy de UI en español, directo y sin jerga; código, variables y comentarios en inglés.
- Reutilizar componentes y patrones del repo. Mobile-first, targets táctiles ≥ 44 px, HTML semántico, `inputMode` en campos numéricos.
- Feedback inmediato (loading, `disabled`, empty, error) y toasts para acciones importantes. Destructivo: confirmación explícita con el diálogo del repo, no `window.confirm`.
- Un CTA principal por vista; máximo 3 a 5 opciones a la vez.

**IA**
- Las claves BYOK viven solo en `localStorage`/Ajustes; nunca en el repo ni en el backend.
- La salida de un LLM es `unknown`: sanitizar con `safeParseAIResponse`, validar con Zod (`safeParse`, nunca `.parse()` directo), usar `parseAIWithFallback` en UI y `formatZodIssuesForPrompt` para reintentos. Recién entonces llamar la mutación, que vuelve a exigir auth y propiedad (ADR 002 y 003).

**Respuestas:** código listo para producción con paths exactos; señalar riesgos de arquitectura y costo (no sugerir de pago por defecto); marcar patrones viejos con `⚠️ OUTDATED: [old] → [new]. Reason: [why].`; si cambia arquitectura, deps, API o UX, actualizar los docs de este repo.

**Convex en rutas planas:** la separación en subcarpetas rompió `api.*` y se revirtió (`339a26a`). Leer `frontend/convex/_generated/ai/guidelines.md` antes de editar `convex/`.

## 7. Librerías

- **Instaladas (no se reemplazan):** Next 16, React 19, Tailwind v4, shadcn/Radix/Lucide, Convex, Supabase JS, Zod 4, `@dnd-kit`, Sonner, Recharts 3.7, Vitest + RTL.
- **Gráficas:** se decidió usar [TanStack Charts](https://tanstack.com/charts/latest) para gráficas nuevas. Ojo: **no figura en `frontend/package.json`** (hoy `ProjectProgressChart` usa Recharts). Instalarla antes de usarla y no migrar lo existente sin pedirlo.
- **Defaults para librerías nuevas** (`working-style.md`, solo si el repo no resuelve el problema): zod, Temporal (fechas), tanstack-table, better-auth, motion, fontsource, zustand, pragmatic-drag-and-drop, nuqs. La regla lista `chart.js` para gráficas; esa fila queda desplazada por TanStack Charts.

## 8. Reglas de agentes: corregidas, pendientes de commit

Se alinearon con el código (rutas planas de Convex, flujo de IA BYOK en el cliente, `requireProjectOwner` y los códigos de `errors.ts`) en `.agents/rules/{architecture,convex-conventions,ai-validation-zod}.md`, sus copias en `frontend/.agents/rules/` y los espejos `.cursor/rules/*.mdc`. Pendiente:
- `docs/adr/002-ai-response-validation-with-zod.md` sigue describiendo el flujo Action → `internalMutation`. Es un ADR histórico: añadir una nota de que lo implementado es BYOK en el cliente (o un ADR nuevo que lo reemplace).
- `working-style.md` lista `chart.js` como default de gráficas; actualizarlo a TanStack Charts cuando se instale.
- `frontend/.cursor/rules/` está vacío; los espejos viven solo en `.cursor/rules/` de la raíz.

## 9. Cómo actualizar este documento

Pedirlo en el chat de la sesión: Claude revisa `git log`, el estado del repo y el código, edita este archivo y luego refresca la copia de Notion.
