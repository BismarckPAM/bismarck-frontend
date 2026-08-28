import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../../context/AuthContext';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../../api/client';

/** Stores a valid (non-expired) session in localStorage before mounting. */
const seedValidSession = (token = 'valid-active-jwt') => {
  const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_AT_KEY, futureExpiry);
};

const renderProtectedRoute = (initialEntries = ['/users']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/users"
              element={<div data-testid="protected-users">Protected Users</div>}
            />
            <Route
              path="/resources"
              element={<div data-testid="protected-resources">Protected Resources</div>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /login when no token is present', async () => {
    renderProtectedRoute(['/users']);

    // Wait for mount-time session check to settle
    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-users')).not.toBeInTheDocument();
  });

  it('renders child protected component when a valid non-expired token is present', async () => {
    seedValidSession('valid-active-jwt');
    renderProtectedRoute(['/users']);

    await waitFor(() => {
      expect(screen.getByTestId('protected-users')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  it('guards /resources route and allows access when a valid token is present', async () => {
    seedValidSession('valid-active-jwt');
    renderProtectedRoute(['/resources']);

    await waitFor(() => {
      expect(screen.getByTestId('protected-resources')).toBeInTheDocument();
    });
  });

  it('redirects to /login when a token exists but has expired', async () => {
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    localStorage.setItem(TOKEN_KEY, 'expired-jwt');
    localStorage.setItem(EXPIRES_AT_KEY, pastExpiry);

    renderProtectedRoute(['/users']);

    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-users')).not.toBeInTheDocument();
    // Expired token must be cleared from storage
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
