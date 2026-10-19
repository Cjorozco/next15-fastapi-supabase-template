import { resolveTaskStatus } from '@/convex/lib/taskFields';
import type { Task } from '@/domains/tasks/types';

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Value for `<input type="date">` (local calendar day). Empty string when unset. */
export function toDateInputValue(timestamp: number | undefined): string {
  if (timestamp === undefined) return '';
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local midnight of a `YYYY-MM-DD` value, or null when empty / invalid. */
export function fromDateInputValue(value: string): number | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date.getTime() : null;
}

/** Overdue = has a due date before today and the task is not completed. */
export function isTaskOverdue(
  task: Pick<Task, 'dueDate' | 'isCompleted' | 'status'>,
  now: number
): boolean {
  if (task.dueDate === undefined) return false;
  if (resolveTaskStatus({ isCompleted: task.isCompleted, status: task.status }) === 'completada') {
    return false;
  }
  return task.dueDate < startOfDay(now);
}

export function formatDueDate(timestamp: number, now: number = Date.now()): string {
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Date(timestamp).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}
