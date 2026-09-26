import axios from 'axios';
import { env } from './config';

/**
 * Landing "Raise a Ticket" API.
 *
 * IMPORTANT: this module deliberately does NOT reuse the shared axios
 * clients from ./client.ts. The landing page is served to UNAUTHENTICATED
 * visitors, so it must not attach Bearer tokens nor trigger the shared
 * 401 -> /login redirect interceptor. This isolated instance is clean of
 * both concerns.
 *
 * Expected backend contract (API Gateway):
 *
 *   POST {VITE_API_URL}/api/public/tickets
 *   Body:  { name, email, company?, requestType, message }
 *   201 -> { ticketId: "PAM-XXXXXXXX" }
 *   4xx/5xx / network error -> surfaced to the dialog's error state
 *
 * Until the backend endpoint exists, the dialog shows a graceful inline
 * error with a mailto fallback (see features/landing/TicketDialog.tsx).
 */

const publicClient = axios.create({
  baseURL: env.gatewayBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export type TicketRequestType = 'access' | 'demo' | 'support' | 'pilot' | 'other';

export interface TicketPayload {
  name: string;
  email: string;
  company?: string;
  requestType: TicketRequestType;
  message: string;
}

export interface TicketCreatedResponse {
  ticketId: string;
}

export async function createTicket(payload: TicketPayload): Promise<TicketCreatedResponse> {
  const res = await publicClient.post<TicketCreatedResponse>('/api/public/tickets', payload);
  return res.data;
}
