import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SortableTaskItem } from '@/domains/projects/components/SortableTaskItem';
import { Task } from '@/domains/tasks/types';
import { Id } from '@/convex/_generated/dataModel';

describe('SortableTaskItem (Subtasks Support & Interaction)', () => {
  const mockTask: Task = {
    _id: 'task_1' as Id<'tasks'>,
    projectId: 'project_1' as Id<'projects'>,
    title: 'Tarea con subtareas',
    isCompleted: false,
    position: 0,
    subtasks: [
      { id: 'sub_1', title: 'Subtarea 1', isCompleted: true },
      { id: 'sub_2', title: 'Subtarea 2', isCompleted: false },
    ],
  };

  it('renders task title and subtask badge', () => {
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Tarea con subtareas')).toBeInTheDocument();
    expect(screen.getByText('1/2 subtareas')).toBeInTheDocument();
  });

  it('expands subtasks list when clicking toggle button', () => {
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Click expand button
    const expandBtn = screen.getByTitle('Ver subtareas');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Subtarea 1')).toBeInTheDocument();
    expect(screen.getByText('Subtarea 2')).toBeInTheDocument();
  });

  it('calls onToggleSubtask when subtask checkbox is clicked', () => {
    const onToggleSubtask = vi.fn();
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
        onToggleSubtask={onToggleSubtask}
      />
    );

    fireEvent.click(screen.getByTitle('Ver subtareas'));

    // Check subtask 2
    const subtask2Label = screen.getByText('Subtarea 2');
    fireEvent.click(subtask2Label);

    expect(onToggleSubtask).toHaveBeenCalledWith('task_1', 'sub_2', true);
  });

  it('allows adding a new subtask via inline form', () => {
    const onAddSubtask = vi.fn();
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
        onAddSubtask={onAddSubtask}
      />
    );

    fireEvent.click(screen.getByTitle('Añadir subtarea'));

    const input = screen.getByPlaceholderText('Nombre de la subtarea...');
    fireEvent.change(input, { target: { value: 'Nueva Subtarea 3' } });

    const saveBtn = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveBtn);

    expect(onAddSubtask).toHaveBeenCalledWith('task_1', 'Nueva Subtarea 3');
  });

  it('calls onRemoveSubtask when delete subtask is clicked', () => {
    const onRemoveSubtask = vi.fn();
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
        onRemoveSubtask={onRemoveSubtask}
      />
    );

    fireEvent.click(screen.getByTitle('Ver subtareas'));

    const deleteSubtaskBtns = screen.getAllByTitle('Eliminar subtarea');
    fireEvent.click(deleteSubtaskBtns[0]);

    expect(onRemoveSubtask).toHaveBeenCalledWith('task_1', 'sub_1');
  });

  it('displays droppable subtask conversion zone when another task is dragging', () => {
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={true}
        activeDraggingId="task_2"
        onUpdateStatus={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      screen.getByText('Soltar aquí para convertir en subtarea')
    ).toBeInTheDocument();
  });
});

