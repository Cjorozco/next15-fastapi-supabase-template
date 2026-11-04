import { memo } from 'react';
import Link from 'next/link';
import { FolderKanban, ListChecks, Repeat } from 'lucide-react';
import { TASK_RECURRENCE_LABELS } from '@/convex/lib/taskFields';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { TaskPriorityBadge } from '@/domains/tasks/components/TaskBadges';
import type { TodayTask } from '@/domains/tasks/lib/today';
import type { Id } from '@/convex/_generated/dataModel';

interface TodayTaskRowProps {
  item: TodayTask;
  onToggleTask: (taskId: Id<'tasks'>) => void;
  onToggleSubtask: (item: TodayTask) => void;
}

/** One task of the "Hoy" view: title, project, priority, repetition, subtask progress and next subtask. */
export const TodayTaskRow = memo(function TodayTaskRow({
  item,
  onToggleTask,
  onToggleSubtask,
}: TodayTaskRowProps) {
  const { task, project, nextSubtask } = item;
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length;
  const taskCheckboxId = `today-task-${task._id}`;

  return (
    <li className="p-3 space-y-2" data-testid="today-task">
      <div className="flex items-start gap-3">
        {/* Larger hit area for touch screens, same visual size as the rest of the app. */}
        <label htmlFor={taskCheckboxId} className="-m-2 p-2 cursor-pointer">
          <Checkbox
            id={taskCheckboxId}
            checked={false}
            aria-label={`Completar ${task.title}`}
            onCheckedChange={() => onToggleTask(task._id)}
          />
        </label>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground break-words">{task.title}</p>
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

      {nextSubtask && (
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
    </li>
  );
});
