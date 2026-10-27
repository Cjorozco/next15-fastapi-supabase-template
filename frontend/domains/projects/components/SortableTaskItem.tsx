'use client';

import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { X, GripVertical, CheckCircle2, ChevronRight, ChevronDown, Plus, CornerDownRight } from 'lucide-react';
import { Task, TaskDetailsInput } from '@/domains/tasks/types';
import { TaskMeta } from '@/domains/tasks/components/TaskBadges';
import { TaskEditForm } from '@/domains/tasks/components/TaskEditForm';
import { resolveTaskStatus } from '@/convex/lib/taskFields';
import { Id } from '@/convex/_generated/dataModel';

// Hover-only controls must also appear on keyboard focus and on touch (no hover).
const REVEAL_ROW =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100';
const REVEAL_SUBTASK =
  'opacity-0 group-hover/subtask:opacity-100 group-focus-within/subtask:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100';
const REVEAL_COMPACT =
  'opacity-0 group-hover/task:opacity-100 group-focus-within/task:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

interface SortableTaskItemProps {
  task: Task;
  onUpdateStatus: (taskId: Id<'tasks'>, isCompleted: boolean) => void;
  onDelete: (taskId: Id<'tasks'>) => void;
  onAddSubtask?: (taskId: Id<'tasks'>, title: string) => void;
  onToggleSubtask?: (taskId: Id<'tasks'>, subtaskId: string, isCompleted: boolean) => void;
  onRemoveSubtask?: (taskId: Id<'tasks'>, subtaskId: string) => void;
  /** Enables the edit form in the expanded detail view. Resolves true when saved. */
  onSaveDetails?: (taskId: Id<'tasks'>, input: TaskDetailsInput) => Promise<boolean>;
  isDetailView?: boolean;
  activeDraggingId?: string | null;
}

function SortableTaskItemComponent({
  task,
  onUpdateStatus,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onSaveDetails,
  isDetailView = false,
  activeDraggingId = null,
}: SortableTaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  // Droppable zone for converting another dragged task into a subtask of this task
  const {
    isOver: isOverSubtaskDrop,
    setNodeRef: setSubtaskDropRef,
  } = useDroppable({
    id: `subtask-target-${task._id}`,
    data: {
      type: 'subtask-target',
      targetTaskId: task._id,
    },
    disabled: !isDetailView || !activeDraggingId || activeDraggingId === task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const statusLabelId = `task-${isDetailView ? 'detail-' : ''}${task._id}`;
  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasksCount = subtasks.length;

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title || !onAddSubtask) return;

    onAddSubtask(task._id, title);
    setNewSubtaskTitle('');
    setShowSubtaskInput(false);
    setIsExpanded(true);
  };

  const hasMeta =
    task.dueDate !== undefined || task.estimatedHours !== undefined || task.priority === 'alta';
  // Remount the form when the task changes on the server so it never shows stale values.
  const formKey = [
    task.title,
    resolveTaskStatus(task),
    task.dueDate,
    task.estimatedHours,
    task.priority,
    task.notes,
  ].join('|');

  const isAnotherTaskDragging = isDetailView && activeDraggingId && activeDraggingId !== task._id;

  if (isDetailView) {
    return (
      <div
        ref={setSortableRef}
        style={style}
        className={`rounded-xl border transition-colors duration-150 ${
          isDragging
            ? 'bg-card shadow-lg border-primary/40'
            : isOverSubtaskDrop
            ? 'bg-primary/5 border-primary shadow-sm'
            : 'border-transparent hover:bg-muted/30'
        }`}
      >
        <div className="flex items-center gap-3 p-3 group">
          <button
            type="button"
            aria-label={`Reordenar tarea ${task.title}`}
            className={`cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded p-1.5 -m-1.5 touch-none ${FOCUS_RING}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Toggle expand subtasks */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 -m-1 rounded hover:bg-muted ${FOCUS_RING}`}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Ocultar detalles' : 'Ver detalles y subtareas'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          <Checkbox
            id={statusLabelId}
            checked={task.isCompleted}
            onCheckedChange={(checked) => onUpdateStatus(task._id, !!checked)}
          />

          <label
            htmlFor={statusLabelId}
            className={`flex-1 text-xs cursor-pointer font-medium ${
              task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {task.title}
          </label>

          {/* Badge de subtareas */}
          {totalSubtasksCount > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                completedSubtasksCount === totalSubtasksCount
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {completedSubtasksCount}/{totalSubtasksCount} subtareas
            </span>
          )}

          {task.isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          )}

          {/* Botón rápido para añadir subtarea */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              setShowSubtaskInput(true);
            }}
            className={`${REVEAL_ROW} transition-opacity text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted ${FOCUS_RING}`}
            aria-label={`Añadir subtarea a ${task.title}`}
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            <span className="text-xs">Subtarea</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className={`${REVEAL_ROW} transition-opacity text-muted-foreground hover:text-destructive p-2 -m-1 rounded ${FOCUS_RING}`}
            aria-label={`Eliminar tarea ${task.title}`}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="pl-[4.5rem] pr-3 pb-2 -mt-1">
          <TaskMeta task={task} />
        </div>

        {/* Zona visual de Drop para convertir la tarea arrastrada en subtarea */}
        {isAnotherTaskDragging && (
          <div
            ref={setSubtaskDropRef}
            className={`mx-3 mb-2.5 p-2 rounded-xl border-2 border-dashed transition-colors flex items-center justify-center gap-2 text-xs select-none ${
              isOverSubtaskDrop
                ? 'border-primary bg-primary/20 text-primary font-semibold shadow-sm ring-2 ring-primary/20'
                : 'border-primary/40 bg-primary/5 text-primary/80 hover:border-primary/70 hover:bg-primary/10'
            }`}
          >
            <CornerDownRight
              aria-hidden="true"
              className={`w-3.5 h-3.5 ${isOverSubtaskDrop ? 'text-primary' : 'text-primary/70'}`}
            />
            <span>
              {isOverSubtaskDrop
                ? '¡Soltar para convertir en subtarea!'
                : 'Soltar aquí para convertir en subtarea'}
            </span>
          </div>
        )}

        {/* Sección desplegable de subtareas */}
        {isExpanded && (
          <div className="animate-in fade-in-50 duration-150">
            {onSaveDetails && (
              <TaskEditForm
                key={formKey}
                task={task}
                onSave={(input) => onSaveDetails(task._id, input)}
              />
            )}
          </div>
        )}

        {isExpanded && (
          <div className="pl-11 pr-4 pb-3 space-y-1.5 animate-in fade-in-50 duration-150">
            {subtasks.map((subtask) => {
              const subtaskCheckboxId = `subtask-${subtask.id}`;
              return (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-muted/50 group/subtask transition-colors"
                >
                  <CornerDownRight className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
                  <Checkbox
                    id={subtaskCheckboxId}
                    checked={subtask.isCompleted}
                    onCheckedChange={(checked) =>
                      onToggleSubtask?.(task._id, subtask.id, !!checked)
                    }
                  />
                  <label
                    htmlFor={subtaskCheckboxId}
                    className={`flex-1 text-xs cursor-pointer ${
                      subtask.isCompleted
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {subtask.title}
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveSubtask?.(task._id, subtask.id)}
                    className={`${REVEAL_SUBTASK} transition-opacity text-muted-foreground hover:text-destructive p-2 -m-1.5 rounded ${FOCUS_RING}`}
                    aria-label={`Eliminar subtarea ${subtask.title}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            {/* Input inline para nueva subtarea */}
            {showSubtaskInput ? (
              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 pt-1 pl-5">
                <input
                  type="text"
                  autoFocus
                  aria-label="Nombre de la subtarea"
                  placeholder="Nombre de la subtarea..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSubtaskInput(false);
                      setNewSubtaskTitle('');
                    }
                  }}
                  className="flex-1 text-xs bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className={`text-xs bg-primary text-primary-foreground font-medium px-2.5 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubtaskInput(false);
                    setNewSubtaskTitle('');
                  }}
                  className={`text-muted-foreground hover:text-foreground text-xs p-2 -m-1 rounded ${FOCUS_RING}`}
                  aria-label="Cancelar nueva subtarea"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubtaskInput(true)}
                className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1.5 pl-5 font-medium rounded ${FOCUS_RING}`}
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Añadir subtarea</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`py-1 group/task relative ${
        isDragging ? 'bg-card rounded-lg shadow-xs border border-primary/40 indent-1' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Reordenar tarea ${task.title}`}
          className={`cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 rounded p-1.5 -m-1.5 touch-none ${FOCUS_RING}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <Checkbox
          id={statusLabelId}
          checked={task.isCompleted}
          onCheckedChange={(checked) => onUpdateStatus(task._id, !!checked)}
        />
        <label
          htmlFor={statusLabelId}
          className={`flex-1 text-xs cursor-pointer ${
            task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {task.title}
        </label>

        {totalSubtasksCount > 0 && (
          <span
            className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium border border-border/50"
            aria-label={`${completedSubtasksCount} de ${totalSubtasksCount} subtareas completadas`}
          >
            {completedSubtasksCount}/{totalSubtasksCount}
          </span>
        )}

        <button
          type="button"
          onClick={() => onDelete(task._id)}
          className={`${REVEAL_COMPACT} transition-opacity text-muted-foreground hover:text-destructive p-2 -m-1 rounded ${FOCUS_RING}`}
          aria-label={`Eliminar tarea ${task.title}`}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {hasMeta && <TaskMeta task={task} compact />}
    </div>
  );
}

export const SortableTaskItem = memo(SortableTaskItemComponent);
