'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CalendarCheck, FolderKanban, Loader2 } from 'lucide-react';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useProjects } from '@/domains/projects/hooks/useProjects';
import { useUpdateTask } from '@/domains/tasks/hooks/useTaskMutations';
import { TaskMeta } from '@/domains/tasks/components/TaskBadges';
import { buildWeekTasks, summarizeWeek } from '@/domains/tasks/lib/week';
import { useNow } from '@/shared/lib/useNow';
import type { Id } from '@/convex/_generated/dataModel';

function WeekContent() {
  const { data: projects, isLoading } = useProjects();
  const { mutate: updateTask } = useUpdateTask();
  const now = useNow();

  const items = useMemo(() => (projects ? buildWeekTasks(projects) : []), [projects]);
  const summary = useMemo(() => summarizeWeek(items, now), [items, now]);

  const handleToggle = useCallback(
    (taskId: Id<'tasks'>, isCompleted: boolean) => updateTask({ taskId, isCompleted }),
    [updateTask]
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header />

        <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">Esta semana</h2>
            <p className="text-xs text-muted-foreground">
              Tareas pendientes de tus proyectos activos, por prioridad y fecha. Los proyectos en pausa no aparecen.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Cargando" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-16 bg-card border border-border rounded-2xl p-10 shadow-sm">
              <CalendarCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
              <p className="text-foreground text-base font-medium">No tienes tareas pendientes</p>
              <p className="text-muted-foreground text-xs mt-1">
                Las tareas de tus proyectos activos aparecerán aquí.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-3" aria-live="polite">
                <span className={summary.overdue > 0 ? 'text-destructive font-semibold' : ''}>
                  {summary.overdue} vencida{summary.overdue === 1 ? '' : 's'}
                </span>
                {' · '}
                {summary.thisWeek} esta semana · {summary.later} más adelante · {summary.undated} sin fecha
              </p>

              <ul className="bg-card border border-border rounded-2xl divide-y divide-border shadow-sm">
                {items.map(({ task, project, dueDate }) => {
                  const checkboxId = `week-task-${task._id}`;
                  return (
                    <li key={task._id} className="p-3 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={checkboxId}
                          checked={task.isCompleted}
                          onCheckedChange={(checked) => handleToggle(task._id, !!checked)}
                        />
                        <label htmlFor={checkboxId} className="flex-1 text-xs font-medium text-foreground cursor-pointer">
                          {task.title}
                        </label>
                        <Link
                          href={`/projects/${project._id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors max-w-[40%] truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
                        >
                          <FolderKanban className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{project.name}</span>
                          <span className="sr-only">: abrir proyecto</span>
                        </Link>
                      </div>
                      <div className="pl-7">
                        <TaskMeta
                          task={task}
                          inheritedDueDate={task.dueDate === undefined ? dueDate : undefined}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function WeekPage() {
  return (
    <Suspense>
      <WeekContent />
    </Suspense>
  );
}
