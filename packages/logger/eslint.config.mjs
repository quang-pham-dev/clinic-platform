import { config } from '@clinic-platform/eslint-config/base';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config,
  {
    ignores: ['dist/**'],
  },
]);
