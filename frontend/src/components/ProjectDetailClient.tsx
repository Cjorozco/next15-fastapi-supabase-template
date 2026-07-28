'use client';

import { useProject } from '@/hooks/useProject';
import { useUpdateTask, useCreateTask, useDeleteTask, useReorderTasks } from '@/hooks/useTasks';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import {
  Loader2, AlertCircle, ArrowLeft, Plus, X,
  Circle, FolderKanban
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';

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
    createTask({ projectId, title }, {
      onSuccess: () => { setNewTaskTitle(''); setShowInput(false); },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') { setShowInput(false); setNewTaskTitle(''); }
  };

  const completedTasks = project?.tasks.filter((t) => t.isCompleted).length ?? 0;
  const totalTasks = project?.tasks.length ?? 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/projects" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Projects
            </Link>
            {project && (
              <>
                <span>/</span>
                <span className="text-slate-900 font-medium">{project.name}</span>
              </>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-semibold">Project not found</p>
            </div>
          )}

          {project && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <FolderKanban className="w-7 h-7 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                    {project.description && (
                      <p className="text-slate-500 mt-1">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">Global Progress</span>
                    <span className="font-semibold text-slate-900">
                      {completedTasks}/{totalTasks} tasks completed
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-slate-900 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-slate-400 mt-1">{Math.round(progress)}%</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
                  <button
                    onClick={() => setShowInput(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Task
                  </button>
                </div>

                {showInput && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Task name..."
                      className="flex-1 text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
                      disabled={isCreating}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={isCreating || !newTaskTitle.trim()}
                      className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                    </button>
                    <button
                      onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {project.tasks.length === 0 && !showInput && (
                  <div className="text-center py-8">
                    <Circle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No tasks yet</p>
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
