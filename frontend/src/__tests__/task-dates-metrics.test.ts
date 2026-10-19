import { describe, it, expect } from 'vitest';
import {
  formatHours,
  fromDateInputValue,
  isTaskOverdue,
  toDateInputValue,
} from '@/domains/tasks/lib/dates';
import { computeProjectMetrics, countOpenTasks } from '@/domains/projects/lib/metrics';
import { resolveTaskStatus, statusAfterCompletion } from '@/convex/lib/taskFields';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime();

describe('date input conversion', () => {
  it('round-trips a local calendar day', () => {
    const ts = day(2030, 3, 9);
    expect(toDateInputValue(ts)).toBe('2030-03-09');
    expect(fromDateInputValue('2030-03-09')).toBe(ts);
  });

  it('returns null for empty or impossible dates', () => {
    expect(fromDateInputValue('')).toBeNull();
    expect(fromDateInputValue('2030-02-31')).toBeNull();
    expect(toDateInputValue(undefined)).toBe('');
  });
});

describe('isTaskOverdue', () => {
  const now = new Date(2030, 5, 15, 14, 30).getTime();

  it('is overdue only when the day is before today and the task is not completed', () => {
    expect(isTaskOverdue({ dueDate: day(2030, 6, 14), isCompleted: false }, now)).toBe(true);
    expect(isTaskOverdue({ dueDate: day(2030, 6, 15), isCompleted: false }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: day(2030, 6, 14), isCompleted: true }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: day(2030, 6, 14), isCompleted: false, status: 'en_progreso' }, now)).toBe(true);
    expect(isTaskOverdue({ isCompleted: false }, now)).toBe(false);
  });
});

describe('resolveTaskStatus', () => {
  it('derives status from the boolean when missing', () => {
    expect(resolveTaskStatus({ isCompleted: true })).toBe('completada');
    expect(resolveTaskStatus({ isCompleted: false })).toBe('pendiente');
  });

  it('keeps an in-progress status and maps legacy values', () => {
    expect(resolveTaskStatus({ isCompleted: false, status: 'en_progreso' })).toBe('en_progreso');
    expect(resolveTaskStatus({ isCompleted: false, status: 'in_progress' })).toBe('en_progreso');
  });

  it('lets the checkbox win over a stale status', () => {
    expect(resolveTaskStatus({ isCompleted: true, status: 'pendiente' })).toBe('completada');
    expect(resolveTaskStatus({ isCompleted: false, status: 'completada' })).toBe('pendiente');
  });

  it('statusAfterCompletion only changes status when crossing the completed boundary', () => {
    expect(statusAfterCompletion('en_progreso', false)).toBe('en_progreso');
    expect(statusAfterCompletion('en_progreso', true)).toBe('completada');
    expect(statusAfterCompletion('completada', false)).toBe('pendiente');
  });
});

describe('computeProjectMetrics', () => {
  it('sums estimated and completed hours and finds the nearest open due date', () => {
    const metrics = computeProjectMetrics([
      { isCompleted: true, estimatedHours: 4, dueDate: day(2030, 1, 1) },
      { isCompleted: false, status: 'en_progreso', estimatedHours: 6.5, dueDate: day(2030, 2, 10) },
      { isCompleted: false, estimatedHours: 2, dueDate: day(2030, 2, 5) },
      { isCompleted: false },
    ]);

    expect(metrics.totalEstimatedHours).toBe(12.5);
    expect(metrics.completedHours).toBe(4);
    // The completed task's earlier date is ignored.
    expect(metrics.nextDueDate).toBe(day(2030, 2, 5));
  });

  it('handles projects without tasks or dates', () => {
    expect(computeProjectMetrics([])).toEqual({
      totalEstimatedHours: 0,
      completedHours: 0,
      nextDueDate: undefined,
    });
  });
});

describe('countOpenTasks', () => {
  it('counts pendiente + en_progreso', () => {
    expect(
      countOpenTasks([
        { isCompleted: false },
        { isCompleted: false, status: 'en_progreso' },
        { isCompleted: true, status: 'completada' },
      ])
    ).toBe(2);
  });
});

describe('formatHours', () => {
  it('drops the decimals of whole numbers', () => {
    expect(formatHours(8)).toBe('8 h');
    expect(formatHours(2.5)).toBe('2.5 h');
  });
});
