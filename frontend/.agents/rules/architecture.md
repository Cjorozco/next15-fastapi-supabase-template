# Ecosistemas Platform — Reglas de Arquitectura

> **Ámbito:** Toda la aplicación (Frontend, Backend, Dominios y Esquema).
> **Descripción:** Arquitectura general, límites del MVP y reglas de negocio no negociables de Ecosistemas Platform.

Este proyecto tiene un documento de arquitectura completo en [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (raíz del repo).
**Léelo antes de proponer cualquier tabla, mutation, query o componente nuevo.**

---

## 1. No negociable

1. **No inventes dominios ni tablas nuevas:** El schema tiene 8 tablas de negocio (`users`, `clients`, `scheduledVisits`, `collections`, `buyers`, `sales`, `trainings`, y certificados como función sin tabla). Si una tarea parece necesitar una tabla nueva, detente y pregunta — no la crees.
2. **No implementes nada de la lista "Fuera de alcance" del MVP** sin que el usuario lo apruebe explícitamente en esa conversación:
   - Facturación electrónica
   - Contabilidad, pagos, cuentas por pagar
   - Portal para clientes
   - App móvil nativa
   - Optimización de rutas y mapas
   - Reportes avanzados, exportaciones, ranking de litros por cliente
   - Notificaciones automáticas
   - Roles más allá de admin/operador
   - Inventario de pimpinas
   - IA / analítica predictiva
   - Dashboard completo (gráficas, históricos, filtros)
3. **Toda regla de negocio vive en Convex (`convex/`), nunca solo en componentes React:** Los componentes de UI son tontos: reciben datos y disparan mutations, no deciden precios, permisos ni cálculos.
4. **Autorización siempre server-side:** Toda mutation y query sensible debe llamar a `requireAdmin(ctx)` o `requireAuthenticatedUser(ctx)` desde `convex/lib/authorization.ts`. Nunca confíes en el rol mostrado en el cliente para decidir si una acción es válida.
5. **Snapshot de precio es intocable:** `collections.pricePerLiterApplied` se copia de `clients.currentPricePerLiter` UNA SOLA VEZ, al momento de crear la recolección. Nunca se vuelve a leer del cliente después. Editar el precio de un cliente jamás debe alterar recolecciones ya registradas.
6. **`sales` no tiene vínculo transaccional a `collections`:** No agregues un campo `collectionIds` o similar a `sales` — el negocio no distingue qué recolecciones componen cada venta. La trazabilidad es por ventana de tiempo, calculada en query (ver `sales/queries.ts::salePeriodSummary`), no almacenada.
7. **Sin sobreingeniería:** No propongas patrones, abstracciones o capas (factories, repositorios genéricos, event sourcing, etc.) que el MVP no necesita. Preferir siempre la solución más simple que resuelva el problema real.

---

## 2. Estructura por Dominio

Organización por dominio de negocio, no por tipo de archivo:

```text
convex/{dominio}/mutations.ts
convex/{dominio}/queries.ts
domains/{dominio}/components/
domains/{dominio}/hooks/
```

- **Dominios válidos:** `clients`, `schedule`, `collections`, `buyers`, `sales`, `dashboard`, `certificates`, `trainings`, `auth`, `users`.
- **Código compartido (`shared/`):** Exclusivamente código genérico sin conocimiento de negocio (botones, inputs base, formateo de fecha/moneda). Si un componente conoce el nombre de un campo de negocio (`pricePerLiter`, `netWeightKg`, etc.), pertenece a su respectivo `domains/{dominio}/`.

---

## 3. Matriz de Roles y Permisos

| Acción | Admin | Operador |
|---|---|---|
| Crear/editar cliente y precio | ✅ | ❌ |
| Programar/registrar recolección | ✅ | ✅ |
| Registrar capacitación y generar su PDF | ✅ | ✅ |
| Generar certificado | ✅ | ✅ |
| Registrar venta de lote | ✅ | ❌ |
| Ver historial / dashboard | ✅ | ✅ |

---

## 4. Cuando algo no está claro

Si una tarea no está cubierta en [`ARCHITECTURE.md`](../../ARCHITECTURE.md) y no es obvia a partir de estos principios, **pregunta antes de improvisar**. No asumas alcance nuevo ni inventes reglas de negocio que no se hayan confirmado con el cliente real (Ecosistemas y Medio Ambiente / Juan Carlos Medina Solano).
