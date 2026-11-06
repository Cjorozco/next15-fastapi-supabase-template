import { describe, it, expect } from 'vitest';
import type { Id } from '@/convex/_generated/dataModel';
import { moveOffWeekend, nextOccurrence } from '@/convex/lib/taskFields';
import { normalizeAiRecurrence } from '@/domains/projects/schemas/ai-fields';
import { buildTodayTasks, todayGroupFor } from '@/domains/tasks/lib/today';
import { buildWeekTasks } from '@/domains/tasks/lib/week';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';

// Calendar used below (November 2026):
// Thu 5 · Fri 6 · Sat 7 · Sun 8 · Mon 9 · Tue 10
const BOGOTA = 300;
/** 10:00 in Bogotá on the given day of November 2026. */
const at10 = (day: number) => Date.UTC(2026, 10, day, 15, 0);
/** Noon in Bogotá on the given day of November 2026. */
const noon = (day: number) => Date.UTC(2026, 10, day, 17, 0);
const localDate = (timestamp: number) =>
  new Date(timestamp - BOGOTA * 60_000).toISOString().slice(0, 10);

const next = (now: number, dueDate?: number) =>
  localDate(nextOccurrence({ dueDate, recurrence: 'laboral', now, tzOffsetMinutes: BOGOTA }));

describe('nextOccurrence for a Monday to Friday task', () => {
  it('moves from one weekday to the next', () => {
    expect(next(at10(9), noon(9))).toBe('2026-11-10'); // Mon → Tue
    expect(next(at10(5), noon(5))).toBe('2026-11-06'); // Thu → Fri
  });

  it('completed on Friday comes back on Monday', () => {
    expect(next(at10(6), noon(6))).toBe('2026-11-09');
  });

  it('without a date, on Friday it also comes back on Monday', () => {
    expect(next(at10(6))).toBe('2026-11-09');
  });

  it('completed during the weekend comes back on Monday', () => {
    expect(next(at10(7), noon(6))).toBe('2026-11-09'); // Saturday, overdue from Friday
    expect(next(at10(8), noon(6))).toBe('2026-11-09'); // Sunday, overdue from Friday
  });

  it('an old overdue date never lands in the past or on a weekend', () => {
    expect(next(at10(6), noon(2))).toBe('2026-11-09'); // Due Mon 2, today Fri 6
  });

  it('uses the local weekday, not the UTC one', () => {
    // 02:00 UTC on Fri 6 is still Thu 5 at 21:00 in Bogotá, so the next day is Friday.
    const thursdayNight = Date.UTC(2026, 10, 6, 2, 0);
    expect(next(thursdayNight, noon(5))).toBe('2026-11-06');
  });
});

describe('moveOffWeekend', () => {
  it('moves Saturday and Sunday to the following Monday, at local noon', () => {
    expect(moveOffWeekend(noon(7), BOGOTA)).toBe(noon(9));
    expect(moveOffWeekend(noon(8), BOGOTA)).toBe(noon(9));
  });

  it('leaves weekdays untouched', () => {
    expect(moveOffWeekend(noon(6), BOGOTA)).toBe(noon(6));
    expect(moveOffWeekend(noon(9), BOGOTA)).toBe(noon(9));
  });
});

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
const project = (tasks: Task[]): Project => ({
  _id: 'p1' as Id<'projects'>,
  ownerId: 'u1' as Id<'users'>,
  name: 'Aprendizaje continuo',
  tasks,
});

describe('Hoy', () => {
  it('a Monday to Friday task without a date is due on weekdays only', () => {
    expect(todayGroupFor({ recurrence: 'laboral' }, '2026-11-06')).toBe('hoy');
    expect(todayGroupFor({ recurrence: 'laboral' }, '2026-11-07')).toBeNull();
    expect(todayGroupFor({ recurrence: 'laboral' }, '2026-11-08')).toBeNull();
  });

  it('a task left pending on Friday hides on the weekend and is overdue on Monday', () => {
    const pending = { recurrence: 'laboral' as const, dueDate: noon(6) };
    expect(todayGroupFor(pending, '2026-11-07')).toBeNull();
    expect(todayGroupFor(pending, '2026-11-08')).toBeNull();
    expect(todayGroupFor(pending, '2026-11-09')).toBe('vencida');
  });

  it('a daily task and a regular overdue task still show on the weekend', () => {
    expect(todayGroupFor({ recurrence: 'diaria' }, '2026-11-07')).toBe('hoy');
    expect(todayGroupFor({ recurrence: 'diaria', dueDate: noon(6) }, '2026-11-07')).toBe('vencida');
    expect(todayGroupFor({ dueDate: noon(6) }, '2026-11-07')).toBe('vencida');
  });

  it('the list follows the Bogotá calendar day', () => {
    const habit = task({ recurrence: 'laboral' });
    // 02:00 UTC on Saturday is still Friday night in Bogotá.
    const fridayNight = Date.UTC(2026, 10, 7, 2, 0);
    expect(buildTodayTasks([project([habit])], fridayNight)).toHaveLength(1);
    expect(buildTodayTasks([project([habit])], at10(7))).toHaveLength(0);
  });
});

describe('Esta semana', () => {
  const ids = (tasks: Task[], now: number) =>
    buildWeekTasks([project(tasks)], now).map((item) => item.task._id as string);

  it('hides a Monday to Friday task on the weekend, with or without a date', () => {
    const undated = task({ recurrence: 'laboral' });
    const pending = task({ recurrence: 'laboral', dueDate: noon(6) });
    expect(ids([undated, pending], at10(7))).toEqual([]);
    expect(ids([undated, pending], at10(8))).toEqual([]);
  });

  it('shows it on weekdays', () => {
    const undated = task({ recurrence: 'laboral' });
    expect(ids([undated], at10(6))).toEqual([undated._id]);
    expect(ids([undated], at10(9))).toEqual([undated._id]);
  });

  it('keeps other tasks on the weekend', () => {
    const daily = task({ recurrence: 'diaria' });
    const regular = task({ dueDate: noon(10) });
    expect(ids([daily, regular], at10(7)).sort()).toEqual([daily._id, regular._id].sort());
  });
});

describe('recurrence written by the AI', () => {
  it.each(['laboral', 'Lunes a viernes', 'lunes-viernes', 'L-V', 'weekdays', 'días laborables'])(
    'understands "%s"',
    (value) => {
      expect(normalizeAiRecurrence(value)).toBe('laboral');
    }
  );
});
