import {
  PROJECT_STATUS_LABELS,
  resolveProjectStatus,
  type ProjectStatus,
} from '@/convex/lib/projectFields';
import { MAX_TASKS_PER_REQUEST, type TaskPriority, type TaskStatus } from '@/convex/lib/taskFields';
import { dayKey } from '@/domains/tasks/lib/timezone';

/**
 * Helpers for the MCP write tools (phase 2). Pure functions: the route calls the existing
 * Convex mutations and uses these to translate input and to write the summary the user
 * reads to confirm what happened.
 */

/** Offset of `APP_TIME_ZONE` (America/Bogota, UTC-5, no daylight saving), as `getTimezoneOffset()`. */
export const APP_TZ_OFFSET_MINUTES = 300;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Midnight in Bogotá of a `YYYY-MM-DD` day, the same instant the app's date picker stores
 * for that day. Null when the value is not a real calendar date.
 */
export function bogotaMidnight(value: string): number | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const timestamp = Date.UTC(year, month - 1, day, APP_TZ_OFFSET_MINUTES / 60);
  return dayKey(timestamp) === value ? timestamp : null;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'pendiente',
  en_progreso: 'en progreso',
  completada: 'completada',
};

export interface NewTaskInput {
  titulo: string;
  fecha?: string;
  prioridad?: TaskPriority;
}

/** Tasks for `projects.createWithTasks`, or the reason they cannot be created. */
export function toProjectTasks(
  tareas: readonly NewTaskInput[]
):
  | { ok: true; tasks: { title: string; position: number; dueDate?: number; priority?: TaskPriority }[] }
  | { ok: false; error: string } {
  if (tareas.length > MAX_TASKS_PER_REQUEST) {
    return { ok: false, error: `Como máximo ${MAX_TASKS_PER_REQUEST} tareas por proyecto en una llamada.` };
  }
  const tasks = [];
  for (const [index, tarea] of tareas.entries()) {
    let dueDate: number | undefined;
    if (tarea.fecha) {
      const parsed = bogotaMidnight(tarea.fecha);
      if (parsed === null) {
        return { ok: false, error: `Fecha no válida en «${tarea.titulo}»: ${tarea.fecha}. Usa YYYY-MM-DD.` };
      }
      dueDate = parsed;
    }
    tasks.push({
      title: tarea.titulo,
      position: index,
      ...(dueDate !== undefined ? { dueDate } : {}),
      ...(tarea.prioridad ? { priority: tarea.prioridad } : {}),
    });
  }
  return { ok: true, tasks };
}

interface TaskLike {
  title: string;
  status: TaskStatus;
  dueDate?: number;
  priority?: TaskPriority;
  recurrence?: string;
}

/** «Leer capítulo 3» (pendiente, 2026-11-25, prioridad alta) */
export function describeTask(task: TaskLike): string {
  const parts: string[] = [STATUS_LABEL[task.status]];
  if (task.dueDate !== undefined) parts.push(dayKey(task.dueDate));
  if (task.priority) parts.push(`prioridad ${task.priority}`);
  if (task.recurrence) parts.push(`se repite: ${task.recurrence}`);
  return `«${task.title}» (${parts.join(', ')})`;
}

export function summarizeCreatedProject(project: {
  name: string;
  description?: string;
  tasks: readonly TaskLike[];
}): string {
  const lines = [`Creado el proyecto «${project.name}».`];
  if (project.description) lines.push(`Descripción: ${project.description}`);
  if (project.tasks.length > 0) {
    lines.push(`Con ${project.tasks.length} tarea(s):`);
    for (const task of project.tasks) lines.push(`- ${describeTask(task)}`);
  }
  return lines.join('\n');
}

/**
 * Summary of a status change. A recurring task marked as completed reopens right away with
 * its next date, so it reads "pendiente" again: say so instead of looking like a failure.
 */
export function summarizeMovedTask(
  before: TaskLike,
  after: TaskLike,
  requested: TaskStatus,
  projectName: string
): string {
  const where = `en «${projectName}»`;
  if (requested === 'completada' && before.recurrence && after.status !== 'completada') {
    const next = after.dueDate !== undefined ? ` La próxima es el ${dayKey(after.dueDate)}.` : '';
    return `Hecha la repetición de «${after.title}» ${where}; al ser repetitiva sigue abierta.${next}`;
  }
  if (before.status === after.status) {
    return `«${after.title}» ${where} ya estaba ${STATUS_LABEL[after.status]}; no cambió nada.`;
  }
  return `«${after.title}» ${where}: ${STATUS_LABEL[before.status]} → ${STATUS_LABEL[after.status]}.`;
}

interface ProjectLike {
  _id: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
}

const quoteOrEmpty = (value: string | undefined) => (value ? `«${value}»` : '(vacía)');

/** What `editar_proyecto` changed: id plus each field before → after, or that nothing changed. */
export function summarizeEditedProject(before: ProjectLike, after: ProjectLike): string {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`nombre: «${before.name}» → «${after.name}»`);
  if ((before.description ?? '') !== (after.description ?? '')) {
    changes.push(
      `descripción: ${quoteOrEmpty(before.description)} → ${quoteOrEmpty(after.description)}`
    );
  }
  if (changes.length === 0) {
    return `Proyecto «${after.name}» (id ${after._id}): no cambió nada, ya tenía esos datos.`;
  }
  return [`Proyecto «${after.name}» (id ${after._id}) actualizado:`, ...changes.map((c) => `- ${c}`)].join(
    '\n'
  );
}

/** What `cambiar_estado_proyecto` changed: id, name and status before → after. */
export function summarizeProjectStatus(before: ProjectLike, after: ProjectLike): string {
  const from = resolveProjectStatus(before);
  const to = resolveProjectStatus(after);
  const head = `Proyecto «${after.name}» (id ${after._id})`;
  if (from === to) return `${head} ya estaba ${PROJECT_STATUS_LABELS[to].toLowerCase()}; no cambió nada.`;
  return `${head}: ${PROJECT_STATUS_LABELS[from].toLowerCase()} → ${PROJECT_STATUS_LABELS[to].toLowerCase()}.`;
}
