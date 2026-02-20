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
