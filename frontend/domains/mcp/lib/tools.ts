import { resolveProjectStatus } from '@/convex/lib/projectFields';
import { resolveTaskStatus, type TaskStatus } from '@/convex/lib/taskFields';
import { dayKey } from '@/domains/tasks/lib/timezone';
import { buildTodayTasks } from '@/domains/tasks/lib/today';
import { buildWeekTasks } from '@/domains/tasks/lib/week';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';

/**
 * What the MCP tools return, built from the same data and the same rules as the app's
 * "Hoy" and "Esta semana" views. Pure functions: the route only fetches and serializes.
 */

/** Page size of `listar_tareas`, so one answer stays readable in a chat. */
export const MAX_LISTED_TASKS = 200;

export type DateFilter = 'hoy' | 'semana';

export interface TaskFilters {
  proyectoId?: string;
  estado?: TaskStatus;
  fecha?: DateFilter;
  /** Offset for the next page: pass the `siguiente` of the previous answer. */
  desde?: number;
}

export interface ProjectSummary {
  id: string;
  nombre: string;
  estado: string;
  fechaLimite?: string;
  tareasPendientes: number;
}

export interface TaskSummary {
  id: string;
  titulo: string;
  estado: TaskStatus;
  prioridad?: string;
  /** Calendar day `YYYY-MM-DD` in the app's time zone. */
  fecha?: string;
  repeticion?: string;
  proyecto: { id: string; nombre: string };
  /** Only with a date filter: "vencida", "hoy" or "esta_semana". */
  grupo?: string;
}

const day = (timestamp: number | undefined) =>
  timestamp === undefined ? undefined : dayKey(timestamp);

export function summarizeProjects(projects: readonly Project[]): ProjectSummary[] {
  return projects.map((project) => ({
    id: project._id,
    nombre: project.name,
    estado: resolveProjectStatus(project),
    ...(project.dueDate !== undefined ? { fechaLimite: day(project.dueDate) } : {}),
    tareasPendientes: project.tasks.filter((task) => resolveTaskStatus(task) !== 'completada')
      .length,
  }));
}

export function summarizeTask(
  task: Task,
  project: Pick<Project, '_id' | 'name'>,
  grupo?: string
): TaskSummary {
  return {
    id: task._id,
    titulo: task.title,
    estado: resolveTaskStatus(task),
    ...(task.priority ? { prioridad: task.priority } : {}),
    ...(task.dueDate !== undefined ? { fecha: day(task.dueDate) } : {}),
    ...(task.recurrence ? { repeticion: task.recurrence } : {}),
    proyecto: { id: project._id, nombre: project.name },
    ...(grupo ? { grupo } : {}),
  };
}

/**
 * Tasks matching the filters.
 * - `fecha: "hoy"`: exactly the "Hoy" view (overdue first, then today).
 * - `fecha: "semana"`: the "Esta semana" view limited to overdue and due this week.
 * - No `fecha`: every task of every project, in project and board order.
 * Date views only hold pending tasks of active projects, as in the app.
 */
export function filterTasks(
  projects: readonly Project[],
  filters: TaskFilters,
  now: number
): { tareas: TaskSummary[]; total: number; siguiente?: number } {
  const scoped = filters.proyectoId
    ? projects.filter((project) => project._id === filters.proyectoId)
    : projects;

  let items: TaskSummary[];
  if (filters.fecha === 'hoy') {
    items = buildTodayTasks(scoped, now).map(({ task, project, group }) =>
      summarizeTask(task, project, group)
    );
  } else if (filters.fecha === 'semana') {
    items = buildWeekTasks(scoped, now)
      .filter(({ bucket }) => bucket === 'vencida' || bucket === 'esta_semana')
      .map(({ task, project, bucket }) => summarizeTask(task, project, bucket));
  } else {
    items = scoped.flatMap((project) =>
      [...project.tasks]
        .sort((a, b) => a.position - b.position)
        .map((task) => summarizeTask(task, project))
    );
  }

  if (filters.estado) {
    items = items.filter((item) => item.estado === filters.estado);
  }
  const desde = Math.max(0, Math.floor(filters.desde ?? 0));
  const end = desde + MAX_LISTED_TASKS;
  return {
    tareas: items.slice(desde, end),
    total: items.length,
    ...(end < items.length ? { siguiente: end } : {}),
  };
}
