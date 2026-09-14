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
    <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all shadow-sm">
      <Link href={`/projects/${project._id}`} className="block group cursor-pointer">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description || 'Sin descripción'}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium">Progreso</span>
            <span className="text-foreground font-semibold">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground/80 mb-3">Tareas</h4>
        {project.tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic">No hay tareas aún</p>
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
              className="flex-1 text-xs bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              disabled={isCreating}
            />
            <button
              onClick={handleAddTask}
              disabled={isCreating || !newTaskTitle.trim()}
              className="text-xs bg-primary text-white font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
            >
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-3 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva tarea
          </button>
        )}
      </div>
    </div>
  );
}
