import { resolveProjectStatus } from '@/convex/lib/projectFields';
import { resolveTaskStatus, restsOnDay } from '@/convex/lib/taskFields';
import { dayKey } from '@/domains/tasks/lib/timezone';
import { PRIORITY_RANK } from '@/domains/tasks/lib/week';
import type { Project } from '@/domains/projects/types';
import type { Subtask, Task } from '@/domains/tasks/types';

export type TodayGroup = 'vencida' | 'hoy';

export interface TodayTask {
  task: Task;
  project: Pick<Project, '_id' | 'name'>;
  group: TodayGroup;
  /** First subtask, in order, that is not completed yet. */
  nextSubtask?: Subtask;
}

/** First pending subtask in the order they were written. */
export function nextPendingSubtask(task: Pick<Task, 'subtasks'>): Subtask | undefined {
  return task.subtasks?.find((subtask) => !subtask.isCompleted);
}

/**
 * Where a task belongs in "Hoy", or null when it does not belong.
 * Only the task's own date counts: tasks without one stay in "Esta semana".
 * For recurring tasks `dueDate` is the date of the next occurrence, so a daily or Monday
 * to Friday task without a date has not started its cycle yet and is due today. A weekly
 * task is due once that date arrives, which also keeps it out of the list the same day it
 * is completed (it comes back dated one week ahead). A Monday to Friday task stays out on
 * weekends, even when overdue.
 */
export function todayGroupFor(
  task: Pick<Task, 'dueDate' | 'recurrence'>,
  todayKey: string
): TodayGroup | null {
  if (restsOnDay(task, todayKey)) return null;
  if (task.dueDate === undefined) {
    return task.recurrence === 'diaria' || task.recurrence === 'laboral' ? 'hoy' : null;
  }
  const due = dayKey(task.dueDate);
  if (due < todayKey) return 'vencida';
  return due === todayKey ? 'hoy' : null;
}

/**
 * Pending tasks of active projects that are due today or earlier.
 * "Vencidas" go first, oldest date first. "Hoy" is ordered by priority (high first,
 * none last), then project name, then the order of the tasks inside the project.
 */
export function buildTodayTasks(projects: readonly Project[], now: number): TodayTask[] {
  const todayKey = dayKey(now);
  const items: TodayTask[] = [];

  for (const project of projects) {
    if (resolveProjectStatus(project) !== 'activo') continue;
    for (const task of project.tasks) {
      if (resolveTaskStatus(task) === 'completada') continue;
      const group = todayGroupFor(task, todayKey);
      if (!group) continue;
      items.push({ task, project, group, nextSubtask: nextPendingSubtask(task) });
    }
  }

  return items.sort((a, b) => {
    if (a.group !== b.group) return a.group === 'vencida' ? -1 : 1;
    if (a.group === 'vencida') {
      const byDate = (a.task.dueDate ?? 0) - (b.task.dueDate ?? 0);
      if (byDate !== 0) return byDate;
    }
    const byPriority =
      PRIORITY_RANK[a.task.priority ?? 'none'] - PRIORITY_RANK[b.task.priority ?? 'none'];
    if (byPriority !== 0) return byPriority;
    const byProject = a.project.name.localeCompare(b.project.name, 'es');
    if (byProject !== 0) return byProject;
    return a.task.position - b.task.position;
  });
}
