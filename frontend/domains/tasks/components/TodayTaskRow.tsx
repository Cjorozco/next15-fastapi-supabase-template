import { memo } from 'react';
import Link from 'next/link';
import { FolderKanban, ListChecks, Repeat } from 'lucide-react';
import { TASK_RECURRENCE_LABELS } from '@/convex/lib/taskFields';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { TaskPriorityBadge } from '@/domains/tasks/components/TaskBadges';
import type { TodayTask } from '@/domains/tasks/lib/today';

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

      {nextSubtask && isOpen && (
        <div className="ml-7 flex items-start gap-3 rounded-xl bg-muted/50 px-3 py-2">
          <label
            htmlFor={`today-subtask-${task._id}`}
            className="-m-2 p-2 cursor-pointer"
          >
            <Checkbox
              id={`today-subtask-${task._id}`}
              checked={false}
              aria-label={`Completar subtarea ${nextSubtask.title}`}
              onCheckedChange={() => onToggleSubtask(item)}
            />
          </label>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Siguiente subtarea</p>
            <p className="text-xs text-foreground break-words">{nextSubtask.title}</p>
          </div>
        </div>
      )}
      </div>
    </li>
  );
});
