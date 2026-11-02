import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { NativeSelect } from '@/shared/components/ui/native-select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_NOTES_LENGTH,
  hasNoDeadline,
  MAX_TASK_TITLE_LENGTH,
  resolveTaskStatus,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCES,
  TASK_RECURRENCE_SHORT_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
} from '@/convex/lib/taskFields';
import { fromDateInputValue, toDateInputValue } from '@/domains/tasks/lib/dates';
import { formatDurationInput, parseDuration } from '@/domains/tasks/lib/duration';
import type { Task, TaskDetailsInput } from '@/domains/tasks/types';
import type { Id } from '@/convex/_generated/dataModel';

interface TaskEditFormProps {
  task: Task;
  /** Resolves true when the task was saved. */
  onSave: (input: TaskDetailsInput) => Promise<boolean>;
  /** Projects the task can be moved to (including its current one). Hides the selector when absent. */
  projects?: Array<{ _id: Id<'projects'>; name: string }>;
}

const FIELD = 'bg-muted/50 border border-border text-foreground text-xs rounded-lg h-8';

/**
 * Edit form for a task. All field state is local so typing never re-renders the task
 * list; only "Guardar" talks to the server.
 */
export function TaskEditForm({ task, onSave, projects }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(resolveTaskStatus(task));
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [noDeadline, setNoDeadline] = useState(hasNoDeadline(task));
  const [hours, setHours] = useState(task.estimatedHours !== undefined ? formatDurationInput(task.estimatedHours) : '');
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority ?? '');
  const [recurrence, setRecurrence] = useState<TaskRecurrence | ''>(task.recurrence ?? '');
  const [projectId, setProjectId] = useState<Id<'projects'>>(task.projectId);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const idPrefix = `task-edit-${task._id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('El título es obligatorio');
      return;
    }

    let estimatedHours: number | null = null;
    if (hours.trim() !== '') {
      const parsed = parseDuration(hours);
      if (parsed === null || parsed < 0 || parsed > MAX_ESTIMATED_HOURS) {
        setError(`La duración debe ser un tiempo como "10 min" o "1.5 h" (entre 0 y ${MAX_ESTIMATED_HOURS} h)`);
        return;
      }
      estimatedHours = parsed;
    }

    setError('');
    setIsSaving(true);
    await onSave({
      title: trimmedTitle,
      status,
      dueDate: noDeadline ? null : fromDateInputValue(dueDate),
      noDeadline,
      estimatedHours,
      priority: priority === '' ? null : priority,
      recurrence: recurrence === '' ? null : recurrence,
      notes: notes.trim() || null,
      ...(projectId !== task.projectId ? { projectId } : {}),
    });
    setIsSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-3 mb-3 ml-11 p-3 space-y-3 bg-muted/30 border border-border rounded-xl"
      aria-label={`Editar tarea ${task.title}`}
    >
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-title`} className="text-xs text-muted-foreground">
          Título
        </Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          maxLength={MAX_TASK_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-status`} className="text-xs text-muted-foreground">
            Estado
          </Label>
          <NativeSelect
            id={`${idPrefix}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className={FIELD}
          >
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-priority`} className="text-xs text-muted-foreground">
            Prioridad
          </Label>
          <NativeSelect
            id={`${idPrefix}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
            className={FIELD}
          >
            <option value="">Sin prioridad</option>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {TASK_PRIORITY_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-due`} className="text-xs text-muted-foreground">
            Fecha límite
          </Label>
          <Input
            id={`${idPrefix}-due`}
            type="date"
            value={dueDate}
            disabled={noDeadline}
            onChange={(e) => setDueDate(e.target.value)}
            className={FIELD}
          />
          <label
            htmlFor={`${idPrefix}-no-deadline`}
            className="flex items-center gap-2 pt-1 text-xs text-muted-foreground cursor-pointer w-fit"
          >
            <Checkbox
              id={`${idPrefix}-no-deadline`}
              checked={noDeadline}
              onCheckedChange={(checked) => {
                setNoDeadline(!!checked);
                if (checked) setDueDate('');
              }}
            />
            <span>Sin fecha límite</span>
          </label>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-hours`} className="text-xs text-muted-foreground">
            Duración estimada
          </Label>
          <Input
            id={`${idPrefix}-hours`}
            type="text"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Ej. 10 min o 1.5 h"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-recurrence`} className="text-xs text-muted-foreground">
            Repetir
          </Label>
          <NativeSelect
            id={`${idPrefix}-recurrence`}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence | '')}
            className={FIELD}
          >
            <option value="">No se repite</option>
            {TASK_RECURRENCES.map((value) => (
              <option key={value} value={value}>
                {TASK_RECURRENCE_SHORT_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>

        {projects && projects.length > 1 && (
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-project`} className="text-xs text-muted-foreground">
              Proyecto
            </Label>
            <NativeSelect
              id={`${idPrefix}-project`}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value as Id<'projects'>)}
              className={FIELD}
            >
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-notes`} className="text-xs text-muted-foreground">
          Notas
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={notes}
          maxLength={MAX_TASK_NOTES_LENGTH}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="bg-muted/50 border border-border text-foreground text-xs rounded-lg resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="text-xs bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1 shadow-xs"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
