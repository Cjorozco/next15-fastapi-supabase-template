import { describe, it, expect } from 'vitest';
import { nextOccurrence } from '@/convex/lib/taskFields';

const DAY = 24 * 60 * 60 * 1000;

/** Local calendar date (YYYY-MM-DD) of a timestamp for a given `getTimezoneOffset()` value. */
function localDate(timestamp: number, tzOffsetMinutes: number): string {
  return new Date(timestamp - tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

const NOW = Date.UTC(2030, 5, 12, 15, 0); // Wed 12 Jun 2030, 15:00 UTC

describe('nextOccurrence (UTC)', () => {
  it('daily: due today moves to tomorrow', () => {
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 12), recurrence: 'diaria', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-13');
  });

  it('daily: an overdue task never lands in the past', () => {
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 1), recurrence: 'diaria', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-13');
  });

  it('daily: completing early jumps to the day after the due date', () => {
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 20), recurrence: 'diaria', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-21');
  });

  it('weekly: due today moves one week ahead', () => {
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 12), recurrence: 'semanal', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-19');
  });

  it('weekly: an overdue task keeps its weekday', () => {
    // Due Sat 1 Jun; today is Wed 12 Jun, so the next Saturday is 15 Jun.
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 1), recurrence: 'semanal', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-15');
  });

  it('weekly: completing early moves to the following cycle', () => {
    const next = nextOccurrence({ dueDate: Date.UTC(2030, 5, 14), recurrence: 'semanal', now: NOW });
    expect(localDate(next, 0)).toBe('2030-06-21');
  });

  it('without a due date the cycle starts today', () => {
    expect(localDate(nextOccurrence({ recurrence: 'diaria', now: NOW }), 0)).toBe('2030-06-13');
    expect(localDate(nextOccurrence({ recurrence: 'semanal', now: NOW }), 0)).toBe('2030-06-19');
  });

  it('always returns a timestamp after now', () => {
    for (const dueDate of [undefined, NOW - 40 * DAY, NOW, NOW + 40 * DAY]) {
      for (const recurrence of ['diaria', 'semanal'] as const) {
        expect(nextOccurrence({ dueDate, recurrence, now: NOW })).toBeGreaterThan(NOW);
      }
    }
  });
});

describe('nextOccurrence in the user timezone', () => {
  // Bogotá is UTC-5 => getTimezoneOffset() === 300.
  const BOGOTA = 300;

  it('uses the local calendar day, not the UTC day', () => {
    // 02:00 UTC on 13 Jun is still 12 Jun 21:00 in Bogotá.
    const now = Date.UTC(2030, 5, 13, 2, 0);
    const dueLocalMidnight = Date.UTC(2030, 5, 12, 5, 0); // 12 Jun 00:00 Bogotá
    const next = nextOccurrence({
      dueDate: dueLocalMidnight,
      recurrence: 'diaria',
      now,
      tzOffsetMinutes: BOGOTA,
    });
    expect(localDate(next, BOGOTA)).toBe('2030-06-13');
  });

  it('lands at local noon so a DST change cannot move the calendar day', () => {
    const next = nextOccurrence({
      dueDate: Date.UTC(2030, 5, 12, 5, 0),
      recurrence: 'semanal',
      now: NOW,
      tzOffsetMinutes: BOGOTA,
    });
    const local = new Date(next - BOGOTA * 60_000);
    expect(local.getUTCHours()).toBe(12);
    // One hour of DST drift in either direction keeps the same date.
    expect(localDate(next + 60 * 60_000, BOGOTA)).toBe(localDate(next, BOGOTA));
    expect(localDate(next - 60 * 60_000, BOGOTA)).toBe(localDate(next, BOGOTA));
  });
});
