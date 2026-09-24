/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Single API Gateway base URL shared by all backend services.
  readonly VITE_API_URL: string;
  readonly VITE_AUTHORIZATION_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
