import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginApi } from './auth';
import { getUsersApi } from './users';
import { getResourcesApi } from './resources';
import { identityClient, resourceClient } from './client';

vi.mock('./client', () => {
  const mockIdentityPost = vi.fn();
  const mockIdentityGet = vi.fn();
  const mockResourceGet = vi.fn();

  const identityInstance = {
    post: mockIdentityPost,
    get: mockIdentityGet,
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] },
    },
  };

  const resourceInstance = {
    get: mockResourceGet,
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] },
    },
  };

  return {
    default: identityInstance,
    identityClient: identityInstance,
    resourceClient: resourceInstance,
    apiClient: identityInstance,
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    getAuthExpiresAt: vi.fn(),
    setAuthExpiresAt: vi.fn(),
  };
});

describe('API Module functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginApi', () => {
    it('calls POST /api/identity/auth/login via identityClient and returns response data', async () => {
      const mockResponseData = {
        token: 'test-jwt',
        expiresAt: '2099-01-01T00:00:00.000Z',
        user: {
          id: 'u-1',
          fullName: 'Test User',
          email: 'test@bismarck.sec',
          role: 'Admin',
          department: 'SecOps',
        },
      };

      vi.mocked(identityClient.post).mockResolvedValueOnce({ data: mockResponseData });

      const result = await loginApi({
        email: 'test@bismarck.sec',
        password: 'password123',
      });

      expect(identityClient.post).toHaveBeenCalledWith('/api/identity/auth/login', {
        email: 'test@bismarck.sec',
        password: 'password123',
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('getUsersApi', () => {
    it('returns direct User array from Identity Service response via identityClient', async () => {
      const mockUsers = [
        {
          id: 'u-1',
          fullName: 'Alice Vance',
          email: 'alice@bismarck.sec',
          role: 'Admin',
          department: 'SecOps',
        },
        {
          id: 'u-2',
          fullName: 'Bob Martinez',
          email: 'bob@bismarck.sec',
          role: 'Operator',
          department: 'Infra',
        },
      ];

      vi.mocked(identityClient.get).mockResolvedValueOnce({ data: mockUsers });
      const result = await getUsersApi();
      expect(identityClient.get).toHaveBeenCalledWith('/api/identity/users');
      expect(result).toEqual(mockUsers);
    });

    it('throws an error when the Identity Service response is not an array', async () => {
      vi.mocked(identityClient.get).mockResolvedValueOnce({ data: { message: 'Malformed response' } });
      await expect(getUsersApi()).rejects.toThrow(
        'Unexpected response from Identity Service: expected an array of users',
      );
    });
  });

  describe('getResourcesApi', () => {
    it('returns direct Resource array from Resource Service response via resourceClient', async () => {
      const mockResources = [
        {
          id: 'r-1',
          name: 'prod-db-1',
          type: 'Database',
          environment: 'PRODUCTION',
          criticality: 'CRITICAL',
        },
        {
          id: 'r-2',
          name: 'staging-k8s',
          type: 'Kubernetes',
          environment: 'STAGING',
          criticality: 'HIGH',
        },
      ];

      vi.mocked(resourceClient.get).mockResolvedValueOnce({ data: mockResources });
      const result = await getResourcesApi();
      expect(resourceClient.get).toHaveBeenCalledWith('/api/resources');
      expect(result).toEqual(mockResources);
    });

    it('throws an error when the Resource Service response is not an array', async () => {
      vi.mocked(resourceClient.get).mockResolvedValueOnce({ data: null });
      await expect(getResourcesApi()).rejects.toThrow(
        'Unexpected response from Resource Service: expected an array of resources',
      );
    });
  });
});
