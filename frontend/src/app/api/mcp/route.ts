import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { MCP_RESOURCE_METADATA_PATH } from '@/domains/mcp/lib/resource';
import { verifySupabaseToken } from '@/domains/mcp/lib/supabaseToken';
import { filterTasks, summarizeProjects, summarizeTask } from '@/domains/mcp/lib/tools';

/**
 * Remote MCP server, read only. Auth is OAuth 2.1 with Supabase Auth as the authorization
 * server: without a valid Supabase token the answer is 401 with a `resource_metadata`
 * pointer (`/.well-known/oauth-protected-resource`), which is how Claude finds where to
 * sign in. The token is then forwarded to Convex, so tools call the same queries as the
 * app (`projects.list`, `tasks.get`) as the user who approved the connection.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Convex client acting as the caller. One per request: the token is per user. */
function convexFor(authInfo: AuthInfo | undefined): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || !authInfo) throw new Error('MCP no configurado');
  const client = new ConvexHttpClient(url);
  client.setAuth(authInfo.token);
  return client;
}

const json = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

const failure = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'listar_proyectos',
      {
        title: 'Listar proyectos',
        description:
          'Lista los proyectos del usuario con id, nombre, estado (activo, en_pausa, completado), fecha límite y número de tareas pendientes.',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async (_args, ctx) => {
        try {
          const projects = await convexFor(ctx.http?.authInfo).query(api.projects.list, {});
          return json(summarizeProjects(projects));
        } catch {
          return failure('No se pudieron leer los proyectos.');
        }
      }
    );

    server.registerTool(
      'listar_tareas',
      {
        title: 'Listar tareas',
        description:
          'Lista tareas. fecha "hoy" devuelve lo mismo que la vista Hoy (vencidas y de hoy); "semana" las vencidas y las que vencen esta semana. Ambas solo incluyen tareas pendientes de proyectos activos. Sin fecha devuelve todas. Fechas en YYYY-MM-DD, hora de Bogotá. Devuelve hasta 200 por página: si la respuesta trae "siguiente", vuelve a llamar con desde = siguiente para ver el resto.',
        inputSchema: z.object({
          proyecto_id: z.string().optional().describe('Id de un proyecto (de listar_proyectos)'),
          estado: z.enum(['pendiente', 'en_progreso', 'completada']).optional(),
          fecha: z.enum(['hoy', 'semana']).optional(),
          desde: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Posición desde la que listar; usa el "siguiente" de la respuesta anterior'),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ proyecto_id, estado, fecha, desde }, ctx) => {
        try {
          const projects = await convexFor(ctx.http?.authInfo).query(api.projects.list, {});
          return json(
            filterTasks(projects, { proyectoId: proyecto_id, estado, fecha, desde }, Date.now())
          );
        } catch {
          return failure('No se pudieron leer las tareas.');
        }
      }
    );

    server.registerTool(
      'obtener_tarea',
      {
        title: 'Obtener tarea',
        description:
          'Detalle de una tarea por id: estado, prioridad, fecha, repetición, notas, horas estimadas y subtareas.',
        inputSchema: z.object({ tarea_id: z.string().min(1) }),
        annotations: { readOnlyHint: true },
      },
      async ({ tarea_id }, ctx) => {
        try {
          const result = await convexFor(ctx.http?.authInfo).query(api.tasks.get, {
            taskId: tarea_id as Id<'tasks'>,
          });
          if (!result) return failure('Tarea no encontrada.');
          const { task, project } = result;
          return json({
            ...summarizeTask(task, project),
            ...(task.notes ? { notas: task.notes } : {}),
            ...(task.estimatedHours !== undefined ? { horasEstimadas: task.estimatedHours } : {}),
            ...(task.noDeadline ? { sinFechaLimite: true } : {}),
            subtareas: (task.subtasks ?? []).map((s) => ({
              titulo: s.title,
              completada: s.isCompleted,
            })),
          });
        } catch {
          // An id that is not a task id also lands here (Convex rejects it).
          return failure('Tarea no encontrada.');
        }
      }
    );
  },
  { serverInfo: { name: 'project-manager', version: '1.1.0' } }
);

const handler = withMcpAuth(mcpHandler, (_req, token) => verifySupabaseToken(token), {
  required: true,
  // RFC 9728 path-suffixed form: its `resource` comes out as `<origin>/api/mcp`, which
  // must equal the URL entered in Claude exactly.
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export { handler as GET, handler as POST, handler as DELETE };
