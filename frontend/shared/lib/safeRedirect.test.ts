import { describe, expect, test } from 'vitest';
import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  test('keeps internal paths with their query', () => {
    expect(safeRedirectPath('/oauth/consent?authorization_id=abc')).toBe(
      '/oauth/consent?authorization_id=abc'
    );
  });

  test('falls back for external or malformed targets', () => {
    for (const value of [
      null,
      '',
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
    ]) {
      expect(safeRedirectPath(value)).toBe('/hoy');
    }
  });
});
