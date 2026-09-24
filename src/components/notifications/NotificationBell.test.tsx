import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { AuthProvider } from '../../context/AuthContext';
import { WorkflowProvider } from '../../state/WorkflowProvider';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../../api/client';

const getNotifications = vi.fn();
vi.mock('../../api/notifications', () => ({
  getNotifications: (...args: unknown[]) => getNotifications(...args),
}));

const seedAuth = () => {
  localStorage.setItem(TOKEN_KEY, 'token');
  localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600_000).toISOString());
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({ id: 'usr-1', fullName: 'Jane', email: 'j@x.io', role: 'Admin' }),
  );
};

const renderBell = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <WorkflowProvider>
          <NotificationBell />
        </WorkflowProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear();
    getNotifications.mockReset();
  });

  it('shows the unread count from the feed', async () => {
    seedAuth();
    getNotifications.mockResolvedValue({
      items: [
        {
          id: 'n1',
          eventType: 'ACCESS_REQUEST_SUBMITTED',
          title: 'Request submitted',
          message: 'Your request was received',
          createdAt: '2024-01-01T00:00:00Z',
          isRead: false,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    });
    renderBell();

    expect(await screen.findByTestId('unread-count')).toHaveTextContent('1');
  });

  it('opens the panel and shows notification items', async () => {
    seedAuth();
    getNotifications.mockResolvedValue({
      items: [
        {
          id: 'n1',
          eventType: 'REQUEST_APPROVED',
          title: 'Approved',
          message: 'Your request was approved',
          createdAt: '2024-01-01T00:00:00Z',
          isRead: false,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    });
    const user = userEvent.setup();
    renderBell();

    await screen.findByTestId('unread-count');
    await user.click(screen.getByTestId('notification-bell'));

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Your request was approved/)).toBeInTheDocument();
  });

  it('shows an empty feed gracefully', async () => {
    seedAuth();
    getNotifications.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
    const user = userEvent.setup();
    renderBell();

    await waitFor(() => expect(getNotifications).toHaveBeenCalled());
    await user.click(screen.getByTestId('notification-bell'));

    expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
  });

  it('refreshes the feed when the refresh button is used', async () => {
    seedAuth();
    getNotifications.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
    const user = userEvent.setup();
    renderBell();

    await waitFor(() => expect(getNotifications).toHaveBeenCalled());
    const before = getNotifications.mock.calls.length;
    await user.click(screen.getByTestId('notification-bell'));
    await user.click(screen.getByRole('button', { name: /refresh notifications/i }));

    await waitFor(() => expect(getNotifications.mock.calls.length).toBeGreaterThan(before));
  });

  it('shows an error state with retry on failure', async () => {
    seedAuth();
    getNotifications.mockRejectedValue({ kind: 'network', message: 'Network down' });
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByTestId('notification-bell'));
    expect(await screen.findByText(/Network down/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
