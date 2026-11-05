'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProjects } from '@/domains/projects/hooks/useProjects';
import { useToggleSubtask, useUpdateTask } from '@/domains/tasks/hooks/useTaskMutations';
import { TodayTaskRow, type TodayRowStatus } from '@/domains/tasks/components/TodayTaskRow';
import { buildTodayTasks, type TodayGroup, type TodayTask } from '@/domains/tasks/lib/today';
import { formatLongDay } from '@/domains/tasks/lib/timezone';
import { useNow } from '@/shared/lib/useNow';
import type { Id } from '@/convex/_generated/dataModel';

/** How long a ticked task stays visible, struck through, before it collapses out. */
const DONE_VISIBLE_MS = 600;
const LEAVING_MS = 300;

interface Row {
  item: TodayTask;
  status: TodayRowStatus;
}

/** A task ticked in this visit that is kept on screen a moment so the tick can be seen. */
interface Lingering {
  item: TodayTask;
  /** Position it had in its group, to keep it in place after the data drops it. */
  index: number;
  status: 'done' | 'leaving';
}

/** Rows of one group: the pending ones plus those still fading out after being ticked. */
function groupRows(
  pending: TodayTask[],
  group: TodayGroup,
  lingering: ReadonlyMap<Id<'tasks'>, Lingering>
): Row[] {
  const rows: Row[] = pending.map((item) => ({
    item,
    status: lingering.get(item.task._id)?.status ?? 'open',
  }));
  const stillListed = new Set(pending.map((item) => item.task._id));
  [...lingering.values()]
    .filter((entry) => entry.item.group === group && !stillListed.has(entry.item.task._id))
    .sort((a, b) => a.index - b.index)
    .forEach((entry) => {
      rows.splice(Math.min(entry.index, rows.length), 0, { item: entry.item, status: entry.status });
    });
  return rows;
}

function TodayList({
  rows,
  onToggleTask,
  onToggleSubtask,
  className,
}: {
  rows: Row[];
  onToggleTask: (item: TodayTask) => void;
  onToggleSubtask: (item: TodayTask) => void;
  className: string;
}) {
  return (
    <ul className={`rounded-2xl divide-y overflow-hidden shadow-sm ${className}`}>
      {rows.map(({ item, status }) => (
        <TodayTaskRow
          key={item.task._id}
          item={item}
          status={status}
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

  const [lingering, setLingering] = useState<ReadonlyMap<Id<'tasks'>, Lingering>>(new Map());
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pendingTimers = timers.current;
    return () => pendingTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const items = useMemo(() => (projects ? buildTodayTasks(projects, now) : []), [projects, now]);
  const overdue = useMemo(() => items.filter((item) => item.group === 'vencida'), [items]);
  const today = useMemo(() => items.filter((item) => item.group === 'hoy'), [items]);

  // A ticked task that is still listed was not saved (error) or is not done: do not count it.
  const done = useMemo(() => {
    const pendingIds = new Set(items.map((item) => item.task._id));
    return [...ticked].filter((id) => !pendingIds.has(id)).length;
  }, [ticked, items]);
  const total = items.length + done;

  const rowsOverdue = useMemo(() => groupRows(overdue, 'vencida', lingering), [overdue, lingering]);
  const rowsToday = useMemo(() => groupRows(today, 'hoy', lingering), [today, lingering]);

  /** Shows the ticked task struck through for a moment, then collapses it out of the list. */
  const showTick = useCallback(
    (item: TodayTask) => {
      const id = item.task._id;
      const index = items.filter((other) => other.group === item.group).findIndex((other) => other.task._id === id);
      const setStatus = (status: Lingering['status'] | null) =>
        setLingering((previous) => {
          const next = new Map(previous);
          if (status === null) next.delete(id);
          else next.set(id, { item, index: Math.max(index, 0), status });
          return next;
        });
      setStatus('done');
      timers.current.push(
        window.setTimeout(() => setStatus('leaving'), DONE_VISIBLE_MS),
        window.setTimeout(() => setStatus(null), DONE_VISIBLE_MS + LEAVING_MS)
      );
    },
    [items]
  );

  const markTicked = useCallback(
    (taskId: Id<'tasks'>) => setTicked((previous) => new Set(previous).add(taskId)),
    []
  );

  const handleToggleTask = useCallback(
    (item: TodayTask) => {
      markTicked(item.task._id);
      showTick(item);
      updateTask({ taskId: item.task._id, isCompleted: true });
    },
    [markTicked, showTick, updateTask]
  );

  const handleToggleSubtask = useCallback(
    (item: TodayTask) => {
      const { task, nextSubtask } = item;
      if (!nextSubtask) return;
      // Completing the last pending subtask completes the task too, and a subtask of a
      // recurring task counts as done for today: either way the task leaves the list.
      const pending = (task.subtasks ?? []).filter((subtask) => !subtask.isCompleted).length;
      if (pending === 1 || task.recurrence) {
        markTicked(task._id);
        showTick(item);
      }
      toggleSubtask({ taskId: task._id, subtaskId: nextSubtask.id, isCompleted: true });
    },
    [markTicked, showTick, toggleSubtask]
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

          {!isLoading && items.length === 0 && lingering.size === 0 && (
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

          {rowsOverdue.length > 0 && (
            <section aria-labelledby="today-overdue" className="mb-6">
              <h3 id="today-overdue" className="text-sm font-semibold text-destructive mb-2">
                Vencidas ({overdue.length})
              </h3>
              <TodayList
                rows={rowsOverdue}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                className="bg-destructive/5 border border-destructive/20 divide-destructive/15"
              />
            </section>
          )}

          {rowsToday.length > 0 && (
            <section aria-labelledby="today-due">
              <h3 id="today-due" className="text-sm font-semibold text-foreground mb-2">
                Hoy ({today.length})
              </h3>
              <TodayList
                rows={rowsToday}
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
