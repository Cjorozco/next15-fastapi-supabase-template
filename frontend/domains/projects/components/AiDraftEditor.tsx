'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { NativeSelect } from '@/shared/components/ui/native-select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCES,
  TASK_RECURRENCE_SHORT_LABELS,
  type TaskPriority,
  type TaskRecurrence,
} from '@/convex/lib/taskFields';
import {
  newDraftTask,
  type DraftTask,
  type ProjectDraft,
} from '@/domains/projects/lib/ai-draft';

interface AiDraftEditorProps {
  draft: ProjectDraft;
  onChange: (draft: ProjectDraft) => void;
  disabled?: boolean;
}

/**
 * Editable preview of an AI-generated project: name, description and every task
 * (title, priority, hours, date) can be changed, removed or added before creating it.
 */
export function AiDraftEditor({ draft, onChange, disabled = false }: AiDraftEditorProps) {
  const updateTask = (key: string, patch: Partial<DraftTask>) =>
    onChange({
      ...draft,
      tasks: draft.tasks.map((task) => (task.key === key ? { ...task, ...patch } : task)),
    });

  const removeTask = (key: string) =>
    onChange({ ...draft, tasks: draft.tasks.filter((task) => task.key !== key) });

  const addTask = () => onChange({ ...draft, tasks: [...draft.tasks, newDraftTask()] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="draft-name" className="text-xs font-semibold text-foreground">
          Nombre del proyecto
        </Label>
        <Input
          id="draft-name"
          value={draft.name}
          maxLength={100}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="bg-muted/50 border-border text-sm rounded-xl h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="draft-description" className="text-xs font-semibold text-foreground">
          Descripción
        </Label>
        <Textarea
          id="draft-description"
          value={draft.description}
          rows={2}
          maxLength={1000}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          className="bg-muted/50 border border-border text-xs rounded-xl resize-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">
          Tareas ({draft.tasks.length})
        </p>
        <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {draft.tasks.map((task, index) => {
            const n = index + 1;
            return (
              <li
                key={task.key}
                className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={task.title}
                    maxLength={200}
                    disabled={disabled}
                    placeholder="Título de la tarea"
                    aria-label={`Título de la tarea ${n}`}
                    onChange={(e) => updateTask(task.key, { title: e.target.value })}
                    className="bg-background border-border text-xs rounded-lg h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    aria-label={`Eliminar tarea ${n}`}
                    onClick={() => removeTask(task.key)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <NativeSelect
                    value={task.priority}
                    disabled={disabled}
                    aria-label={`Prioridad de la tarea ${n}`}
                    onChange={(e) =>
                      updateTask(task.key, { priority: e.target.value as TaskPriority | '' })
                    }
                    className="h-8 text-xs"
                  >
                    <option value="">Sin prioridad</option>
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={task.estimatedHours}
                    disabled={disabled}
                    placeholder="Ej. 10 min"
                    aria-label={`Duración estimada de la tarea ${n}`}
                    onChange={(e) => updateTask(task.key, { estimatedHours: e.target.value })}
                    className="bg-background border-border text-xs rounded-lg h-8"
                  />
                  <NativeSelect
                    value={task.recurrence}
                    disabled={disabled}
                    aria-label={`Repetición de la tarea ${n}`}
                    onChange={(e) =>
                      updateTask(task.key, { recurrence: e.target.value as TaskRecurrence | '' })
                    }
                    className="h-8 text-xs"
                  >
                    <option value="">Sin repetir</option>
                    {TASK_RECURRENCES.map((recurrence) => (
                      <option key={recurrence} value={recurrence}>
                        {TASK_RECURRENCE_SHORT_LABELS[recurrence]}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    type="date"
                    value={task.dueDate}
                    disabled={disabled || task.noDeadline}
                    aria-label={`Fecha de la tarea ${n}`}
                    onChange={(e) => updateTask(task.key, { dueDate: e.target.value })}
                    className="bg-background border-border text-xs rounded-lg h-8"
                  />
                </div>
                <label
                  htmlFor={`draft-no-deadline-${task.key}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit"
                >
                  <Checkbox
                    id={`draft-no-deadline-${task.key}`}
                    checked={task.noDeadline}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateTask(task.key, checked ? { noDeadline: true, dueDate: '' } : { noDeadline: false })
                    }
                  />
                  <span>
                    Sin fecha límite
                    <span className="sr-only"> (tarea {n})</span>
                  </span>
                </label>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground w-fit">
                    Subtareas y notas
                    {(task.subtasks.trim() || task.notes.trim()) && (
                      <span className="sr-only"> (con contenido, tarea {n})</span>
                    )}
                  </summary>
                  <div className="space-y-2 pt-2">
                    <Textarea
                      value={task.subtasks}
                      rows={3}
                      disabled={disabled}
                      placeholder="Una subtarea por línea"
                      aria-label={`Subtareas de la tarea ${n} (una por línea)`}
                      onChange={(e) => updateTask(task.key, { subtasks: e.target.value })}
                      className="bg-background border border-border text-xs rounded-lg resize-none"
                    />
                    <Textarea
                      value={task.notes}
                      rows={2}
                      maxLength={500}
                      disabled={disabled}
                      placeholder="Notas"
                      aria-label={`Notas de la tarea ${n}`}
                      onChange={(e) => updateTask(task.key, { notes: e.target.value })}
                      className="bg-background border border-border text-xs rounded-lg resize-none"
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addTask}
          className="text-xs h-8 rounded-lg border-border"
        >
          <Plus className="w-3 h-3 mr-1.5" />
          Agregar tarea
        </Button>
      </div>
    </div>
  );
}
