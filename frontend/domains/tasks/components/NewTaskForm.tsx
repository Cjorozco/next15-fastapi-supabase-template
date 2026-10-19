'use client';

import { memo, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface NewTaskFormProps {
  isCreating: boolean;
  /** `onCreated` must be called by the parent once the task exists, to reset the input. */
  onSubmit: (title: string, onCreated: () => void) => void;
  onCancel: () => void;
  /** `card` = compact style used in project cards; `detail` = style of the detail page. */
  variant?: 'card' | 'detail';
}

/**
 * Inline "new task" input. The typed text lives here (not in the page/card), so each
 * keystroke re-renders only this component and not the whole task list.
 */
export const NewTaskForm = memo(function NewTaskForm({
  isCreating,
  onSubmit,
  onCancel,
  variant = 'card',
}: NewTaskFormProps) {
  const [title, setTitle] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed, () => setTitle(''));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') onCancel();
  };

  const isDetail = variant === 'detail';

  return (
    <div
      className={
        isDetail
          ? 'flex items-center gap-2 mb-4 p-3 bg-muted/40 rounded-xl border border-border'
          : 'flex items-center gap-2 mt-3'
      }
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la tarea..."
        aria-label="Nombre de la tarea"
        className={
          isDetail
            ? 'flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground'
            : 'flex-1 text-xs bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors'
        }
        disabled={isCreating}
      />
      <button
        type="button"
        onClick={submit}
        disabled={isCreating || !title.trim()}
        className="text-xs bg-primary text-white font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
      >
        {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
});
