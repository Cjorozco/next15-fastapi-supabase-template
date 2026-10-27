'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/domains/projects/types';
import { useUpdateTask, useCreateTask, useDeleteTask, useReorderTasks } from '@/domains/tasks/hooks/useTaskMutations';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';
import { EditProjectDialog } from './EditProjectDialog';
import { NewTaskForm } from '@/domains/tasks/components/NewTaskForm';
import { Plus } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface ProjectCardProps {
  project: Project;
}

function ProjectCardComponent({ project }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((task) => task.isCompleted).length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: reorderTasks } = useReorderTasks();

  const [showInput, setShowInput] = useState(false);

  const sortedTasks = useMemo(
    () => [...project.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [project.tasks]
  );
  const sortableIds = useMemo(() => sortedTasks.map((t) => t._id), [sortedTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedTasks.findIndex((t) => t._id === active.id);
    const newIndex = sortedTasks.findIndex((t) => t._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sortedTasks, oldIndex, newIndex);
    reorderTasks({ projectId: project._id, taskIds: newOrder.map(t => t._id) });
  };

  const projectId = project._id;
  const handleCreateTask = useCallback(
    (title: string, onCreated: () => void) => {
      createTask(
        { projectId, title },
        {
          onSuccess: () => {
            onCreated();
            setShowInput(false);
          },
        }
      );
    },
    [createTask, projectId]
  );
  const handleCancelCreate = useCallback(() => setShowInput(false), []);

  const handleUpdateStatus = useCallback(
    (taskId: Id<'tasks'>, isCompleted: boolean) => updateTask({ taskId, isCompleted }),
    [updateTask]
  );
  const handleDeleteTask = useCallback((taskId: Id<'tasks'>) => deleteTask(taskId), [deleteTask]);

  return (
    <div className="relative bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors shadow-sm">
      <EditProjectDialog
        projectId={project._id}
        name={project.name}
        description={project.description}
        className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-primary p-2.5 rounded-lg hover:bg-muted transition-colors"
      />

      <Link href={`/projects/${project._id}`} className="block group cursor-pointer">
        <div className="mb-4 pr-8">
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
              className="bg-primary h-1.5 rounded-full transition-[width] duration-300 motion-reduce:transition-none shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground/80 mb-3">Tareas</h4>
        {project.tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No hay tareas aún</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {sortedTasks.map((task) => (
                  <SortableTaskItem
                    key={task._id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {showInput ? (
          <NewTaskForm
            isCreating={isCreating}
            onSubmit={handleCreateTask}
            onCancel={handleCancelCreate}
          />
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

export const ProjectCard = memo(ProjectCardComponent);
