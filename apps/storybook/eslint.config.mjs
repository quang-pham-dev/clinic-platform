import { storybookConfig } from '@clinic-platform/eslint-config/storybook';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...storybookConfig,
  {
    ignores: ['dist/**'],
  },
]);
