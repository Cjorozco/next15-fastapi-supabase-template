import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { toast } from 'sonner';

const PROJECTS_KEY = ['projects'];

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, title }: { projectId: number; title: string }) => {
      const response = await api.post(`/projects/${projectId}/tasks/`, { title });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(`Task "${data.title}" created`);
    },
    onError: () => {
      toast.error('Error creating task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number; isCompleted: boolean }) => {
      const response = await api.patch(`/tasks/${taskId}?is_completed=${isCompleted}`);
      return response.data;
    },
    onMutate: async (updatedTask) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });
      const previousData = queryClient.getQueriesData<Project[]>({ queryKey: PROJECTS_KEY });

      queryClient.setQueriesData<Project[]>({ queryKey: PROJECTS_KEY }, (old) => {
        if (!old) return old;
        return old.map((project) => ({
          ...project,
          tasks: project.tasks.map((t) =>
            t.id === updatedTask.taskId ? { ...t, is_completed: updatedTask.isCompleted } : t
          ),
        }));
      });

      return { previousData };
    },
    onError: (_err, _updatedTask, context) => {
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('Error updating task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: number) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Error deleting task');
    },
  });
};

export const useReorderTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, taskIds }: { projectId: number; taskIds: number[] }) => {
      const response = await api.put(`/projects/${projectId}/tasks/reorder`, { task_ids: taskIds });
      return response.data;
    },
    onMutate: async ({ projectId, taskIds }) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });
      const previousData = queryClient.getQueriesData<Project[]>({ queryKey: PROJECTS_KEY });

      queryClient.setQueriesData<Project[]>({ queryKey: PROJECTS_KEY }, (old) => {
        if (!old) return old;
        return old.map((project) => {
          if (project.id === projectId) {
            const reorderedTasks = taskIds.map(id => project.tasks.find(t => t.id === id)).filter(Boolean) as typeof project.tasks;
            const missingTasks = project.tasks.filter(t => !taskIds.includes(t.id));
            return {
              ...project,
              tasks: [...reorderedTasks, ...missingTasks].map((t, index) => ({ ...t, position: index }))
            };
          }
          return project;
        });
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error('Error reordering tasks');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
};
