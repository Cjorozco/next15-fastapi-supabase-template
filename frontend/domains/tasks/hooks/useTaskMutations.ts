import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { mapErrorToUserMessage } from '@/shared/lib/userFacingError';
import { formatDueDate } from '@/domains/tasks/lib/dates';
import type { Task, TaskDetailsInput } from '@/domains/tasks/types';

/** Offset the server needs to compute recurring dates in the user's calendar. */
const tzOffsetMinutes = () => new Date().getTimezoneOffset();

/** A recurring task is not closed when completed: tell the user when it comes back. */
function notifyIfReopened(task: Pick<Task, 'recurrence' | 'isCompleted' | 'dueDate'>, askedToComplete: boolean) {
  if (askedToComplete && task.recurrence && !task.isCompleted && task.dueDate !== undefined) {
    toast.success(`Tarea recurrente: vuelve el ${formatDueDate(task.dueDate)}`);
  }
}

// Every `mutate` is memoized so list items wrapped in React.memo keep stable props.

export const useCreateTask = () => {
  const create = useMutation(api.tasks.create);

  const mutate = useCallback(
    (
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
    [create]
  );

  return { mutate, isPending: false };
};

export const useCreateTasks = () => {
  const createMany = useMutation(api.tasks.createMany);

  const mutate = useCallback(
    (
      { projectId, titles }: { projectId: Id<'projects'>; titles: string[] },
      options?: { onSuccess?: () => void }
    ) => {
      createMany({ projectId, titles })
        .then((tasks) => {
          toast.success(
            tasks.length === 1 ? `Tarea "${tasks[0].title}" creada` : `${tasks.length} tareas creadas`
          );
          options?.onSuccess?.();
        })
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al crear las tareas'));
        });
    },
    [createMany]
  );

  return { mutate, isPending: false };
};

export const useUpdateTask = () => {
  const update = useMutation(api.tasks.update);

  const mutate = useCallback(
    ({ taskId, isCompleted }: { taskId: Id<'tasks'>; isCompleted: boolean }) => {
      update({ taskId, isCompleted, tzOffsetMinutes: tzOffsetMinutes() })
        .then((task) => notifyIfReopened(task, isCompleted))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al actualizar la tarea'));
        });
    },
    [update]
  );

  return { mutate };
};

/** Saves the task edit form. Resolves true on success, false (after a toast) on error. */
export const useUpdateTaskDetails = () => {
  const updateTask = useMutation(api.tasks.updateTask);

  const mutate = useCallback(
    async (taskId: Id<'tasks'>, input: TaskDetailsInput): Promise<boolean> => {
      try {
        const updated = await updateTask({ taskId, ...input, tzOffsetMinutes: tzOffsetMinutes() });
        if (input.projectId) {
          toast.success('Tarea movida a otro proyecto');
        } else if (input.status === 'completada' && updated.recurrence && !updated.isCompleted) {
          notifyIfReopened(updated, true);
        } else {
          toast.success('Tarea actualizada');
        }
        return true;
      } catch (err: unknown) {
        toast.error(mapErrorToUserMessage(err, 'Error al guardar la tarea'));
        return false;
      }
    },
    [updateTask]
  );

  return { mutate };
};

export const useDeleteTask = () => {
  const remove = useMutation(api.tasks.remove);

  const mutate = useCallback(
    (taskId: Id<'tasks'>) => {
      remove({ taskId })
        .then(() => toast.success('Tarea eliminada'))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al eliminar la tarea'));
        });
    },
    [remove]
  );

  return { mutate };
};

export const useReorderTasks = () => {
  const reorder = useMutation(api.tasks.reorder);

  const mutate = useCallback(
    ({ projectId, taskIds }: { projectId: Id<'projects'>; taskIds: Id<'tasks'>[] }) => {
      reorder({ projectId, taskIds }).catch((err: unknown) => {
        toast.error(mapErrorToUserMessage(err, 'Error al reordenar las tareas'));
      });
    },
    [reorder]
  );

  return { mutate };
};

export const useAddSubtask = () => {
  const addSubtask = useMutation(api.tasks.addSubtask);

  const mutate = useCallback(
    (
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
    [addSubtask]
  );

  return { mutate };
};

export const useToggleSubtask = () => {
  const toggleSubtask = useMutation(api.tasks.toggleSubtask);

  const mutate = useCallback(
    ({
      taskId,
      subtaskId,
      isCompleted,
    }: {
      taskId: Id<'tasks'>;
      subtaskId: string;
      isCompleted: boolean;
    }) => {
      toggleSubtask({ taskId, subtaskId, isCompleted, tzOffsetMinutes: tzOffsetMinutes() })
        .then((task) => notifyIfReopened(task, isCompleted))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al actualizar la subtarea'));
        });
    },
    [toggleSubtask]
  );

  return { mutate };
};

export const useRemoveSubtask = () => {
  const removeSubtask = useMutation(api.tasks.removeSubtask);

  const mutate = useCallback(
    ({ taskId, subtaskId }: { taskId: Id<'tasks'>; subtaskId: string }) => {
      removeSubtask({ taskId, subtaskId })
        .then(() => toast.success('Subtarea eliminada'))
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al eliminar la subtarea'));
        });
    },
    [removeSubtask]
  );

  return { mutate };
};

export const useConvertTaskToSubtask = () => {
  const convert = useMutation(api.tasks.convertTaskToSubtask);

  const mutate = useCallback(
    (
      { sourceTaskId, targetTaskId }: { sourceTaskId: Id<'tasks'>; targetTaskId: Id<'tasks'> },
      options?: { onSuccess?: () => void }
    ) => {
      convert({ sourceTaskId, targetTaskId })
        .then(() => {
          toast.success('Tarea convertida en subtarea');
          options?.onSuccess?.();
        })
        .catch((err: unknown) => {
          toast.error(mapErrorToUserMessage(err, 'Error al convertir la tarea en subtarea'));
        });
    },
    [convert]
  );

  return { mutate };
};
