import { identityClient } from './client';
import { normalizeApiError } from './errors';
import {
  normalizeApprovalStatus,
  type ApprovalRequest,
  type CreateApprovalRequest,
  type RejectApprovalRequest,
} from '../types/pam';

/** Normalize a raw Approval Service payload into a typed ApprovalRequest. */
function toApprovalRequest(raw: Record<string, unknown>): ApprovalRequest {
  return {
    id: String(raw.id ?? ''),
    requesterUserId: String(raw.requesterUserId ?? ''),
    resourceId: String(raw.resourceId ?? ''),
    requestedLevel: Number(raw.requestedLevel ?? 0),
    reason: String(raw.reason ?? ''),
    durationMinutes: Number(raw.durationMinutes ?? 0),
    status: normalizeApprovalStatus(raw.status),
    createdAt: String(raw.createdAt ?? ''),
    reviewedAt: (raw.reviewedAt as string | null) ?? null,
    reviewedByUserId: (raw.reviewedByUserId as string | null) ?? null,
    rejectionReason: (raw.rejectionReason as string | null) ?? null,
  };
}

async function withNormalizedError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Submit an access request.
 * POST /api/approval/requests  -> 201 ApprovalRequestResponse
 */
export async function createApprovalRequest(
  body: CreateApprovalRequest,
): Promise<ApprovalRequest> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.post<Record<string, unknown>>(
      '/api/approval/requests',
      body,
    );
    return toApprovalRequest(data);
  });
}

/**
 * List PENDING approval requests (approver only — Admin).
 * GET /api/approval/requests -> 200 ApprovalRequestResponse[]
 * Backend returns 403 for non-approvers.
 */
export async function listPendingApprovalRequests(): Promise<ApprovalRequest[]> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.get<Record<string, unknown>[]>(
      '/api/approval/requests',
    );
    return Array.isArray(data) ? data.map(toApprovalRequest) : [];
  });
}

/**
 * Fetch a single approval request.
 * GET /api/approval/requests/{id} -> 200 ApprovalRequestResponse
 */
export async function getApprovalRequest(id: string): Promise<ApprovalRequest> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.get<Record<string, unknown>>(
      `/api/approval/requests/${id}`,
    );
    return toApprovalRequest(data);
  });
}

/**
 * Approve a request (approver only).
 * POST /api/approval/requests/{id}/approve -> 200 ApprovalRequestResponse
 */
export async function approveApprovalRequest(id: string): Promise<ApprovalRequest> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.post<Record<string, unknown>>(
      `/api/approval/requests/${id}/approve`,
    );
    return toApprovalRequest(data);
  });
}

/**
 * Reject a request with a mandatory reason (approver only).
 * POST /api/approval/requests/{id}/reject -> 200 ApprovalRequestResponse
 */
export async function rejectApprovalRequest(
  id: string,
  body: RejectApprovalRequest,
): Promise<ApprovalRequest> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.post<Record<string, unknown>>(
      `/api/approval/requests/${id}/reject`,
      body,
    );
    return toApprovalRequest(data);
  });
}