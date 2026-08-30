import { identityClient } from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';

/**
 * Calls the Bismarck PAM Identity Service login endpoint.
 * Endpoint: POST /api/identity/auth/login
 */
export const loginApi = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await identityClient.post<LoginResponse>('/api/identity/auth/login', credentials);
  return response.data;
};
