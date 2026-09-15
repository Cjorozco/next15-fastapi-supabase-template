import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { useState } from 'react';
import { mapErrorToUserMessage } from '@/shared/lib/userFacingError';

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
      newProject: { name: string; description?: string },
      options?: {
        onSuccess?: (data: { _id: string; name: string }) => void;
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
        .catch((err: unknown) => {
          const message = mapErrorToUserMessage(err, 'Error al crear el proyecto');
          toast.error(message);
          options?.onError?.(err instanceof Error ? err : new Error(message));
        })
        .finally(() => {
          setIsPending(false);
        });
    },
    isPending,
  };
};

export const useCreateProjectWithTasks = () => {
  const createWithTasks = useMutation(api.projects.createWithTasks);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (
      projectData: {
        name: string;
        description?: string;
        tasks: Array<{ title: string; position: number }>;
      },
      options?: {
        onSuccess?: (data: { _id: string; name: string; tasks: Array<{ title: string; position: number }> }) => void;
        onError?: (err: Error) => void;
      }
    ) => {
      setIsPending(true);
      void createWithTasks({
        name: projectData.name,
        description: projectData.description || undefined,
        tasks: projectData.tasks,
      })
        .then((data) => {
          toast.success(`Proyecto "${data.name}" generado con ${data.tasks.length} tareas`);
          options?.onSuccess?.(data);
        })
        .catch((err: unknown) => {
          const message = mapErrorToUserMessage(err, 'Error al crear el proyecto generado con IA');
          toast.error(message);
          options?.onError?.(err instanceof Error ? err : new Error(message));
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
        .catch((err: unknown) => {
          const message = mapErrorToUserMessage(err, 'Error al eliminar el proyecto');
          toast.error(message);
          options?.onError?.();
        })
        .finally(() => {
          setIsPending(false);
        });
    },
    isPending,
  };
};
