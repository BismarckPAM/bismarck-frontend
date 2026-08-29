import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginApi } from './auth';
import { getUsersApi } from './users';
import { getResourcesApi } from './resources';
import apiClient from './client';

vi.mock('./client', () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  return {
    default: {
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: vi.fn(), handlers: [] },
        response: { use: vi.fn(), handlers: [] },
      },
    },
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
    it('calls POST /api/identity/auth/login and returns response data', async () => {
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

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponseData });

      const result = await loginApi({
        email: 'test@bismarck.sec',
        password: 'password123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/identity/auth/login', {
        email: 'test@bismarck.sec',
        password: 'password123',
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('getUsersApi', () => {
    it('returns array when API responds with direct User array', async () => {
      const mockUsers = [
        {
          id: 'u-1',
          fullName: 'Alice Vance',
          email: 'alice@bismarck.sec',
          role: 'Admin',
          department: 'SecOps',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUsers });
      const result = await getUsersApi();
      expect(apiClient.get).toHaveBeenCalledWith('/api/identity/users');
      expect(result).toEqual(mockUsers);
    });

    it('returns array when API responds with wrapped { users: [...] }', async () => {
      const mockUsers = [
        {
          id: 'u-2',
          fullName: 'Bob Martinez',
          email: 'bob@bismarck.sec',
          role: 'Operator',
          department: 'Infra',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { users: mockUsers } });
      const result = await getUsersApi();
      expect(result).toEqual(mockUsers);
    });

    it('returns array when API responds with wrapped { data: [...] }', async () => {
      const mockUsers = [
        {
          id: 'u-3',
          fullName: 'Charlie Kim',
          email: 'charlie@bismarck.sec',
          role: 'Auditor',
          department: 'Compliance',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockUsers } });
      const result = await getUsersApi();
      expect(result).toEqual(mockUsers);
    });

    it('returns empty array when API response is unexpected', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: null });
      const result = await getUsersApi();
      expect(result).toEqual([]);
    });
  });

  describe('getResourcesApi', () => {
    it('returns array when API responds with direct Resource array', async () => {
      const mockResources = [
        {
          id: 'r-1',
          name: 'prod-db-1',
          type: 'Database',
          environment: 'PRODUCTION',
          criticality: 'CRITICAL',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResources });
      const result = await getResourcesApi();
      expect(apiClient.get).toHaveBeenCalledWith('/api/resources');
      expect(result).toEqual(mockResources);
    });

    it('returns array when API responds with wrapped { resources: [...] }', async () => {
      const mockResources = [
        {
          id: 'r-2',
          name: 'staging-k8s',
          type: 'Kubernetes',
          environment: 'STAGING',
          criticality: 'HIGH',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { resources: mockResources } });
      const result = await getResourcesApi();
      expect(result).toEqual(mockResources);
    });

    it('returns array when API responds with wrapped { data: [...] }', async () => {
      const mockResources = [
        {
          id: 'r-3',
          name: 'dev-bastion',
          type: 'Bastion',
          environment: 'DEV',
          criticality: 'LOW',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockResources } });
      const result = await getResourcesApi();
      expect(result).toEqual(mockResources);
    });

    it('returns empty array when API response is unexpected', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: undefined });
      const result = await getResourcesApi();
      expect(result).toEqual([]);
    });
  });
});
