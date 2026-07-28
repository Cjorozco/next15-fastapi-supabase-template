import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Id } from '../../convex/_generated/dataModel';

export const useCreateTask = () => {
  const create = useMutation(api.tasks.create);

  return {
    mutate: (
      { projectId, title }: { projectId: Id<'projects'>; title: string },
      options?: { onSuccess?: (data: { title: string }) => void }
    ) => {
      create({ projectId, title })
        .then((data) => {
          toast.success(`Task "${data.title}" created`);
          options?.onSuccess?.(data);
        })
        .catch(() => {
          toast.error('Error creating task');
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
      update({ taskId, isCompleted }).catch(() => {
        toast.error('Error updating task');
      });
    },
  };
};

export const useDeleteTask = () => {
  const remove = useMutation(api.tasks.remove);

  return {
    mutate: (taskId: Id<'tasks'>) => {
      remove({ taskId })
        .then(() => toast.success('Task deleted'))
        .catch(() => toast.error('Error deleting task'));
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
      reorder({ projectId, taskIds }).catch(() => {
        toast.error('Error reordering tasks');
      });
    },
  };
};
