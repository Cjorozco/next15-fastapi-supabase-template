import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export const useProject = (projectId?: Id<'projects'>) => {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.users.me,
    isAuthenticated ? {} : 'skip'
  );

  const data = useQuery(
    api.projects.get,
    currentUser && projectId ? { projectId } : 'skip'
  );

  return {
    data: data ?? undefined,
    isLoading:
      authLoading ||
      currentUser === undefined ||
      (currentUser !== null && projectId !== undefined && data === undefined),
    error: data === null ? new Error('Project not found') : null,
  };
};
