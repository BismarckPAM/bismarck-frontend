import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/useAuth';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../api/client';

/** Helper component that exposes AuthContext values into the DOM for assertions. */
const AuthStateReader = () => {
  const { isAuthenticated, isLoading, token } = useAuth();
  return (
    <div>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="token">{token ?? 'null'}</span>
    </div>
  );
};

const renderProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthStateReader />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('AuthProvider — mount-time session validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts loading and settles to unauthenticated when localStorage is empty', async () => {
    renderProvider();

    // isLoading should settle to false even with no stored session
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
  });

  it('restores a valid non-expired session from localStorage as authenticated', async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    localStorage.setItem(TOKEN_KEY, 'valid-stored-token');
    localStorage.setItem(EXPIRES_AT_KEY, futureExpiry);
    localStorage.setItem(
      'bismarck_pam_user',
      JSON.stringify({
        id: 'usr-001',
        fullName: 'Test User',
        email: 'test@bismarck.sec',
        role: 'Administrator',
        department: 'IT',
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('token')).toHaveTextContent('valid-stored-token');
  });

  it('clears an expired token from localStorage and treats user as unauthenticated', async () => {
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(EXPIRES_AT_KEY, pastExpiry);
    localStorage.setItem(
      'bismarck_pam_user',
      JSON.stringify({
        id: 'usr-002',
        fullName: 'Expired User',
        email: 'expired@bismarck.sec',
        role: 'Operator',
        department: 'Ops',
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('token')).toHaveTextContent('null');

    // Verify that localStorage was actually cleared
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(EXPIRES_AT_KEY)).toBeNull();
    expect(localStorage.getItem('bismarck_pam_user')).toBeNull();
  });

  it('clears a token with a missing/invalid expiresAt and treats user as unauthenticated', async () => {
    localStorage.setItem(TOKEN_KEY, 'orphaned-token');
    // No EXPIRES_AT_KEY set — simulates a session from before expiresAt was stored

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
