import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { MCP_RESOURCE_METADATA_PATH } from '@/domains/mcp/lib/resource';
import { verifySupabaseToken } from '@/domains/mcp/lib/supabaseToken';
import { filterTasks, summarizeProjects, summarizeTask } from '@/domains/mcp/lib/tools';
import {
  APP_TZ_OFFSET_MINUTES,
  bogotaMidnight,
  describeTask,
  summarizeCreatedProject,
  summarizeMovedTask,
  toProjectTasks,
} from '@/domains/mcp/lib/writes';
import { mapErrorToUserMessage } from '@/shared/lib/userFacingError';

/**
 * Remote MCP server: reads (phase 1) and creates/moves without deleting (phase 2). Auth is OAuth 2.1 with Supabase Auth as the authorization
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

/** Plain-text result: write tools answer with a summary the user reads to confirm. */
const text = (message: string) => ({ content: [{ type: 'text' as const, text: message }] });

/** Error for a failed write, with the domain reason when Convex gives one. */
const writeFailure = (action: string, error: unknown) =>
  failure(`${action}: ${mapErrorToUserMessage(error, 'error inesperado, no se guardó nada.')}`);

const STATUS = z.enum(['pendiente', 'en_progreso', 'completada']);
const PRIORITY = z.enum(['baja', 'media', 'alta']);
const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Fecha límite YYYY-MM-DD (hora de Bogotá)');

/** Writes create or change data but never delete it. */
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

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

    server.registerTool(
      'crear_proyecto',
      {
        title: 'Crear proyecto',
        description:
          'Crea un proyecto (activo) con nombre y descripción opcional. Con "tareas" crea también sus tareas en la misma operación: o se crea todo o nada. Devuelve un resumen de lo creado para que el usuario lo confirme. No borra nada.',
        inputSchema: z.object({
          nombre: z.string().trim().min(1).max(100),
          descripcion: z.string().trim().max(1000).optional(),
          tareas: z
            .array(
              z.object({
                titulo: z.string().trim().min(1).max(200),
                fecha: DATE.optional(),
                prioridad: PRIORITY.optional(),
              })
            )
            .max(50)
            .optional()
            .describe('Tareas iniciales, en orden'),
        }),
        annotations: WRITE,
      },
      async ({ nombre, descripcion, tareas }, ctx) => {
        const action = `No se creó el proyecto «${nombre}»`;
        const converted = toProjectTasks(tareas ?? []);
        if (!converted.ok) return failure(`${action}: ${converted.error}`);
        try {
          const convex = convexFor(ctx.http?.authInfo);
          const existing = await convex.query(api.projects.list, {});
          if (existing.some((project) => project.name === nombre)) {
            return failure(`${action}: ya tienes un proyecto con ese nombre.`);
          }
          const project =
            converted.tasks.length > 0
              ? await convex.mutation(api.projects.createWithTasks, {
                  name: nombre,
                  description: descripcion,
                  tasks: converted.tasks,
                })
              : await convex.mutation(api.projects.create, {
                  name: nombre,
                  description: descripcion,
                });
          return text(`${summarizeCreatedProject(project)}\nId del proyecto: ${project._id}`);
        } catch (error) {
          return writeFailure(action, error);
        }
      }
    );

    server.registerTool(
      'crear_tarea',
      {
        title: 'Crear tarea',
        description:
          'Crea una tarea al final de un proyecto, con fecha límite y estado opcionales (por defecto pendiente). Devuelve un resumen de lo creado para que el usuario lo confirme. No borra nada.',
        inputSchema: z.object({
          titulo: z.string().trim().min(1).max(200),
          proyecto_id: z.string().min(1).describe('Id de un proyecto (de listar_proyectos)'),
          fecha: DATE.optional(),
          estado: STATUS.optional(),
        }),
        annotations: WRITE,
      },
      async ({ titulo, proyecto_id, fecha, estado }, ctx) => {
        const action = `No se creó la tarea «${titulo}»`;
        const dueDate = fecha ? bogotaMidnight(fecha) : undefined;
        if (dueDate === null) {
          return failure(`${action}: fecha no válida (${fecha}). Usa YYYY-MM-DD.`);
        }

        let convex: ConvexHttpClient;
        let taskId: Id<'tasks'>;
        try {
          convex = convexFor(ctx.http?.authInfo);
          const created = await convex.mutation(api.tasks.create, {
            projectId: proyecto_id as Id<'projects'>,
            title: titulo,
          });
          taskId = created._id;
        } catch (error) {
          return writeFailure(action, error);
        }

        // Second step: date and status go through the same mutation as the app's editor.
        const setStatus = estado && estado !== 'pendiente' ? estado : undefined;
        let warning = '';
        if (dueDate !== undefined || setStatus) {
          try {
            await convex.mutation(api.tasks.updateTask, {
              taskId,
              ...(dueDate !== undefined ? { dueDate } : {}),
              ...(setStatus ? { status: setStatus } : {}),
              tzOffsetMinutes: APP_TZ_OFFSET_MINUTES,
            });
          } catch (error) {
            warning = `\nAviso: la tarea se creó, pero no se pudo poner la fecha o el estado (${mapErrorToUserMessage(error)}).`;
          }
        }

        try {
          const result = await convex.query(api.tasks.get, { taskId });
          if (!result) return text(`Tarea creada (id ${taskId}).${warning}`);
          return text(
            `Creada la tarea ${describeTask(result.task)} en «${result.project.name}».\nId de la tarea: ${taskId}${warning}`
          );
        } catch {
          return text(`Tarea creada (id ${taskId}).${warning}`);
        }
      }
    );

    server.registerTool(
      'mover_tarea',
      {
        title: 'Mover tarea',
        description:
          'Cambia el estado de una tarea (pendiente, en_progreso, completada). Una tarea repetitiva marcada como completada se reabre con su próxima fecha, como en la app. Devuelve un resumen del cambio para que el usuario lo confirme. No borra nada.',
        inputSchema: z.object({
          tarea_id: z.string().min(1).describe('Id de una tarea (de listar_tareas)'),
          estado: STATUS,
        }),
        annotations: WRITE,
      },
      async ({ tarea_id, estado }, ctx) => {
        const action = 'No se cambió la tarea';
        try {
          const convex = convexFor(ctx.http?.authInfo);
          const taskId = tarea_id as Id<'tasks'>;
          const before = await convex.query(api.tasks.get, { taskId });
          if (!before) return failure(`${action}: tarea no encontrada.`);
          const after = await convex.mutation(api.tasks.updateTask, {
            taskId,
            status: estado,
            tzOffsetMinutes: APP_TZ_OFFSET_MINUTES,
          });
          return text(summarizeMovedTask(before.task, after, estado, before.project.name));
        } catch (error) {
          return writeFailure(action, error);
        }
      }
    );
  },
  { serverInfo: { name: 'project-manager', version: '1.2.0' } }
);

const handler = withMcpAuth(mcpHandler, (_req, token) => verifySupabaseToken(token), {
  required: true,
  // RFC 9728 path-suffixed form: its `resource` comes out as `<origin>/api/mcp`, which
  // must equal the URL entered in Claude exactly.
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export { handler as GET, handler as POST, handler as DELETE };
