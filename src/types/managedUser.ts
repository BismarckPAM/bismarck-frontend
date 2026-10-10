/**
 * Directory account shape returned by the Identity Service admin endpoints
 * (GET /api/identity/users/admin/all and PATCH /api/identity/users/{id}/status).
 *
 * Deliberately separate from `types/auth.ts`'s `User`: that one models the login
 * response, which carries no `IsActive`. The Identity `UserResponse` does, and
 * conflating the two would either pollute the auth type or hide the status the
 * Admin Dashboard exists to manage.
 */
export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  role: string;
  departmentId: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

/** Normalize a raw Identity UserResponse into the typed domain shape. */
export function toManagedUser(raw: Record<string, unknown>): ManagedUser {
  return {
    id: String(raw.id ?? ''),
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    roleId: String(raw.roleId ?? ''),
    role: String(raw.role ?? ''),
    departmentId: String(raw.departmentId ?? ''),
    department: String(raw.department ?? ''),
    // Coerce defensively: a missing field must read as "not active" so the row
    // never silently claims an account is enabled when the server said nothing.
    isActive: raw.isActive === true,
    createdAt: String(raw.createdAt ?? ''),
  };
}
