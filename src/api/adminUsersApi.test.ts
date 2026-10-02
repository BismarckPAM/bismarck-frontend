import { describe, expect, it, vi, beforeEach } from 'vitest';
import { identityClient } from './client';
import { getAdminUsersApi, updateUserStatusApi, getUsersApi } from './users';

vi.mock('./client', () => ({
  identityClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

/** A raw Identity `UserResponse` exactly as the service serialises it. */
const rawUser = {
  id: 'usr-1',
  fullName: 'Alice Vance',
  email: 'alice.vance@bismarck.sec',
  roleId: 'role-1',
  role: 'Developer',
  departmentId: 'dep-1',
  department: 'Engineering',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Admin user-management API (BIS-405)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the Admin directory from the dedicated all-accounts route', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: [rawUser] });

    const result = await getAdminUsersApi();

    expect(identityClient.get).toHaveBeenCalledWith('/api/identity/users/admin/all');
    expect(result).toEqual([rawUser]);
  });

  it('returns an empty list rather than throwing on an empty payload', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: [] });
    await expect(getAdminUsersApi()).resolves.toEqual([]);
  });

  it('normalizes a payload missing isActive to inactive, never to active', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({
      data: [{ ...rawUser, isActive: undefined }],
    });

    const [user] = await getAdminUsersApi();

    // Fail-safe: silence must never be read as "this account is enabled".
    expect(user.isActive).toBe(false);
  });

  it('PATCHes only { isActive } to the focused status route', async () => {
    vi.mocked(identityClient.patch).mockResolvedValueOnce({
      data: { ...rawUser, isActive: false },
    });

    const result = await updateUserStatusApi('usr-1', false);

    // No FullName / Email / RoleId / DepartmentId is required to flip an account.
    expect(identityClient.patch).toHaveBeenCalledWith('/api/identity/users/usr-1/status', {
      isActive: false,
    });
    expect(result.isActive).toBe(false);
    expect(result.email).toBe('alice.vance@bismarck.sec');
  });

  it('activates through the same route with isActive true', async () => {
    vi.mocked(identityClient.patch).mockResolvedValueOnce({ data: rawUser });

    await updateUserStatusApi('usr-1', true);

    expect(identityClient.patch).toHaveBeenCalledWith('/api/identity/users/usr-1/status', {
      isActive: true,
    });
  });

  it('normalizes API failures so the UI never shows a raw stack trace', async () => {
    vi.mocked(identityClient.patch).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403, data: {} },
    });

    await expect(updateUserStatusApi('usr-1', false)).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
    });
  });

  it('leaves the standard active-only listing untouched', async () => {
    vi.mocked(identityClient.get).mockResolvedValueOnce({ data: [rawUser] });

    await getUsersApi();

    // Existing consumers (Access Check, /users) must keep the original contract.
    expect(identityClient.get).toHaveBeenCalledWith('/api/identity/users');
  });
});