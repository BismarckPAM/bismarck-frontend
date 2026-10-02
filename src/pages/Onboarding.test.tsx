import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Onboarding from './Onboarding';
import type { OnboardingTicket } from '../types/pam';

const listTickets = vi.fn();
const approveTicket = vi.fn();
const rejectTicket = vi.fn();

vi.mock('../api/onboarding', () => ({
  adminListOnboardingTickets: () => listTickets(),
  approveOnboardingTicket: (id: string) => approveTicket(id),
  rejectOnboardingTicket: (id: string, reason: string) => rejectTicket(id, reason),
}));

const pendingTicket: OnboardingTicket = {
  id: 'tkt-1',
  fullName: 'Alex Kumar',
  email: 'alex@company.com',
  department: 'Engineering',
  requestedRole: 'User',
  justification: 'Need access',
  status: 'PENDING',
  createdAt: '2024-01-01T10:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  rejectionReason: null,
  provisionedUserId: null,
};

describe('Onboarding', () => {
  beforeEach(() => {
    listTickets.mockReset();
    approveTicket.mockReset();
    rejectTicket.mockReset();
  });

  it('renders the pending review queue with applicant details', async () => {
    listTickets.mockResolvedValue([pendingTicket]);
    render(<Onboarding />);

    expect(await screen.findByText('Alex Kumar')).toBeInTheDocument();
    expect(screen.getByText('alex@company.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
  });

  it('shows an empty state when there are no pending requests', async () => {
    listTickets.mockResolvedValue([]);
    render(<Onboarding />);

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  it('approves a ticket and provisions the account', async () => {
    listTickets.mockResolvedValue([pendingTicket]);
    approveTicket.mockResolvedValue({ ...pendingTicket, status: 'APPROVED' });
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.click(await screen.findByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/Approve onboarding request/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve & provision/i }));

    await waitFor(() => expect(approveTicket).toHaveBeenCalledWith('tkt-1'));
    await user.click(screen.getByRole('tab', { name: /approved/i }));
    expect(await screen.findByTestId('onboarding-status-APPROVED')).toBeInTheDocument();
  });

  it('requires a reason before rejecting', async () => {
    listTickets.mockResolvedValue([pendingTicket]);
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.click(await screen.findByRole('button', { name: /^reject$/i }));
    await user.click(screen.getByRole('button', { name: /reject request/i }));

    expect(await screen.findByText(/provide a reason/i)).toBeInTheDocument();
    expect(rejectTicket).not.toHaveBeenCalled();
  });

  it('rejects with a reason and updates the row status', async () => {
    listTickets.mockResolvedValue([pendingTicket]);
    rejectTicket.mockResolvedValue({
      ...pendingTicket,
      status: 'REJECTED',
      rejectionReason: 'Not justified',
    });
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.click(await screen.findByRole('button', { name: /^reject$/i }));
    await user.type(screen.getByLabelText(/Reason/i), 'Not justified');
    await user.click(screen.getByRole('button', { name: /reject request/i }));

    await waitFor(() => expect(rejectTicket).toHaveBeenCalledWith('tkt-1', 'Not justified'));
    await user.click(screen.getByRole('tab', { name: /rejected/i }));
    expect(await screen.findByTestId('onboarding-status-REJECTED')).toBeInTheDocument();
  });
});
