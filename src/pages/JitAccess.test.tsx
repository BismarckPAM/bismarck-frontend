import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JitAccess from './JitAccess';
import { AuthProvider } from '../context/AuthContext';
import { WorkflowContext, type WorkflowContextValue } from '../state/WorkflowContext';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../api/client';
import type { ApprovalRequest } from '../types/pam';

vi.mock('../api/resources', () => ({
  getResourcesApi: vi.fn().mockResolvedValue([]),
}));

const revoke = vi.fn();
vi.mock('../api/jit', () => ({
  revokeTemporaryPermission: (id: string) => revoke(id),
}));

const approvedRequest: ApprovalRequest = {
  id: 'req-55555',
  requesterUserId: 'me',
  resourceId: 'res-1',
  requestedLevel: 3,
  reason: 'needed',
  durationMinutes: 60,
  status: 'APPROVED',
  createdAt: '2024-01-01T00:00:00Z',
  reviewedAt: '2024-01-01T01:00:00Z',
};

const makeValue = (requests: ApprovalRequest[]): WorkflowContextValue => ({
  myRequests: requests,
  addMyRequest: vi.fn(),
  updateMyRequest: vi.fn(),
  notifications: [],
  unreadCount: 0,
  notificationsLoading: false,
  notificationsError: null,
  viewedIds: [],
  markViewed: vi.fn(),
  refreshNotifications: vi.fn().mockResolvedValue(undefined),
});

const seedAuth = (role: string) => {
  localStorage.setItem(TOKEN_KEY, 'token');
  localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600_000).toISOString());
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({ id: 'u-admin', fullName: 'Admin', email: 'a@x.io', role }),
  );
};

const renderJit = (requests: ApprovalRequest[]) =>
  render(
    <AuthProvider>
      <WorkflowContext.Provider value={makeValue(requests)}>
        <JitAccess />
      </WorkflowContext.Provider>
    </AuthProvider>,
  );

describe('JIT Access', () => {
  beforeEach(() => {
    localStorage.clear();
    revoke.mockReset();
  });

  it('shows an empty state when there are no approved requests', async () => {
    seedAuth('Admin');
    renderJit([]);
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists approved requests as JIT sessions for an Admin', async () => {
    seedAuth('Admin');
    renderJit([approvedRequest]);
    expect(await screen.findByText('req-55555'.slice(0, 8) + '…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('hides the revoke action for non-Admins', async () => {
    seedAuth('Manager');
    renderJit([approvedRequest]);
    expect(await screen.findByText(/admin only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('revokes a temporary permission and reports success', async () => {
    seedAuth('Admin');
    revoke.mockResolvedValue({ message: 'revoked ok' });
    const user = userEvent.setup();
    renderJit([approvedRequest]);

    await user.click(await screen.findByRole('button', { name: /revoke/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith('req-55555'));
    expect(await screen.findByText(/revoked ok/i)).toBeInTheDocument();
  });

  it('shows an error when revoke fails', async () => {
    seedAuth('Admin');
    revoke.mockRejectedValue({ kind: 'conflict', message: 'Already expired' });
    const user = userEvent.setup();
    renderJit([approvedRequest]);

    await user.click(await screen.findByRole('button', { name: /revoke/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    expect(await screen.findByText(/Already expired/i)).toBeInTheDocument();
  });
});