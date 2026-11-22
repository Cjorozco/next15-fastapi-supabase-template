# Handoff: exponer el Project Manager SaaS como servidor MCP

> **Documento histórico:** es el encargo original (22 nov 2026), guardado como referencia y sin reescribir. Se implementó en Cjorozco/next15-fastapi-supabase-template#49 (fase 1) y #51 (fase 2). Lo que cambió respecto a este texto está en [ADR 006](../adr/006-servidor-mcp-oauth-supabase.md); el principal cambio es que la autenticación no usa un token fijo sino **OAuth 2.1 con Supabase Auth**. El estado actual está en `frontend/README.md`, sección "Servidor MCP".

Proyecto destino: Project Manager SaaS (Next.js 16 + Convex, desplegado en Vercel). Repo: project-manager-web.
Ejecutor: Claude Code, en el repo del proyecto.
Origen: decisión de José en el proyecto Rumbo (22 nov 2026).

## Objetivo

Que Claude (chat) pueda leer y operar las tareas de la app mediante un servidor MCP remoto, para no hacerlo a mano. Ejemplo de uso: "crea el proyecto AI Engineer con estas tareas" o "qué tengo hoy".

Esto NO incluye que Claude edite el código del repo. El MCP expone datos (proyectos, tareas, fechas, estados), no el código.

## Reglas de trabajo

1. Antes de tocar código, inspecciona el repo y propone un plan corto: qué archivos se crean, qué funciones de Convex se reutilizan y qué cambia en Vercel. Espera confirmación de José.
2. No dupliques lógica: el MCP llama a las mismas funciones (queries y mutations) de Convex que ya usa la app. Una sola fuente de verdad.
3. Ninguna clave, token ni URL privada va al repositorio. Usa variables de entorno en Vercel y en `.env.local`, y revisa que estén en `.gitignore`.
4. Fase 1 solo lectura. La escritura (crear y mover tareas) entra en la fase 2, tras probar la lectura.

## Fase 1: lectura (entregable mínimo)

Herramientas MCP a exponer:

- `listar_proyectos`: nombre, id, estado.
- `listar_tareas`: filtros por proyecto, estado y fecha (hoy, esta semana).
- `obtener_tarea`: detalle de una tarea por id.

Criterios de aceptación:

- Endpoint MCP remoto por HTTPS, protegido con un token de acceso.
- Sin token válido, responde 401 y no devuelve datos.
- José lo conecta en Claude como conector personalizado (verificar en la documentación vigente de Claude cómo se agregan conectores remotos).
- Desde el chat, Claude lista las tareas de hoy sin errores.

## Fase 2: escritura (solo después de la fase 1)

Herramientas adicionales:

- `crear_proyecto`: nombre y descripción.
- `crear_tarea`: título, proyecto, fecha, estado.
- `mover_tarea`: cambia el estado.

Reglas:

- Cada escritura devuelve un resumen de lo que hizo, para que José lo confirme.
- Sin borrado en esta fase.

Caso de prueba de fase 2: crear el proyecto "AI Engineer (estudio)" con sus tareas, con fechas.

## Entregables

- Código del endpoint MCP y las herramientas de la fase 1.
- Nota corta en el README: cómo generar el token, cómo conectarlo en Claude, qué expone y qué no.
- Lista de lo que NO expone (código, claves, datos de otros usuarios).
- Si la fase 2 queda lista, marcar cada herramienta de escritura con su criterio de confirmación.

## Preguntas que Claude Code debe responder primero (leyendo el repo)

- ¿Cómo está modelado un proyecto y una tarea en Convex? ¿Hay campo de fecha?
- ¿Hay autenticación de usuario? ¿Qué usuario representa el token del MCP?
- ¿Qué versión del SDK de MCP para TypeScript es compatible con Next.js 16?
