# Handoff: completar herramientas MCP de proyectos (renombrar y cambiar estado)

> **Documento histórico:** encargo original (22 nov 2026), guardado sin reescribir. Implementado en la rama `feat/mcp-editar-proyecto` (ver [ADR 006, enmienda del 2026-11-22](../adr/006-servidor-mcp-oauth-supabase.md#enmiendas)). Dos precisiones sobre el texto:
> - La fase 2 sí estaba publicada (`114d162`). Si un chat solo mostraba la lectura, era porque Claude conserva la lista de herramientas de cada conexión; en un chat nuevo aparecían todas.
> - No hay "token de acceso" fijo ni variables en Vercel: la autenticación es OAuth 2.1 con Supabase Auth. `ccr-local:8002` no aparece en el proyecto; el conector usa `https://project-manager-web-five.vercel.app/api/mcp`.

Proyecto destino: Project Manager SaaS (Next.js 16 + Convex, desplegado en Vercel). Repo: project-manager-web.
Ejecutor: Claude Code, en el repo del proyecto.
Origen: José, 22 nov 2026, desde el proyecto Rumbo.

## Contexto

La fase 1 (lectura) funciona: `listar_proyectos`, `listar_tareas` y `obtener_tarea` responden desde Claude.
La fase 2 quedó anunciada como publicada, pero desde el chat de Claude solo aparecen las herramientas de lectura.
Además, al reconectar el conector, el servidor intentó una dirección local (`ccr-local:8002`) en vez de la URL pública de producción.

## Objetivo

1. Verificar que el endpoint MCP de producción (URL pública HTTPS de Vercel) expone las herramientas de escritura: `crear_proyecto`, `crear_tarea`, `mover_tarea`. Si alguna falta, agrégala.
2. Agregar las herramientas que faltan para gestionar proyectos:
   - `editar_proyecto`: cambia nombre y/o descripción de un proyecto por id.
   - `cambiar_estado_proyecto`: cambia el estado a `activo`, `en_pausa` o `completado`.

## Reglas de trabajo

1. Antes de tocar código, inspecciona el repo y propone un plan corto. Espera confirmación de José.
2. Reutiliza las mutaciones de Convex que ya usa la app para editar proyectos y su estado. No dupliques lógica.
3. Mismo token de acceso que las herramientas actuales. Sin token válido, responde 401.
4. Cada escritura devuelve un resumen de lo que cambió (id, nombre o estado anterior y nuevo).
5. Sin borrado de proyectos. José borra a mano desde la app.
6. Ningún secreto va al repositorio. Variables de entorno en Vercel.

## Criterios de aceptación

- `tools/list` del endpoint de producción muestra: `listar_proyectos`, `listar_tareas`, `obtener_tarea`, `crear_proyecto`, `crear_tarea`, `mover_tarea`, `editar_proyecto`, `cambiar_estado_proyecto`.
- Probar en producción: renombrar un proyecto de prueba y cambiar su estado a `en_pausa` y de vuelta a `activo`. Mostrar el resumen de cada cambio.
- Desde un chat nuevo de Claude con el conector recién reconectado, las herramientas aparecen sin errores.
- En el README: qué expone cada herramienta y cuál es la URL de producción que debe usar el conector.

## Preguntas para responder primero

- ¿El despliegue de producción ya incluye `crear_proyecto`, `crear_tarea` y `mover_tarea`?
- ¿Qué URL pública tiene el endpoint MCP y dónde se configura en el conector de Claude?
- ¿Existe ya una mutación para editar nombre y estado de proyecto en Convex?
