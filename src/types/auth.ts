export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
}

/**
 * Exact response shape returned by POST /api/identity/auth/login.
 *
 * {
 *   "token": "...",
 *   "expiresAt": "2026-08-29T00:00:00.000Z",
 *   "user": { "id": "...", "fullName": "...", "email": "...", "role": "...", "department": "..." }
 * }
 */
export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True during the initial session-check on mount, and during an active login submission. */
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}
