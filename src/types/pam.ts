/**
 * Shared domain types for the Bismarck PAM privileged-access workflow.
 *
 * Field names and enum values are derived from the actual backend source code
 * (DTOs, models, controllers). Normalizers accept both string enum names
 * (services that register JsonStringEnumConverter) and numeric ordinals (the
 * Approval Service does not), so the UI never breaks on either serialization.
 */

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JitStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type AuthorizationDecision = 'ALLOW' | 'DENY' | 'APPROVAL_REQUIRED';

const APPROVAL_ORDINAL: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const JIT_ORDINAL: JitStatus[] = ['ACTIVE', 'EXPIRED', 'REVOKED'];

export function normalizeApprovalStatus(value: unknown): ApprovalStatus {
  if (typeof value === 'number') return APPROVAL_ORDINAL[value] ?? 'PENDING';
  const upper = String(value ?? '').toUpperCase();
  return upper === 'APPROVED' || upper === 'REJECTED' ? upper : 'PENDING';
}

export function normalizeJitStatus(value: unknown): JitStatus {
  if (typeof value === 'number') return JIT_ORDINAL[value] ?? 'ACTIVE';
  const upper = String(value ?? '').toUpperCase();
  return upper === 'EXPIRED' || upper === 'REVOKED' ? upper : 'ACTIVE';
}

/** ApprovalRequestResponse returned by the Approval Service. */
export interface ApprovalRequest {
  id: string;
  requesterUserId: string;
  resourceId: string;
  requestedLevel: number;
  reason: string;
  durationMinutes: number;
  status: ApprovalStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  rejectionReason?: string | null;
}

/** CreateApprovalRequestRequest body: POST /api/approval/requests. */
export interface CreateApprovalRequest {
  resourceId: string;
  requestedLevel: number;
  reason: string;
  durationMinutes: number;
}

/** RejectApprovalRequest body: POST /api/approval/requests/{id}/reject. */
export interface RejectApprovalRequest {
  reason: string;
}

/** NotificationResponseDto — GET /api/notifications/{userId}. */
export interface NotificationItem {
  id: string;
  eventType: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

/** AuditLog — GET /api/audit/logs. */
export interface AuditLogEntry {
  id: string;
  eventId: string;
  eventType: string;
  occurredAt: string;
  actor: string;
  resource?: string | null;
  action: string;
  outcome: string;
  metadata: string;
  consumedAt: string;
}

export interface AuditQuery {
  user?: string;
  resource?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Response of POST /api/authorization/permissions/{id}/revoke. */
export interface JitRevokeResult {
  message: string;
  id?: string;
  status?: string;
  revokedAt?: string;
}

/** PagedResult<T> from the Notification and Audit services. */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'rateLimited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unknown';

/** Normalized, user-presentable API error used across the whole UI. */
export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Capability flags describing which backend operations actually exist.
 * Missing endpoints are disabled and can be enabled later without breaking any
 * screen (see apiConfig overrides in api/config.ts).
 */
export interface BackendCapabilities {
  approvalPendingQueue: boolean;
  approvalGetById: boolean;
  approvalMyRequests: boolean;
  notificationsList: boolean;
  notificationsMarkRead: boolean;
  auditList: boolean;
  jitList: boolean;
  jitRequest: boolean;
  jitRevoke: boolean;
}