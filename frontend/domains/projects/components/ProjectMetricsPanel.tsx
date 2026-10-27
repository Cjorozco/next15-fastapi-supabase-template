import { useMemo } from 'react';
import { CalendarClock, CheckCheck, Hourglass } from 'lucide-react';
import { computeProjectMetrics } from '@/domains/projects/lib/metrics';
import { formatDueDate, formatHours, startOfDay } from '@/domains/tasks/lib/dates';
import type { Task } from '@/domains/tasks/types';
import { useNow } from '@/shared/lib/useNow';

/** Estimated hours, completed hours and nearest open due date of a project. */
export function ProjectMetricsPanel({ tasks }: { tasks: Task[] }) {
  const now = useNow();
  const metrics = useMemo(() => computeProjectMetrics(tasks), [tasks]);
  const isNextOverdue =
    metrics.nextDueDate !== undefined && metrics.nextDueDate < startOfDay(now);

  const items = [
    {
      label: 'Horas estimadas',
      value: formatHours(metrics.totalEstimatedHours),
      icon: Hourglass,
      tone: 'text-foreground',
    },
    {
      label: 'Horas completadas',
      value: formatHours(metrics.completedHours),
      icon: CheckCheck,
      tone: 'text-foreground',
    },
    {
      label: 'Próxima fecha límite',
      value: metrics.nextDueDate !== undefined ? formatDueDate(metrics.nextDueDate, now) : 'Sin fecha',
      icon: CalendarClock,
      tone: isNextOverdue ? 'text-destructive' : 'text-foreground',
    },
  ];

  return (
    <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Métricas del proyecto">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <item.icon className="w-4 h-4" />
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className={`text-sm font-semibold ${item.tone}`}>
              {item.value}
              {item.label === 'Próxima fecha límite' && isNextOverdue && (
                <span className="text-xs font-medium ml-1">(vencida)</span>
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
