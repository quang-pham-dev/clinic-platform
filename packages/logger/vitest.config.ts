import { nodeConfig } from '@clinic-platform/vitest-config/node';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.{test,spec}.ts'],
    },
  }),
);
