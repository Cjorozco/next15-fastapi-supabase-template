# Convenciones de Código Convex

> **Ámbito:** Backend (`convex/**/*.ts`).
> **Descripción:** Convenciones técnicas, estructura y reglas de seguridad para código backend en Convex.

---

## 1. Mutations

- **Autorización al inicio:** Toda mutation que requiera un usuario autenticado empieza validando permisos con `requireAuthenticatedUser(ctx)` desde `convex/lib/authorization.ts`:
  ```typescript
  import { mutation } from "./_generated/server";
  import { requireAuthenticatedUser, requireProjectOwner } from "./lib/authorization";
  import { DomainException } from "./lib/errors";

  export const miMutation = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
      await requireProjectOwner(ctx, args.projectId); // auth + propiedad
      // ... resto de la lógica
    },
  });
  ```
- **Propiedad del recurso:** autenticarse no basta. Si la función recibe un `projectId` o `taskId`, usa `requireProjectOwner` y verifica que cada tarea pertenezca al proyecto.
- **Errores estructurados:** Usa `new DomainException("ENTITY_NOT_FOUND", "mensaje descriptivo")` en lugar de `Error` genérico. Códigos: `ENTITY_NOT_FOUND`, `DUPLICATE_ENTITY`, `INVALID_INPUT`, `UNAUTHORIZED`, `NOT_AUTHENTICATED`.
- **Cálculos y ordenamiento en el backend:** Posiciones de tareas (`position`) y estados derivados se manejan o validan en el servidor.
- **Cascada de eliminación:** Al eliminar un proyecto, eliminar también todas sus tareas asociadas (`tasks.by_project`).

---

## 2. Queries

- **Indexación eficiente:** Usa siempre `.withIndex()` (ej. `by_owner`, `by_project`, `by_token`). Evita `.filter()` sobre `.collect()` completo salvo colecciones muy pequeñas sin índice.
- **Protección de datos:** Las queries de datos privados validan la sesión con `requireAuthenticatedUser(ctx)` y filtran por el `ownerId` del usuario.

---

## 3. Organización de Archivos

- **Rutas planas por dominio:** un archivo por dominio (`convex/projects.ts`, `tasks.ts`, `users.ts`) que mezcla queries y mutations. No crear carpetas `convex/{dominio}/`: rompieron `api.*` y los tipos generados (`339a26a`).
- **Librería común (`convex/lib/`):** Utilidades reutilizables:
  - `authorization.ts`: helpers `requireAuthenticatedUser` y `requireProjectOwner`.
  - `errors.ts`: clase `DomainException` y tipo `DomainErrorCode`.
- Antes de editar `convex/`, leer `convex/_generated/ai/guidelines.md`.

---

## 4. Esquema (`convex/schema.ts`)

- **Respetar el esquema:** No modifiques `convex/schema.ts` sin validar el impacto en producción (ej. índices requeridos, compatibilidad hacia atrás).
