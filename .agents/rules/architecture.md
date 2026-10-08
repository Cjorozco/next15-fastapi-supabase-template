# Project Manager SaaS — Reglas de Arquitectura

> Código vivo: `frontend/` (Next.js + Convex + Supabase Auth).  
> `backend/` (FastAPI) es **archivo histórico**. No lo extiendas salvo petición explícita.  
> No copies reglas de Ecosistemas (aceite, snapshot de precio, roles admin/operador de campo).

Este proyecto cuenta con documentación de arquitectura completa en [`ARCHITECTURE.md`](../ARCHITECTURE.md) (raíz del repositorio).
**Consúltalo antes de proponer cualquier tabla, mutation, query o componente nuevo.**

---

## 1. Reglas No Negociables

1. **Esquema de datos acotado:** Las entidades principales de negocio son `users`, `projects` y `tasks`. Si una tarea parece requerir tablas adicionales, valida con el usuario antes de crearla.
2. **UI tonta, backend fuerte:** Toda la lógica de negocio, validaciones de integridad y autorizaciones viven en Convex (`convex/`). Los componentes React solo renderizan estado y disparan mutations.
3. **Autorización server-side obligatoria:** Toda mutation y query protegida debe llamar a `requireAuthenticatedUser(ctx)` desde `convex/lib/authorization.ts`. Si recibe un `projectId` o `taskId`, además debe verificar propiedad con `requireProjectOwner(ctx, projectId)` y que cada tarea pertenezca a ese proyecto (IDOR de `tasks.reorder`, corregido en `990d109`). Nunca confíes en el estado del cliente para autorizar operaciones.
4. **Manejo de errores tipados:** Utiliza `DomainException` desde `convex/lib/errors.ts` para arrojar errores predecibles con código (`NOT_AUTHENTICATED`, `UNAUTHORIZED`, `ENTITY_NOT_FOUND`, `DUPLICATE_ENTITY`, `INVALID_INPUT`). En el frontend se mapean con `mapErrorToUserMessage()` en `shared/lib/userFacingError.ts`.
5. **Autenticación con Supabase Auth:** Supabase gestiona la identidad del usuario y firma JWTs con ES256 que Convex valida vía JWKS (`convex/auth.config.ts`). No alterar este mecanismo sin consultar.
6. **Sin sobreingeniería:** Mantener la arquitectura simple y directa. Preferir las abstracciones nativas de Convex y Next.js App Router antes que capas intermedias innecesarias.
7. **Dominio primero:** organizar por dominio de negocio (`domains/{dominio}/`), no por tipo de archivo. `shared/` no conoce términos de negocio.
8. **Decisiones como ADR:** toda decisión de arquitectura relevante se registra en `docs/adr/` (hoy 001 a 003). Un ADR histórico no se reescribe: se añade una nota o uno nuevo que lo reemplace.
9. **Borrado lógico (`active: false`)** para registros con historial. Aquí no aplica a proyectos ni tareas (ver excepciones).
10. **FinOps:** preferir lo gratuito o ya instalado.

---

## 2. Estructura por Dominio

Organización basada en dominios de negocio:

```text
convex/
  lib/                 # Utilidades compartidas (authorization.ts, errors.ts)
  projects.ts          # Rutas planas: api.projects.* (no separar en carpetas)
  tasks.ts             # api.tasks.*
  users.ts             # api.users.*
domains/
  projects/            # components/, hooks/, schemas/ (Zod de IA), types.ts
  tasks/               # hooks/, types.ts
  dashboard/           # components/
shared/
  components/
    ui/                # Componentes base (shadcn/ui)
    layout/            # Header, Sidebar
  context/             # AuthContext, ThemeContext
  lib/                 # ai/ (gateway BYOK), convex-provider, supabase, themeEngine, utils, userFacingError
src/app/
  (auth)/              # login, register
  (dashboard)/         # page (dashboard), projects/, projects/[id]/
```

- **Código compartido (`shared/`):** Exclusivamente componentes y utilidades reutilizables agnósticos de la lógica de negocio específica.
- **Dominios (`domains/{dominio}/`):** Componentes, hooks y tipos acoplados a una entidad concreta del producto.

---

## 3. Excepciones del proyecto a la capa común

La capa común ([Principios y forma de trabajo](https://app.notion.com/p/3f3aa39f8dab81bc80fadd7c6515a087)) es el default. Estas diferencias son deliberadas; no las "corrijas":

| Capa común | Este proyecto | Motivo |
|---|---|---|
| Llamadas a IA en el backend | Llamadas desde el navegador con la API key del usuario (BYOK, `localStorage`); la mutation de Convex revalida auth y propiedad | Decisión de diseño: las claves nunca pasan por el servidor (ADR 002 y 003) |
| `convex/{dominio}/` | Archivos planos `convex/projects.ts`, `tasks.ts`, `users.ts` | Las carpetas rompieron `api.*` y los tipos generados (`339a26a`) |
| Borrado lógico en registros con historial | Borrado físico con cascada de proyectos y tareas | No hay historial que preservar |
| Gráficas: `@tanstack/charts` | Recharts 3.7 instalado (`ProjectProgressChart`); no se migra sin pedirlo | `package.json` manda |
| Drag & drop: pragmatic-drag-and-drop | `@dnd-kit` | Ya instalado y en uso |
| Auth: better-auth | Supabase Auth con JWT ES256 y JWKS en Convex | ADR 001 |
| Flujo de ramas `develop` → `master` | Solo `master` | Repo de un solo desarrollador |
