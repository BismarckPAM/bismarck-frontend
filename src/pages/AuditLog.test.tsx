import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AuditLog from './AuditLog';
import RequireRole from '../components/auth/RequireRole';
import { AuthProvider } from '../context/AuthContext';
import { canViewAudit } from '../auth/roles';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../api/client';

const getAuditLogs = vi.fn();
vi.mock('../api/audit', () => ({
  getAuditLogs: (...args: unknown[]) => getAuditLogs(...args),
}));

const entry = {
  id: 'a1',
  eventId: 'evt-1',
  eventType: 'PERMISSION_GRANTED',
  occurredAt: '2024-01-01T00:00:00Z',
  actor: 'alice',
  resource: 'res-1',
  action: 'GRANT',
  outcome: 'SUCCESS',
  metadata: '{"level":3}',
  consumedAt: '2024-01-01T00:00:01Z',
};

const page = (items: unknown[]) => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 20,
  totalPages: 1,
});

describe('AuditLog', () => {
  beforeEach(() => {
    getAuditLogs.mockReset();
  });

  it('displays audit events', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('GRANT')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('shows an empty state when no events match', async () => {
    getAuditLogs.mockResolvedValue(page([]));
    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('refetches with the event type filter applied', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>,
    );
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by event type/i), 'PERMISSION');

    await waitFor(() =>
      expect(
        getAuditLogs.mock.calls.some((call) => JSON.stringify(call[0]).includes('PERMISSION')),
      ).toBe(true),
    );
  });

  it('shows an error state with retry when the request fails', async () => {
    getAuditLogs.mockRejectedValue({ kind: 'forbidden', message: 'Not allowed' });
    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Not allowed/i)).toBeInTheDocument();
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });

  it('prevents unauthorized users from accessing audit data', () => {
    localStorage.setItem(TOKEN_KEY, 't');
    localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600_000).toISOString());
    localStorage.setItem(
      'bismarck_pam_user',
      JSON.stringify({ id: 'u3', fullName: 'Normal', email: 'n@x.io', role: 'User' }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <RequireRole allowed={canViewAudit}>
            <AuditLog />
          </RequireRole>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
    expect(getAuditLogs).not.toHaveBeenCalled();
  });
});
