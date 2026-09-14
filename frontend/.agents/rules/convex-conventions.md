# Convenciones de Código Convex

> **Ámbito:** Backend (`convex/**/*.ts`, `convex/**/*.tsx`).
> **Descripción:** Convenciones técnicas, estructura y reglas de seguridad para código backend en Convex.

---

## 1. Mutations

- **Autorización al inicio:** Toda mutation empieza validando permisos antes de cualquier otra lógica:
  ```typescript
  export const miMutation = mutation({
    args: { ... },
    handler: async (ctx, args) => {
      const user = await requireAdmin(ctx); // o requireAuthenticatedUser(ctx)
      // ... resto de la lógica
    },
  });
  ```
- **Cálculos derivados en el backend:** Totales, valores y pesos netos se calculan **dentro de la mutation**, nunca se reciben como argumento desde el cliente. El frontend envía datos crudos (litros, peso bruto, peso pimpinas); Convex calcula y sella el resultado.
- **Desactivación lógica (Soft-delete):** Nunca borres registros con historial dependiente (`clients`, `buyers`). Usa `active: false` vía `.patch()`.

---

## 2. Queries

- **Indexación eficiente:** Usa siempre `.withIndex()`. Evita `.filter()` sobre `.collect()` completo salvo tablas muy pequeñas sin índice aplicable.
- **Protección de datos:** Toda query que devuelva datos sensibles o de negocio valida `requireAuthenticatedUser(ctx)` como mínimo.

---

## 3. Organización de Archivos

- **Separación por dominio:** Una carpeta `convex/{dominio}/` con `mutations.ts` y `queries.ts` separados. No mezclar mutations y queries en el mismo archivo.
- **Librería común (`convex/lib/`):** Funciones auxiliares compartidas entre dominios (autorización, cálculo de fechas, pesos) van en `convex/lib/`, evitando duplicación.

---

## 4. Esquema (`convex/schema.ts`)

- **Respetar el esquema:** No modifiques `convex/schema.ts` sin señalar explícitamente que es un cambio de schema y esperar confirmación del usuario. En producción, un campo nuevo con datos reales puede requerir un plan de migración.
