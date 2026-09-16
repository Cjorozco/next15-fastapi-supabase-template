import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { mapErrorToUserMessage } from '@/shared/lib/userFacingError';

export const useCreateTask = () => {
  const create = useMutation(api.tasks.create);

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
  const update = useMutation(api.tasks.update);

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
  const remove = useMutation(api.tasks.remove);

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
  const reorder = useMutation(api.tasks.reorder);

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

export const useAddSubtask = () => {
  const addSubtask = useMutation(api.tasks.addSubtask);

  return {
    mutate: (
      { taskId, title }: { taskId: Id<'tasks'>; title: string },
      options?: { onSuccess?: () => void }
    ) => {
      addSubtask({ taskId, title })
        .then(() => {
          options?.onSuccess?.();
        })
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al agregar la subtarea'));
        });
    },
  };
};

export const useToggleSubtask = () => {
  const toggleSubtask = useMutation(api.tasks.toggleSubtask);

  return {
    mutate: ({
      taskId,
      subtaskId,
      isCompleted,
    }: {
      taskId: Id<'tasks'>;
      subtaskId: string;
      isCompleted: boolean;
    }) => {
      toggleSubtask({ taskId, subtaskId, isCompleted }).catch((err: unknown) => {
        toast.error(mapErrorToUserMessage(err, 'Error al actualizar la subtarea'));
      });
    },
  };
};

export const useRemoveSubtask = () => {
  const removeSubtask = useMutation(api.tasks.removeSubtask);

  return {
    mutate: ({
      taskId,
      subtaskId,
    }: {
      taskId: Id<'tasks'>;
      subtaskId: string;
    }) => {
      removeSubtask({ taskId, subtaskId })
        .then(() => toast.success('Subtarea eliminada'))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al eliminar la subtarea'));
        });
    },
  };
};

export const useConvertTaskToSubtask = () => {
  const convert = useMutation(api.tasks.convertTaskToSubtask);

  return {
    mutate: (
      {
        sourceTaskId,
        targetTaskId,
      }: {
        sourceTaskId: Id<'tasks'>;
        targetTaskId: Id<'tasks'>;
      },
      options?: { onSuccess?: () => void }
    ) => {
      convert({ sourceTaskId, targetTaskId })
        .then(() => {
          toast.success('Tarea convertida en subtarea');
          options?.onSuccess?.();
        })
        .catch((err: unknown) => {
          toast.error(
            mapErrorToUserMessage(err, 'Error al convertir la tarea en subtarea')
          );
        });
    },
  };
};


