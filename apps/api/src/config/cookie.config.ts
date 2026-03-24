import { registerAs } from '@nestjs/config';

export default registerAs('cookie', () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches refresh token TTL
  name: 'refresh_token',
}));
