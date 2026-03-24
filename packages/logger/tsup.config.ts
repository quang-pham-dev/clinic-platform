import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/http.ts', 'src/nestjs.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
}));
