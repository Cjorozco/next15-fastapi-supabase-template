'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { useUpdateTask, useCreateTask, useDeleteTask } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, X } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((task) => task.is_completed).length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    createTask(
      { projectId: project.id, title },
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <Link href={`/projects/${project.id}`} className="block group cursor-pointer">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Progress</span>
            <span className="text-slate-900 font-semibold">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-slate-900 h-2 rounded-full transition-all duration-300 group-hover:bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Tasks</h4>
        {project.tasks.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No tasks yet</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {project.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1 group/task">
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.is_completed}
                  onCheckedChange={(checked) => {
                    updateTask({ taskId: task.id, isCompleted: !!checked });
                  }}
                />
                <label
                  htmlFor={`task-${task.id}`}
                  className={`flex-1 text-sm cursor-pointer ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                >
                  {task.title}
                </label>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover/task:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-0.5 rounded"
                  title="Borrar tarea"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
              className="flex-1 text-sm border border-slate-300 rounded-md px-2 py-1 outline-none focus:border-slate-500 transition-colors"
              disabled={isCreating}
            />
            <button
              onClick={handleAddTask}
              disabled={isCreating || !newTaskTitle.trim()}
              className="text-sm bg-slate-900 text-white px-3 py-1 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewTaskTitle(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mt-3 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
