import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminUsers from './AdminUsers';
import * as usersApi from '../../api/users';
import { AuthProvider } from '../../context/AuthContext';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../../api/client';
import type { ManagedUser } from '../../types/managedUser';

vi.mock('../../api/users', () => ({
  getAdminUsersApi: vi.fn(),
  updateUserStatusApi: vi.fn(),
}));

const alice: ManagedUser = {
  id: 'usr-alice',
  fullName: 'Alice Vance',
  email: 'alice.vance@bismarck.sec',
  roleId: 'role-1',
  role: 'Developer',
  departmentId: 'dep-1',
  department: 'Engineering',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const bob: ManagedUser = {
  id: 'usr-bob',
  fullName: 'Bob Martinez',
  email: 'bob.m@bismarck.sec',
  roleId: 'role-2',
  role: 'Auditor',
  departmentId: 'dep-2',
  department: 'Compliance',
  isActive: false,
  createdAt: '2026-02-01T00:00:00.000Z',
};

/** Seeds a logged-in session so AdminUsers can read `useAuth()`. */
const seedAuth = (role = 'Admin', id = 'usr-me') => {
  localStorage.setItem(TOKEN_KEY, 'token');
  localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3_600_000).toISOString());
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({ id, fullName: 'Current Admin', email: 'me@x.io', role }),
  );
};

const renderAdminUsers = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminUsers />
      </AuthProvider>
    </MemoryRouter>,
  );

const rowFor = (name: string) => within(screen.getByRole('row', { name: new RegExp(name, 'i') }));

describe('Admin Dashboard → Users & Roles', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedAuth();
  });

  it('loads BOTH active and inactive accounts from the admin endpoint', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice, bob]);
    renderAdminUsers();

    await waitFor(() => expect(usersApi.getAdminUsersApi).toHaveBeenCalled());
    expect(await screen.findByText('Alice Vance')).toBeInTheDocument();
    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
  });

  it('renders the REAL status per row instead of hard-coding "Active"', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice, bob]);
    renderAdminUsers();

    await waitFor(() => expect(screen.getByText('Alice Vance')).toBeInTheDocument());
    expect(rowFor('Alice Vance').getByText('Active')).toBeInTheDocument();
    expect(rowFor('Bob Martinez').getByText('Inactive')).toBeInTheDocument();
    expect(screen.getAllByText('Inactive')).toHaveLength(1);
  });

  it('shows Deactivate on an active row and Activate on an inactive row', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice, bob]);
    renderAdminUsers();

    await waitFor(() => expect(screen.getByText('Alice Vance')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /deactivate alice vance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activate bob martinez/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deactivate bob martinez/i })).toBeNull();
  });

  it('asks for confirmation before deactivating', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /deactivate alice vance/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/no longer be able to sign in/i)).toBeInTheDocument();
    // Nothing is sent until the operator confirms.
    expect(usersApi.updateUserStatusApi).not.toHaveBeenCalled();
  });

  it('deactivate sends false and flips the row immediately', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    vi.mocked(usersApi.updateUserStatusApi).mockResolvedValue({ ...alice, isActive: false });
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /deactivate alice vance/i }));
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }));

    await waitFor(() => expect(usersApi.updateUserStatusApi).toHaveBeenCalledWith(alice.id, false));
    await waitFor(() => expect(screen.getByText('Inactive')).toBeInTheDocument());
    // The action swaps to Activate with no page reload.
    expect(screen.getByRole('button', { name: /activate alice vance/i })).toBeInTheDocument();
    expect(screen.getByText(/has been deactivated/i)).toBeInTheDocument();
  });

  it('activate sends true and flips the row immediately', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([bob]);
    vi.mocked(usersApi.updateUserStatusApi).mockResolvedValue({ ...bob, isActive: true });
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /activate bob martinez/i }));

    await waitFor(() => expect(usersApi.updateUserStatusApi).toHaveBeenCalledWith(bob.id, true));
    await waitFor(() => expect(rowFor('Bob Martinez').getByText('Active')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /deactivate bob martinez/i })).toBeInTheDocument();
  });

  it('does not reload the document when a status changes', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    vi.mocked(usersApi.updateUserStatusApi).mockResolvedValue({ ...alice, isActive: false });
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /deactivate alice vance/i }));
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }));

    await waitFor(() => expect(screen.getByText('Inactive')).toBeInTheDocument());
    // A reload would reset the list refetch; a client-side update must not.
    expect(usersApi.getAdminUsersApi).toHaveBeenCalledTimes(1);
  });

  it('preserves the previous status when the API fails, and shows a clean error', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    vi.mocked(usersApi.updateUserStatusApi).mockRejectedValue({
      kind: 'server',
      message: 'The server encountered an error. Please try again shortly.',
    });
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /deactivate alice vance/i }));
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/the server encountered an error/i);
    // No optimistic lie: Alice is still Active.
    expect(rowFor('Alice Vance').getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deactivate alice vance/i })).toBeInTheDocument();
  });

  it('handles a 403 cleanly without exposing backend detail', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    vi.mocked(usersApi.updateUserStatusApi).mockRejectedValue({
      kind: 'forbidden',
      message: 'You do not have permission to perform this action.',
    });
    const user = userEvent.setup();
    renderAdminUsers();

    await user.click(await screen.findByRole('button', { name: /deactivate alice vance/i }));
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/do not have permission/i);
    expect(alert.textContent).not.toMatch(/stack|exception|System\./i);
    expect(rowFor('Alice Vance').getByText('Active')).toBeInTheDocument();
  });

  it('shows a loading state while the directory is in flight', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockReturnValue(new Promise(() => {}));
    renderAdminUsers();

    expect(await screen.findByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows an empty state when there are no accounts', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([]);
    renderAdminUsers();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows an error state and retries on demand', async () => {
    vi.mocked(usersApi.getAdminUsersApi)
      .mockRejectedValueOnce({ kind: 'network', message: 'Unable to reach the server.' })
      .mockResolvedValueOnce([alice]);
    const user = userEvent.setup();
    renderAdminUsers();

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      /unable to reach the server/i,
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Alice Vance')).toBeInTheDocument();
    expect(usersApi.getAdminUsersApi).toHaveBeenCalledTimes(2);
  });

  it('filters the directory by the search box', async () => {
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice, bob]);
    const user = userEvent.setup();
    renderAdminUsers();

    await screen.findByText('Alice Vance');
    await user.type(screen.getByLabelText(/search admin users/i), 'Martinez');

    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
    expect(screen.queryByText('Alice Vance')).toBeNull();
  });

  it('prevents an admin from deactivating their own account', async () => {
    seedAuth('Admin', alice.id);
    vi.mocked(usersApi.getAdminUsersApi).mockResolvedValue([alice]);
    renderAdminUsers();

    await waitFor(() => expect(screen.getByText('Alice Vance')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /deactivate alice vance/i })).toBeDisabled();
    expect(screen.getByText(/cannot deactivate your own account/i)).toBeInTheDocument();
  });
});
