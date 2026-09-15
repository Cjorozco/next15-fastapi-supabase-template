'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { X, GripVertical, CheckCircle2, ChevronRight, ChevronDown, Plus, CornerDownRight } from 'lucide-react';
import { Task } from '@/domains/tasks/types';
import { Id } from '@/convex/_generated/dataModel';

interface SortableTaskItemProps {
  task: Task;
  onUpdateStatus: (taskId: Id<'tasks'>, isCompleted: boolean) => void;
  onDelete: (taskId: Id<'tasks'>) => void;
  onAddSubtask?: (taskId: Id<'tasks'>, title: string) => void;
  onToggleSubtask?: (taskId: Id<'tasks'>, subtaskId: string, isCompleted: boolean) => void;
  onRemoveSubtask?: (taskId: Id<'tasks'>, subtaskId: string) => void;
  isDetailView?: boolean;
}

export function SortableTaskItem({
  task,
  onUpdateStatus,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  isDetailView = false,
}: SortableTaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  if (isDetailView) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-xl border border-transparent transition-colors ${
          isDragging ? 'bg-card shadow-md border-primary/40' : 'hover:bg-muted/30'
        }`}
      >
        <div className="flex items-center gap-3 p-3 group">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Toggle expand subtasks */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
            title={isExpanded ? 'Ocultar subtareas' : 'Ver subtareas'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
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
              task.isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'
            }`}
          >
            {task.title}
          </label>

          {/* Badge de subtareas */}
          {totalSubtasksCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                completedSubtasksCount === totalSubtasksCount
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {completedSubtasksCount}/{totalSubtasksCount} subtareas
            </span>
          )}

          {task.isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
          )}

          {/* Botón rápido para añadir subtarea */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              setShowSubtaskInput(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted"
            title="Añadir subtarea"
          >
            <Plus className="w-3 h-3" />
            <span className="text-[10px]">Subtarea</span>
          </button>

          <button
            onClick={() => onDelete(task._id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1 rounded"
            title="Eliminar tarea"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sección desplegable de subtareas */}
        {isExpanded && (
          <div className="pl-11 pr-4 pb-3 space-y-1.5 animate-in fade-in-50 duration-150">
            {subtasks.map((subtask) => {
              const subtaskCheckboxId = `subtask-${subtask.id}`;
              return (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-muted/50 group/subtask transition-colors"
                >
                  <CornerDownRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <Checkbox
                    id={subtaskCheckboxId}
                    checked={subtask.isCompleted}
                    onCheckedChange={(checked) =>
                      onToggleSubtask?.(task._id, subtask.id, !!checked)
                    }
                  />
                  <label
                    htmlFor={subtaskCheckboxId}
                    className={`flex-1 text-[11px] cursor-pointer ${
                      subtask.isCompleted
                        ? 'line-through text-muted-foreground/60'
                        : 'text-foreground/90'
                    }`}
                  >
                    {subtask.title}
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveSubtask?.(task._id, subtask.id)}
                    className="opacity-0 group-hover/subtask:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-0.5 rounded"
                    title="Eliminar subtarea"
                  >
                    <X className="w-3 h-3" />
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
                  placeholder="Nombre de la subtarea..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSubtaskInput(false);
                      setNewSubtaskTitle('');
                    }
                  }}
                  className="flex-1 text-[11px] bg-muted/40 border border-border rounded-lg px-2.5 py-1 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="text-[10px] bg-primary text-white font-medium px-2 py-1 rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubtaskInput(false);
                    setNewSubtaskTitle('');
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubtaskInput(true)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors py-1 pl-5 font-medium"
              >
                <Plus className="w-3 h-3" />
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
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1 group/task relative ${
        isDragging ? 'bg-card rounded-lg shadow-xs border border-primary/40 indent-1' : ''
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <Checkbox
        id={statusLabelId}
        checked={task.isCompleted}
        onCheckedChange={(checked) => onUpdateStatus(task._id, !!checked)}
      />
      <label
        htmlFor={statusLabelId}
        className={`flex-1 text-xs cursor-pointer ${
          task.isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'
        }`}
      >
        {task.title}
      </label>

      {totalSubtasksCount > 0 && (
        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded font-medium border border-border/50">
          {completedSubtasksCount}/{totalSubtasksCount}
        </span>
      )}

      <button
        onClick={() => onDelete(task._id)}
        className="opacity-0 group-hover/task:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-0.5 rounded"
        title="Borrar tarea"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
