import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { mapErrorToUserMessage } from '@/shared/lib/userFacingError';

export const useCreateTask = () => {
  const create = useMutation(api.tasks.mutations.create);

  return {
    mutate: (
      { projectId, title }: { projectId: Id<'projects'>; title: string },
      options?: { onSuccess?: (data: { title: string }) => void }
    ) => {
      create({ projectId, title })
        .then((data) => {
          toast.success(`Tarea "${data.title}" creada`);
          options?.onSuccess?.(data);
        })
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al crear la tarea'));
        });
    },
    isPending: false,
  };
};

export const useUpdateTask = () => {
  const update = useMutation(api.tasks.mutations.update);

  return {
    mutate: ({
      taskId,
      isCompleted,
    }: {
      taskId: Id<'tasks'>;
      isCompleted: boolean;
    }) => {
      update({ taskId, isCompleted }).catch((err: unknown) => {
        toast.error(mapErrorToUserMessage(err, 'Error al actualizar la tarea'));
      });
    },
  };
};

export const useDeleteTask = () => {
  const remove = useMutation(api.tasks.mutations.remove);

  return {
    mutate: (taskId: Id<'tasks'>) => {
      remove({ taskId })
        .then(() => toast.success('Tarea eliminada'))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al eliminar la tarea'));
        });
    },
  };
};

export const useReorderTasks = () => {
  const reorder = useMutation(api.tasks.mutations.reorder);

  return {
    mutate: ({
      projectId,
      taskIds,
    }: {
      projectId: Id<'projects'>;
      taskIds: Id<'tasks'>[];
    }) => {
      reorder({ projectId, taskIds }).catch((err: unknown) => {
        toast.error(mapErrorToUserMessage(err, 'Error al reordenar las tareas'));
      });
    },
  };
};
