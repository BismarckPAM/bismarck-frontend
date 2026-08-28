import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import apiClient, { getAuthToken, setAuthToken, clearAuthToken } from './client';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('manages auth tokens in localStorage', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('test-jwt-token');
    expect(getAuthToken()).toBe('test-jwt-token');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('attaches Authorization Bearer token header in request interceptor', async () => {
    setAuthToken('my-secret-jwt');

    // Access the registered request interceptor handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestHandler = (apiClient.interceptors.request as any).handlers[0]?.fulfilled;
    expect(requestHandler).toBeDefined();

    const initialConfig: InternalAxiosRequestConfig = {
      headers: new AxiosHeaders(),
    };

    const config = await requestHandler(initialConfig);

    expect(config.headers.Authorization).toBe('Bearer my-secret-jwt');
  });

  it('handles 401 response by clearing token', async () => {
    setAuthToken('expired-jwt');
    expect(getAuthToken()).toBe('expired-jwt');

    // Access the registered response interceptor handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorHandler = (apiClient.interceptors.response as any).handlers[0]?.rejected;
    expect(errorHandler).toBeDefined();

    const error401 = {
      response: {
        status: 401,
        data: { message: 'Token expired' },
      },
    };

    await expect(errorHandler(error401)).rejects.toEqual(error401);
    expect(getAuthToken()).toBeNull();
  });
});
