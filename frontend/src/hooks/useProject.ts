import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';

const fetchProject = async (projectId: number): Promise<Project> => {
  const { data } = await api.get<Project>(`/projects/${projectId}`);
  return data;
};

export const useProject = (projectId?: number) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: projectId !== undefined,
  });
};
