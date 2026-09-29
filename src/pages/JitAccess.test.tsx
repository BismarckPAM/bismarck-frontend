import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JitAccess from './JitAccess';
import { AuthProvider } from '../context/AuthContext';
import { WorkflowContext, type WorkflowContextValue } from '../state/WorkflowContext';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../api/client';
import type { JitSession } from '../types/pam';

vi.mock('../api/resources', () => ({
  getResourcesApi: vi.fn().mockResolvedValue([]),
}));

const revoke = vi.fn();
const listJit = vi.fn().mockResolvedValue([]);

vi.mock('../api/jit', () => ({
  listJitSessions: (activeOnly?: boolean) => listJit(activeOnly),
  revokeTemporaryPermission: (id: string) => revoke(id),
}));

const future = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** A real TemporaryPermission row, as returned by GET /api/jit/sessions. */
const activeSession: JitSession = {
  id: 'perm-55555-0000-0000-000000000000',
  approvalId: 'req-55555',
  userId: 'me',
  userEmail: 'a@x.io',
  resourceId: 'res-1',
  resourceName: 'Prod DB',
  action: 'ELEVATED_ACCESS',
  requestedLevel: 3,
  status: 'ACTIVE',
  grantedAt: new Date().toISOString(),
  expiresAt: future(45),
  revokedAt: null,
  revokedByUserId: null,
  remainingSeconds: 45 * 60,
  provisioningStatus: 'LOCAL_ONLY',
  provisioningDetail: 'Azure provisioning is not configured; local-only session.',
};

const revokedSession: JitSession = {
  ...activeSession,
  id: 'perm-66666-0000-0000-000000000000',
  status: 'REVOKED',
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
  remainingSeconds: 0,
  provisioningStatus: 'REVOKED',
};

/** A session whose resource is a real Azure VM, so a connect command exists. */
const vmSession: JitSession = {
  ...activeSession,
  id: 'perm-77777-0000-0000-000000000000',
  userEmail: 'alex@company.com',
  resourceName: 'Bastion Host',
  targetVmName: 'pam-demo-vm',
  targetResourceGroup: 'pam-rg',
  targetHost: '20.51.0.4',
  targetOsType: 'Linux',
  connectionCommand: 'ssh alex@20.51.0.4',
  provisioningStatus: 'ACTIVE',
};

const emptyValue: WorkflowContextValue = {
  myRequests: [],
  myRequestCounters: { total: 0, pending: 0, approved: 0, rejected: 0 },
  myRequestsLoading: false,
  myRequestsError: null,
  refreshMyRequests: vi.fn().mockResolvedValue(undefined),
  addMyRequest: vi.fn(),
  updateMyRequest: vi.fn(),
  notifications: [],
  unreadCount: 0,
  notificationsLoading: false,
  notificationsError: null,
  viewedIds: [],
  markViewed: vi.fn(),
  refreshNotifications: vi.fn().mockResolvedValue(undefined),
} satisfies WorkflowContextValue;

const seedAuth = (role: string) => {
  localStorage.setItem(TOKEN_KEY, 'token');
  localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600_000).toISOString());
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({ id: 'u-admin', fullName: 'Admin', email: 'a@x.io', role }),
  );
};

const renderJit = () =>
  render(
    <AuthProvider>
      <WorkflowContext.Provider value={emptyValue}>
        <JitAccess />
      </WorkflowContext.Provider>
    </AuthProvider>,
  );

describe('JIT Access', () => {
  beforeEach(() => {
    localStorage.clear();
    revoke.mockReset();
    listJit.mockReset();
    listJit.mockResolvedValue([]);
  });

  it('loads sessions from the Authorization Service rather than from approval requests', async () => {
    seedAuth('Admin');
    renderJit();

    await waitFor(() => expect(listJit).toHaveBeenCalled());
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists an active session with its resource name, countdown and provisioning status', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([activeSession]);
    renderJit();

    expect(await screen.findByText('Prod DB')).toBeInTheDocument();
    expect(screen.getByText(/Provisioning: LOCAL_ONLY/i)).toBeInTheDocument();
    // 45 minutes remaining renders as "45m 0s".
    expect(screen.getByText(/4[45]m \d+s|45m 0s/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('separates expired/revoked sessions into a history table', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([activeSession, revokedSession]);
    renderJit();

    expect(await screen.findByText(/Expired & revoked sessions/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Expired and revoked JIT sessions')).toBeInTheDocument();
  });

  it('hides the revoke action for non-Admins', async () => {
    seedAuth('Manager');
    listJit.mockResolvedValue([activeSession]);
    renderJit();

    expect(await screen.findByText(/admin only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('revokes a temporary permission using the session id and reports success', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([activeSession]);
    revoke.mockResolvedValue({ message: 'revoked ok' });
    const user = userEvent.setup();
    renderJit();

    await user.click(await screen.findByRole('button', { name: /revoke/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith(activeSession.id));
    expect(await screen.findByText(/revoked ok/i)).toBeInTheDocument();
  });

  it('shows an error when revoke fails', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([activeSession]);
    revoke.mockRejectedValue({ kind: 'conflict', message: 'Already expired' });
    const user = userEvent.setup();
    renderJit();

    await user.click(await screen.findByRole('button', { name: /revoke/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    const errors = await screen.findAllByText(/Already expired/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('surfaces a load failure without crashing the page', async () => {
    seedAuth('Admin');
    listJit.mockRejectedValue({ kind: 'network', message: 'Unable to reach the server.' });
    renderJit();

    expect(await screen.findByText(/Unable to reach the server\./i)).toBeInTheDocument();
  });

  it('shows the connect command for an active VM session', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([vmSession]);
    renderJit();

    expect(await screen.findByText(/Connect to your granted machines/i)).toBeInTheDocument();
    expect(screen.getByText('ssh alex@20.51.0.4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('does not show a connect command for a non-VM session', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([activeSession]);
    renderJit();

    await screen.findByText('Prod DB');
    expect(screen.queryByText(/Connect to your granted machines/i)).not.toBeInTheDocument();
  });

  it('hides the connect command once the session is no longer active', async () => {
    seedAuth('Admin');
    listJit.mockResolvedValue([{ ...vmSession, status: 'EXPIRED' }]);
    renderJit();

    expect(await screen.findByText(/Expired & revoked sessions/i)).toBeInTheDocument();
    expect(screen.queryByText(/Connect to your granted machines/i)).not.toBeInTheDocument();
  });
});
