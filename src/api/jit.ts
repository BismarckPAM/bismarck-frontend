import { authorizationClient } from './client';
import { normalizeApiError } from './errors';
import { normalizeJitStatus, type JitRevokeResult, type JitSession } from '../types/pam';

/** Normalize a raw JitSessionResponse into the typed domain shape. */
function toJitSession(raw: Record<string, unknown>): JitSession {
  const num = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    id: String(raw.id ?? ''),
    approvalId: String(raw.approvalId ?? ''),
    userId: String(raw.userId ?? ''),
    userEmail: raw.userEmail ? String(raw.userEmail) : null,
    resourceId: String(raw.resourceId ?? ''),
    resourceName: raw.resourceName ? String(raw.resourceName) : null,
    action: raw.action ? String(raw.action) : null,
    requestedLevel: num(raw.requestedLevel),
    status: normalizeJitStatus(raw.status),
    grantedAt: String(raw.grantedAt ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
    revokedAt: raw.revokedAt ? String(raw.revokedAt) : null,
    revokedByUserId: raw.revokedByUserId ? String(raw.revokedByUserId) : null,
    remainingSeconds: Math.max(0, num(raw.remainingSeconds)),
    provisioningStatus: raw.provisioningStatus ? String(raw.provisioningStatus) : null,
    provisioningDetail: raw.provisioningDetail ? String(raw.provisioningDetail) : null,
  };
}

/**
 * List Just-In-Time sessions.
 * GET /api/jit/sessions?activeOnly={bool} -> 200 JitSessionResponse[]
 *
 * This is the authoritative view of granted access: rows are created by the
 * Authorization Service when it consumes the `approval-granted` Kafka event, so
 * the list is empty until an approval has actually been processed.
 *
 * Scoping is enforced server-side — a regular user only ever receives their own
 * sessions; an Admin receives everyone's.
 */
export async function listJitSessions(activeOnly = false): Promise<JitSession[]> {
  try {
    const { data } = await authorizationClient.get<Record<string, unknown>[]>('/api/jit/sessions', {
      params: { activeOnly },
    });
    return Array.isArray(data) ? data.map(toJitSession) : [];
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Manually revoke an ACTIVE temporary (Just-In-Time) permission.
 * POST /api/authorization/permissions/{id}/revoke -> 200
 *
 * Admin-only on the backend: a non-Admin receives 403, an already
 * expired/revoked permission returns 409, and an unknown id returns 404.
 * The `id` is a `TemporaryPermission` id, which is the `id` returned by
 * `listJitSessions` — NOT an approval request id.
 */
export async function revokeTemporaryPermission(id: string): Promise<JitRevokeResult> {
  try {
    const { data } = await authorizationClient.post<JitRevokeResult>(
      `/api/authorization/permissions/${id}/revoke`,
    );
    return data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
