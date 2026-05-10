/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_BASE_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_BASE_URL: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
