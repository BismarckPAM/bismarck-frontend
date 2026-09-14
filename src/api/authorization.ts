import { authorizationClient } from './client';
import type {
  AuthorizationCheckRequest,
  AuthorizationDecisionResult,
} from '../types/policy';

export const checkAuthorizationApi = async (
  request: AuthorizationCheckRequest,
): Promise<AuthorizationDecisionResult> => {
  const response = await authorizationClient.post<AuthorizationDecisionResult>(
    '/api/authorization/check',
    request,
  );
  return response.data;
};