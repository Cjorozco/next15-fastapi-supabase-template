import { createMcpHandler } from 'mcp-handler';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isValidBearer } from '@/domains/mcp/lib/accessToken';
import { filterTasks, summarizeProjects, summarizeTask } from '@/domains/mcp/lib/tools';

/**
 * Remote MCP server, read only (phase 1). Claude connects with
 * `Authorization: Bearer <MCP_ACCESS_TOKEN>`; without it the answer is 401 and Convex is
 * never called. Data comes from `convex/mcp.ts`, which acts as one fixed user.
 * Env (server only, never NEXT_PUBLIC): MCP_ACCESS_TOKEN, MCP_CONVEX_SECRET.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.MCP_CONVEX_SECRET;
  if (!url || !secret) throw new Error('MCP no configurado');
  return { client: new ConvexHttpClient(url), secret };
}

const json = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

const failure = (message: string) => ({
  content: [{ type: 'text' as const, text: message }],
  isError: true,
});

async function loadProjects() {
  const { client, secret } = convex();
  return await client.query(api.mcp.listProjects, { secret });
}

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
      async () => {
        try {
          return json(summarizeProjects(await loadProjects()));
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
      async ({ proyecto_id, estado, fecha, desde }) => {
        try {
          const projects = await loadProjects();
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
      async ({ tarea_id }) => {
        try {
          const { client, secret } = convex();
          const result = await client.query(api.mcp.getTask, {
            secret,
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
  { serverInfo: { name: 'project-manager', version: '1.0.0' } }
);

async function handler(request: Request): Promise<Response> {
  if (!isValidBearer(request.headers.get('authorization'), process.env.MCP_ACCESS_TOKEN)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
    });
  }
  return mcpHandler(request);
}

export { handler as GET, handler as POST, handler as DELETE };
