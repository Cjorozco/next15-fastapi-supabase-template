'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProject } from '@/domains/projects/hooks/useProject';
import {
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
  useAddSubtask,
  useToggleSubtask,
  useRemoveSubtask,
  useConvertTaskToSubtask,
} from '@/domains/tasks/hooks/useTaskMutations';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RefineProjectWithAiModal } from './RefineProjectWithAiModal';
import { SortableTaskItem } from './SortableTaskItem';
import { Plus, ArrowLeft, Loader2, AlertCircle, FolderKanban, Circle, X } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface ProjectDetailClientProps {
  projectId: Id<'projects'>;
}

export function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const { data: project, isLoading, error } = useProject(projectId);
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: reorderTasks } = useReorderTasks();
  const { mutate: addSubtask } = useAddSubtask();
  const { mutate: toggleSubtask } = useToggleSubtask();
  const { mutate: removeSubtask } = useRemoveSubtask();
  const { mutate: convertTaskToSubtask } = useConvertTaskToSubtask();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);

  const sortedTasks = project ? [...project.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Detectar si fue soltado en la zona de subtarea de otra tarea
    if (typeof over.id === 'string' && over.id.startsWith('subtask-target-')) {
      const targetTaskId = over.id.replace('subtask-target-', '') as Id<'tasks'>;
      const sourceTaskId = active.id as Id<'tasks'>;
      if (sourceTaskId !== targetTaskId) {
        convertTaskToSubtask({ sourceTaskId, targetTaskId });
      }
      return;
    }

    const oldIndex = sortedTasks.findIndex((t) => t._id === active.id);
    const newIndex = sortedTasks.findIndex((t) => t._id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newOrder = arrayMove(sortedTasks, oldIndex, newIndex);
      reorderTasks({ projectId, taskIds: newOrder.map((t) => t._id) });
    }
  };

  const handleDragCancel = () => {
    setActiveDraggingId(null);
  };

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    createTask(
      { projectId, title },
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
    if (e.key === 'Escape') { setShowInput(false); setNewTaskTitle(''); }
  };

  const completedTasks = project?.tasks.filter((t) => t.isCompleted).length ?? 0;
  const totalTasks = project?.tasks.length ?? 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/projects" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Proyectos
            </Link>
            {project && (
              <>
                <span>/</span>
                <span className="text-foreground font-medium">{project.name}</span>
              </>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-semibold text-xs">Proyecto no encontrado</p>
            </div>
          )}

          {project && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5 flex-shrink-0">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <RefineProjectWithAiModal
                    projectId={project._id}
                    projectName={project.name}
                    projectDescription={project.description}
                    tasks={project.tasks}
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground font-medium">Progreso Global</span>
                    <span className="font-semibold text-primary">
                      {completedTasks}/{totalTasks} tareas completadas
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-[11px] text-muted-foreground mt-1">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Tareas</h2>
                  <button
                    onClick={() => setShowInput(true)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Tarea
                  </button>
                </div>

                {showInput && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted/40 rounded-xl border border-border">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nombre de la tarea..."
                      className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                      disabled={isCreating}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={isCreating || !newTaskTitle.trim()}
                      className="text-xs bg-primary text-white font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
                    </button>
                    <button
                      onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {project.tasks.length === 0 && !showInput && (
                  <div className="text-center py-8">
                    <Circle className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-xs">No hay tareas aún</p>
                  </div>
                )}

                <div className="space-y-1">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragCancel={handleDragCancel}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={sortedTasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                      {sortedTasks.map((task) => (
                        <SortableTaskItem
                          key={task._id}
                          task={task}
                          isDetailView={true}
                          activeDraggingId={activeDraggingId}
                          onUpdateStatus={(taskId, isCompleted) => updateTask({ taskId, isCompleted })}
                          onDelete={(taskId) => deleteTask(taskId)}
                          onAddSubtask={(taskId, title) => addSubtask({ taskId, title })}
                          onToggleSubtask={(taskId, subtaskId, isCompleted) =>
                            toggleSubtask({ taskId, subtaskId, isCompleted })
                          }
                          onRemoveSubtask={(taskId, subtaskId) =>
                            removeSubtask({ taskId, subtaskId })
                          }
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
