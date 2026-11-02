import { CalendarDays, Flag, PauseCircle, CheckCircle2, CircleDot } from 'lucide-react';
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  resolveProjectPriority,
  resolveProjectStatus,
  type ProjectPriority,
  type ProjectStatus,
} from '@/convex/lib/projectFields';
import { formatDueDate, startOfDay } from '@/domains/tasks/lib/dates';
import { useNow } from '@/shared/lib/useNow';

const PILL = 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border';

// Each level has its own color and, since color is never the only cue, a text label.
export const PRIORITY_PILL_STYLES: Record<Exclude<ProjectPriority, 'ninguna'>, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/30',
  media: 'bg-warning/10 text-warning border-warning/30',
  baja: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
};

const STATUS_PILL_STYLES: Record<ProjectStatus, string> = {
  activo: 'bg-success/10 text-success border-success/30',
  en_pausa: 'bg-muted text-muted-foreground border-border',
  completado: 'bg-primary/10 text-primary border-primary/30',
};

const STATUS_ICONS = {
  activo: CircleDot,
  en_pausa: PauseCircle,
  completado: CheckCircle2,
} as const;

export function ProjectPriorityBadge({ priority }: { priority?: ProjectPriority }) {
  const resolved = resolveProjectPriority({ priority });
  if (resolved === 'ninguna') return null;
  return (
    <span className={`${PILL} ${PRIORITY_PILL_STYLES[resolved]}`}>
      <Flag className="w-2.5 h-2.5" aria-hidden="true" />
      Prioridad {PROJECT_PRIORITY_LABELS[resolved].toLowerCase()}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status?: ProjectStatus }) {
  const resolved = resolveProjectStatus({ status });
  const Icon = STATUS_ICONS[resolved];
  return (
    <span className={`${PILL} ${STATUS_PILL_STYLES[resolved]}`}>
      <Icon className="w-2.5 h-2.5" aria-hidden="true" />
      {PROJECT_STATUS_LABELS[resolved]}
    </span>
  );
}

export function ProjectDueDateBadge({ dueDate, status }: { dueDate?: number; status?: ProjectStatus }) {
  const now = useNow();
  if (dueDate === undefined) return null;
  const overdue = resolveProjectStatus({ status }) !== 'completado' && dueDate < startOfDay(now);
  return (
    <span
      className={`${PILL} ${
        overdue
          ? 'bg-destructive/10 text-destructive border-destructive/30'
          : 'bg-muted/60 text-muted-foreground border-border'
      }`}
      title={overdue ? 'Fecha límite vencida' : 'Fecha límite'}
    >
      <CalendarDays className="w-2.5 h-2.5" aria-hidden="true" />
      <span className="sr-only">Fecha límite: </span>
      {formatDueDate(dueDate, now)}
      {overdue && <span className="sr-only"> (vencida)</span>}
    </span>
  );
}

/** Status, priority and due date of a project as a row of small badges. */
export function ProjectBadges(project: {
  priority?: ProjectPriority;
  status?: ProjectStatus;
  dueDate?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ProjectStatusBadge status={project.status} />
      <ProjectPriorityBadge priority={project.priority} />
      <ProjectDueDateBadge dueDate={project.dueDate} status={project.status} />
    </div>
  );
}
