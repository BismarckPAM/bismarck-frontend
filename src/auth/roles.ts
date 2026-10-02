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

/**
 * Roles allowed into the Admin Dashboard (BIS-405).
 *
 * Kept SEPARATE from isAdmin on purpose. Widening isAdmin would silently hand
 * Security Admin every Admin-only feature (e.g. the onboarding review queue),
 * which is not part of this story. Only the Admin Dashboard, BIS-405 user
 * management, BIS-405 policy management and JIT administration use this.
 *
 * Exact allow-list — never `role.includes('admin')`, which would wrongly
 * privilege roles such as "Auditor (Admin Reports)" or "Non-Admin Trainee".
 */
export const ADMIN_DASHBOARD_ROLES = ['Admin', 'Security Admin'] as const;

export function isAdminOrSecurityAdmin(user: User | null | undefined): boolean {
  const role = user?.role?.trim().toLowerCase();
  if (!role) return false;
  // "SecurityAdmin" (no space) is accepted defensively so a deployment that
  // seeds the role without the space still reaches the dashboard.
  return ADMIN_DASHBOARD_ROLES.some((candidate) => {
    const normalized = candidate.toLowerCase();
    return role === normalized || role === normalized.replace(' ', '');
  });
}

/** Audit data is restricted; expose the screen to Admin (and Manager defensively). */
export function canViewAudit(user: User | null | undefined): boolean {
  return isApprover(user);
}

/**
 * Manual JIT permission revoke. Matches the Authorization Service, which lets
 * Admin AND Security Admin revoke any session.
 */
export function canRevokePermissions(user: User | null | undefined): boolean {
  return isAdminOrSecurityAdmin(user);
}
