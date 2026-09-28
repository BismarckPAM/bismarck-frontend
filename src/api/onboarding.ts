import axios from 'axios';
import { env } from './config';
import { identityClient } from './client';
import { normalizeApiError } from './errors';
import type { OnboardingTicket } from '../types/pam';

/**
 * Onboarding ticket API.
 *
 * Two audiences share this module:
 *
 *  1. PUBLIC submission — POST /api/onboarding/tickets
 *     Served to UNAUTHENTICATED visitors, so it deliberately does NOT reuse
 *     the shared authenticated axios clients. An isolated instance attaches
 *     no Bearer token and never triggers the shared 401 -> /login redirect.
 *     Cloudflare Turnstile protects the endpoint server-side.
 *
 *  2. ADMIN queue — GET/POST /api/admin/onboarding/tickets...
 *     Runs inside the authenticated console and reuses `identityClient`.
 */

const publicClient = axios.create({
  baseURL: env.gatewayBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Payload for the public onboarding form. Field names mirror the backend DTO. */
export interface CreateOnboardingTicketPayload {
  fullName: string;
  email: string;
  department: string;
  requestedRole: string;
  justification: string;
  /** Cloudflare Turnstile response token; verified server-side. */
  turnstileToken: string;
}

export interface CreateOnboardingTicketResult {
  ticketId: string;
  status: string;
  message: string;
}

/** Backend error codes surfaced from the onboarding endpoint. */
export type OnboardingSubmitErrorCode = 'INVALID_CAPTCHA' | 'DUPLICATE' | 'UNKNOWN';

/** Thrown when the backend rejects the submission with a known error code. */
export class OnboardingSubmitError extends Error {
  readonly code: OnboardingSubmitErrorCode;
  readonly status?: number;

  constructor(code: OnboardingSubmitErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'OnboardingSubmitError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Submit a registration request.
 * POST /api/onboarding/tickets -> 201 { ticketId, status, message }
 * 403 INVALID_CAPTCHA when Turnstile verification fails;
 * 409 DUPLICATE when an account or pending ticket already exists.
 */
export async function createOnboardingTicket(
  payload: CreateOnboardingTicketPayload,
): Promise<CreateOnboardingTicketResult> {
  try {
    const { data } = await publicClient.post<CreateOnboardingTicketResult>(
      '/api/onboarding/tickets',
      payload,
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const body = error.response.data as { code?: string; message?: string } | undefined;

      if (status === 403 || body?.code === 'INVALID_CAPTCHA') {
        throw new OnboardingSubmitError(
          'INVALID_CAPTCHA',
          body?.message ||
            'Human verification failed. Please complete the verification and try again.',
          status,
        );
      }
      if (status === 409 || body?.code === 'DUPLICATE') {
        throw new OnboardingSubmitError(
          'DUPLICATE',
          body?.message || 'An account or pending request already exists for this email address.',
          status,
        );
      }
    }
    throw new OnboardingSubmitError('UNKNOWN', normalizeApiError(error).message);
  }
}

/** GET /api/admin/onboarding/tickets -> full review queue (Admin only). */
export async function adminListOnboardingTickets(): Promise<OnboardingTicket[]> {
  try {
    const { data } = await identityClient.get<Record<string, unknown>[]>(
      '/api/admin/onboarding/tickets',
    );
    return (data ?? []).map(toOnboardingTicket);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/** POST /api/admin/onboarding/tickets/{id}/approve -> provisions the user. */
export async function approveOnboardingTicket(id: string): Promise<OnboardingTicket> {
  try {
    const { data } = await identityClient.post<Record<string, unknown>>(
      `/api/admin/onboarding/tickets/${id}/approve`,
    );
    return toOnboardingTicket(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/** POST /api/admin/onboarding/tickets/{id}/reject -> notifies the applicant. */
export async function rejectOnboardingTicket(
  id: string,
  reason: string,
): Promise<OnboardingTicket> {
  try {
    const { data } = await identityClient.post<Record<string, unknown>>(
      `/api/admin/onboarding/tickets/${id}/reject`,
      { reason },
    );
    return toOnboardingTicket(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/** Normalize a raw ticket record into the domain shape (tolerant of enums). */
function toOnboardingTicket(raw: Record<string, unknown>): OnboardingTicket {
  return {
    id: String(raw.id ?? ''),
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    department: String(raw.department ?? ''),
    requestedRole: String(raw.requestedRole ?? ''),
    justification: String(raw.justification ?? ''),
    status: normalizeTicketStatus(raw.status),
    createdAt: String(raw.createdAt ?? ''),
    reviewedAt: raw.reviewedAt ? String(raw.reviewedAt) : null,
    reviewedBy: raw.reviewedBy ? String(raw.reviewedBy) : null,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : null,
    provisionedUserId: raw.provisionedUserId ? String(raw.provisionedUserId) : null,
  };
}

function normalizeTicketStatus(value: unknown): OnboardingTicket['status'] {
  const upper = String(value ?? '').toUpperCase();
  if (upper === 'APPROVED' || upper === 'REJECTED') return upper;
  return 'PENDING';
}
