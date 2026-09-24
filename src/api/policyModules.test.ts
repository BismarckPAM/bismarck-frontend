import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authorizationClient } from './client';
import { createPolicyApi, deactivatePolicyApi, getPoliciesApi, updatePolicyApi } from './policies';
import { checkAuthorizationApi } from './authorization';

vi.mock('./client', () => ({
  authorizationClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Policy and authorization API modules', () => {
  beforeEach(() => vi.clearAllMocks());

  const request = {
    role: 'ADMIN',
    resourceType: 'DATABASE',
    environment: 'PRODUCTION',
    criticality: 'HIGH',
    maxAccessLevel: 4,
    requiresApprovalForElevated: true,
  };

  it('supports policy list, create, update, and deactivate operations', async () => {
    const policy = { id: 'p-1', ...request, isActive: true };
    vi.mocked(authorizationClient.get).mockResolvedValueOnce({ data: [policy] });
    vi.mocked(authorizationClient.post).mockResolvedValueOnce({ data: policy });
    vi.mocked(authorizationClient.put).mockResolvedValueOnce({ data: policy });
    vi.mocked(authorizationClient.delete).mockResolvedValueOnce({
      data: { ...policy, isActive: false },
    });

    await expect(getPoliciesApi()).resolves.toEqual([policy]);
    await expect(createPolicyApi(request)).resolves.toEqual(policy);
    await expect(updatePolicyApi('p-1', request)).resolves.toEqual(policy);
    await expect(deactivatePolicyApi('p-1')).resolves.toMatchObject({ isActive: false });

    expect(authorizationClient.get).toHaveBeenCalledWith('/authz/policies');
    expect(authorizationClient.post).toHaveBeenCalledWith('/authz/policies', request);
    expect(authorizationClient.put).toHaveBeenCalledWith('/authz/policies/p-1', request);
    expect(authorizationClient.delete).toHaveBeenCalledWith('/authz/policies/p-1');
  });

  it('posts an authorization check and returns the decision', async () => {
    const check = {
      userId: 'u-1',
      resourceId: 'r-1',
      action: 'READ_STATUS',
      sessionDurationMinutes: 120,
    };
    const result = { decision: 'APPROVAL_REQUIRED', reason: 'ELEVATED_ACCESS_REQUIRES_APPROVAL' };
    vi.mocked(authorizationClient.post).mockResolvedValueOnce({ data: result });

    await expect(checkAuthorizationApi(check)).resolves.toEqual(result);
    expect(authorizationClient.post).toHaveBeenCalledWith('/api/authorization/check', check);
  });

  it('rejects malformed policy list responses', async () => {
    vi.mocked(authorizationClient.get).mockResolvedValueOnce({ data: null });
    await expect(getPoliciesApi()).rejects.toThrow(/expected an array of policies/i);
  });
});
