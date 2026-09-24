import type { User } from '../types/auth';

/**
 * Role handling.
 *
 * The Identity token carries a SINGLE role (`ClaimTypes.Role`). The Approval
 * Service approver role is configured as `Approval:ApproverRoles = ["Admin"]`,
 * so only Admin is treated as an approver by the backend today. Manager is
 * accepted defensively as a second potential approver role so the UI tracks a
 * future config change; backend authorization remains the source of truth.
 */
export const APPROVER_ROLES = ['Admin', 'Manager'] as const;

export function isApprover(user: User | null | undefined): boolean {
  const role = user?.role?.trim().toLowerCase();
  if (!role) return false;
  return APPROVER_ROLES.some((candidate) => candidate.toLowerCase() === role);
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role?.trim().toLowerCase() === 'admin';
}

/** Audit data is restricted; expose the screen to Admin (and Manager defensively). */
export function canViewAudit(user: User | null | undefined): boolean {
  return isApprover(user);
}

/** Manual JIT permission revoke is Admin-only on the backend. */
export function canRevokePermissions(user: User | null | undefined): boolean {
  return isAdmin(user);
}