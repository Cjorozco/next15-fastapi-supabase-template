import { resolveProjectStatus } from '@/convex/lib/projectFields';
import { hasNoDeadline, resolveTaskStatus, type TaskPriority } from '@/convex/lib/taskFields';
import { startOfDay } from '@/domains/tasks/lib/dates';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';

/** Sort rank of a priority: high first, none last. Shared with the "Hoy" view. */
export const PRIORITY_RANK: Record<TaskPriority | 'none', number> = {
  alta: 0,
  media: 1,
  baja: 2,
  none: 3,
};

/**
 * Where a task sits in "Esta semana", in display order:
 * overdue → this week → no deadline (high priority) → later → unplanned → rest with no deadline.
 */
export const WEEK_BUCKETS = [
  'vencida',
  'esta_semana',
  'sin_limite_alta',
  'mas_adelante',
  'sin_planificar',
  'sin_limite',
] as const;
export type WeekBucket = (typeof WEEK_BUCKETS)[number];

export interface WeekTask {
  task: Task;
  project: Pick<Project, '_id' | 'name'>;
  /** Task date, or the project's when the task has none (never written to the task). */
  dueDate?: number;
  bucket: WeekBucket;
}

/**
 * Date shown for a task: its own, or the project's. A task flagged "sin fecha límite"
 * never inherits the project date.
 */
export function effectiveDueDate(
  task: Pick<Task, 'dueDate' | 'noDeadline' | 'recurrence'>,
  projectDueDate?: number
): number | undefined {
  if (task.dueDate !== undefined) return task.dueDate;
  return hasNoDeadline(task) ? undefined : projectDueDate;
}

/** Last instant of the Sunday that closes the week containing `now` (local time). */
export function endOfWeek(now: number): number {
  const today = new Date(startOfDay(now));
  const daysUntilSunday = (7 - today.getDay()) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday + 1).getTime() - 1;
}

export function bucketFor(
  task: Pick<Task, 'priority' | 'noDeadline' | 'recurrence'>,
  dueDate: number | undefined,
  now: number
): WeekBucket {
  if (dueDate === undefined) {
    if (!hasNoDeadline(task)) return 'sin_planificar';
    return task.priority === 'alta' ? 'sin_limite_alta' : 'sin_limite';
  }
  if (dueDate < startOfDay(now)) return 'vencida';
  return dueDate <= endOfWeek(now) ? 'esta_semana' : 'mas_adelante';
}

/**
 * Pending tasks of every active project. Paused and completed projects are left out.
 * Order: bucket (see `WEEK_BUCKETS`), then priority (high first, none last), then date
 * (soonest first). Ties keep project and task order.
 */
export function buildWeekTasks(projects: readonly Project[], now: number): WeekTask[] {
  const items: WeekTask[] = [];
  for (const project of projects) {
    if (resolveProjectStatus(project) !== 'activo') continue;
    const tasks = [...project.tasks].sort((a, b) => a.position - b.position);
    for (const task of tasks) {
      if (resolveTaskStatus(task) === 'completada') continue;
      const dueDate = effectiveDueDate(task, project.dueDate);
      items.push({ task, project, dueDate, bucket: bucketFor(task, dueDate, now) });
    }
  }

  return items.sort((a, b) => {
    const byBucket = WEEK_BUCKETS.indexOf(a.bucket) - WEEK_BUCKETS.indexOf(b.bucket);
    if (byBucket !== 0) return byBucket;
    const byPriority =
      PRIORITY_RANK[a.task.priority ?? 'none'] - PRIORITY_RANK[b.task.priority ?? 'none'];
    if (byPriority !== 0) return byPriority;
    if (a.dueDate === b.dueDate) return 0;
    if (a.dueDate === undefined) return 1;
    if (b.dueDate === undefined) return -1;
    return a.dueDate - b.dueDate;
  });
}

export interface WeekSummary {
  overdue: number;
  thisWeek: number;
  later: number;
  unplanned: number;
  noDeadline: number;
}

export function summarizeWeek(items: readonly WeekTask[]): WeekSummary {
  const summary: WeekSummary = { overdue: 0, thisWeek: 0, later: 0, unplanned: 0, noDeadline: 0 };
  for (const { bucket } of items) {
    if (bucket === 'vencida') summary.overdue++;
    else if (bucket === 'esta_semana') summary.thisWeek++;
    else if (bucket === 'mas_adelante') summary.later++;
    else if (bucket === 'sin_planificar') summary.unplanned++;
    else summary.noDeadline++;
  }
  return summary;
}
