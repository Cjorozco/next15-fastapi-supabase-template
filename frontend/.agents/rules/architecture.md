# Project Manager SaaS — Reglas de Arquitectura

> **Ámbito:** Toda la aplicación (Frontend, Backend, Dominios y Esquema).
> **Descripción:** Arquitectura general, límites y reglas de negocio de Project Manager SaaS.

Este proyecto cuenta con documentación de arquitectura completa en [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (raíz del repositorio).
**Consúltalo antes de proponer cualquier tabla, mutation, query o componente nuevo.**

---

## 1. Reglas No Negociables

1. **Esquema de datos acotado:** Las entidades principales de negocio son `users`, `projects` y `tasks`. Si una tarea parece requerir tablas adicionales, valida con el usuario antes de crearla.
2. **UI tonta, backend fuerte:** Toda la lógica de negocio, validaciones de integridad y autorizaciones viven en Convex (`convex/`). Los componentes React solo renderizan estado y disparan mutations.
3. **Autorización server-side obligatoria:** Toda mutation y query protegida debe llamar a `requireAuthenticatedUser(ctx)` desde `convex/lib/authorization.ts`. Nunca confíes en el estado del cliente para autorizar operaciones.
4. **Manejo de errores tipados:** Utiliza `DomainException` desde `convex/lib/errors.ts` para arrojar errores predecibles con código (`NOT_AUTHENTICATED`, `NOT_FOUND`, `ALREADY_EXISTS`, `UNAUTHORIZED`, `VALIDATION_ERROR`). En el frontend se mapean con `mapErrorToUserMessage()` en `shared/lib/userFacingError.ts`.
5. **Autenticación con Supabase Auth:** Supabase gestiona la identidad del usuario y firma JWTs con ES256 que Convex valida vía JWKS (`convex/auth.config.ts`). No alterar este mecanismo sin consultar.
6. **Sin sobreingeniería:** Mantener la arquitectura simple y directa. Preferir las abstracciones nativas de Convex y Next.js App Router antes que capas intermedias innecesarias.

---

## 2. Estructura por Dominio

Organización basada en dominios de negocio:

```text
convex/
  lib/                 # Utilidades compartidas (authorization.ts, errors.ts)
  projects/            # mutations.ts, queries.ts
  tasks/               # mutations.ts, queries.ts
  users/               # mutations.ts, queries.ts
domains/
  projects/            # components/, hooks/, types.ts
  tasks/               # hooks/, types.ts
  dashboard/           # components/
shared/
  components/
    ui/                # Componentes base (shadcn/ui)
    layout/            # Header, Sidebar
  context/             # AuthContext
  lib/                 # convex-provider, supabase, utils, userFacingError
src/app/
  (auth)/              # login, register
  (dashboard)/         # page (dashboard), projects/, projects/[id]/
```

- **Código compartido (`shared/`):** Exclusivamente componentes y utilidades reutilizables agnósticos de la lógica de negocio específica.
- **Dominios (`domains/{dominio}/`):** Componentes, hooks y tipos acoplados a una entidad concreta del producto.
