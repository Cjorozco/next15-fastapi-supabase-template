import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewTaskForm } from '@/domains/tasks/components/NewTaskForm';
import { parsePastedTasks } from '@/domains/tasks/lib/bulk';
import { buildWeekTasks, endOfWeek, summarizeWeek } from '@/domains/tasks/lib/week';
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

describe('buildWeekTasks', () => {
  const ids = (projects: Project[]) => buildWeekTasks(projects).map((item) => item.task._id as string);

  it('leaves out paused and completed projects and finished tasks', () => {
    const projects = [
      project('active', [task('open'), task('done', { isCompleted: true })]),
      project('paused', [task('paused-task')], { status: 'en_pausa' }),
      project('finished', [task('finished-task')], { status: 'completado' }),
    ];
    expect(ids(projects)).toEqual(['open']);
  });

  it('orders by priority, then by date, undated last', () => {
    const projects = [
      project('a', [
        task('none-soon', { dueDate: 100 }),
        task('low', { priority: 'baja', dueDate: 50 }),
        task('high-late', { priority: 'alta', dueDate: 300 }),
        task('high-undated', { priority: 'alta' }),
        task('high-soon', { priority: 'alta', dueDate: 200 }),
        task('mid', { priority: 'media' }),
      ]),
    ];
    expect(ids(projects)).toEqual(['high-soon', 'high-late', 'high-undated', 'mid', 'low', 'none-soon']);
  });

  it('mixes projects and keeps the project order on full ties', () => {
    const projects = [
      project('a', [task('a1'), task('a2')]),
      project('b', [task('b1', { priority: 'alta' }), task('b2')]),
    ];
    expect(ids(projects)).toEqual(['b1', 'a1', 'a2', 'b2']);
  });

  it('uses the project due date for tasks without their own date, without changing the task', () => {
    const own = task('own', { dueDate: 500 });
    const inherits = task('inherits');
    const items = buildWeekTasks([project('a', [own, inherits], { dueDate: 100 })]);

    expect(items.map((i) => [i.task._id, i.dueDate])).toEqual([
      ['inherits', 100],
      ['own', 500],
    ]);
    expect(inherits.dueDate).toBeUndefined();
  });
});

describe('week boundaries', () => {
  it('ends on Sunday 23:59:59.999 local time', () => {
    const wednesday = new Date(2030, 5, 12, 10, 0).getTime();
    const end = new Date(endOfWeek(wednesday));
    expect(end.getDay()).toBe(0);
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
    expect(end.getDate()).toBe(16);
  });

  it('keeps Sunday inside its own week', () => {
    const sunday = new Date(2030, 5, 16, 9, 0).getTime();
    expect(new Date(endOfWeek(sunday)).getDate()).toBe(16);
  });

  it('counts overdue, this week, later and undated tasks', () => {
    const now = new Date(2030, 5, 12, 10, 0).getTime(); // Wednesday
    const today = new Date(2030, 5, 12).getTime();
    const items = buildWeekTasks([
      project('a', [
        task('late', { dueDate: today - 3 * DAY }),
        task('today', { dueDate: today }),
        task('sunday', { dueDate: new Date(2030, 5, 16).getTime() }),
        task('next-week', { dueDate: new Date(2030, 5, 17).getTime() }),
        task('undated'),
      ]),
    ]);
    expect(summarizeWeek(items, now)).toEqual({ overdue: 1, thisWeek: 2, later: 1, undated: 1 });
  });
});
