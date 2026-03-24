/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the backend API (e.g. /api/v1) */
  readonly VITE_API_BASE_URL: string;
  /** Target server for Vite dev proxy (e.g. http://localhost:3000) */
  readonly VITE_API_PROXY_TARGET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
