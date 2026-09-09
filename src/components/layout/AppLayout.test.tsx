import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './AppLayout';
import { AuthProvider } from '../../context/AuthContext';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../../api/client';

const seedAuthSession = () => {
  const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  localStorage.setItem(TOKEN_KEY, 'test-jwt-token');
  localStorage.setItem(EXPIRES_AT_KEY, futureExpiry);
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({
      id: 'usr-999',
      fullName: 'Sarah Connor',
      email: 'sarah.c@bismarck.sec',
      role: 'Security Commander',
      department: 'Cyber Defense',
    }),
  );
};

const renderAppWithLayout = (initialEntries = ['/users']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/users" element={<div data-testid="users-content">Users Content</div>} />
            <Route
              path="/resources"
              element={<div data-testid="resources-content">Resources Content</div>}
            />
          </Route>
          <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('AppLayout Component & Navigation Shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders brand header, navigation links, and active content', async () => {
    seedAuthSession();
    renderAppWithLayout(['/users']);

    expect(screen.getByText('Bismarck PAM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /identities and users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privileged resources/i })).toBeInTheDocument();
    expect(screen.getByTestId('users-content')).toBeInTheDocument();
  });

  it('displays user profile information correctly in header', async () => {
    seedAuthSession();
    renderAppWithLayout(['/users']);

    await waitFor(() => {
      expect(screen.getByTestId('user-display-name')).toHaveTextContent('Sarah Connor');
      expect(screen.getByTestId('user-display-role')).toHaveTextContent('Security Commander');
    });
  });

  it('navigates between /users and /resources when navigation links are clicked', async () => {
    const user = userEvent.setup();
    seedAuthSession();
    renderAppWithLayout(['/users']);

    expect(screen.getByTestId('users-content')).toBeInTheDocument();

    const resourcesLink = screen.getByRole('link', { name: /privileged resources/i });
    await user.click(resourcesLink);

    expect(screen.getByTestId('resources-content')).toBeInTheDocument();
  });

  it('clears token and redirects to /login when clicking the logout button', async () => {
    const user = userEvent.setup();
    seedAuthSession();
    renderAppWithLayout(['/users']);

    const logoutBtn = screen.getByTestId('logout-btn');
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });

    // Token must be cleared from storage
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
