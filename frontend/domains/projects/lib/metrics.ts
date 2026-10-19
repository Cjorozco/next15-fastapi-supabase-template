import { resolveTaskStatus } from '@/convex/lib/taskFields';
import type { Task } from '@/domains/tasks/types';

type MetricTask = Pick<Task, 'isCompleted' | 'status' | 'estimatedHours' | 'dueDate'>;

export interface ProjectMetrics {
  totalEstimatedHours: number;
  completedHours: number;
  /** Earliest due date among tasks that are not completed, if any. */
  nextDueDate: number | undefined;
}

export function computeProjectMetrics(tasks: MetricTask[]): ProjectMetrics {
  let totalEstimatedHours = 0;
  let completedHours = 0;
  let nextDueDate: number | undefined;

  for (const task of tasks) {
    const isDone = resolveTaskStatus(task) === 'completada';
    const hours = task.estimatedHours ?? 0;
    totalEstimatedHours += hours;
    if (isDone) completedHours += hours;

    if (!isDone && task.dueDate !== undefined) {
      nextDueDate = nextDueDate === undefined ? task.dueDate : Math.min(nextDueDate, task.dueDate);
    }
  }

  return { totalEstimatedHours, completedHours, nextDueDate };
}

/** Tasks that are still open: "pendiente" + "en_progreso". */
export function countOpenTasks(tasks: Array<Pick<Task, 'isCompleted' | 'status'>>): number {
  return tasks.filter((task) => resolveTaskStatus(task) !== 'completada').length;
}
