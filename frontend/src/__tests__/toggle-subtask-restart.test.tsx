import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Id } from '@/convex/_generated/dataModel';

const toggleSubtaskMutation = vi.fn();
const updateMutation = vi.fn();
const toastFn = vi.fn();

vi.mock('convex/react', () => ({
  // The hook creates the subtask mutation first and the task update second.
  useMutation: (ref: { name: string }) => (ref.name === 'toggleSubtask' ? toggleSubtaskMutation : updateMutation),
}));
vi.mock('@/convex/_generated/api', () => ({
  api: { tasks: { toggleSubtask: { name: 'toggleSubtask' }, update: { name: 'update' } } },
}));
vi.mock('sonner', () => ({
  toast: Object.assign((...args: unknown[]) => toastFn(...args), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useToggleSubtask } from '@/domains/tasks/hooks/useTaskMutations';

const taskId = 't1' as Id<'tasks'>;

beforeEach(() => {
  toggleSubtaskMutation.mockReset();
  updateMutation.mockReset();
  toastFn.mockReset();
});

describe('useToggleSubtask when the last subtask of a recurring task is done', () => {
  it('asks whether to restart the task and restarts it on "Reiniciar"', async () => {
    toggleSubtaskMutation.mockResolvedValue({
      _id: taskId,
      title: 'Curso de n8n',
      recurrence: 'diaria',
      isCompleted: true,
    });
    updateMutation.mockResolvedValue({});
    const { result } = renderHook(() => useToggleSubtask());

    act(() => result.current.mutate({ taskId, subtaskId: 's3', isCompleted: true }));

    await waitFor(() => expect(toastFn).toHaveBeenCalledTimes(1));
    const [message, options] = toastFn.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toContain('Curso de n8n');
    expect(options.action.label).toBe('Reiniciar');
    expect(updateMutation).not.toHaveBeenCalled();

    options.action.onClick();
    expect(updateMutation).toHaveBeenCalledWith(expect.objectContaining({ taskId, isCompleted: false }));
  });

  it('does not ask when the task is still open (progress made, more subtasks left)', async () => {
    toggleSubtaskMutation.mockResolvedValue({
      _id: taskId,
      title: 'Curso de n8n',
      recurrence: 'diaria',
      isCompleted: false,
      dueDate: Date.now() + 86_400_000,
    });
    const { result } = renderHook(() => useToggleSubtask());

    act(() => result.current.mutate({ taskId, subtaskId: 's1', isCompleted: true }));

    await waitFor(() => expect(toggleSubtaskMutation).toHaveBeenCalled());
    // Only the "vuelve el …" success toast; no restart question.
    expect(toastFn).not.toHaveBeenCalled();
  });
});
