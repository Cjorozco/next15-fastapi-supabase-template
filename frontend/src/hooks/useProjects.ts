import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { toast } from 'sonner';
import axios from 'axios';

const fetchProjects = async (userId: number): Promise<Project[]> => {
  const { data } = await api.get<Project[]>(`/users/${userId}/projects/`);
  return data;
};

export const useProjects = (userId?: number) => {
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: () => fetchProjects(userId!),
    enabled: userId !== undefined,
  });
};

export const useCreateProject = (userId?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject: { name: string; description: string }) => {
      const response = await api.post('/projects', newProject);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
      toast.success(`Proyecto "${data.name}" creado`);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        toast.error(err.response.data.detail);
      } else {
        toast.error('Error al crear el proyecto');
      }
    },
  });
};

export const useDeleteProject = (userId?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
      toast.success('Proyecto eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar el proyecto');
    },
  });
};