import { nextJsConfig } from '@clinic-platform/eslint-config/next-internal-library';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...nextJsConfig,
  {
    ignores: ['**/.next/**', '**/out/**', '**/build/**', 'next-env.d.ts'],
  },
]);
