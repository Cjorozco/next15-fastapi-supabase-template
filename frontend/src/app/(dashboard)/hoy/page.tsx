'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProjects } from '@/domains/projects/hooks/useProjects';
import { useToggleSubtask, useUpdateTask } from '@/domains/tasks/hooks/useTaskMutations';
import { TodayTaskRow } from '@/domains/tasks/components/TodayTaskRow';
import { buildTodayTasks, type TodayTask } from '@/domains/tasks/lib/today';
import { formatLongDay } from '@/domains/tasks/lib/timezone';
import { useNow } from '@/shared/lib/useNow';
import type { Id } from '@/convex/_generated/dataModel';

function TodayList({
  items,
  onToggleTask,
  onToggleSubtask,
  className,
}: {
  items: TodayTask[];
  onToggleTask: (taskId: Id<'tasks'>) => void;
  onToggleSubtask: (item: TodayTask) => void;
  className: string;
}) {
  return (
    <ul className={`rounded-2xl divide-y shadow-sm ${className}`}>
      {items.map((item) => (
        <TodayTaskRow
          key={item.task._id}
          item={item}
          onToggleTask={onToggleTask}
          onToggleSubtask={onToggleSubtask}
        />
      ))}
    </ul>
  );
}

function TodayContent() {
  const { data: projects, isLoading } = useProjects();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: toggleSubtask } = useToggleSubtask();
  const now = useNow();
  // Completing a task takes it out of the list (a recurring one comes back on a later
  // date), so the counter remembers what was ticked in this visit.
  const [ticked, setTicked] = useState<ReadonlySet<Id<'tasks'>>>(new Set());

  const items = useMemo(() => (projects ? buildTodayTasks(projects, now) : []), [projects, now]);
  const overdue = useMemo(() => items.filter((item) => item.group === 'vencida'), [items]);
  const today = useMemo(() => items.filter((item) => item.group === 'hoy'), [items]);

  // A ticked task that is still listed was not saved (error) or is not done: do not count it.
  const done = useMemo(() => {
    const pendingIds = new Set(items.map((item) => item.task._id));
    return [...ticked].filter((id) => !pendingIds.has(id)).length;
  }, [ticked, items]);
  const total = items.length + done;

  const markTicked = useCallback(
    (taskId: Id<'tasks'>) => setTicked((previous) => new Set(previous).add(taskId)),
    []
  );

  const handleToggleTask = useCallback(
    (taskId: Id<'tasks'>) => {
      markTicked(taskId);
      updateTask({ taskId, isCompleted: true });
    },
    [markTicked, updateTask]
  );

  const handleToggleSubtask = useCallback(
    ({ task, nextSubtask }: TodayTask) => {
      if (!nextSubtask) return;
      // Completing the last pending subtask completes the task too, and a subtask of a
      // recurring task counts as done for today: either way the task leaves the list.
      const pending = (task.subtasks ?? []).filter((subtask) => !subtask.isCompleted).length;
      if (pending === 1 || task.recurrence) markTicked(task._id);
      toggleSubtask({ taskId: task._id, subtaskId: nextSubtask.id, isCompleted: true });
    },
    [markTicked, toggleSubtask]
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header />

        <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              Hoy — {formatLongDay(now)}
            </h2>
            {!isLoading && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {done} de {total} hechas
              </p>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Cargando" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-16 bg-card border border-border rounded-2xl p-10 shadow-sm">
              <p className="text-foreground text-base font-medium">Nada pendiente para hoy 🎉</p>
              <Link
                href="/week"
                className="inline-block mt-3 text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
              >
                Ver esta semana
              </Link>
            </div>
          )}

          {overdue.length > 0 && (
            <section aria-labelledby="today-overdue" className="mb-6">
              <h3 id="today-overdue" className="text-sm font-semibold text-destructive mb-2">
                Vencidas ({overdue.length})
              </h3>
              <TodayList
                items={overdue}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                className="bg-destructive/5 border border-destructive/20 divide-destructive/15"
              />
            </section>
          )}

          {today.length > 0 && (
            <section aria-labelledby="today-due">
              <h3 id="today-due" className="text-sm font-semibold text-foreground mb-2">
                Hoy ({today.length})
              </h3>
              <TodayList
                items={today}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                className="bg-card border border-border divide-border"
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense>
      <TodayContent />
    </Suspense>
  );
}
