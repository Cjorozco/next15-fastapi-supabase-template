/**
 * Task status / priority helpers shared by Convex functions and the UI.
 *
 * Pure TypeScript (no Convex runtime imports) so the frontend can import it too.
 *
 * Compatibility rule: the boolean `isCompleted` is the historical source of truth.
 * `status` is optional in the database; when missing it is derived from the boolean.
 * Legacy English values written by the first demo seed ("todo" | "in_progress" |
 * "done", "low" | "medium" | "high") are still accepted on read until the
 * backfill migration has normalized every document.
 */

export const TASK_STATUSES = ["pendiente", "en_progreso", "completada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["baja", "media", "alta"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_RECURRENCES = ["diaria", "semanal"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  diaria: "Todos los días",
  semanal: "Todas las semanas",
};

export const LEGACY_TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type LegacyTaskStatus = (typeof LEGACY_TASK_STATUSES)[number];

export const LEGACY_TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type LegacyTaskPriority = (typeof LEGACY_TASK_PRIORITIES)[number];

const LEGACY_STATUS_MAP: Record<LegacyTaskStatus, TaskStatus> = {
  todo: "pendiente",
  in_progress: "en_progreso",
  done: "completada",
};

const LEGACY_PRIORITY_MAP: Record<LegacyTaskPriority, TaskPriority> = {
  low: "baja",
  medium: "media",
  high: "alta",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const MAX_TASK_TITLE_LENGTH = 200;
export const MAX_TASK_NOTES_LENGTH = 5000;
export const MAX_ESTIMATED_HOURS = 10000;
export const MAX_TASKS_PER_REQUEST = 50;

export function normalizeStatus(
  value: TaskStatus | LegacyTaskStatus | undefined
): TaskStatus | undefined {
  if (value === undefined) return undefined;
  return value in LEGACY_STATUS_MAP
    ? LEGACY_STATUS_MAP[value as LegacyTaskStatus]
    : (value as TaskStatus);
}

export function normalizePriority(
  value: TaskPriority | LegacyTaskPriority | undefined
): TaskPriority | undefined {
  if (value === undefined) return undefined;
  return value in LEGACY_PRIORITY_MAP
    ? LEGACY_PRIORITY_MAP[value as LegacyTaskPriority]
    : (value as TaskPriority);
}

interface StatusSource {
  isCompleted: boolean;
  status?: TaskStatus | LegacyTaskStatus;
}

/**
 * Effective status of a task. `isCompleted` wins over a stale stored status so the
 * checkbox and the status can never disagree.
 */
export function resolveTaskStatus(task: StatusSource): TaskStatus {
  if (task.isCompleted) return "completada";
  const stored = normalizeStatus(task.status);
  return stored && stored !== "completada" ? stored : "pendiente";
}

/**
 * Status to store after `isCompleted` changes (checkbox, subtasks).
 * Completing sets "completada"; un-completing a finished task sends it back to
 * "pendiente"; any other status is preserved.
 */
export function statusAfterCompletion(
  previous: TaskStatus,
  isCompleted: boolean
): TaskStatus {
  if (isCompleted) return "completada";
  return previous === "completada" ? "pendiente" : previous;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECURRENCE_STEP_DAYS: Record<TaskRecurrence, number> = { diaria: 1, semanal: 7 };

/**
 * Due date of the next occurrence of a recurring task that was just completed.
 *
 * It is the first date of the task's own cycle (due date + k * step) that falls after
 * today, so completing an overdue task never schedules something in the past, and an
 * early completion moves on to the following cycle. Without a due date the cycle starts
 * today. Calendar days are computed in the user's timezone (`tzOffsetMinutes`, as given
 * by `Date#getTimezoneOffset`) and the result is local noon so a DST change can never
 * move it to another calendar day.
 */
export function nextOccurrence(params: {
  dueDate?: number;
  recurrence: TaskRecurrence;
  now: number;
  tzOffsetMinutes?: number;
}): number {
  const offset = params.tzOffsetMinutes ?? 0;
  const localDay = (timestamp: number) => Math.floor((timestamp - offset * 60_000) / DAY_MS);

  const today = localDay(params.now);
  const base = params.dueDate === undefined ? today : localDay(params.dueDate);
  const step = RECURRENCE_STEP_DAYS[params.recurrence];
  const cycles = base > today ? 1 : Math.floor((today - base) / step) + 1;
  const nextDay = base + cycles * step;

  return nextDay * DAY_MS + DAY_MS / 2 + offset * 60_000;
}
