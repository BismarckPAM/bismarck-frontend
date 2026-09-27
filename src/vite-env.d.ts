/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Single API Gateway base URL shared by all backend services.
  readonly VITE_API_URL: string;
  readonly VITE_AUTHORIZATION_API_URL?: string;
  /** Cloudflare Turnstile public site key (onboarding registration form). */
  readonly VITE_TURNSTILE_SITEKEY?: string;
  /** Optional capability overrides (JSON), see src/api/config.ts. */
  readonly VITE_CAPABILITIES?: string;
  /** Notification polling interval in milliseconds. */
  readonly VITE_NOTIFICATION_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
