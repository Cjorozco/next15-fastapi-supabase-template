import { describe, it, expect } from 'vitest';
import { formatDurationInput, minutesToHours, parseDuration } from '@/domains/tasks/lib/duration';
import { formatHours } from '@/domains/tasks/lib/dates';

describe('parseDuration', () => {
  it('reads minutes', () => {
    expect(parseDuration('10 min')).toBe(0.1667);
    expect(parseDuration('10min')).toBe(0.1667);
    expect(parseDuration('15 minutos')).toBe(0.25);
    expect(parseDuration('90 min')).toBe(1.5);
    expect(parseDuration('30m')).toBe(0.5);
  });

  it('reads hours, treating a bare number as hours', () => {
    expect(parseDuration('2')).toBe(2);
    expect(parseDuration('1.5')).toBe(1.5);
    expect(parseDuration('1,5 h')).toBe(1.5);
    expect(parseDuration('0,5')).toBe(0.5);
    expect(parseDuration('3 horas')).toBe(3);
  });

  it('reads hours and minutes together', () => {
    expect(parseDuration('1h30')).toBe(1.5);
    expect(parseDuration('1 h 30 min')).toBe(1.5);
    expect(parseDuration('2h15m')).toBe(2.25);
  });

  it('returns null for empty or invalid text', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('   ')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('-2')).toBeNull();
    expect(parseDuration('10 dias')).toBeNull();
  });
});

describe('formatDurationInput / minutesToHours', () => {
  it('shows minutes under one hour and hours from one hour', () => {
    expect(formatDurationInput(0.1667)).toBe('10 min');
    expect(formatDurationInput(0.17)).toBe('10 min');
    expect(formatDurationInput(0.25)).toBe('15 min');
    expect(formatDurationInput(0.5)).toBe('30 min');
    expect(formatDurationInput(1)).toBe('1 h');
    expect(formatDurationInput(1.5)).toBe('1.5 h');
    expect(formatDurationInput(2)).toBe('2 h');
  });

  it('round-trips what is stored, so editing never drifts', () => {
    for (const text of ['10 min', '5 min', '45 min', '1 h', '1.5 h', '2 h']) {
      const hours = parseDuration(text)!;
      expect(formatDurationInput(hours)).toBe(text);
      expect(parseDuration(formatDurationInput(hours))).toBe(hours);
    }
  });

  it('stores minutes as hours with 4 decimals', () => {
    expect(minutesToHours(10)).toBe(0.1667);
    expect(minutesToHours(90)).toBe(1.5);
  });

  it('the badge text is the same as the input text', () => {
    for (const hours of [0.1667, 0.25, 0.5, 1, 1.33, 1.5, 6]) {
      expect(formatHours(hours)).toBe(formatDurationInput(hours));
    }
    expect(formatHours(0.1667)).toBe('10 min');
  });
});
