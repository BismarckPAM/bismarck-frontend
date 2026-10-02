import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminActivePermissions from './AdminActivePermissions';

const listJit = vi.fn();
const revoke = vi.fn();
vi.mock('../../api/jit', () => ({
  listJitSessions: (activeOnly?: boolean) => listJit(activeOnly),
  revokeTemporaryPermission: (id: string, reason?: string) => revoke(id, reason),
}));

const future = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** A real ACTIVE TemporaryPermission row as returned by GET /api/jit/sessions. */
const activeSession = {
  id: 'perm-1111-0000-0000-000000000000',
  approvalId: 'req-1111',
  userId: 'usr-1',
  userEmail: 'alice.vance@bismarck.sec',
  resourceId: 'res-1',
  resourceName: 'Prod DB',
  action: 'ELEVATED_ACCESS',
  requestedLevel: 3,
  status: 'ACTIVE' as const,
  grantedAt: new Date().toISOString(),
  expiresAt: future(45),
  revokedAt: null,
  revokedByUserId: null,
  remainingSeconds: 45 * 60,
  provisioningStatus: 'ACTIVE',
  provisioningDetail: null,
};

const secondSession = {
  ...activeSession,
  id: 'perm-2222-0000-0000-000000000000',
  userEmail: 'bob.m@bismarck.sec',
  resourceName: 'Bastion Host',
};

const renderView = () => render(<AdminActivePermissions />);

describe('Admin Dashboard → Active Permissions', () => {
  beforeEach(() => {
    listJit.mockReset();
    revoke.mockReset();
    listJit.mockResolvedValue([]);
    revoke.mockResolvedValue({ ...activeSession, status: 'REVOKED' });
  });

  it('asks the authoritative JIT endpoint for active sessions only', async () => {
    renderView();

    await waitFor(() => expect(listJit).toHaveBeenCalledWith(true));
  });

  it('displays the user, resource, action and level returned by the server', async () => {
    listJit.mockResolvedValue([activeSession]);
    renderView();

    expect(await screen.findByText('alice.vance@bismarck.sec')).toBeInTheDocument();
    expect(screen.getByText('Prod DB')).toBeInTheDocument();
    expect(screen.getByText('ELEVATED_ACCESS')).toBeInTheDocument();
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /active temporary permissions/i }),
    ).toBeInTheDocument();
  });

  it('shows a friendly zero state when nothing is active', async () => {
    listJit.mockResolvedValue([]);
    renderView();

    expect(await screen.findByText(/no active temporary permissions/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows a loading state while the request is in flight', async () => {
    listJit.mockReturnValue(new Promise(() => {}));
    renderView();

    expect(await screen.findByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows a network error state and retries', async () => {
    listJit
      .mockRejectedValueOnce({ kind: 'network', message: 'Unable to reach the server.' })
      .mockResolvedValueOnce([activeSession]);
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      /unable to reach the server/i,
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Prod DB')).toBeInTheDocument();
    expect(listJit).toHaveBeenCalledTimes(2);
  });

  it('refresh re-queries the JIT endpoint instead of reloading the page', async () => {
    listJit.mockResolvedValue([activeSession]);
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Prod DB');
    await user.click(screen.getByRole('button', { name: /refresh active permissions/i }));

    await waitFor(() => expect(listJit).toHaveBeenCalledTimes(2));
  });

  it('offers a labelled revoke action for each active session', async () => {
    listJit.mockResolvedValue([activeSession]);
    renderView();

    expect(
      await screen.findByRole('button', { name: /revoke permission for prod db/i }),
    ).toBeInTheDocument();
  });

  it('requires confirmation before revoking', async () => {
    listJit.mockResolvedValue([activeSession]);
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /revoke permission for prod db/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('revokes through the JIT session endpoint and removes the row', async () => {
    listJit.mockResolvedValue([activeSession, secondSession]);
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /revoke permission for prod db/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    // The immediate-effect endpoint, not the legacy permissions/{id}/revoke.
    await waitFor(() => expect(revoke).toHaveBeenCalledWith(activeSession.id, ''));

    await waitFor(() => expect(screen.queryByText('Prod DB')).toBeNull());
    // The other session is untouched.
    expect(screen.getByText('Bastion Host')).toBeInTheDocument();
    expect(screen.getByText(/revoked permission for prod db/i)).toBeInTheDocument();
  });

  it('sends the optional reason supplied in the confirmation modal', async () => {
    listJit.mockResolvedValue([activeSession]);
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /revoke permission for prod db/i }));
    await user.type(screen.getByLabelText(/reason/i), 'Compromised credential');
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    await waitFor(() =>
      expect(revoke).toHaveBeenCalledWith(activeSession.id, 'Compromised credential'),
    );
  });

  it('keeps the row in place when the revoke is rejected (409)', async () => {
    listJit.mockResolvedValue([activeSession]);
    revoke.mockRejectedValue({
      kind: 'conflict',
      message: 'Cannot revoke the session. It is already REVOKED or has expired.',
    });
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /revoke permission for prod db/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    const alerts = await screen.findAllByText(/already REVOKED or has expired/i);
    expect(alerts.length).toBeGreaterThan(0);
    // The row survives the failure — no optimistic removal. Scoped to the table
    // because the open confirmation modal also names the resource.
    const table = screen.getByRole('table', { name: /active temporary permissions/i });
    expect(within(table).getByText('Prod DB')).toBeInTheDocument();
  });

  it('disables the confirm button while the revoke is in flight', async () => {
    listJit.mockResolvedValue([activeSession]);
    let release!: (value: unknown) => void;
    revoke.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: /revoke permission for prod db/i }));
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }));

    expect(await screen.findByRole('button', { name: /revoking/i })).toBeDisabled();

    release({ ...activeSession, status: 'REVOKED' });
    await waitFor(() => expect(screen.queryByText('Prod DB')).toBeNull());
  });

  it('never renders secret material such as an SSH private key', async () => {
    listJit.mockResolvedValue([{ ...activeSession, provisioningDetail: 'key id: key-42' }]);
    renderView();

    await screen.findByText('Prod DB');
    expect(document.body.textContent).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY/i);
  });
});
