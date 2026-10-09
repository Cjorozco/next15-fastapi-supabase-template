# Handoff — Project Manager (Next + Convex)

> La fuente de verdad es este archivo. Hay una copia en Notion (Proyectos / Project Manager (Next + Convex)) que se refresca cuando se pida en la sesión de Claude Code.
>
> **Última actualización:** 2026-10-09 · **Último cambio de código:** `c8871be` (login demo de un clic). Antes de él, el último fue `990d109` (2026-09-20). Repo local verificado el 2026-10-09: árbol limpio y sincronizado con `origin`.

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

- Tests: Vitest 15 archivos / 107 pruebas OK. `tsc --noEmit` sin errores (verificado el 2026-10-09).
- Demo de un clic (`c8871be`): botón "Probar demo" en `/login` (visible si existe `NEXT_PUBLIC_DEMO_EMAIL`) que llama a `POST /api/demo-login` (`src/app/api/demo-login/route.ts`). La ruta inicia sesión en Supabase con `DEMO_EMAIL`/`DEMO_PASSWORD`, que solo existen en el servidor (404 si faltan; límite de 10 intentos por minuto por IP, en memoria de la instancia). `proxy.ts` deja pública esa ruta. Datos sembrados en `convex/lib/demoData.ts`; `convex/demo.ts` (`reset`, interna) los restaura cada 24 h desde `convex/crons.ts` y solo toca al usuario con `DEMO_TOKEN_IDENTIFIER` (si falta, no hace nada). `convex/demo.test.ts` (6 pruebas) la cubre. `DemoBanner` aparece en el header. `tasks` ganó campos opcionales (`status`, `priority`, `dueDate`, `assignee`) que el seed rellena y la UI aún no muestra.
- Autorización en Convex: `convex/authorization.test.ts` (15 pruebas) cubre llamadas anónimas, usuario sin registro y aislamiento entre usuarios sobre una base compartida para todas las funciones públicas de `projects` y `tasks`. Se comprobó que falla si se reintroduce el IDOR de `tasks.reorder`. `convex/example.test.ts` son pruebas funcionales reales; su prueba "cannot access other user project" usa dos bases separadas y por eso no prueba aislamiento (lo cubre el archivo nuevo).
- Usuarios en Convex: `convex/users.test.ts` (9 pruebas) cubre `users.me` (anónimo, sin registro, forma devuelta, aislamiento entre usuarios) y `users.store` (rechazo anónimo, creación, idempotencia, email vacío, identidades distintas).
- Incidente resuelto (2026-10-09): una sesión vio `.git` sin `config` ni `index` (sospecha de sincronización de OneDrive, porque el repo vive dentro de OneDrive). Al revisar después, el remoto y el índice estaban bien y los commits funcionan. Sigue pendiente decidir si se mueve el repo fuera de OneDrive.
- `npm run lint`: 0 errores y 4 advertencias "Unused eslint-disable directive" en archivos autogenerados de `convex/_generated/` (no se tocan). `npm run build` (Next 16.1.6, Turbopack) compila, pasa TypeScript e incluye la ruta dinámica `/api/demo-login` (verificado el 2026-10-09 por otra sesión, con `.env.local` y `.env.production` locales).
- No se probó la app en vivo en el navegador.
- `ARCHITECTURE.md` y `CHANGELOG.md` están actualizados con IA, subtareas, tema, fix de seguridad y retiro de Cypress.
- Las reglas de agentes se corrigieron para reflejar el código real (commit `f2699e7` en `master`) y luego se alinearon con la capa común (rama `docs/align-common-layer`, fusionada a `master` por fast-forward y subida a `origin`; ver sección 6).

### Mapa del código

- `frontend/convex/`: `projects.ts`, `tasks.ts`, `users.ts` (rutas planas), `schema.ts`, `lib/authorization.ts` (`requireAuthenticatedUser`, `requireProjectOwner`), `lib/errors.ts`.
- `frontend/domains/{projects,tasks,dashboard}`: componentes, hooks y esquemas Zod de IA.
- `frontend/shared/lib/ai/`: gateway multi-proveedor (Gemini, Groq), adaptadores, `config.ts`, `safe-ai-parser.ts`, `ai-errors.ts`, `useAiClient.ts`.
- `frontend/src/proxy.ts`: guards de auth (frontera de red de Next 16); deja pasar `/api/demo-login`.
- Demo: `convex/demo.ts`, `convex/crons.ts`, `convex/lib/demoData.ts`, `src/app/api/demo-login/route.ts`, `shared/components/layout/DemoBanner.tsx`.

## 4. Cambios recientes

| Commit | Cambio |
|---|---|
| `c8871be` | Login demo de un clic con datos sembrados y reinicio diario por cron. |
| `547b0f8` | Pruebas de `users.me` y `users.store`. |
| `aa5b392` | Pruebas de autorización y aislamiento entre tenants. |
| `990d109` | Fix de seguridad: IDOR entre tenants en `tasks.reorder` (exige dueño del proyecto y tareas del proyecto). |
| `7c856b0` | Lista de modelos Groq depurada y metadatos en `config.ts`. |
| `89a17f4` | Copiloto de refinamiento con IA (`projects.applyAiRefinement`). |
| `0c34c40`, `1a977dd` | Gateway de IA multi-proveedor (Gemini y Groq). |
| `715e7ee`, `bff82f0` | Subtareas con autocompletado del padre y conversión de tarea en subtarea por drag and drop. |
| `1e32028` | Generador de proyectos con IA (`projects.createWithTasks`). |
| `efec9a1`, `5169529` | Tema claro por defecto, toggle a oscuro y motor de armonía de color. |

## 5. Pendientes / deuda conocida

1. Decidir si se mueve el repo fuera de OneDrive (ver sección 3).
2. Probar en navegador los flujos de IA (generador y copiloto) con claves reales y el login demo.
3. Demo: documentarla en `CHANGELOG.md` y `ARCHITECTURE.md` (hoy no la mencionan). Configurar en producción: usuario demo en Supabase, `DEMO_EMAIL` y `DEMO_PASSWORD` en Next/Vercel, y `DEMO_TOKEN_IDENTIFIER` y `DEMO_EMAIL` en Convex; confirmar que el cron corre en el despliegue. No verificado. No existe `frontend/.env.example`: valorar crearlo con estas variables.
4. Demo: `tasks.update` y `toggleSubtask` no actualizan `status`, así que un cambio de `isCompleted` deja `status` desincronizado. Hoy la UI no lo muestra; resolverlo antes de mostrarlo. El límite de intentos del login demo es por instancia, no global.
5. Cypress E2E fue retirado (`5eca517`): no hay pruebas de extremo a extremo.
6. Sin colaboración entre usuarios: cada proyecto tiene un solo dueño.
7. Los tests de Convex no cubren `createWithTasks` con posiciones arbitrarias del cliente.
8. El nombre de la carpeta del repo (`next15-fastapi-supabase-template`) ya no describe el producto.

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

- ADR 002: enmendado el 2026-10-08 con la implementación real (BYOK en el cliente); el texto original se conserva como registro histórico.
- Las reglas existen en cuatro copias (`.agents/rules/`, `frontend/.agents/rules/`, `.cursor/rules/`, `frontend/.cursor/rules/`) y hay que mantenerlas sincronizadas a mano. Se decidió mantener las cuatro por ahora.

## 8. Cómo actualizar este documento

Pedirlo en el chat de la sesión: Claude revisa `git log`, el estado del repo y el código, edita este archivo y luego refresca la copia de Notion.
