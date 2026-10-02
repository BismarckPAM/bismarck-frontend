import { identityClient } from './client';
import { normalizeApiError } from './errors';
import type { User } from '../types/auth';
import { toManagedUser, type ManagedUser } from '../types/managedUser';

/**
 * Fetches all registered users from the Bismarck PAM Identity Service.
 * Endpoint: GET /api/identity/users
 *
 * Returns ACTIVE accounts only — the Identity `User.IsActive` query filter hides
 * deactivated ones. Existing consumers (Access Check, the /users screen) rely on
 * that, so this function is unchanged.
 */
export const getUsersApi = async (): Promise<User[]> => {
  const response = await identityClient.get<User[]>('/api/identity/users');
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from Identity Service: expected an array of users');
  }
  return response.data;
};

/**
 * Admin user directory, INCLUDING deactivated accounts.
 * Endpoint: GET /api/identity/users/admin/all
 *
 * Server-restricted to Admin / Security Admin. This is what makes an
 * administrator able to see and reactivate an account that has been switched off.
 */
export const getAdminUsersApi = async (): Promise<ManagedUser[]> => {
  try {
    const { data } = await identityClient.get<Record<string, unknown>[]>(
      '/api/identity/users/admin/all',
    );
    return Array.isArray(data) ? data.map(toManagedUser) : [];
  } catch (error) {
    throw normalizeApiError(error);
  }
};

/**
 * Activate / deactivate a single account.
 * PATCH /api/identity/users/{id}/status  body: { isActive: boolean }
 *
 * Returns the full updated account. Repeating the status an account already has
 * is a safe no-op (200), which makes UI retries safe.
 */
export const updateUserStatusApi = async (
  userId: string,
  isActive: boolean,
): Promise<ManagedUser> => {
  try {
    const { data } = await identityClient.patch<Record<string, unknown>>(
      `/api/identity/users/${userId}/status`,
      { isActive },
    );
    return toManagedUser(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
};
