import { resolveProjectStatus } from '@/convex/lib/projectFields';
import { resolveTaskStatus, type TaskPriority } from '@/convex/lib/taskFields';
import { startOfDay } from '@/domains/tasks/lib/dates';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';

const PRIORITY_RANK: Record<TaskPriority | 'none', number> = {
  alta: 0,
  media: 1,
  baja: 2,
  none: 3,
};

export interface WeekTask {
  task: Task;
  project: Pick<Project, '_id' | 'name'>;
  /** Task date, or the project's when the task has none (never written to the task). */
  dueDate?: number;
}

/** Date shown for a task: its own, or the one inherited from its project. */
export function effectiveDueDate(
  task: Pick<Task, 'dueDate'>,
  projectDueDate?: number
): number | undefined {
  return task.dueDate ?? projectDueDate;
}

/**
 * Pending tasks of every active project, ordered by priority (high first, none last)
 * and then by date (soonest first, undated last). Paused and completed projects are
 * left out. Ties keep project and task order.
 */
export function buildWeekTasks(projects: readonly Project[]): WeekTask[] {
  const items: WeekTask[] = [];
  for (const project of projects) {
    if (resolveProjectStatus(project) !== 'activo') continue;
    const tasks = [...project.tasks].sort((a, b) => a.position - b.position);
    for (const task of tasks) {
      if (resolveTaskStatus(task) === 'completada') continue;
      items.push({ task, project, dueDate: effectiveDueDate(task, project.dueDate) });
    }
  }

  return items.sort((a, b) => {
    const byPriority =
      PRIORITY_RANK[a.task.priority ?? 'none'] - PRIORITY_RANK[b.task.priority ?? 'none'];
    if (byPriority !== 0) return byPriority;
    if (a.dueDate === b.dueDate) return 0;
    if (a.dueDate === undefined) return 1;
    if (b.dueDate === undefined) return -1;
    return a.dueDate - b.dueDate;
  });
}

/** Last instant of the Sunday that closes the week containing `now` (local time). */
export function endOfWeek(now: number): number {
  const today = new Date(startOfDay(now));
  const daysUntilSunday = (7 - today.getDay()) % 7;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday + 1).getTime() - 1;
}

export interface WeekSummary {
  overdue: number;
  thisWeek: number;
  later: number;
  undated: number;
}

export function summarizeWeek(items: readonly WeekTask[], now: number): WeekSummary {
  const today = startOfDay(now);
  const weekEnd = endOfWeek(now);
  const summary: WeekSummary = { overdue: 0, thisWeek: 0, later: 0, undated: 0 };
  for (const { dueDate } of items) {
    if (dueDate === undefined) summary.undated++;
    else if (dueDate < today) summary.overdue++;
    else if (dueDate <= weekEnd) summary.thisWeek++;
    else summary.later++;
  }
  return summary;
}
