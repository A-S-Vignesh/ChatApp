interface ImportMetaEnv {
  readonly VITE_AUTH_BASE_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
