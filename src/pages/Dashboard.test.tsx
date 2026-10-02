import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { listPendingApprovalRequests } from '../api/approval';
import { getAnalyticsSummary, getDenialReasons, getTopResources } from '../api/analytics';
import type { User } from '../types/auth';
import type { ApprovalRequest } from '../types/pam';

vi.mock('../api/approval', () => ({
  listPendingApprovalRequests: vi.fn(),
}));

vi.mock('../api/analytics', () => ({
  getAnalyticsSummary: vi.fn(),
  getTopResources: vi.fn(),
  getDenialReasons: vi.fn(),
}));

// The dashboard reads cross-screen state from WorkflowContext and the signed-in
// user from AuthContext. Both are mocked so this file stays a focused regression
// guard for the dashboard's own layout and visibility rules.
vi.mock('../state/WorkflowContext', () => ({
  useWorkflow: () => workflowState,
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ user: currentUser }),
}));

let currentUser: User | null = null;

let workflowState = {
  myRequests: [] as ApprovalRequest[],
  notifications: [] as unknown[],
  unreadCount: 0,
  notificationsError: null as string | null,
};

const ADMIN: User = {
  id: 'u-1',
  fullName: 'Alice Vance',
  email: 'alice@bismarck.sec',
  role: 'Admin',
  department: 'Security Operations',
};

const request = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'r-1',
  requesterUserId: 'u-2',
  resourceId: 'res-1',
  requestedLevel: 3,
  reason: 'Investigate incident',
  durationMinutes: 60,
  status: 'PENDING',
  createdAt: '2026-10-01T09:00:00Z',
  ...overrides,
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

/**
 * Flushes the analytics request/response cycle.
 *
 * The dashboard kicks off analytics on mount, so a test that asserts only on
 * the pre-existing panels would otherwise finish while that promise is still
 * in flight and React would report an unwrapped state update.
 */
const flushAnalytics = () => waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = ADMIN;
  workflowState = {
    myRequests: [request()],
    notifications: [],
    unreadCount: 2,
    notificationsError: null,
  };
  vi.mocked(listPendingApprovalRequests).mockResolvedValue([]);
  vi.mocked(getAnalyticsSummary).mockResolvedValue({
    startDate: null,
    endDate: null,
    totals: { requests: 7, approvals: 5, denials: 2, revocations: 1 },
    trend: [{ date: '2026-10-01', requests: 7, approvals: 5, denials: 2, revocations: 1 }],
  });
  vi.mocked(getTopResources).mockResolvedValue({
    startDate: null,
    endDate: null,
    totalRequests: 7,
    items: [
      { rank: 1, resourceId: 'res-1', resourceName: 'prod-db-1', requestCount: 7, percentage: 100 },
    ],
  });
  vi.mocked(getDenialReasons).mockResolvedValue({
    startDate: null,
    endDate: null,
    totalDenials: 2,
    items: [{ reason: 'POLICY_DENIED', count: 2, percentage: 100 }],
  });
});

describe('Dashboard - existing behaviour is preserved (BIS-404 regression)', () => {
  it('still renders the page header with the signed-in user', async () => {
    renderDashboard();
    await flushAnalytics();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Alice Vance/)).toBeInTheDocument();
  });

  it('still renders the personal request counters', async () => {
    renderDashboard();
    await flushAnalytics();
    expect(screen.getByTestId('metric-total')).toHaveTextContent('1');
    expect(screen.getByTestId('metric-pending')).toHaveTextContent('1');
    expect(screen.getByTestId('metric-approved')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-rejected')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-unread')).toHaveTextContent('2');
  });

  it('still renders the recent notifications panel and link', async () => {
    renderDashboard();
    await flushAnalytics();
    expect(screen.getByRole('heading', { name: /recent notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all notifications/i })).toBeInTheDocument();
  });

  it('still renders the approval queue preview for an approver', async () => {
    renderDashboard();
    expect(
      screen.getByRole('heading', { name: /requests awaiting your approval/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to approval queue/i })).toBeInTheDocument();
    await waitFor(() => expect(listPendingApprovalRequests).toHaveBeenCalled());
  });

  it('still renders the Audit & security shortcut for an approver', async () => {
    renderDashboard();
    await flushAnalytics();
    expect(screen.getByRole('heading', { name: /audit & security/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open audit log/i })).toHaveAttribute('href', '/audit');
  });

  it('keeps the existing notice and scopes it to the personal counters', async () => {
    renderDashboard();
    await flushAnalytics();
    const notice = screen.getByTestId('unsupported-notice');
    expect(notice).toHaveTextContent(/personal request counters/i);
    // It must not imply that the new server-side analytics are browser-session data.
    expect(notice).toHaveTextContent(/Analytics Service/i);
  });

  it('does not show analytics or the audit panel to a non-approver', async () => {
    currentUser = { ...ADMIN, role: 'User' };
    renderDashboard();

    await waitFor(() => expect(getAnalyticsSummary).not.toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /access analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open audit log/i })).not.toBeInTheDocument();
    expect(listPendingApprovalRequests).not.toHaveBeenCalled();
    // The rest of the dashboard is untouched for this role.
    expect(screen.getByTestId('metric-total')).toHaveTextContent('1');
  });
});

describe('Dashboard - BIS-404 analytics integration', () => {
  it('renders the Access Analytics section for a permitted user', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { name: /access analytics/i })).toBeInTheDocument();
  });

  it('loads all three analytics endpoints from the dashboard', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(getAnalyticsSummary).toHaveBeenCalledTimes(1);
      expect(getTopResources).toHaveBeenCalledTimes(1);
      expect(getDenialReasons).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the analytics summary metrics inside the analytics section', async () => {
    renderDashboard();
    expect(await screen.findByTestId('analytics-total-requests')).toHaveTextContent('7');
    expect(screen.getByTestId('analytics-total-approvals')).toHaveTextContent('5');
    expect(screen.getByTestId('analytics-total-denials')).toHaveTextContent('2');
    expect(screen.getByTestId('analytics-total-revocations')).toHaveTextContent('1');
  });

  it('renders the three charts', async () => {
    renderDashboard();
    expect(
      await screen.findByRole('heading', { name: /request & access activity/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /most requested resources/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /denial reasons/i })).toBeInTheDocument();
  });

  it('does not remove the existing dashboard panels when analytics is present', async () => {
    renderDashboard();
    await screen.findByTestId('analytics-total-requests');

    expect(screen.getByTestId('metric-total')).toBeInTheDocument();
    expect(screen.getByTestId('metric-unread')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open audit log/i })).toBeInTheDocument();
  });

  it('keeps the rest of the dashboard usable when analytics fails', async () => {
    vi.mocked(getAnalyticsSummary).mockRejectedValue({
      kind: 'server',
      message: 'Analytics service unavailable.',
    });
    renderDashboard();

    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    // Existing dashboard content must remain intact.
    expect(screen.getByTestId('metric-total')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open audit log/i })).toBeInTheDocument();
  });
});
