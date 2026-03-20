import { formatDate } from '../src/time/formatDate';
import { describe, expect, it } from 'vitest';

describe('formatDate', () => {
  it('formats a date with the default formatter', () => {
    const date = new Date('2025-01-15T00:00:00.000Z');
    expect(formatDate(date)).toContain('Jan');
  });
});
