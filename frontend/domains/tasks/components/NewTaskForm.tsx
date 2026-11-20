'use client';

import { memo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MAX_BULK_TASKS, parsePastedTasks } from '@/domains/tasks/lib/bulk';
import {
  TASK_RECURRENCES,
  TASK_RECURRENCE_SHORT_LABELS,
  type TaskRecurrence,
} from '@/convex/lib/taskFields';

interface NewTaskFormProps {
  isCreating: boolean;
  /**
   * Creates one task per title. `onCreated` must be called by the parent once they
   * exist; the form then stays open and focused to keep adding. `recurrence` is set when
   * the user chose "Repetir" (it applies to every title).
   */
  onSubmit: (titles: string[], onCreated: () => void, recurrence?: TaskRecurrence) => void;
  onCancel: () => void;
  /** `card` = compact style used in project cards; `detail` = style of the detail page. */
  variant?: 'card' | 'detail';
}

/**
 * Inline "new task" input. The typed text lives here (not in the page/card), so each
 * keystroke re-renders only this component and not the whole task list.
 * Enter adds the task and keeps the input open; pasting several lines adds one task per line.
 */
export const NewTaskForm = memo(function NewTaskForm({
  isCreating,
  onSubmit,
  onCancel,
  variant = 'card',
}: NewTaskFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  // Kept after each add, so several habits can be added in a row.
  const [recurrence, setRecurrence] = useState<TaskRecurrence | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const refocus = () => inputRef.current?.focus();

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setError('');
    onSubmit(
      [trimmed],
      () => {
        setTitle('');
        refocus();
      },
      recurrence || undefined
    );
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const lines = parsePastedTasks(e.clipboardData.getData('text'));
    if (lines.length < 2) return; // a single line pastes as usual

    e.preventDefault();
    if (lines.length > MAX_BULK_TASKS) {
      setError(`Puedes pegar hasta ${MAX_BULK_TASKS} tareas a la vez (pegaste ${lines.length}).`);
      return;
    }
    setError('');
    onSubmit(lines, refocus, recurrence || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
    if (e.key === 'Escape') onCancel();
  };

  const isDetail = variant === 'detail';

  return (
    <div className={isDetail ? 'mb-4' : 'mt-3'}>
      <div
        className={
          isDetail
            ? 'flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border'
            : 'flex items-center gap-2'
        }
      >
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Nombre de la tarea (o pega varias líneas)..."
          aria-label="Nombre de la tarea"
          aria-describedby={error ? 'new-task-error' : undefined}
          className={
            isDetail
              ? 'flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground'
              : 'flex-1 text-xs bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors'
          }
          disabled={isCreating}
        />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as TaskRecurrence | '')}
          aria-label="Repetir"
          title="Repetir"
          disabled={isCreating}
          className="text-xs bg-muted/50 border border-border rounded-lg px-1.5 py-1.5 text-foreground outline-none focus:border-primary transition-colors max-w-[7.5rem]"
        >
          <option value="">No se repite</option>
          {TASK_RECURRENCES.map((value) => (
            <option key={value} value={value}>
              {TASK_RECURRENCE_SHORT_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={isCreating || !title.trim()}
          className="text-xs bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs"
        >
          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
        >
          Listo
        </button>
      </div>
      {error && (
        <p id="new-task-error" role="alert" className="text-xs text-destructive mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
});
