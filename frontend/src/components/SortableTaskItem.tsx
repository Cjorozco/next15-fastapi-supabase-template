'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { X, GripVertical, CheckCircle2 } from 'lucide-react';
import { Task } from '@/types';
import { Id } from '../../convex/_generated/dataModel';

interface SortableTaskItemProps {
  task: Task;
  onUpdateStatus: (taskId: Id<'tasks'>, isCompleted: boolean) => void;
  onDelete: (taskId: Id<'tasks'>) => void;
  isDetailView?: boolean;
}

export function SortableTaskItem({ task, onUpdateStatus, onDelete, isDetailView = false }: SortableTaskItemProps) {
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

  if (isDetailView) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 group transition-colors ${isDragging ? 'bg-slate-50 shadow-md border border-slate-200' : ''}`}
      >
        <button
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Checkbox
          id={statusLabelId}
          checked={task.isCompleted}
          onCheckedChange={(checked) => onUpdateStatus(task._id, !!checked)}
        />
        <label
          htmlFor={statusLabelId}
          className={`flex-1 text-sm cursor-pointer ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}
        >
          {task.title}
        </label>
        {task.isCompleted && (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}
        <button
          onClick={() => onDelete(task._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1 rounded"
          title="Delete task"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1 group/task relative ${isDragging ? 'bg-slate-50 rounded shadow-sm border border-slate-200 indent-1' : ''}`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
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
        className={`flex-1 text-sm cursor-pointer ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}
      >
        {task.title}
      </label>
      <button
        onClick={() => onDelete(task._id)}
        className="opacity-0 group-hover/task:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-0.5 rounded"
        title="Borrar tarea"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
