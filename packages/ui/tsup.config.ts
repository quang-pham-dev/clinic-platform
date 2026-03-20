import { Options, defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  banner: {
    js: "'use client'",
  },
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
  dts: true,
  ...options,
}));
