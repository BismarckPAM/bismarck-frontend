import { describe, it, expect } from 'vitest';
import {
  canRevokePermissions,
  canViewAudit,
  isAdmin,
  isAdminOrSecurityAdmin,
  isApprover,
} from './roles';
import type { User } from '../types/auth';

const asUser = (role: string): User => ({
  id: 'usr-1',
  fullName: 'Test User',
  email: 'test@bismarck.sec',
  role,
  department: 'SecOps',
});

describe('isAdminOrSecurityAdmin (BIS-405 Admin Dashboard guard)', () => {
  it('allows Admin', () => {
    expect(isAdminOrSecurityAdmin(asUser('Admin'))).toBe(true);
  });

  it('allows Security Admin', () => {
    expect(isAdminOrSecurityAdmin(asUser('Security Admin'))).toBe(true);
  });

  it('allows the SecurityAdmin alias when formatting differs', () => {
    expect(isAdminOrSecurityAdmin(asUser('SecurityAdmin'))).toBe(true);
  });

  it('normalizes harmless formatting (case and surrounding whitespace)', () => {
    expect(isAdminOrSecurityAdmin(asUser('  admin  '))).toBe(true);
    expect(isAdminOrSecurityAdmin(asUser('SECURITY ADMIN'))).toBe(true);
  });

  it('blocks a Developer', () => {
    expect(isAdminOrSecurityAdmin(asUser('Developer'))).toBe(false);
  });

  it('blocks a Manager — the story does not grant dashboard access', () => {
    expect(isAdminOrSecurityAdmin(asUser('Manager'))).toBe(false);
  });

  it('blocks an Auditor', () => {
    expect(isAdminOrSecurityAdmin(asUser('Auditor'))).toBe(false);
  });

  it('blocks an undefined or null user', () => {
    expect(isAdminOrSecurityAdmin(undefined)).toBe(false);
    expect(isAdminOrSecurityAdmin(null)).toBe(false);
  });

  it('blocks a user with no role at all', () => {
    expect(isAdminOrSecurityAdmin({ ...asUser(''), role: '' })).toBe(false);
  });

  it('does not treat every role containing "admin" as privileged', () => {
    // A substring test such as role.includes('admin') would wrongly allow these.
    expect(isAdminOrSecurityAdmin(asUser('Admin Reports Viewer'))).toBe(false);
    expect(isAdminOrSecurityAdmin(asUser('Superadmin'))).toBe(false);
    expect(isAdminOrSecurityAdmin(asUser('Non-Admin Trainee'))).toBe(false);
  });
});

describe('existing role helpers keep their original semantics', () => {
  it('isAdmin stays Admin-only and is NOT widened to Security Admin', () => {
    // Widening this would hand Security Admin the Admin-only onboarding queue.
    expect(isAdmin(asUser('Admin'))).toBe(true);
    expect(isAdmin(asUser('Security Admin'))).toBe(false);
    expect(isAdmin(asUser('SecurityAdmin'))).toBe(false);
    expect(isAdmin(asUser('Developer'))).toBe(false);
  });

  it('isApprover stays Admin/Manager only', () => {
    expect(isApprover(asUser('Admin'))).toBe(true);
    expect(isApprover(asUser('Manager'))).toBe(true);
    // A Security Admin must NOT become an approver: human approval authority is
    // a separate security capability owned by the Approval Service.
    expect(isApprover(asUser('Security Admin'))).toBe(false);
    expect(isApprover(asUser('Developer'))).toBe(false);
    expect(isApprover(undefined)).toBe(false);
  });

  it('canViewAudit is unchanged', () => {
    expect(canViewAudit(asUser('Admin'))).toBe(true);
    expect(canViewAudit(asUser('Manager'))).toBe(true);
    expect(canViewAudit(asUser('Developer'))).toBe(false);
  });

  it('canRevokePermissions now matches the backend: Admin OR Security Admin', () => {
    expect(canRevokePermissions(asUser('Admin'))).toBe(true);
    expect(canRevokePermissions(asUser('Security Admin'))).toBe(true);
    expect(canRevokePermissions(asUser('Developer'))).toBe(false);
    expect(canRevokePermissions(asUser('Manager'))).toBe(false);
  });
});
