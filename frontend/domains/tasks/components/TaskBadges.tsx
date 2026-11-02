import { memo } from 'react';
import { CalendarDays, Clock, Flag } from 'lucide-react';
import {
  resolveTaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/convex/lib/taskFields';
import { formatDueDate, formatHours, isTaskOverdue } from '@/domains/tasks/lib/dates';
import type { Task } from '@/domains/tasks/types';
import { useNow } from '@/shared/lib/useNow';

const STATUS_STYLES: Record<TaskStatus, string> = {
  pendiente: 'bg-muted text-muted-foreground border-border',
  en_progreso: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  completada: 'bg-success/10 text-success border-success/20',
};

const PILL = 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`${PILL} ${STATUS_STYLES[status]}`}>{TASK_STATUS_LABELS[status]}</span>;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/30',
  media: 'bg-warning/10 text-warning border-warning/30',
  baja: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
};

/** Every level is shown, each with its own color and a text label (color is never the only cue). */
export function TaskPriorityBadge({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  return (
    <span className={`${PILL} ${PRIORITY_STYLES[priority]}`}>
      <Flag className="w-2.5 h-2.5" aria-hidden="true" />
      Prioridad {TASK_PRIORITY_LABELS[priority].toLowerCase()}
    </span>
  );
}

interface TaskMetaProps {
  task: Task;
  /** Compact variant for project cards: smaller, no status badge. */
  compact?: boolean;
}

/** Status, priority, due date and estimated hours of a task, as a row of small badges. */
export const TaskMeta = memo(function TaskMeta({ task, compact = false }: TaskMetaProps) {
  const status = resolveTaskStatus(task);
  const now = useNow();
  const overdue = isTaskOverdue(task, now);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'pl-9' : ''}`}>
      {!compact && <TaskStatusBadge status={status} />}
      <TaskPriorityBadge priority={task.priority} />
      {task.dueDate !== undefined && (
        <span
          className={`${PILL} ${
            overdue
              ? 'bg-destructive/10 text-destructive border-destructive/30'
              : 'bg-muted/60 text-muted-foreground border-border'
          }`}
          title={overdue ? 'Fecha límite vencida' : 'Fecha límite'}
        >
          <CalendarDays className="w-2.5 h-2.5" />
          {formatDueDate(task.dueDate, now)}
          {overdue && <span className="sr-only"> (vencida)</span>}
        </span>
      )}
      {task.estimatedHours !== undefined && (
        <span className={`${PILL} bg-muted/60 text-muted-foreground border-border`} title="Horas estimadas">
          <Clock className="w-2.5 h-2.5" />
          {formatHours(task.estimatedHours)}
        </span>
      )}
    </div>
  );
});
