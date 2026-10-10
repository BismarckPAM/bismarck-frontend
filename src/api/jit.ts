import { authorizationClient } from './client';
import { normalizeApiError } from './errors';
import { normalizeJitStatus, type JitSession } from '../types/pam';

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
    targetVmName: raw.targetVmName ? String(raw.targetVmName) : null,
    targetHost: raw.targetHost ? String(raw.targetHost) : null,
    targetOsType: raw.targetOsType ? String(raw.targetOsType) : null,
    connectionCommand: raw.connectionCommand ? String(raw.connectionCommand) : null,
    targetResourceGroup: raw.targetResourceGroup ? String(raw.targetResourceGroup) : null,
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
 * POST /api/jit/sessions/{id}/revoke  body: { reason?: string } -> 200 JitSessionResponse
 *
 * Admin or Security Admin on the backend: an ordinary user receives 403, an
 * already expired/revoked session returns 409, and an unknown id returns 404.
 * The `id` is a `TemporaryPermission` id, which is the `id` returned by
 * `listJitSessions` — NOT an approval request id.
 *
 * This is deliberately the JIT-session endpoint rather than the older
 * `/api/authorization/permissions/{id}/revoke`. Revocation here has IMMEDIATE
 * effect: it closes the live brokered terminal, revokes the cloud role
 * assignment (best effort), marks the permission REVOKED with RevokedAt /
 * RevokedByUserId, and publishes the JIT revocation event. The older endpoint
 * only flipped the database row, leaving a live shell running.
 *
 * The legacy endpoint remains on the server for backward compatibility; this
 * helper simply no longer uses it.
 */
export async function revokeTemporaryPermission(id: string, reason?: string): Promise<JitSession> {
  try {
    const { data } = await authorizationClient.post<Record<string, unknown>>(
      `/api/jit/sessions/${id}/revoke`,
      { reason: reason?.trim() ? reason.trim() : null },
    );
    return toJitSession(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
