import apiClient from './client';
import type { User } from '../types/auth';

/**
 * Fetches all registered users from the Bismarck PAM Identity Service.
 * Endpoint: GET /api/identity/users
 */
export const getUsersApi = async (): Promise<User[]> => {
  const response = await apiClient.get<User[] | { users?: User[]; data?: User[] }>(
    '/api/identity/users',
  );

  // Normalize response to always return User[]
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.users)) {
    return response.data.users;
  }
  if (response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};
