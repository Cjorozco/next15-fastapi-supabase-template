import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, ListChecks, Repeat } from 'lucide-react';
import { TASK_RECURRENCE_LABELS } from '@/convex/lib/taskFields';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { TaskPriorityBadge } from '@/domains/tasks/components/TaskBadges';
import type { TodayTask } from '@/domains/tasks/lib/today';
import type { Subtask } from '@/domains/tasks/types';

/** How long a ticked subtask stays visible, struck through, before the next one replaces it. */
const SUBTASK_TICK_MS = 600;

/** `done`: just ticked (struck through, highlighted). `leaving`: collapsing out of the list. */
export type TodayRowStatus = 'open' | 'done' | 'leaving';

interface TodayTaskRowProps {
  item: TodayTask;
  status?: TodayRowStatus;
  onToggleTask: (item: TodayTask) => void;
  onToggleSubtask: (item: TodayTask) => void;
}

/** One task of the "Hoy" view: title, project, priority, repetition, subtask progress and next subtask. */
export const TodayTaskRow = memo(function TodayTaskRow({
  item,
  status = 'open',
  onToggleTask,
  onToggleSubtask,
}: TodayTaskRowProps) {
  const { task, project, nextSubtask } = item;
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length;
  const taskCheckboxId = `today-task-${task._id}`;
  const isOpen = status === 'open';

  // Ticking the next subtask shows it checked for a moment before the following one
  // takes its place, so the tick is seen instead of the text just changing.
  const [tickingSubtask, setTickingSubtask] = useState<Subtask | null>(null);
  const tickTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tickTimer.current), []);
  const shownSubtask = tickingSubtask ?? nextSubtask;

  const handleSubtaskTick = () => {
    if (!nextSubtask || tickingSubtask) return;
    setTickingSubtask(nextSubtask);
    window.clearTimeout(tickTimer.current);
    tickTimer.current = window.setTimeout(() => setTickingSubtask(null), SUBTASK_TICK_MS);
    onToggleSubtask(item);
  };

  return (
    // The grid-rows trick lets the row collapse smoothly to zero height when it leaves.
    <li
      data-testid="today-task"
      data-status={status}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        status === 'leaving' ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
      }`}
    >
      <div
        className={`min-h-0 overflow-hidden p-3 space-y-2 transition-colors duration-300 motion-reduce:transition-none ${
          isOpen ? '' : 'bg-success/10'
        }`}
      >
      <div className="flex items-start gap-3">
        {/* Larger hit area for touch screens, same visual size as the rest of the app. */}
        <label htmlFor={taskCheckboxId} className="-m-2 p-2 cursor-pointer">
          <Checkbox
            id={taskCheckboxId}
            checked={!isOpen}
            disabled={!isOpen}
            aria-label={`Completar ${task.title}`}
            onCheckedChange={() => onToggleTask(item)}
          />
        </label>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p
            className={`text-sm font-medium break-words transition-colors duration-300 motion-reduce:transition-none ${
              isOpen ? 'text-foreground' : 'line-through text-muted-foreground'
            }`}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Link
              href={`/projects/${project._id}`}
              aria-label={`Abrir proyecto ${project.name}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors max-w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            >
              <FolderKanban className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.name}</span>
            </Link>
            <TaskPriorityBadge priority={task.priority} />
            {task.recurrence && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title={`Se repite: ${TASK_RECURRENCE_LABELS[task.recurrence].toLowerCase()}`}
              >
                <Repeat className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only">Se repite {TASK_RECURRENCE_LABELS[task.recurrence].toLowerCase()}</span>
              </span>
            )}
            {subtasks.length > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title="Subtareas completadas"
              >
                <ListChecks className="w-3 h-3" aria-hidden="true" />
                {doneSubtasks}/{subtasks.length}
                <span className="sr-only"> subtareas completadas</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {shownSubtask && (isOpen || tickingSubtask) && (
        // Keyed by subtask so each new "next subtask" fades in.
        <div
          key={shownSubtask.id}
          className={`ml-7 flex items-start gap-3 rounded-xl px-3 py-2 transition-colors duration-300 motion-reduce:transition-none animate-in fade-in duration-300 ${
            tickingSubtask ? 'bg-success/10' : 'bg-muted/50'
          }`}
        >
          <label
            htmlFor={`today-subtask-${task._id}`}
            className="-m-2 p-2 cursor-pointer"
          >
            <Checkbox
              id={`today-subtask-${task._id}`}
              checked={!!tickingSubtask}
              disabled={!!tickingSubtask}
              aria-label={`Completar subtarea ${shownSubtask.title}`}
              onCheckedChange={handleSubtaskTick}
            />
          </label>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Siguiente subtarea</p>
            <p
              className={`text-xs break-words transition-colors duration-300 motion-reduce:transition-none ${
                tickingSubtask ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {shownSubtask.title}
            </p>
          </div>
        </div>
      )}
      </div>
    </li>
  );
});
