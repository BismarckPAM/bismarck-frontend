import { authorizationClient, getAuthToken } from './client';
import { normalizeApiError } from './errors';
import type { JitTerminalStatus } from '../types/pam';

/**
 * Client for the brokered JIT terminal.
 *
 * The Authorization Service owns the SSH channel and never sends the private key
 * to the browser: the browser speaks WebSocket to the service, and the service
 * speaks SSH to the VM. That is what makes JIT expiry a real control rather than
 * a record - when the timer hits zero the service kills the SSH channel and this
 * socket closes with it.
 *
 * Wire protocol (JSON text frames both ways), matching JitTerminalController:
 *   -> {"t":"i","s":"ls -la"}   send input
 *   -> {"t":"r","c":120,"r":40}  resize
 *   <- {"t":"o","d":"..."}       output
 *   <- {"t":"e","m":"..."}       closed / error
 */

/** Absolute ws:// or wss:// URL for a brokered terminal socket. */
function buildTerminalUrl(
  permissionId: string,
  columns: number,
  rows: number,
  token: string,
): string {
  // Resolve against the page origin so a relative VITE_AUTHORIZATION_API_URL (the
  // local dev case) still produces a correct absolute ws:// URL.
  const configured = authorizationClient.defaults.baseURL || '';
  const base = configured || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(`${base.replace(/\/+$/, '')}/api/jit/terminal/${permissionId}`);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('columns', String(columns));
  url.searchParams.set('rows', String(rows));

  // The browser WebSocket API cannot set an Authorization header, so the JWT
  // travels as a query parameter. Both the gateway and the Authorization Service
  // accept it for this route only.
  url.searchParams.set('access_token', token);

  return url.toString();
}

/**
 * Whether this browser can host a terminal at all. A hard no beats rendering an
 * empty box, which is what the screen used to do before the terminal existed.
 */
export function isTerminalSupported(): boolean {
  return typeof WebSocket !== 'undefined';
}

export interface TerminalHandlers {
  /** Remote shell output. */
  onOutput: (data: string) => void;
  /** The session ended or errored; `message` is safe to show to the user. */
  onClose: (message: string) => void;
  /** Called once the socket is open, with a resize helper for the PTY. */
  onOpen?: (send: { resize(cols: number, rows: number): void }) => void;
}

/** A live terminal socket: push input, resize, and close it. */
export interface TerminalConnection {
  send(data: string): void;
  resize(columns: number, rows: number): void;
  close(): void;
}

/**
 * Opens a brokered terminal and wires it to the supplied handlers.
 * Returns null when the terminal cannot be started at all (no WebSocket support,
 * or no auth token), having already reported why through `onClose`.
 */
export function openJitTerminal(
  permissionId: string,
  columns: number,
  rows: number,
  handlers: TerminalHandlers,
): TerminalConnection | null {
  if (!isTerminalSupported()) {
    handlers.onClose('This browser does not support WebSockets, so the terminal cannot run.');
    return null;
  }

  const token = getAuthToken();
  if (!token) {
    handlers.onClose('Your session has expired. Sign in again to open a terminal.');
    return null;
  }

  let socket: WebSocket;
  try {
    socket = new WebSocket(buildTerminalUrl(permissionId, columns, rows, token));
  } catch (error) {
    handlers.onClose(error instanceof Error ? error.message : 'Could not open the terminal.');
    return null;
  }

  let disposed = false;
  let closeReported = false;

  const send = (payload: unknown): void => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const reportClose = (message: string): void => {
    if (closeReported) return;
    closeReported = true;
    handlers.onClose(message);
  };

  socket.onopen = () => {
    const size = { columns, rows };
    handlers.onOpen?.({ resize: (c, r) => send({ t: 'r', c, r }) });
    // Seed the PTY with the initial geometry so the remote shell wraps correctly.
    send({ t: 'r', ...size });
  };

  socket.onmessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') return;

    let frame: { t?: string; d?: string; m?: string };
    try {
      frame = JSON.parse(event.data) as typeof frame;
    } catch {
      return;
    }

    if (frame.t === 'o' && typeof frame.d === 'string') {
      handlers.onOutput(frame.d);
    } else if (frame.t === 'e') {
      reportClose(frame.m || 'The terminal session closed.');
    }
  };

  // The handshake can be refused before the socket opens (403 from the broker).
  // A WebSocket exposes no status body, so surface the actionable explanation
  // rather than a bare "connection failed".
  socket.onerror = () => {
    if (!disposed) {
      reportClose(
        'The terminal connection was refused. This is usually an expired JIT session, or an SSH key that is not authorised for your account on the VM.',
      );
    }
  };

  socket.onclose = () => {
    if (!disposed) reportClose('The terminal connection closed.');
  };

  return {
    send: (data: string) => send({ t: 'i', s: data }),
    resize: (c: number, r: number) => send({ t: 'r', c, r }),
    close: () => {
      disposed = true;
      // 1000 = normal closure; without a code the server logs an abnormal close.
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'client closed');
      }
    },
  };
}

/**
 * GET /api/jit/terminal/{id}/status — is a terminal possible for this session?
 * Rejects with a normalized ApiError so callers can fall back to hiding the
 * terminal button rather than surfacing a failure.
 */
export async function getJitTerminalStatus(
  permissionId: string,
  userEmail?: string | null,
): Promise<JitTerminalStatus | null> {
  try {
    const { data } = await authorizationClient.get<JitTerminalStatus>(
      `/api/jit/terminal/${permissionId}/status`,
      { params: { userEmail: userEmail ?? undefined } },
    );
    return data ?? null;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
