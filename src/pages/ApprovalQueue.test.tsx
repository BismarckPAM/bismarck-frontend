import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ApprovalQueue from './ApprovalQueue';
import RequireRole from '../components/auth/RequireRole';
import { AuthProvider } from '../context/AuthContext';
import { WorkflowProvider } from '../state/WorkflowProvider';
import { isApprover } from '../auth/roles';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../api/client';

vi.mock('../api/resources', () => ({
  getResourcesApi: vi.fn().mockResolvedValue([
    { id: 'res-1', name: 'Prod DB', type: 'DATABASE', environment: 'PRODUCTION' },
  ]),
}));

const listPending = vi.fn();
const approveReq = vi.fn();
const rejectReq = vi.fn();
vi.mock('../api/approval', () => ({
  listPendingApprovalRequests: () => listPending(),
  approveApprovalRequest: (id: string) => approveReq(id),
  rejectApprovalRequest: (id: string, body: unknown) => rejectReq(id, body),
}));

const pendingRequest = {
  id: 'req-11111111',
  requesterUserId: 'user-abc',
  resourceId: 'res-1',
  requestedLevel: 3,
  reason: 'Rotate DB credentials for incident 42',
  durationMinutes: 60,
  status: 'PENDING',
  createdAt: '2024-01-01T10:00:00Z',
};

const renderQueue = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <WorkflowProvider>
          <ApprovalQueue />
        </WorkflowProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('ApprovalQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    listPending.mockReset();
    approveReq.mockReset();
    rejectReq.mockReset();
  });

  it('displays pending requests with approver actions', async () => {
    listPending.mockResolvedValue([pendingRequest]);
    renderQueue();

    expect(await screen.findByText('user-abc')).toBeInTheDocument();
    expect(screen.getByText(/Rotate DB credentials/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no pending requests', async () => {
    listPending.mockResolvedValue([]);
    renderQueue();

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('approves after confirmation and removes the row', async () => {
    listPending.mockResolvedValue([pendingRequest]);
    approveReq.mockResolvedValue({ ...pendingRequest, status: 'APPROVED' });
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole('button', { name: /^approve$/i }));
    // Confirmation dialog shown.
    expect(await screen.findByText(/Confirm approval/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm approve/i }));

    await waitFor(() => expect(approveReq).toHaveBeenCalledWith('req-11111111'));
    await waitFor(() => expect(screen.queryByText('user-abc')).not.toBeInTheDocument());
  });

  it('requires a reason before rejecting', async () => {
    listPending.mockResolvedValue([pendingRequest]);
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole('button', { name: /^reject$/i }));
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));

    expect(await screen.findByText(/rejection reason is required/i)).toBeInTheDocument();
    expect(rejectReq).not.toHaveBeenCalled();
  });

  it('rejects with a reason and removes the row', async () => {
    listPending.mockResolvedValue([pendingRequest]);
    rejectReq.mockResolvedValue({ ...pendingRequest, status: 'REJECTED' });
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole('button', { name: /^reject$/i }));
    await user.type(screen.getByLabelText(/rejection reason/i), 'Not justified');
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));

    await waitFor(() =>
      expect(rejectReq).toHaveBeenCalledWith('req-11111111', { reason: 'Not justified' }),
    );
    await waitFor(() => expect(screen.queryByText('user-abc')).not.toBeInTheDocument());
  });

  it('keeps the queue usable when a mutation fails', async () => {
    listPending.mockResolvedValue([pendingRequest]);
    approveReq.mockRejectedValue({ kind: 'server', message: 'Server exploded' });
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByRole('button', { name: /^approve$/i }));
    await user.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(await screen.findByText(/Server exploded/i)).toBeInTheDocument();
    // Row preserved so the approver can retry.
    expect(screen.getByText('user-abc')).toBeInTheDocument();
  });

  it('blocks non-approvers via the route guard', () => {
    localStorage.setItem(TOKEN_KEY, 't');
    localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600_000).toISOString());
    localStorage.setItem(
      'bismarck_pam_user',
      JSON.stringify({ id: 'u2', fullName: 'Normal User', email: 'n@x.io', role: 'User' }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <RequireRole allowed={isApprover}>
            <ApprovalQueue />
          </RequireRole>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
    expect(listPending).not.toHaveBeenCalled();
  });
});