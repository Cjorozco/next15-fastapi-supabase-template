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

export const TASK_RECURRENCES = ["diaria", "laboral", "semanal"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  diaria: "Todos los días",
  laboral: "De lunes a viernes",
  semanal: "Todas las semanas",
};

/** Short labels for narrow selects ("Todos los días" gets cut off). */
export const TASK_RECURRENCE_SHORT_LABELS: Record<TaskRecurrence, string> = {
  diaria: "Diaria",
  laboral: "Lun a vie",
  semanal: "Semanal",
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
const RECURRENCE_STEP_DAYS: Record<TaskRecurrence, number> = { diaria: 1, laboral: 1, semanal: 7 };

/** Calendar day number of a timestamp in the user's timezone (`Date#getTimezoneOffset` minutes). */
function localDayNumber(timestamp: number, tzOffsetMinutes = 0): number {
  return Math.floor((timestamp - tzOffsetMinutes * 60_000) / DAY_MS);
}

/** Local noon of a calendar day, so a DST change can never move it to another day. */
function localNoon(dayNumber: number, tzOffsetMinutes = 0): number {
  return dayNumber * DAY_MS + DAY_MS / 2 + tzOffsetMinutes * 60_000;
}

/** Days from a calendar day to the next weekday: 2 on Saturday, 1 on Sunday, otherwise 0. */
function daysToWeekday(dayNumber: number): number {
  // Day number 0 (1 Jan 1970) was a Thursday, so this gives 0 = Sunday ... 6 = Saturday.
  const weekday = (dayNumber + 4) % 7;
  if (weekday === 6) return 2;
  return weekday === 0 ? 1 : 0;
}

/** A date on Saturday or Sunday becomes the following Monday; a weekday is left as it is. */
export function moveOffWeekend(dueDate: number, tzOffsetMinutes?: number): number {
  const day = localDayNumber(dueDate, tzOffsetMinutes);
  const shift = daysToWeekday(day);
  return shift === 0 ? dueDate : localNoon(day + shift, tzOffsetMinutes);
}

/**
 * A Monday to Friday task does not apply on a weekend, not even when it is overdue:
 * the views leave it out until Monday. `dayKey` is a calendar day as `YYYY-MM-DD`.
 */
export function restsOnDay(task: { recurrence?: TaskRecurrence }, dayKey: string): boolean {
  if (task.recurrence !== "laboral") return false;
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/**
 * A recurring task whose next occurrence is after today: this cycle is already done.
 * Used to count a cycle once when a task with subtasks is advanced several times a day.
 */
export function isDoneForNow(
  task: { recurrence?: TaskRecurrence; dueDate?: number },
  now: number,
  tzOffsetMinutes?: number
): boolean {
  if (!task.recurrence || task.dueDate === undefined) return false;
  return localDayNumber(task.dueDate, tzOffsetMinutes) > localDayNumber(now, tzOffsetMinutes);
}

/**
 * Due date of the next occurrence of a recurring task that was just completed.
 *
 * It is the first date of the task's own cycle (due date + k * step) that falls after
 * today, so completing an overdue task never schedules something in the past, and an
 * early completion moves on to the following cycle. Without a due date the cycle starts
 * today. A Monday to Friday task skips the weekend. Calendar days are computed in the
 * user's timezone (`tzOffsetMinutes`, as given by `Date#getTimezoneOffset`) and the result
 * is local noon so a DST change can never move it to another calendar day.
 */
export function nextOccurrence(params: {
  dueDate?: number;
  recurrence: TaskRecurrence;
  now: number;
  tzOffsetMinutes?: number;
}): number {
  const offset = params.tzOffsetMinutes ?? 0;
  const localDay = (timestamp: number) => localDayNumber(timestamp, offset);

  const today = localDay(params.now);
  const base = params.dueDate === undefined ? today : localDay(params.dueDate);
  const step = RECURRENCE_STEP_DAYS[params.recurrence];
  const cycles = base > today ? 1 : Math.floor((today - base) / step) + 1;
  const nextDay = base + cycles * step;

  return localNoon(
    params.recurrence === "laboral" ? nextDay + daysToWeekday(nextDay) : nextDay,
    offset
  );
}

/**
 * "No deadline by nature" (habits, open-ended tasks), as opposed to "still needs a date".
 * A task with a date never counts. `noDeadline` is optional in the database (absent means
 * false), except that a recurring task without the flag is treated as having no deadline.
 */
export function hasNoDeadline(task: {
  noDeadline?: boolean;
  recurrence?: TaskRecurrence;
  dueDate?: number;
}): boolean {
  if (task.dueDate !== undefined) return false;
  return task.noDeadline ?? task.recurrence !== undefined;
}
