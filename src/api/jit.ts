import { authorizationClient } from './client';
import { normalizeApiError } from './errors';
import type { JitRevokeResult } from '../types/pam';

/**
 * Manually revoke an ACTIVE temporary (Just-In-Time) permission.
 * POST /api/authorization/permissions/{id}/revoke -> 200
 *
 * Admin-only on the backend: a non-Admin receives 403, an already
 * expired/revoked permission returns 409, and an unknown id returns 404.
 * No JIT "list permissions" endpoint exists in the backend, so the UI only
 * exposes revoke when given a known permission id (from an approval id flow).
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
