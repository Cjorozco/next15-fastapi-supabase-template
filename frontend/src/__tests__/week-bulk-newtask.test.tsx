import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewTaskForm } from '@/domains/tasks/components/NewTaskForm';
import { parsePastedTasks } from '@/domains/tasks/lib/bulk';
import { buildWeekTasks, endOfWeek, summarizeWeek, bucketFor, effectiveDueDate } from '@/domains/tasks/lib/week';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';
import type { Id } from '@/convex/_generated/dataModel';

describe('parsePastedTasks', () => {
  it('creates one title per non-empty line', () => {
    expect(parsePastedTasks('Uno\n\n  Dos  \r\nTres\n')).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('drops list markers from pasted checklists', () => {
    expect(parsePastedTasks('- A\n* B\n• C\n1. D\n2) E\n[ ] F\n[x] G')).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]);
  });

  it('keeps hyphens and numbers inside the title', () => {
    expect(parsePastedTasks('Llamar a Ana-María\n2024 revisión')).toEqual([
      'Llamar a Ana-María',
      '2024 revisión',
    ]);
  });
});

describe('NewTaskForm', () => {
  const paste = (input: HTMLElement, text: string) =>
    fireEvent.paste(input, { clipboardData: { getData: () => text } });

  it('adds the task on Enter and stays open, cleared and ready for the next one', () => {
    const onSubmit = vi.fn((_titles: string[], onCreated: () => void) => onCreated());
    const onCancel = vi.fn();
    render(<NewTaskForm isCreating={false} onSubmit={onSubmit} onCancel={onCancel} />);

    const input = screen.getByLabelText('Nombre de la tarea') as HTMLInputElement;
    fireEvent.change(input, { target: { value: ' Primera ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith(['Primera'], expect.any(Function));
    expect(onCancel).not.toHaveBeenCalled();
    expect(input.value).toBe('');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'Segunda' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('creates one task per line when several lines are pasted', () => {
    const onSubmit = vi.fn();
    render(<NewTaskForm isCreating={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    paste(screen.getByLabelText('Nombre de la tarea'), 'Uno\nDos\n- Tres');

    expect(onSubmit).toHaveBeenCalledWith(['Uno', 'Dos', 'Tres'], expect.any(Function));
  });

  it('lets a single pasted line behave like normal text', () => {
    const onSubmit = vi.fn();
    render(<NewTaskForm isCreating={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    paste(screen.getByLabelText('Nombre de la tarea'), 'Solo una línea');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses to paste more than 50 tasks and says why', () => {
    const onSubmit = vi.fn();
    render(<NewTaskForm isCreating={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    paste(
      screen.getByLabelText('Nombre de la tarea'),
      Array.from({ length: 51 }, (_, i) => `T${i}`).join('\n')
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/hasta 50 tareas/i);
  });

  it('closes with Escape', () => {
    const onCancel = vi.fn();
    render(<NewTaskForm isCreating={false} onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByLabelText('Nombre de la tarea'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

const DAY = 24 * 60 * 60 * 1000;

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    _id: id as Id<'tasks'>,
    projectId: 'p1' as Id<'projects'>,
    title: id,
    isCompleted: false,
    position: 0,
    ...overrides,
  };
}

function project(id: string, tasks: Task[], overrides: Partial<Project> = {}): Project {
  return {
    _id: id as Id<'projects'>,
    ownerId: 'u1' as Id<'users'>,
    name: id,
    tasks,
    ...overrides,
  };
}

// Wednesday 12 Jun 2030, 10:00 local.
const NOW = new Date(2030, 5, 12, 10, 0).getTime();
const TODAY = new Date(2030, 5, 12).getTime();
const day = (offset: number) => TODAY + offset * DAY;

describe('buildWeekTasks', () => {
  const ids = (projects: Project[]) => buildWeekTasks(projects, NOW).map((item) => item.task._id as string);

  it('leaves out paused and completed projects and finished tasks', () => {
    const projects = [
      project('active', [task('open'), task('done', { isCompleted: true })]),
      project('paused', [task('paused-task')], { status: 'en_pausa' }),
      project('finished', [task('finished-task')], { status: 'completado' }),
    ];
    expect(ids(projects)).toEqual(['open']);
  });

  it('orders overdue → this week → high-priority no-deadline → later → unplanned → rest no-deadline', () => {
    const projects = [
      project('a', [
        task('no-limit-low', { noDeadline: true, priority: 'baja' }),
        task('unplanned'),
        task('later', { dueDate: day(20) }),
        task('no-limit-high', { noDeadline: true, priority: 'alta' }),
        task('this-week', { dueDate: day(2) }),
        task('overdue', { dueDate: day(-3) }),
        task('habit', { recurrence: 'diaria' }),
      ]),
    ];
    expect(ids(projects)).toEqual([
      'overdue',
      'this-week',
      'no-limit-high',
      'later',
      'unplanned',
      'no-limit-low',
      'habit',
    ]);
  });

  it('orders by priority and then by date inside a bucket', () => {
    const projects = [
      project('a', [
        task('mid-soon', { priority: 'media', dueDate: day(1) }),
        task('none-sooner', { dueDate: day(0) }),
        task('high-late', { priority: 'alta', dueDate: day(3) }),
        task('high-soon', { priority: 'alta', dueDate: day(2) }),
      ]),
    ];
    expect(ids(projects)).toEqual(['high-soon', 'high-late', 'mid-soon', 'none-sooner']);
  });

  it('keeps project and task order on full ties', () => {
    const projects = [project('a', [task('a1'), task('a2')]), project('b', [task('b1')])];
    expect(ids(projects)).toEqual(['a1', 'a2', 'b1']);
  });

  it('uses the project due date for tasks without their own date, without changing the task', () => {
    const own = task('own', { dueDate: day(3) });
    const inherits = task('inherits');
    const items = buildWeekTasks([project('a', [own, inherits], { dueDate: day(1) })], NOW);

    expect(items.map((i) => [i.task._id, i.dueDate])).toEqual([
      ['inherits', day(1)],
      ['own', day(3)],
    ]);
    expect(inherits.dueDate).toBeUndefined();
  });

  it('does not inherit the project date when the task has no deadline by nature', () => {
    const open = task('open', { noDeadline: true });
    const habit = task('habit', { recurrence: 'semanal' });
    const items = buildWeekTasks([project('a', [open, habit], { dueDate: day(1) })], NOW);
    expect(items.map((i) => [i.task._id, i.dueDate, i.bucket])).toEqual([
      ['open', undefined, 'sin_limite'],
      ['habit', undefined, 'sin_limite'],
    ]);
  });
});

describe('bucketFor / effectiveDueDate', () => {
  it('classifies by date and by the no-deadline flag', () => {
    expect(bucketFor({}, day(-1), NOW)).toBe('vencida');
    expect(bucketFor({}, day(0), NOW)).toBe('esta_semana');
    expect(bucketFor({}, day(4), NOW)).toBe('esta_semana'); // Sunday
    expect(bucketFor({}, day(5), NOW)).toBe('mas_adelante'); // next Monday
    expect(bucketFor({}, undefined, NOW)).toBe('sin_planificar');
    expect(bucketFor({ noDeadline: true }, undefined, NOW)).toBe('sin_limite');
    expect(bucketFor({ noDeadline: true, priority: 'alta' }, undefined, NOW)).toBe('sin_limite_alta');
    expect(bucketFor({ recurrence: 'diaria', priority: 'alta' }, undefined, NOW)).toBe('sin_limite_alta');
  });

  it('a recurring task with a date is dated, not no-deadline', () => {
    expect(bucketFor({ recurrence: 'diaria' }, day(1), NOW)).toBe('esta_semana');
    expect(effectiveDueDate({ dueDate: day(2), recurrence: 'diaria' }, day(9))).toBe(day(2));
  });
});

describe('recurring tasks dated after today', () => {
  const ids = (tasks: Task[]) =>
    buildWeekTasks([project('a', tasks)], NOW).map((item) => item.task._id as string);

  it('leave the list once completed (next occurrence is after today)', () => {
    expect(
      ids([
        task('daily-tomorrow', { recurrence: 'diaria', dueDate: day(1) }),
        task('weekly-next', { recurrence: 'semanal', dueDate: day(7) }),
      ])
    ).toEqual([]);
  });

  it('stay when due today, overdue or without a date, and plain tasks are unaffected', () => {
    expect(
      ids([
        task('daily-today', { recurrence: 'diaria', dueDate: day(0) }),
        task('weekly-late', { recurrence: 'semanal', dueDate: day(-2) }),
        task('habit', { recurrence: 'diaria' }),
        task('plain-tomorrow', { dueDate: day(1) }),
      ]).sort()
    ).toEqual(['daily-today', 'habit', 'plain-tomorrow', 'weekly-late']);
  });
});

describe('week boundaries', () => {
  it('ends on Sunday 23:59:59.999 local time', () => {
    const end = new Date(endOfWeek(NOW));
    expect(end.getDay()).toBe(0);
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
    expect(end.getDate()).toBe(16);
  });

  it('keeps Sunday inside its own week', () => {
    const sunday = new Date(2030, 5, 16, 9, 0).getTime();
    expect(new Date(endOfWeek(sunday)).getDate()).toBe(16);
  });

  it('counts every bucket for the counter line', () => {
    const items = buildWeekTasks(
      [
        project('a', [
          task('late', { dueDate: day(-3) }),
          task('today', { dueDate: day(0) }),
          task('sunday', { dueDate: day(4) }),
          task('next-week', { dueDate: day(5) }),
          task('unplanned'),
          task('open', { noDeadline: true }),
          task('habit', { recurrence: 'diaria', priority: 'alta' }),
        ]),
      ],
      NOW
    );
    expect(summarizeWeek(items)).toEqual({
      overdue: 1,
      thisWeek: 2,
      later: 1,
      unplanned: 1,
      noDeadline: 2,
    });
  });
});
