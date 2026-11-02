import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Id } from '@/convex/_generated/dataModel';
import type { Task } from '@/domains/tasks/types';

const mutationFn = vi.fn();
vi.mock('convex/react', () => ({
  useMutation: () => mutationFn,
  useQuery: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useUpdateTaskDetails } from '@/domains/tasks/hooks/useTaskMutations';
import { TaskEditForm } from '@/domains/tasks/components/TaskEditForm';

const task: Task = {
  _id: 'task_1' as Id<'tasks'>,
  projectId: 'project_1' as Id<'projects'>,
  title: 'Tarea',
  isCompleted: false,
  position: 0,
};

describe('"Sin fecha límite" end to end on the client', () => {
  beforeEach(() => {
    mutationFn.mockReset();
    mutationFn.mockResolvedValue({ ...task, noDeadline: true });
  });

  it('form → hook → mutation args carry noDeadline: true and dueDate: null', async () => {
    const { result } = renderHook(() => useUpdateTaskDetails());
    const onSave = (input: Parameters<typeof result.current.mutate>[1]) =>
      result.current.mutate(task._id, input);

    render(<TaskEditForm task={task} onSave={onSave} />);
    fireEvent.click(screen.getByLabelText('Sin fecha límite'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    });

    await waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(1));
    expect(mutationFn.mock.calls[0][0]).toMatchObject({
      taskId: 'task_1',
      noDeadline: true,
      dueDate: null,
    });
  });

  it('clicking the text label toggles the checkbox and the date input', () => {
    render(<TaskEditForm task={task} onSave={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /sin fecha límite/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByText('Sin fecha límite'));
    expect(checkbox).toBeChecked();
    expect(screen.getByLabelText('Fecha límite')).toBeDisabled();

    fireEvent.click(screen.getByText('Sin fecha límite'));
    expect(checkbox).not.toBeChecked();
  });
});
