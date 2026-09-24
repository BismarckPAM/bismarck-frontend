import type { BackendCapabilities } from '../types/pam';

/**
 * Environment configuration.
 *
 * EVERY browser API call goes through the single API Gateway base URL
 * (`VITE_API_URL`). There are deliberately NO per-service base URLs — the
 * gateway is the one public entry point. `VITE_AUTHORIZATION_API_URL` is only
 * an already-existing project convention that defaults back to the gateway.
 *
 * No secrets live here; only public base URLs baked in at build time.
 */
export const env = {
  gatewayBaseUrl: import.meta.env.VITE_API_URL || '',
  authorizationBaseUrl:
    import.meta.env.VITE_AUTHORIZATION_API_URL || import.meta.env.VITE_API_URL || '',
};

/**
 * Capability flags for endpoints that do NOT exist in the backend today.
 *
 * Defaults reflect the real backend contract. Each flag can be flipped on later
 * (or overridden via VITE_CAPABILITIES as JSON) once the endpoint is added,
 * without touching any screen.
 *
 * Known backend gaps (verified against backend source):
 *  - No "list my own requests" endpoint. GET /api/approval/requests returns the
 *    full PENDING queue and is restricted to approvers.
 *  - No notification mark-as-read endpoint (notifications are an immutable log).
 *  - No JIT "list permissions" / standalone JIT request endpoint; JIT grants are
 *    created by the `approval-granted` Kafka event.
 */
const baselineCapabilities: BackendCapabilities = {
  approvalPendingQueue: true,
  approvalGetById: true,
  approvalMyRequests: false,
  notificationsList: true,
  notificationsMarkRead: false,
  auditList: true,
  jitList: false,
  jitRequest: false,
  jitRevoke: true,
};

function readOverrides(): Partial<BackendCapabilities> {
  const raw = import.meta.env.VITE_CAPABILITIES;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<BackendCapabilities>;
  } catch {
    return {};
  }
}

export const capabilities: BackendCapabilities = {
  ...baselineCapabilities,
  ...readOverrides(),
};

/** Polling interval (ms) for notification refreshes. Configurable, never aggressive. */
export const notificationPollIntervalMs = Number(
  import.meta.env.VITE_NOTIFICATION_POLL_MS || 60000,
);