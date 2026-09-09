import React, { useState, useEffect, type ReactNode } from 'react';
import type { LoginRequest, User, LoginResponse } from '../types/auth';
import { loginApi } from '../api/auth';
import {
  getAuthToken,
  setAuthToken,
  getAuthExpiresAt,
  setAuthExpiresAt,
  clearAuthToken,
} from '../api/client';
import { AuthContext } from './AuthContext';

/**
 * Returns true if the given ISO-8601 expiresAt string is still in the future.
 * An invalid/missing value is treated as expired.
 */
function isTokenStillValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  return !isNaN(expiry) && expiry > Date.now();
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('bismarck_pam_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // isLoading starts true so ProtectedRoute renders the loading screen
  // during the synchronous mount-time expiry check — preventing a flash
  // of protected content before we know whether the session is valid.
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Lazily initialise from storage; the mount effect will clear these if expired.
  const [token, setTokenState] = useState<string | null>(() => {
    const storedToken = getAuthToken();
    const storedExpiry = getAuthExpiresAt();
    return storedToken && isTokenStillValid(storedExpiry) ? storedToken : null;
  });

  const [user, setUser] = useState<User | null>(() => {
    const storedToken = getAuthToken();
    const storedExpiry = getAuthExpiresAt();
    if (storedToken && isTokenStillValid(storedExpiry)) {
      return readStoredUser();
    }
    return null;
  });

  // --- Mount-time side-effect: clear expired credentials from localStorage ---
  // State is already correct (null) from the lazy initialisers above.
  // This effect only performs the external side-effect of removing stale data.
  useEffect(() => {
    const storedToken = getAuthToken();
    const storedExpiry = getAuthExpiresAt();

    if (storedToken && !isTokenStillValid(storedExpiry)) {
      console.warn('[Bismarck PAM] Stored session has expired — clearing credentials.');
      clearAuthToken();
    }

    // Intentional mount-time transition: signals that the initial session check has completed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false);
  }, []);

  // --- 401 event from the Axios interceptor ---
  useEffect(() => {
    const handleUnauthorized = () => {
      setTokenState(null);
      setUser(null);
    };

    window.addEventListener('bismarck:auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bismarck:auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const res: LoginResponse = await loginApi(credentials);

      // Fail loudly on unexpected response shape — do NOT mask mismatches
      // between the frontend contract and what the Identity Service actually returns.
      if (!res.token || !res.user) {
        throw new Error('Unexpected response from Identity Service');
      }

      setAuthToken(res.token);
      setAuthExpiresAt(res.expiresAt);
      try {
        localStorage.setItem('bismarck_pam_user', JSON.stringify(res.user));
      } catch {
        // localStorage may be full or blocked in certain browser environments
      }

      setTokenState(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
