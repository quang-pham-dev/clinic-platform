import type { LoginRequest, RegisterRequest, TokenResponse } from './auth';
import { Role } from '@clinic-platform/types';
import { describe, expect, it } from 'vitest';

describe('auth types', () => {
  it('should have LoginRequest defined', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(loginRequest.email).toBe('test@example.com');
  });

  it('should have RegisterRequest defined', () => {
    const registerRequest: RegisterRequest = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };
    expect(registerRequest.fullName).toBe('Test User');
  });

  it('should have TokenResponse defined', () => {
    const tokenResponse: TokenResponse = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.PATIENT,
      },
    };
    expect(tokenResponse.accessToken).toBeDefined();
    expect(tokenResponse.user.role).toBe(Role.PATIENT);
  });
});
