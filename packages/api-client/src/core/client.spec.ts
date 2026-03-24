import { type ClientConfig, type TokenPair } from './client';
import { describe, expect, it } from 'vitest';

describe('createHttpClient', () => {
  it('should export HttpClient type and factory', async () => {
    const { createHttpClient } = await import('./client');
    expect(createHttpClient).toBeDefined();
    expect(typeof createHttpClient).toBe('function');
  });

  it('should accept ClientConfig with all required fields', () => {
    const config: ClientConfig = {
      baseUrl: 'http://localhost:3000/api/v1',
      getAccessToken: () => 'token',
      getRefreshToken: () => 'refresh',
      onTokenRefreshed: (_tokens: TokenPair) => {},
      onAuthError: () => {},
    };
    expect(config.baseUrl).toBe('http://localhost:3000/api/v1');
  });

  it('should accept optional timeout config', () => {
    const config: ClientConfig = {
      baseUrl: 'http://localhost:3000/api/v1',
      getAccessToken: () => null,
      getRefreshToken: () => null,
      onTokenRefreshed: () => {},
      onAuthError: () => {},
      timeout: 10000,
    };
    expect(config.timeout).toBe(10000);
  });
});

describe('queryKeys', () => {
  it('should generate hierarchical query keys', async () => {
    const { queryKeys } = await import('./query-keys');

    expect(queryKeys.bookings.all).toEqual(['bookings']);
    expect(queryKeys.bookings.lists()).toEqual(['bookings', 'list']);
    expect(queryKeys.bookings.detail('123')).toEqual([
      'bookings',
      'detail',
      '123',
    ]);
    expect(queryKeys.slots.list('doc-1', { date: '2026-01-01' })).toEqual([
      'slots',
      'list',
      'doc-1',
      { date: '2026-01-01' },
    ]);
  });
});
