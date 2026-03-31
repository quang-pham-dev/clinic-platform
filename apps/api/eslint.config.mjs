import { nestjsConfig } from '@clinic-platform/eslint-config/nestjs';

export default [
  ...nestjsConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      'eslint.config.mjs',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'src/database/seeds/**',
    ],
  },
];
