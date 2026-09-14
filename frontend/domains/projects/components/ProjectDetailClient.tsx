'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProject } from '@/domains/projects/hooks/useProject';
import { useUpdateTask, useCreateTask, useDeleteTask, useReorderTasks } from '@/domains/tasks/hooks/useTaskMutations';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
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

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const sortedTasks = project ? [...project.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) : [];

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
    reorderTasks({ projectId, taskIds: newOrder.map((t) => t._id) });
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
    <div className="flex min-h-screen bg-[#0B0F19] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 text-xs text-white/50 mb-6">
            <Link href="/projects" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Proyectos
            </Link>
            {project && (
              <>
                <span>/</span>
                <span className="text-white font-medium">{project.name}</span>
              </>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-500/40 rounded-xl text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p className="font-semibold text-xs">Proyecto no encontrado</p>
            </div>
          )}

          {project && (
            <div className="space-y-6">
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5 flex-shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">{project.name}</h1>
                    {project.description && (
                      <p className="text-xs text-white/50 mt-1">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-white/50 font-medium">Progreso Global</span>
                    <span className="font-semibold text-primary">
                      {completedTasks}/{totalTasks} tareas completadas
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-[11px] text-white/40 mt-1">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">Tareas</h2>
                  <button
                    onClick={() => setShowInput(true)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:bg-primary/10 px-3 py-1.5 rounded-xl font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Tarea
                  </button>
                </div>

                {showInput && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-[#0B0F19] rounded-xl border border-white/10">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nombre de la tarea..."
                      className="flex-1 text-xs bg-transparent outline-none text-white placeholder:text-white/40"
                      disabled={isCreating}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={isCreating || !newTaskTitle.trim()}
                      className="text-xs bg-primary text-white font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
                    </button>
                    <button
                      onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {project.tasks.length === 0 && !showInput && (
                  <div className="text-center py-8">
                    <Circle className="w-7 h-7 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-xs">No hay tareas aún</p>
                  </div>
                )}

                <div className="space-y-1">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortedTasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                      {sortedTasks.map((task) => (
                        <SortableTaskItem
                          key={task._id}
                          task={task}
                          isDetailView={true}
                          onUpdateStatus={(taskId, isCompleted) => updateTask({ taskId, isCompleted })}
                          onDelete={(taskId) => deleteTask(taskId)}
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
