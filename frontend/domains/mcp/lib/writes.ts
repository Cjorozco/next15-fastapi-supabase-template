import {
  PROJECT_STATUS_LABELS,
  resolveProjectStatus,
  type ProjectStatus,
} from '@/convex/lib/projectFields';
import {
  MAX_TASKS_PER_REQUEST,
  TASK_RECURRENCE_SHORT_LABELS,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
} from '@/convex/lib/taskFields';
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

interface EditableTask {
  _id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number;
  noDeadline?: boolean;
  recurrence?: TaskRecurrence;
  estimatedHours?: number;
  notes?: string;
}

const orNone = (value: string | undefined, none: string) => value ?? none;
const recurrenceLabel = (value: TaskRecurrence | undefined) =>
  value ? TASK_RECURRENCE_SHORT_LABELS[value] : 'sin repetición';
const hoursLabel = (value: number | undefined) => (value === undefined ? 'sin estimar' : `${value} h`);
const notesLabel = (value: string | undefined) =>
  value ? `«${value.length > 80 ? `${value.slice(0, 77)}...` : value}»` : '(vacías)';

/**
 * What `editar_tarea` changed: id, title and one "campo: antes → después" line per field
 * that differs. `requested` lists the fields the caller sent, so a change the app made on
 * its own (e.g. a Monday to Friday date moved off a weekend, or a recurring task reopened)
 * is flagged instead of looking like what was asked.
 */
export function summarizeEditedTask(
  before: EditableTask,
  after: EditableTask,
  projects: { before: string; after: string }
): string {
  const changes: string[] = [];
  // `changed` compares the raw values: labels may be truncated (notes) and equal labels
  // must not hide a real change.
  const add = (field: string, from: string, to: string, changed = from !== to) => {
    if (changed) changes.push(`${field}: ${from} → ${to}`);
  };
  add('título', `«${before.title}»`, `«${after.title}»`);
  add('estado', STATUS_LABEL[before.status], STATUS_LABEL[after.status]);
  add('prioridad', orNone(before.priority, 'sin prioridad'), orNone(after.priority, 'sin prioridad'));
  add(
    'fecha',
    before.dueDate === undefined ? (before.noDeadline ? 'sin fecha límite' : 'sin fecha') : dayKey(before.dueDate),
    after.dueDate === undefined ? (after.noDeadline ? 'sin fecha límite' : 'sin fecha') : dayKey(after.dueDate)
  );
  add('repetición', recurrenceLabel(before.recurrence), recurrenceLabel(after.recurrence));
  add('horas estimadas', hoursLabel(before.estimatedHours), hoursLabel(after.estimatedHours));
  add('notas', notesLabel(before.notes), notesLabel(after.notes), (before.notes ?? '') !== (after.notes ?? ''));
  add('proyecto', `«${projects.before}»`, `«${projects.after}»`);

  const head = `Tarea «${after.title}» (id ${after._id})`;
  if (changes.length === 0) return `${head}: no cambió nada, ya tenía esos datos.`;
  return [`${head} actualizada:`, ...changes.map((change) => `- ${change}`)].join('\n');
}

interface SubtaskLike {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface TaskWithSubtasks {
  _id: string;
  title: string;
  status: TaskStatus;
  dueDate?: number;
  subtasks?: readonly SubtaskLike[];
}

const doneLabel = (value: boolean) => (value ? 'completada' : 'pendiente');
const dateLabel = (value: number | undefined) => (value === undefined ? 'sin fecha' : dayKey(value));

/**
 * Changes the parent task took on its own after a subtask write (completing the last
 * subtask completes the task, adding one reopens it, a recurring task moves to its next
 * date). Flagged so they are not mistaken for what was asked.
 */
function parentTaskChanges(before: TaskWithSubtasks, after: TaskWithSubtasks): string[] {
  const changes: string[] = [];
  if (before.status !== after.status) {
    changes.push(`estado de la tarea: ${STATUS_LABEL[before.status]} → ${STATUS_LABEL[after.status]}`);
  }
  if (before.dueDate !== after.dueDate) {
    changes.push(`fecha de la tarea: ${dateLabel(before.dueDate)} → ${dateLabel(after.dueDate)}`);
  }
  return changes.map((change) => `${change} (lo aplica la app)`);
}

const withList = (head: string, lines: string[]) =>
  lines.length === 0 ? head : [head, ...lines.map((line) => `- ${line}`)].join('\n');

/** What `crear_subtarea` added: the new subtask with its id and position. */
export function summarizeCreatedSubtask(before: TaskWithSubtasks, after: TaskWithSubtasks): string {
  const known = new Set((before.subtasks ?? []).map((subtask) => subtask.id));
  const subtasks = after.subtasks ?? [];
  const index = subtasks.findIndex((subtask) => !known.has(subtask.id));
  if (index === -1) return `Tarea «${after.title}» (id ${after._id}): no se añadió ninguna subtarea.`;
  const created = subtasks[index];
  return withList(
    `Creada la subtarea «${created.title}» (id ${created.id}) en la tarea «${after.title}» (id ${after._id}), posición ${index + 1} de ${subtasks.length}.`,
    parentTaskChanges(before, after)
  );
}

/** What `editar_subtarea` changed: "campo: antes → después" per field, or that nothing changed. */
export function summarizeEditedSubtask(
  before: TaskWithSubtasks,
  after: TaskWithSubtasks,
  subtaskId: string
): string {
  const from = before.subtasks?.find((subtask) => subtask.id === subtaskId);
  const to = after.subtasks?.find((subtask) => subtask.id === subtaskId);
  if (!from || !to) return `Subtarea ${subtaskId}: no encontrada en la tarea «${after.title}».`;
  const changes: string[] = [];
  if (from.title !== to.title) changes.push(`título: «${from.title}» → «${to.title}»`);
  if (from.isCompleted !== to.isCompleted) {
    changes.push(`estado: ${doneLabel(from.isCompleted)} → ${doneLabel(to.isCompleted)}`);
  }
  const head = `Subtarea «${to.title}» (id ${to.id}) de la tarea «${after.title}»`;
  const parent = parentTaskChanges(before, after);
  if (changes.length === 0 && parent.length === 0) return `${head}: no cambió nada, ya tenía esos datos.`;
  return withList(`${head} actualizada:`, [...changes, ...parent]);
}

/** What `mover_subtarea` changed: position before → after and the resulting order. */
export function summarizeMovedSubtask(
  before: TaskWithSubtasks,
  after: TaskWithSubtasks,
  subtaskId: string
): string {
  const subtasks = after.subtasks ?? [];
  const from = (before.subtasks ?? []).findIndex((subtask) => subtask.id === subtaskId);
  const to = subtasks.findIndex((subtask) => subtask.id === subtaskId);
  if (from === -1 || to === -1) return `Subtarea ${subtaskId}: no encontrada en la tarea «${after.title}».`;
  const moved = subtasks[to];
  const head = `Subtarea «${moved.title}» (id ${moved.id}) de la tarea «${after.title}»`;
  if (from === to) return `${head} ya estaba en la posición ${to + 1} de ${subtasks.length}; no cambió nada.`;
  const order = subtasks.map((subtask, index) => `${index + 1}. ${subtask.title}`).join('\n');
  return `${head}: posición ${from + 1} → ${to + 1} (de ${subtasks.length}).\nOrden actual:\n${order}`;
}
