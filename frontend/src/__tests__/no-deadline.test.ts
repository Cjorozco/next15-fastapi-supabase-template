import { describe, it, expect } from 'vitest';
import { hasNoDeadline } from '@/convex/lib/taskFields';

describe('hasNoDeadline', () => {
  it('is false for a plain task without date', () => {
    expect(hasNoDeadline({})).toBe(false);
    expect(hasNoDeadline({ noDeadline: false })).toBe(false);
  });

  it('is true when flagged and has no date', () => {
    expect(hasNoDeadline({ noDeadline: true })).toBe(true);
  });

  it('treats recurring tasks as having no deadline by default', () => {
    expect(hasNoDeadline({ recurrence: 'diaria' })).toBe(true);
    expect(hasNoDeadline({ recurrence: 'semanal' })).toBe(true);
  });

  it('lets an explicit false win over the recurrence default', () => {
    expect(hasNoDeadline({ recurrence: 'diaria', noDeadline: false })).toBe(false);
  });

  it('never applies to a task that has a date', () => {
    expect(hasNoDeadline({ noDeadline: true, dueDate: 1 })).toBe(false);
    expect(hasNoDeadline({ recurrence: 'diaria', dueDate: 1 })).toBe(false);
  });
});
