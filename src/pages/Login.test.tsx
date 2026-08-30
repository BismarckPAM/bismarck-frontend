import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';
import type { LoginResponse } from '../types/auth';

// Mock the API module — no real network calls in tests
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
}));

const renderLoginComponent = (initialEntries = ['/login']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/users" element={<div data-testid="users-page">Users Dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

/** Real Identity Service response shape */
const makeLoginResponse = (overrides: Partial<LoginResponse> = {}): LoginResponse => ({
  token: 'mock-jwt-token-xyz',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  user: {
    id: 'usr-001',
    fullName: 'Admin User',
    email: 'admin@bismarck.sec',
    role: 'Administrator',
    department: 'Security Operations',
  },
  ...overrides,
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form elements correctly', async () => {
    renderLoginComponent();

    // Wait for mount-time isLoading to settle
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bismarck pam/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/corporate email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/master security password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /authenticate & enter/i })).toBeInTheDocument();
  });

  it('shows error if submitted with empty fields', async () => {
    const user = userEvent.setup();
    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /authenticate & enter/i })).toBeInTheDocument(),
    );

    const submitBtn = screen.getByRole('button', { name: /authenticate & enter/i });
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(authApi.loginApi).not.toHaveBeenCalled();
  });

  it('calls the Identity Service login API with entered credentials on submit', async () => {
    const user = userEvent.setup();
    const mockResponse = makeLoginResponse({ token: 'mock-jwt-token-xyz' });
    vi.mocked(authApi.loginApi).mockResolvedValueOnce(mockResponse);

    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/corporate email address/i)).toBeInTheDocument(),
    );

    const emailInput = screen.getByLabelText(/corporate email address/i);
    const passwordInput = screen.getByLabelText(/master security password/i);
    const submitBtn = screen.getByRole('button', { name: /authenticate & enter/i });

    await user.type(emailInput, 'admin@bismarck.sec');
    await user.type(passwordInput, 'SuperSecretPass123!');
    await user.click(submitBtn);

    expect(authApi.loginApi).toHaveBeenCalledTimes(1);
    expect(authApi.loginApi).toHaveBeenCalledWith({
      email: 'admin@bismarck.sec',
      password: 'SuperSecretPass123!',
    });
  });

  it('redirects to /users and stores token + expiresAt in localStorage on successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = makeLoginResponse({ token: 'valid-jwt-token-123' });
    vi.mocked(authApi.loginApi).mockResolvedValueOnce(mockResponse);

    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/corporate email address/i)).toBeInTheDocument(),
    );

    const emailInput = screen.getByLabelText(/corporate email address/i);
    const passwordInput = screen.getByLabelText(/master security password/i);
    const submitBtn = screen.getByRole('button', { name: /authenticate & enter/i });

    await user.type(emailInput, 'security@enterprise.corp');
    await user.type(passwordInput, 'CorrectPassword!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('users-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('bismarck_pam_token')).toBe('valid-jwt-token-123');
    expect(localStorage.getItem('bismarck_pam_expires_at')).toBe(mockResponse.expiresAt);
  });

  it('shows inline error message "Invalid email or password" on failed login', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.loginApi).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized credentials' } },
    });

    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/corporate email address/i)).toBeInTheDocument(),
    );

    const emailInput = screen.getByLabelText(/corporate email address/i);
    const passwordInput = screen.getByLabelText(/master security password/i);
    const submitBtn = screen.getByRole('button', { name: /authenticate & enter/i });

    await user.type(emailInput, 'wrong@user.corp');
    await user.type(passwordInput, 'WrongPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    });

    // Raw API error details must NOT be exposed to the user
    expect(screen.queryByText(/unauthorized credentials/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('users-page')).not.toBeInTheDocument();
  });

  it('shows inline error on unexpected response shape (missing token/user)', async () => {
    const user = userEvent.setup();
    // Simulate Identity Service returning a shape that doesn't match the contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(authApi.loginApi).mockResolvedValueOnce({ expiresAt: '2099-01-01' } as any);

    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/corporate email address/i)).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText(/corporate email address/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/master security password/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /authenticate & enter/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
    });
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    const user = userEvent.setup();
    renderLoginComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/master security password/i)).toBeInTheDocument(),
    );

    const passwordInput = screen.getByLabelText(/master security password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    await user.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByRole('button', { name: /hide password/i });
    await user.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });
});
