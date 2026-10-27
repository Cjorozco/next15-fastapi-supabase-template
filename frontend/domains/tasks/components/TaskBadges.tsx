import { memo } from 'react';
import { CalendarDays, Clock, Flag } from 'lucide-react';
import {
  resolveTaskStatus,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
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

export function TaskPriorityBadge({ priority }: { priority: Task['priority'] }) {
  if (priority !== 'alta') return null;
  return (
    <span className={`${PILL} bg-destructive/10 text-destructive border-destructive/20`}>
      <Flag className="w-2.5 h-2.5" />
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
