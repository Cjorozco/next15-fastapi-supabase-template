import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskMeta } from '@/domains/tasks/components/TaskBadges';
import { TaskEditForm } from '@/domains/tasks/components/TaskEditForm';
import type { Task } from '@/domains/tasks/types';
import type { Id } from '@/convex/_generated/dataModel';

const DAY_MS = 24 * 60 * 60 * 1000;

const baseTask: Task = {
  _id: 'task_1' as Id<'tasks'>,
  projectId: 'project_1' as Id<'projects'>,
  title: 'Diseñar API',
  isCompleted: false,
  position: 0,
};

describe('TaskMeta', () => {
  it('derives the status badge from the boolean when status is missing', () => {
    const { rerender } = render(<TaskMeta task={baseTask} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    rerender(<TaskMeta task={{ ...baseTask, isCompleted: true }} />);
    expect(screen.getByText('Completada')).toBeInTheDocument();
  });

  it('shows the in-progress badge, high priority and estimated hours', () => {
    render(<TaskMeta task={{ ...baseTask, status: 'en_progreso', priority: 'alta', estimatedHours: 6 }} />);
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText(/prioridad alta/i)).toBeInTheDocument();
    expect(screen.getByText('6 h')).toBeInTheDocument();
  });

  it('does not render a badge for non-high priorities', () => {
    render(<TaskMeta task={{ ...baseTask, priority: 'media' }} />);
    expect(screen.queryByText(/prioridad/i)).not.toBeInTheDocument();
  });

  it('marks an overdue open task in red but not a completed one', () => {
    const lastWeek = Date.now() - 7 * DAY_MS;
    const { rerender } = render(<TaskMeta task={{ ...baseTask, dueDate: lastWeek }} />);
    expect(screen.getByTitle('Fecha límite vencida').className).toContain('text-destructive');

    rerender(<TaskMeta task={{ ...baseTask, dueDate: lastWeek, isCompleted: true }} />);
    expect(screen.queryByTitle('Fecha límite vencida')).not.toBeInTheDocument();
    expect(screen.getByTitle('Fecha límite').className).not.toContain('text-destructive');
  });
});

describe('TaskEditForm', () => {
  it('submits trimmed values and converts the date and hours', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<TaskEditForm task={baseTask} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '  Diseñar API v2 ' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'en_progreso' } });
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'alta' } });
    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '2030-03-09' } });
    fireEvent.change(screen.getByLabelText('Horas estimadas'), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: ' Hablar con QA ' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Diseñar API v2',
      status: 'en_progreso',
      priority: 'alta',
      dueDate: new Date(2030, 2, 9).getTime(),
      estimatedHours: 4.5,
      notes: 'Hablar con QA',
    });
  });

  it('sends null for cleared optional fields', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <TaskEditForm
        task={{ ...baseTask, priority: 'baja', estimatedHours: 3, notes: 'x', dueDate: Date.now() }}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Horas estimadas'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ priority: null, dueDate: null, estimatedHours: null, notes: null })
    );
  });

  it('blocks an empty title and negative hours', () => {
    const onSave = vi.fn();
    render(<TaskEditForm task={baseTask} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('El título es obligatorio');

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Ok' } });
    fireEvent.change(screen.getByLabelText('Horas estimadas'), { target: { value: '-2' } });
    // jsdom blocks a click on an invalid form (native min=0); submit directly to reach our own check.
    fireEvent.submit(screen.getByRole('form', { name: /editar tarea/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/horas/i);

    expect(onSave).not.toHaveBeenCalled();
  });
});
