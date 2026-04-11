import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const DEFAULT_PORT = 5173;
const DEFAULT_PROXY_TARGET = 'http://localhost:3000';

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      devtools(),
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    server: {
      host: true,
      port: DEFAULT_PORT,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || DEFAULT_PROXY_TARGET,
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.VITE_API_PROXY_TARGET || DEFAULT_PROXY_TARGET,
          ws: true,
        },
      },
    },
  };
});

export default config;
