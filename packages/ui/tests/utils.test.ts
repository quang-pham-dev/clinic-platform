import { cn } from '../src/lib/utils';
import { describe, expect, it } from 'vitest';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4')).toContain('px-4');
  });
});
