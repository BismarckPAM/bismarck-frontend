import axios from 'axios';
import type { ApiError, ApiErrorKind } from '../types/pam';

const FRIENDLY: Record<ApiErrorKind, string> = {
  validation: 'Some fields are invalid. Please review and try again.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'The requested item could not be found.',
  conflict: 'This action conflicts with the current state. Refresh and try again.',
  rateLimited: 'Too many requests. Please wait a moment and retry.',
  server: 'The server encountered an error. Please try again shortly.',
  network: 'Unable to reach the server. Check your connection and retry.',
  timeout: 'The request timed out. Please try again.',
  cancelled: 'The request was cancelled.',
  unknown: 'Something went wrong. Please try again.',
};

function kindForStatus(status?: number): ApiErrorKind {
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 429:
      return 'rateLimited';
    default:
      return status && status >= 500 ? 'server' : 'unknown';
  }
}

/** Extract ASP.NET model-state style `{ field: [errors] }` if present. */
function extractFieldErrors(data: unknown): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const errors = (data as { errors?: unknown }).errors;
  if (errors && typeof errors === 'object') {
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      result[key] = Array.isArray(value) ? value.map(String) : [String(value)];
    }
    return Object.keys(result).length ? result : undefined;
  }
  return undefined;
}

/** Convert any thrown value into a normalized, user-safe ApiError. */
export function normalizeApiError(error: unknown): ApiError {
  if (axios.isCancel(error)) {
    return { kind: 'cancelled', message: FRIENDLY.cancelled };
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return { kind: 'timeout', message: FRIENDLY.timeout };
    }
    if (!error.response) {
      return { kind: 'network', message: FRIENDLY.network };
    }
    const status = error.response.status;
    const kind = kindForStatus(status);
    const data = error.response.data as { message?: string; title?: string } | undefined;
    const serverMessage =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.title === 'string' && data.title) ||
      undefined;
    return {
      kind,
      status,
      message: serverMessage ?? FRIENDLY[kind],
      fieldErrors: extractFieldErrors(error.response.data),
    };
  }
  if (error instanceof Error) {
    return { kind: 'unknown', message: error.message || FRIENDLY.unknown };
  }
  return { kind: 'unknown', message: FRIENDLY.unknown };
}

export function isApiError(value: unknown): value is ApiError {
  return !!value && typeof value === 'object' && 'kind' in value && 'message' in value;
}