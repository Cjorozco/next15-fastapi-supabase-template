'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { X, GripVertical, CheckCircle2 } from 'lucide-react';
import { Task } from '@/domains/tasks/types';
import { Id } from '@/convex/_generated/dataModel';

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
        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 group transition-colors ${
          isDragging ? 'bg-[#0D0D0D] shadow-md border border-[#FF6B1A]/40' : ''
        }`}
      >
        <button
          className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white"
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
          className={`flex-1 text-sm cursor-pointer ${task.isCompleted ? 'line-through text-white/40' : 'text-white'}`}
        >
          {task.title}
        </label>
        {task.isCompleted && (
          <CheckCircle2 className="w-4 h-4 text-[#FF6B1A] flex-shrink-0" />
        )}
        <button
          onClick={() => onDelete(task._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 p-1 rounded"
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
      className={`flex items-center gap-2 py-1 group/task relative ${
        isDragging ? 'bg-[#0D0D0D] rounded shadow-sm border border-[#FF6B1A]/40 indent-1' : ''
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white shrink-0"
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
        className={`flex-1 text-sm cursor-pointer ${task.isCompleted ? 'line-through text-white/40' : 'text-white'}`}
      >
        {task.title}
      </label>
      <button
        onClick={() => onDelete(task._id)}
        className="opacity-0 group-hover/task:opacity-100 transition-opacity text-white/30 hover:text-red-400 p-0.5 rounded"
        title="Borrar tarea"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
