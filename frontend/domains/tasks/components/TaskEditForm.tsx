import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { NativeSelect } from '@/shared/components/ui/native-select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_NOTES_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  resolveTaskStatus,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/convex/lib/taskFields';
import { fromDateInputValue, toDateInputValue } from '@/domains/tasks/lib/dates';
import type { Task, TaskDetailsInput } from '@/domains/tasks/types';

interface TaskEditFormProps {
  task: Task;
  /** Resolves true when the task was saved. */
  onSave: (input: TaskDetailsInput) => Promise<boolean>;
}

const FIELD = 'bg-muted/50 border border-border text-foreground text-xs rounded-lg h-8';

/**
 * Edit form for a task. All field state is local so typing never re-renders the task
 * list; only "Guardar" talks to the server.
 */
export function TaskEditForm({ task, onSave }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(resolveTaskStatus(task));
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [hours, setHours] = useState(task.estimatedHours !== undefined ? String(task.estimatedHours) : '');
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority ?? '');
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
      estimatedHours = Number(hours);
      if (!Number.isFinite(estimatedHours) || estimatedHours < 0 || estimatedHours > MAX_ESTIMATED_HOURS) {
        setError(`Las horas deben estar entre 0 y ${MAX_ESTIMATED_HOURS}`);
        return;
      }
    }

    setError('');
    setIsSaving(true);
    await onSave({
      title: trimmedTitle,
      status,
      dueDate: fromDateInputValue(dueDate),
      estimatedHours,
      priority: priority === '' ? null : priority,
      notes: notes.trim() || null,
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
        <Label htmlFor={`${idPrefix}-title`} className="text-[11px] text-muted-foreground">
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
          <Label htmlFor={`${idPrefix}-status`} className="text-[11px] text-muted-foreground">
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
          <Label htmlFor={`${idPrefix}-priority`} className="text-[11px] text-muted-foreground">
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
          <Label htmlFor={`${idPrefix}-due`} className="text-[11px] text-muted-foreground">
            Fecha límite
          </Label>
          <Input
            id={`${idPrefix}-due`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-hours`} className="text-[11px] text-muted-foreground">
            Horas estimadas
          </Label>
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_ESTIMATED_HOURS}
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            className={FIELD}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-notes`} className="text-[11px] text-muted-foreground">
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
        <p role="alert" className="text-[11px] text-red-500">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="text-xs bg-primary text-white font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1 shadow-xs"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
