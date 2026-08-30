import { identityClient } from './client';
import type { User } from '../types/auth';

/**
 * Fetches all registered users from the Bismarck PAM Identity Service.
 * Endpoint: GET /api/identity/users
 */
export const getUsersApi = async (): Promise<User[]> => {
  const response = await identityClient.get<User[]>('/api/identity/users');
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from Identity Service: expected an array of users');
  }
  return response.data;
};
