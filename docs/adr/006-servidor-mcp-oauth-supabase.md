# ADR 006: Servidor MCP remoto con OAuth 2.1 de Supabase Auth

- **Estado:** Aceptado
- **Fecha:** 2026-11-22
- **Decisores:** Mantenedor del repositorio
- **Origen:** [handoff del encargo](../handoffs/handoff-mcp-project-manager.md)

## Contexto

El objetivo era operar las tareas desde el chat de Claude (por ejemplo, "qué tengo hoy" o "crea el proyecto X con estas tareas") sin hacerlo a mano. Claude se conecta a servicios externos mediante conectores MCP remotos. El encargo pedía una sola fuente de verdad (las mismas queries y mutations de Convex), ninguna clave en el repositorio, una fase de solo lectura y, después, escritura sin borrado.

## Decisión

### Endpoint

- `POST /api/mcp` en Next.js (Vercel), con `mcp-handler` 2.x y `@modelcontextprotocol/server` 2.x (Streamable HTTP, sin estado).
- **Lectura:** `listar_proyectos`, `listar_tareas` (filtros por proyecto, estado y `hoy`/`semana`, en páginas de 200) y `obtener_tarea`.
- **Escritura:** `crear_proyecto` (con tareas opcionales en una sola operación), `crear_tarea` y `mover_tarea`. Cada una devuelve un resumen de lo que hizo para que el usuario lo confirme. **No hay borrado.**
- Las herramientas llaman a las queries y mutations de la app (`projects.list`, `projects.create`, `projects.createWithTasks`, `tasks.create`, `tasks.updateTask`) y a una query nueva, `tasks.get`, protegida con `requireProjectOwner`. Los filtros de fecha reutilizan `buildTodayTasks` y `buildWeekTasks`, así que "hoy" coincide con la vista Hoy (ADR 005).

### Autenticación: OAuth 2.1 con Supabase Auth

- Supabase Auth actúa como servidor de autorización: su servidor OAuth 2.1 tiene registro dinámico de clientes y la pantalla de consentimiento es `/oauth/consent` en la app.
- Sin token, `/api/mcp` responde `401` con `resource_metadata`, que apunta a `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728, `resource` = `<origen>/api/mcp`).
- El MCP verifica el JWT (JWKS ES256, emisor y `aud: authenticated`) y **lo reenvía a Convex**. Cada consulta corre como el usuario que aprobó la conexión, con la misma autorización que la app (ADR 001). No hay secretos propios del MCP.
- El login y el proxy vuelven a la ruta de origen con un redirect interno validado (`safeRedirectPath`).

### Alternativa descartada: token fijo y usuario fijo

La primera versión (#49, commit inicial) usaba un `Authorization: Bearer` fijo, un secreto compartido entre Vercel y Convex, y queries que actuaban como un usuario configurado por variable de entorno. Se reemplazó antes de publicar por tres motivos:

1. Las cabeceras fijas de los conectores de Claude están en beta y no todas las cuentas las tienen.
2. Duplicaba la autorización: había queries paralelas (`convex/mcp.ts`) en lugar de las de la app.
3. Necesitaba dos secretos y un usuario fijo, que había que rotar y mantener.

## Consecuencias

- **Positivas:** cero secretos nuevos; una sola fuente de verdad para datos y autorización; multiusuario sin trabajo extra; el usuario aprueba y revoca el acceso desde Supabase.
- **Alcance del token:** vale para todo lo que el usuario puede hacer en Convex, no solo para lo que expone el MCP. Lo que limita es el MCP, que no ofrece borrado ni edición de otros campos. Si hiciera falta acotarlo en el servidor, el JWT trae `client_id`.
- **Cambios de alcance:** los scopes de Supabase son genéricos y no separan lectura de escritura. Cuando cambie lo que puede hacer el MCP, hay que actualizar el texto de `/oauth/consent`, revocar la autorización y volver a conectar (se hizo al publicar la fase 2).
- **Dependencia en beta:** el servidor OAuth 2.1 de Supabase está en beta.
- **`crear_tarea`** usa dos mutations (crear, y luego fecha y estado). Si la segunda falla, la tarea queda creada y el resumen lo avisa. Un reintento puede duplicarla.
- **Zona horaria:** las fechas `YYYY-MM-DD` se guardan a medianoche de Bogotá. El filtro `semana` hereda la limitación de `/week` descrita en el ADR 005.

## Enmiendas

### 2026-11-22: editar y cambiar el estado de proyectos

A partir del [segundo handoff](../handoffs/handoff-mcp-proyectos-estado.md) se añaden `editar_proyecto` (nombre y/o descripción) y `cambiar_estado_proyecto` (`activo` / `en_pausa` / `completado`). Las dos reutilizan `projects.updateProject`, la mutation del diálogo de edición de la app, que ya valida dueño, nombre vacío o repetido y longitudes. Cada una lee antes el proyecto con `projects.get` y devuelve el id y los valores antes → después. Siguen sin existir el borrado y la edición de prioridad o fecha de proyectos.

Como cambia el alcance, se actualiza el texto de `/oauth/consent` y hay que revocar la autorización y reconectar al publicar, según las consecuencias de arriba.

### 2026-11-22: editar tareas

A partir del [encargo de `editar_tarea`](../handoffs/handoff-mcp-editar-tarea.md) se añade `editar_tarea`, que reutiliza `tasks.updateTask` (la mutation del formulario de edición). Edita título, estado, prioridad, fecha límite o su ausencia, repetición, horas estimadas y notas, y mueve la tarea a otro proyecto. Solo envía los campos recibidos y devuelve cada cambio como "campo: antes → después". Las reglas de la app (reapertura de repetitivas, lunes a viernes fuera del fin de semana) se aplican igual que en la UI. No edita subtareas ni borra. La "fecha de fin de repetición" pedida en el encargo no existe en el modelo y quedó fuera; añadirla exigiría un campo nuevo y un proceso que la aplique.

Cambia el alcance, así que se actualiza `/oauth/consent` y hay que revocar y reconectar al publicar.
