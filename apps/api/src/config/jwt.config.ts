import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret:
    process.env.JWT_ACCESS_SECRET || 'change-me-access-secret-min-32-chars',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-min-32-chars',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
