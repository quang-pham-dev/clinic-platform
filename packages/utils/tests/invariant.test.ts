import { invariant } from '../src/invariant';
import { describe, expect, it } from 'vitest';

describe('invariant', () => {
  it('throws when condition is falsy', () => {
    expect(() => invariant(false, 'boom')).toThrow('boom');
  });

  it('does nothing when condition is truthy', () => {
    expect(() => invariant(true, 'boom')).not.toThrow();
  });
});
