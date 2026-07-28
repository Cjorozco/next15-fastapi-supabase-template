import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { useState } from 'react';

export const useProjects = () => {
  const currentUser = useQuery(api.users.me);
  const error: Error | null = null;

  const data = useQuery(
    api.projects.list,
    currentUser ? {} : 'skip'
  );

  return {
    data,
    isLoading: currentUser === undefined || (currentUser !== null && data === undefined),
    error,
  };
};

export const useCreateProject = () => {
  const create = useMutation(api.projects.create);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (
      newProject: { name: string; description: string },
      options?: {
        onSuccess?: (data: unknown) => void;
        onError?: (err: Error) => void;
      }
    ) => {
      setIsPending(true);
      void create({
        name: newProject.name,
        description: newProject.description || undefined,
      })
        .then((data) => {
          toast.success(`Proyecto "${data.name}" creado`);
          options?.onSuccess?.(data);
        })
        .catch((err: Error) => {
          toast.error(err.message || 'Error al crear el proyecto');
          options?.onError?.(err);
        })
        .finally(() => {
          setIsPending(false);
        });
    },
    isPending,
  };
};

export const useDeleteProject = () => {
  const remove = useMutation(api.projects.remove);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (
      projectId: Parameters<typeof remove>[0]['projectId'],
      options?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      setIsPending(true);
      void remove({ projectId })
        .then(() => {
          toast.success('Proyecto eliminado');
          options?.onSuccess?.();
        })
        .catch(() => {
          toast.error('Error al eliminar el proyecto');
          options?.onError?.();
        })
        .finally(() => {
          setIsPending(false);
        });
    },
    isPending,
  };
};
