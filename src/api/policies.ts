import { authorizationClient } from './client';
import type { AccessPolicy, AccessPolicyRequest } from '../types/policy';

const policyPath = '/authz/policies';

export const getPoliciesApi = async (): Promise<AccessPolicy[]> => {
  const response = await authorizationClient.get<AccessPolicy[]>(policyPath);
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from Policy Service: expected an array of policies');
  }
  return response.data;
};

export const createPolicyApi = async (request: AccessPolicyRequest): Promise<AccessPolicy> => {
  const response = await authorizationClient.post<AccessPolicy>(policyPath, request);
  return response.data;
};

export const updatePolicyApi = async (
  id: string,
  request: AccessPolicyRequest,
): Promise<AccessPolicy> => {
  const response = await authorizationClient.put<AccessPolicy>(`${policyPath}/${id}`, request);
  return response.data;
};

export const deactivatePolicyApi = async (id: string): Promise<AccessPolicy> => {
  const response = await authorizationClient.delete<AccessPolicy>(`${policyPath}/${id}`);
  return response.data;
};
