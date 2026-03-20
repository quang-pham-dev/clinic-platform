import { config } from '@clinic-platform/eslint-config/react-internal-library';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config,
  {
    ignores: ['dist/**'],
  },
]);
