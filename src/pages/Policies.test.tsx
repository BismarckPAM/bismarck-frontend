import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Policies from './Policies';
import * as policiesApi from '../api/policies';

vi.mock('../api/policies', () => ({
  getPoliciesApi: vi.fn(),
  createPolicyApi: vi.fn(),
  updatePolicyApi: vi.fn(),
  deactivatePolicyApi: vi.fn(),
}));

const policy = {
  id: 'p-1', role: 'ADMIN', resourceType: 'DATABASE', environment: 'PRODUCTION',
  criticality: 'HIGH', maxAccessLevel: 4, requiresApprovalForElevated: true, isActive: true,
};

const renderPage = () => render(<MemoryRouter><Policies /></MemoryRouter>);

describe('Policy management screen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads policies and opens the create form', async () => {
    vi.mocked(policiesApi.getPoliciesApi).mockResolvedValueOnce([policy]);
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByTestId('policy-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('ADMIN')).toBeInTheDocument());
    expect(screen.getByRole('table', { name: /access policies/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new policy/i }));
    expect(screen.getByRole('form', { name: /policy form/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create policy/i })).toBeInTheDocument();
  });

  it('renders a friendly error when policies fail to load', async () => {
    vi.mocked(policiesApi.getPoliciesApi).mockRejectedValueOnce(new Error('Policy service unavailable'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Policy service unavailable'));
  });
});
