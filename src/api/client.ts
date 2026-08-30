import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_KEY = 'bismarck_pam_token';
export const USER_KEY = 'bismarck_pam_user';
export const EXPIRES_AT_KEY = 'bismarck_pam_expires_at';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to save auth token to localStorage', err);
  }
};

export const getAuthExpiresAt = (): string | null => {
  try {
    return localStorage.getItem(EXPIRES_AT_KEY);
  } catch {
    return null;
  }
};

export const setAuthExpiresAt = (expiresAt: string): void => {
  try {
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
  } catch (err) {
    console.error('Failed to save expiresAt to localStorage', err);
  }
};

export const clearAuthToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  } catch (err) {
    console.error('Failed to clear auth data from localStorage', err);
  }
  // Dispatch event so active React context can synchronize state immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bismarck:auth-unauthorized'));
  }
};

const identityBaseURL = import.meta.env.VITE_IDENTITY_API_URL || '';
const resourceBaseURL = import.meta.env.VITE_RESOURCE_API_URL || '';

export const identityClient: AxiosInstance = axios.create({
  baseURL: identityBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const resourceClient: AxiosInstance = axios.create({
  baseURL: resourceBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const attachInterceptors = (client: AxiosInstance): void => {
  // Request Interceptor: Attach Bearer token to all outgoing requests
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response Interceptor: Handle 401 Unauthorized by clearing token & redirecting
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        clearAuthToken();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );
};

// Apply shared interceptors to both microservice clients
attachInterceptors(identityClient);
attachInterceptors(resourceClient);

// Backward compatibility alias & default export
export const apiClient = identityClient;
export default identityClient;
