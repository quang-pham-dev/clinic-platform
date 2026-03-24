import { config } from '@clinic-platform/eslint-config/base';

export default [
  ...config,
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
