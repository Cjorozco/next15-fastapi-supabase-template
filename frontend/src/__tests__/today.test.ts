import { describe, it, expect } from 'vitest';
import type { Id } from '@/convex/_generated/dataModel';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';
import { buildTodayTasks, nextPendingSubtask, todayGroupFor } from '@/domains/tasks/lib/today';
import { dayKey, formatLongDay } from '@/domains/tasks/lib/timezone';

// Wed 4 Nov 2026, 10:00 in Bogotá (UTC-5) = 15:00 UTC.
const NOW = Date.UTC(2026, 10, 4, 15, 0);
const TODAY = '2026-11-04';
const bogota = (y: number, m: number, d: number, h = 0) => Date.UTC(y, m - 1, d, h + 5);

let seq = 0;
function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    _id: `t${seq}` as Id<'tasks'>,
    projectId: 'p1' as Id<'projects'>,
    title: `Tarea ${seq}`,
    isCompleted: false,
    position: seq,
    ...overrides,
  };
}
function project(tasks: Task[], overrides: Partial<Project> = {}): Project {
  return { _id: 'p1' as Id<'projects'>, ownerId: 'u1' as Id<'users'>, name: 'Proyecto', tasks, ...overrides };
}

describe('Bogotá calendar day', () => {
  it('does not move to the next day at 20:00 Bogotá (01:00 UTC)', () => {
    expect(dayKey(Date.UTC(2026, 10, 5, 1, 0))).toBe('2026-11-04');
  });

  it('does not stay on the previous day at 00:30 Bogotá (05:30 UTC)', () => {
    expect(dayKey(Date.UTC(2026, 10, 4, 5, 30))).toBe('2026-11-04');
    expect(dayKey(Date.UTC(2026, 10, 4, 4, 30))).toBe('2026-11-03');
  });

  it('formats the heading in Spanish', () => {
    expect(formatLongDay(NOW)).toBe('miércoles 4 de noviembre');
  });
});

describe('todayGroupFor', () => {
  it('due today → hoy; before today → vencida; after today → not listed', () => {
    expect(todayGroupFor({ dueDate: bogota(2026, 11, 4) }, TODAY)).toBe('hoy');
    expect(todayGroupFor({ dueDate: bogota(2026, 11, 3, 23) }, TODAY)).toBe('vencida');
    expect(todayGroupFor({ dueDate: bogota(2026, 11, 5) }, TODAY)).toBeNull();
  });

  it('tasks without a date never appear', () => {
    expect(todayGroupFor({}, TODAY)).toBeNull();
  });

  it('daily: no date or a date up to today appears; tomorrow does not', () => {
    expect(todayGroupFor({ recurrence: 'diaria' }, TODAY)).toBe('hoy');
    expect(todayGroupFor({ recurrence: 'diaria', dueDate: bogota(2026, 11, 4, 12) }, TODAY)).toBe('hoy');
    expect(todayGroupFor({ recurrence: 'diaria', dueDate: bogota(2026, 11, 5, 12) }, TODAY)).toBeNull();
  });

  it('weekly: appears when its date arrives, not before, and never without a date', () => {
    expect(todayGroupFor({ recurrence: 'semanal', dueDate: bogota(2026, 11, 4, 12) }, TODAY)).toBe('hoy');
    expect(todayGroupFor({ recurrence: 'semanal', dueDate: bogota(2026, 11, 11, 12) }, TODAY)).toBeNull();
    expect(todayGroupFor({ recurrence: 'semanal' }, TODAY)).toBeNull();
  });
});

describe('nextPendingSubtask', () => {
  it('is the first one not completed, in order', () => {
    const next = nextPendingSubtask({
      subtasks: [
        { id: 'a', title: 'A', isCompleted: true },
        { id: 'b', title: 'B', isCompleted: false },
        { id: 'c', title: 'C', isCompleted: false },
      ],
    });
    expect(next?.id).toBe('b');
  });

  it('is undefined without subtasks or when all are done', () => {
    expect(nextPendingSubtask({})).toBeUndefined();
    expect(nextPendingSubtask({ subtasks: [{ id: 'a', title: 'A', isCompleted: true }] })).toBeUndefined();
  });
});

describe('buildTodayTasks', () => {
  it('leaves out paused/completed projects, completed tasks and undated tasks', () => {
    const due = bogota(2026, 11, 4);
    const projects = [
      project([
        task({ title: 'Visible', dueDate: due }),
        task({ title: 'Sin fecha' }),
        task({ title: 'Hecha', dueDate: due, isCompleted: true }),
      ]),
      project([task({ title: 'En pausa', dueDate: due })], { _id: 'p2' as Id<'projects'>, status: 'en_pausa' }),
      project([task({ title: 'Proyecto listo', dueDate: due })], { _id: 'p3' as Id<'projects'>, status: 'completado' }),
    ];
    expect(buildTodayTasks(projects, NOW).map((i) => i.task.title)).toEqual(['Visible']);
  });

  it('puts overdue first, then orders today by priority and project', () => {
    const due = bogota(2026, 11, 4);
    const projects = [
      project(
        [
          task({ title: 'Baja', dueDate: due, priority: 'baja' }),
          task({ title: 'Sin prioridad', dueDate: due }),
          task({ title: 'Vencida', dueDate: bogota(2026, 11, 1) }),
          task({ title: 'Alta B', dueDate: due, priority: 'alta' }),
        ],
        { name: 'B' }
      ),
      project([task({ title: 'Alta A', dueDate: due, priority: 'alta' })], {
        _id: 'p2' as Id<'projects'>,
        name: 'A',
      }),
    ];
    expect(buildTodayTasks(projects, NOW).map((i) => i.task.title)).toEqual([
      'Vencida',
      'Alta A',
      'Alta B',
      'Baja',
      'Sin prioridad',
    ]);
  });

  it('exposes the next pending subtask of each task', () => {
    const t = task({
      dueDate: bogota(2026, 11, 4),
      subtasks: [
        { id: 'a', title: 'A', isCompleted: true },
        { id: 'b', title: 'B', isCompleted: false },
      ],
    });
    expect(buildTodayTasks([project([t])], NOW)[0].nextSubtask?.id).toBe('b');
  });
});
