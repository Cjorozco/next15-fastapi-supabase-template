# Convenciones de Código Convex

> **Ámbito:** Backend (`convex/**/*.ts`).
> **Descripción:** Convenciones técnicas, estructura y reglas de seguridad para código backend en Convex.

---

## 1. Mutations

- **Autorización al inicio:** Toda mutation que requiera un usuario autenticado empieza validando permisos con `requireAuthenticatedUser(ctx)` desde `convex/lib/authorization.ts`:
  ```typescript
  import { mutation } from '../_generated/server';
  import { requireAuthenticatedUser } from '../lib/authorization';
  import { DomainException, DomainErrorCode } from '../lib/errors';

  export const miMutation = mutation({
    args: { ... },
    handler: async (ctx, args) => {
      const user = await requireAuthenticatedUser(ctx);
      // ... resto de la lógica
    },
  });
  ```
- **Errores estructurados:** Usa `DomainException(DomainErrorCode.CODIGO, "mensaje descriptivo")` en lugar de `Error` genérico.
- **Cálculos y ordenamiento en el backend:** Posiciones de tareas (`position`) y estados derivados se manejan o validan en el servidor.
- **Cascada de eliminación:** Al eliminar un proyecto, eliminar también todas sus tareas asociadas (`tasks.by_project`).

---

## 2. Queries

- **Indexación eficiente:** Usa siempre `.withIndex()` (ej. `by_owner`, `by_project`, `by_token`). Evita `.filter()` sobre `.collect()` completo salvo colecciones muy pequeñas sin índice.
- **Protección de datos:** Las queries de datos privados validan la sesión con `requireAuthenticatedUser(ctx)` y filtran por el `ownerId` del usuario.

---

## 3. Organización de Archivos

- **Separación por dominio:** Una carpeta `convex/{dominio}/` con `mutations.ts` y `queries.ts` separados. No mezclar mutations y queries en el mismo archivo.
- **Librería común (`convex/lib/`):** Utilidades reutilizables:
  - `authorization.ts`: helpers `requireAuthenticatedUser`.
  - `errors.ts`: clase `DomainException` y enum `DomainErrorCode`.

---

## 4. Esquema (`convex/schema.ts`)

- **Respetar el esquema:** No modifiques `convex/schema.ts` sin validar el impacto en producción (ej. índices requeridos, compatibilidad hacia atrás).
