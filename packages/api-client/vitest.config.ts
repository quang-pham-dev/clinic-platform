import { nodeConfig } from '@clinic-platform/vitest-config/node';
import * as path from 'path';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(nodeConfig, {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
