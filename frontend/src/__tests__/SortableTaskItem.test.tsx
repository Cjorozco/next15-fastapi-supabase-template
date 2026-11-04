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
    const expandBtn = screen.getByRole('button', { name: 'Ver detalles y subtareas' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles y subtareas' }));

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

    fireEvent.click(
      screen.getByRole('button', { name: 'Añadir subtarea a Tarea con subtareas' })
    );

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

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles y subtareas' }));

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar subtarea Subtarea 1' }));
    expect(onRemoveSubtask).not.toHaveBeenCalled();
    expect(screen.getByText('¿Borrar?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Sí/ }));
    expect(onRemoveSubtask).toHaveBeenCalledWith('task_1', 'sub_1');
  });

  it('keeps the subtask when the deletion is cancelled', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles y subtareas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar subtarea Subtarea 1' }));
    fireEvent.click(screen.getByRole('button', { name: /^No/ }));

    expect(onRemoveSubtask).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Borrar?')).not.toBeInTheDocument();
    expect(screen.getByText('Subtarea 1')).toBeInTheDocument();
  });

  it.each([true, false])('asks for confirmation before deleting a task (detail view: %s)', (isDetailView) => {
    const onDelete = vi.fn();
    render(
      <SortableTaskItem
        task={mockTask}
        isDetailView={isDetailView}
        onUpdateStatus={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tarea Tarea con subtareas' }));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^No/ }));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tarea Tarea con subtareas' }));
    fireEvent.click(screen.getByRole('button', { name: /^Sí/ }));
    expect(onDelete).toHaveBeenCalledWith('task_1');
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

describe('SortableTaskItem (recurring task already completed)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const recurring: Task = {
    _id: 'task_r' as Id<'tasks'>,
    projectId: 'project_1' as Id<'projects'>,
    title: 'Prospección del día',
    isCompleted: false,
    position: 0,
    recurrence: 'diaria',
  };

  it('shows it as done, locked, with the date it comes back, when its next date is after today', () => {
    const onUpdateStatus = vi.fn();
    render(
      <SortableTaskItem
        task={{ ...recurring, dueDate: Date.now() + 2 * DAY }}
        isDetailView={true}
        onUpdateStatus={onUpdateStatus}
        onDelete={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Prospección del día/ });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.getByText(/Hecha · vuelve el/)).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onUpdateStatus).not.toHaveBeenCalled();
  });

  it('stays open when it is due today', () => {
    const onUpdateStatus = vi.fn();
    render(
      <SortableTaskItem
        task={{ ...recurring, dueDate: Date.now() }}
        isDetailView={true}
        onUpdateStatus={onUpdateStatus}
        onDelete={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Prospección del día/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onUpdateStatus).toHaveBeenCalledWith('task_r', true);
  });
});
