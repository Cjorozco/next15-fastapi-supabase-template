'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/domains/projects/types';
import { useUpdateTask, useCreateTask, useDeleteTask, useReorderTasks } from '@/domains/tasks/hooks/useTaskMutations';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';
import { Plus, Loader2 } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((task) => task.isCompleted).length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: reorderTasks } = useReorderTasks();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const sortedTasks = [...project.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedTasks.findIndex((t) => t._id === active.id);
    const newIndex = sortedTasks.findIndex((t) => t._id === over.id);

    const newOrder = arrayMove(sortedTasks, oldIndex, newIndex);
    reorderTasks({ projectId: project._id, taskIds: newOrder.map(t => t._id) });
  };

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    createTask(
      { projectId: project._id, title },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setShowInput(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') {
      setShowInput(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 hover:border-[#FF6B1A]/40 hover:shadow-[0_0_24px_rgba(255,107,26,0.12)] transition-all">
      <Link href={`/projects/${project._id}`} className="block group cursor-pointer">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#FF6B1A] transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-white/60 line-clamp-2">{project.description}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/60 font-medium">Progress</span>
            <span className="text-white font-semibold">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-[#FF6B1A] h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(255,107,26,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white/80 mb-3">Tasks</h4>
        {project.tasks.length === 0 ? (
          <p className="text-sm text-white/40 italic">No tasks yet</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                {sortedTasks.map((task) => (
                  <SortableTaskItem
                    key={task._id}
                    task={task}
                    onUpdateStatus={(taskId, isCompleted) => updateTask({ taskId, isCompleted })}
                    onDelete={(taskId) => deleteTask(taskId)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {showInput ? (
          <div className="flex items-center gap-2 mt-3">
            <input
              autoFocus
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nombre de la tarea..."
              className="flex-1 text-sm bg-[#0A1E3F] border border-white/15 rounded-md px-2.5 py-1 text-white placeholder:text-white/30 outline-none focus:border-[#FF6B1A] transition-colors"
              disabled={isCreating}
            />
            <button
              onClick={handleAddTask}
              disabled={isCreating || !newTaskTitle.trim()}
              className="text-sm bg-[#FF6B1A] text-white font-semibold px-3 py-1 rounded-md hover:bg-[#E05A10] disabled:opacity-50 transition-all flex items-center gap-1 shadow-sm"
            >
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
              className="text-sm text-white/50 hover:text-white px-2 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-sm text-white/50 hover:text-[#FF6B1A] mt-3 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
