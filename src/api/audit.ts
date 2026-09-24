import { identityClient } from './client';
import { normalizeApiError } from './errors';
import type { AuditLogEntry, AuditQuery, PagedResult } from '../types/pam';

/**
 * Query audit logs.
 * GET /api/audit/logs?user=&resource=&eventType=&from=&to=&page=&pageSize=
 *   -> PagedResult<AuditLog>
 *
 * Authorization is enforced by the Audit Service ([Authorize]); the frontend
 * only hides the screen for roles that are not expected to have access.
 */
export async function getAuditLogs(
  query: AuditQuery = {},
  signal?: AbortSignal,
): Promise<PagedResult<AuditLogEntry>> {
  try {
    const { data } = await identityClient.get<PagedResult<AuditLogEntry>>('/api/audit/logs', {
      params: query,
      signal,
    });
    const items = Array.isArray(data?.items) ? data.items : [];
    const pageSize = Number(data?.pageSize ?? query.pageSize ?? 20);
    const totalCount = Number(data?.totalCount ?? items.length);
    return {
      items,
      totalCount,
      page: Number(data?.page ?? query.page ?? 1),
      pageSize,
      totalPages: data?.totalPages ?? Math.ceil(totalCount / Math.max(pageSize, 1)),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
