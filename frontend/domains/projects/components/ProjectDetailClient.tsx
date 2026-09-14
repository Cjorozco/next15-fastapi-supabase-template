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
    <div className="flex min-h-screen bg-[#0A1E3F] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/projects" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Projects
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
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B1A]" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-500/40 rounded-lg text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p className="font-semibold">Project not found</p>
            </div>
          )}

          {project && (
            <div className="space-y-6">
              <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-[#FF6B1A]/15 text-[#FF6B1A] mt-0.5 flex-shrink-0">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                    {project.description && (
                      <p className="text-white/60 mt-1">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/60 font-medium">Global Progress</span>
                    <span className="font-semibold text-[#FF6B1A]">
                      {completedTasks}/{totalTasks} tasks completed
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div
                      className="bg-[#FF6B1A] h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,107,26,0.4)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-white/40 mt-1">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Tasks</h2>
                  <button
                    onClick={() => setShowInput(true)}
                    className="flex items-center gap-1.5 text-sm text-[#FF6B1A] hover:bg-[#FF6B1A]/10 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Task
                  </button>
                </div>

                {showInput && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-[#0A1E3F] rounded-lg border border-white/15">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Task name..."
                      className="flex-1 text-sm bg-transparent outline-none text-white placeholder:text-white/40"
                      disabled={isCreating}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={isCreating || !newTaskTitle.trim()}
                      className="text-sm bg-[#FF6B1A] text-white font-semibold px-3 py-1.5 rounded-md hover:bg-[#E05A10] disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
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
                    <Circle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">No tasks yet</p>
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
