import { nodeConfig } from '@clinic-platform/vitest-config/node';
import * as path from 'path';
import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(nodeConfig, {
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
