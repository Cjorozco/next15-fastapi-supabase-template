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

  it('renders a labelled badge for every priority, each with its own color', () => {
    const { rerender } = render(<TaskMeta task={{ ...baseTask, priority: 'media' }} />);
    const media = screen.getByText(/prioridad media/i).className;
    rerender(<TaskMeta task={{ ...baseTask, priority: 'baja' }} />);
    const baja = screen.getByText(/prioridad baja/i).className;
    rerender(<TaskMeta task={{ ...baseTask, priority: 'alta' }} />);
    const alta = screen.getByText(/prioridad alta/i).className;

    expect(new Set([media, baja, alta]).size).toBe(3);
  });

  it('shows a recurrence icon with an accessible label', () => {
    render(<TaskMeta task={{ ...baseTask, recurrence: 'semanal' }} />);
    expect(screen.getByTitle(/se repite: todas las semanas/i)).toBeInTheDocument();
    expect(screen.getByText(/se repite todas las semanas/i)).toHaveClass('sr-only');
  });

  it('shows the project due date when the task has none, without treating it as the task own', () => {
    const projectDue = new Date(2030, 2, 15).getTime();
    const { rerender } = render(<TaskMeta task={baseTask} inheritedDueDate={projectDue} />);
    expect(screen.getByTitle('Fecha límite del proyecto')).toHaveTextContent(/proyecto:/i);

    rerender(<TaskMeta task={{ ...baseTask, dueDate: new Date(2030, 3, 1).getTime() }} inheritedDueDate={projectDue} />);
    expect(screen.queryByTitle('Fecha límite del proyecto')).not.toBeInTheDocument();
    expect(screen.getByTitle('Fecha límite')).toBeInTheDocument();
  });

  it('marks an inherited past date as overdue', () => {
    render(<TaskMeta task={baseTask} inheritedDueDate={Date.now() - 7 * DAY_MS} />);
    expect(screen.getByTitle('Fecha límite vencida')).toBeInTheDocument();
  });

  it('shows a neutral "Sin límite" badge for a task flagged without deadline', () => {
    render(<TaskMeta task={{ ...baseTask, noDeadline: true }} />);
    expect(screen.getByText('Sin límite')).toBeInTheDocument();
  });

  it('does not show "Sin límite" or "Sin planificar" on a plain undated task in the card', () => {
    render(<TaskMeta task={baseTask} />);
    expect(screen.queryByText('Sin límite')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin planificar')).not.toBeInTheDocument();
  });

  it('marks an undated, unflagged task as "Sin planificar" only in the week view', () => {
    const { rerender } = render(<TaskMeta task={baseTask} showUnplanned />);
    expect(screen.getByText('Sin planificar')).toBeInTheDocument();

    rerender(<TaskMeta task={{ ...baseTask, noDeadline: true }} showUnplanned />);
    expect(screen.queryByText('Sin planificar')).not.toBeInTheDocument();
    rerender(<TaskMeta task={{ ...baseTask, dueDate: Date.now() + 5 * DAY_MS }} showUnplanned />);
    expect(screen.queryByText('Sin planificar')).not.toBeInTheDocument();
  });

  it('treats a recurring task as "Sin límite" by default and does not inherit the project date', () => {
    render(
      <TaskMeta
        task={{ ...baseTask, recurrence: 'diaria' }}
        inheritedDueDate={new Date(2030, 2, 15).getTime()}
        showUnplanned
      />
    );
    expect(screen.getByText('Sin límite')).toBeInTheDocument();
    expect(screen.queryByTitle('Fecha límite del proyecto')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin planificar')).not.toBeInTheDocument();
  });

  it('does not render a priority badge when the task has no priority', () => {
    render(<TaskMeta task={baseTask} />);
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
    fireEvent.change(screen.getByLabelText('Duración estimada'), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: ' Hablar con QA ' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      title: 'Diseñar API v2',
      status: 'en_progreso',
      priority: 'alta',
      dueDate: new Date(2030, 2, 9).getTime(),
      estimatedHours: 4.5,
      recurrence: null,
      noDeadline: false,
      notes: 'Hablar con QA',
    });
  });

  it('edits the duration in minutes and stores it in hours', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<TaskEditForm task={{ ...baseTask, estimatedHours: 0.1667 }} onSave={onSave} />);

    const field = screen.getByLabelText('Duración estimada') as HTMLInputElement;
    expect(field.value).toBe('10 min');

    fireEvent.change(field, { target: { value: '45 min' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedHours: 0.75 })));
  });

  it('shows hours from one hour and accepts a bare number as hours', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<TaskEditForm task={{ ...baseTask, estimatedHours: 1.5 }} onSave={onSave} />);
    expect((screen.getByLabelText('Duración estimada') as HTMLInputElement).value).toBe('1.5 h');

    fireEvent.change(screen.getByLabelText('Duración estimada'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedHours: 2 })));
  });

  it('rejects text that is not a duration', () => {
    const onSave = vi.fn();
    render(<TaskEditForm task={baseTask} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Duración estimada'), { target: { value: 'mucho' } });
    fireEvent.submit(screen.getByRole('form', { name: /editar tarea/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/duración/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('uses short labels in the recurrence select so they are not cut off', () => {
    render(<TaskEditForm task={baseTask} onSave={vi.fn()} />);
    const options = Array.from((screen.getByLabelText('Repetir') as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toEqual(['No se repite', 'Diaria', 'Semanal']);
  });

  it('"Sin fecha límite" disables and clears the date and sends noDeadline', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<TaskEditForm task={{ ...baseTask, dueDate: new Date(2030, 2, 9).getTime() }} onSave={onSave} />);

    const date = screen.getByLabelText('Fecha límite') as HTMLInputElement;
    expect(date.value).toBe('2030-03-09');
    expect(date).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText('Sin fecha límite'));
    expect(date).toBeDisabled();
    expect(date.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueDate: null, noDeadline: true }));
  });

  it('starts checked for a flagged task and for a recurring task without date', () => {
    const { rerender } = render(<TaskEditForm task={{ ...baseTask, noDeadline: true }} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Sin fecha límite')).toBeChecked();
    expect(screen.getByLabelText('Fecha límite')).toBeDisabled();

    rerender(<TaskEditForm key="r" task={{ ...baseTask, recurrence: 'diaria' }} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Sin fecha límite')).toBeChecked();
  });

  it('unchecking re-enables the date input', () => {
    render(<TaskEditForm task={{ ...baseTask, noDeadline: true }} onSave={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Sin fecha límite'));
    expect(screen.getByLabelText('Fecha límite')).not.toBeDisabled();
  });

  it('sends the chosen recurrence and clears it with an empty option', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<TaskEditForm task={baseTask} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Repetir'), { target: { value: 'semanal' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence: 'semanal' })));

    onSave.mockClear();
    rerender(<TaskEditForm key="b" task={{ ...baseTask, recurrence: 'diaria' }} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Repetir'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrence: null })));
  });

  it('offers the project selector and sends projectId only when it changes', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const projects = [
      { _id: 'project_1' as Id<'projects'>, name: 'Origen' },
      { _id: 'project_2' as Id<'projects'>, name: 'Destino' },
    ];
    render(<TaskEditForm task={baseTask} projects={projects} onSave={onSave} />);

    const select = screen.getByLabelText('Proyecto') as HTMLSelectElement;
    expect(select.value).toBe('project_1');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('projectId');

    onSave.mockClear();
    fireEvent.change(select, { target: { value: 'project_2' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project_2' })));
  });

  it('hides the project selector when there is nowhere to move the task', () => {
    render(
      <TaskEditForm
        task={baseTask}
        projects={[{ _id: 'project_1' as Id<'projects'>, name: 'Único' }]}
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Proyecto')).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Duración estimada'), { target: { value: '' } });
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
    fireEvent.change(screen.getByLabelText('Duración estimada'), { target: { value: '-2' } });
    // jsdom blocks a click on an invalid form (native min=0); submit directly to reach our own check.
    fireEvent.submit(screen.getByRole('form', { name: /editar tarea/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/duración/i);

    expect(onSave).not.toHaveBeenCalled();
  });
});
