import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import {
  identityClient,
  resourceClient,
  apiClient,
  getAuthToken,
  setAuthToken,
  getAuthExpiresAt,
  setAuthExpiresAt,
  clearAuthToken,
} from './client';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('configures distinct base URLs for identityClient and resourceClient', () => {
    expect(identityClient.defaults.baseURL).toBeDefined();
    expect(resourceClient.defaults.baseURL).toBeDefined();
    expect(apiClient).toBe(identityClient);
  });

  it('manages auth tokens and expiration in localStorage', () => {
    expect(getAuthToken()).toBeNull();
    expect(getAuthExpiresAt()).toBeNull();

    setAuthToken('test-jwt-token');
    setAuthExpiresAt('2099-01-01T00:00:00.000Z');

    expect(getAuthToken()).toBe('test-jwt-token');
    expect(getAuthExpiresAt()).toBe('2099-01-01T00:00:00.000Z');

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(getAuthExpiresAt()).toBeNull();
  });

  describe('identityClient interceptors', () => {
    it('attaches Authorization Bearer token header in request interceptor', async () => {
      setAuthToken('my-identity-secret-jwt');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestHandler = (identityClient.interceptors.request as any).handlers[0]?.fulfilled;
      expect(requestHandler).toBeDefined();

      const initialConfig: InternalAxiosRequestConfig = {
        headers: new AxiosHeaders(),
      };

      const config = await requestHandler(initialConfig);
      expect(config.headers.Authorization).toBe('Bearer my-identity-secret-jwt');
    });

    it('handles 401 response by clearing token', async () => {
      setAuthToken('expired-identity-jwt');
      expect(getAuthToken()).toBe('expired-identity-jwt');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorHandler = (identityClient.interceptors.response as any).handlers[0]?.rejected;
      expect(errorHandler).toBeDefined();

      const error401 = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      await expect(errorHandler(error401)).rejects.toEqual(error401);
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('resourceClient interceptors', () => {
    it('attaches Authorization Bearer token header in request interceptor', async () => {
      setAuthToken('my-resource-secret-jwt');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestHandler = (resourceClient.interceptors.request as any).handlers[0]?.fulfilled;
      expect(requestHandler).toBeDefined();

      const initialConfig: InternalAxiosRequestConfig = {
        headers: new AxiosHeaders(),
      };

      const config = await requestHandler(initialConfig);
      expect(config.headers.Authorization).toBe('Bearer my-resource-secret-jwt');
    });

    it('handles 401 response by clearing token', async () => {
      setAuthToken('expired-resource-jwt');
      expect(getAuthToken()).toBe('expired-resource-jwt');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorHandler = (resourceClient.interceptors.response as any).handlers[0]?.rejected;
      expect(errorHandler).toBeDefined();

      const error401 = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      await expect(errorHandler(error401)).rejects.toEqual(error401);
      expect(getAuthToken()).toBeNull();
    });
  });
});
