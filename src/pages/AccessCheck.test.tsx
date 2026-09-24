import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccessCheck from './AccessCheck';
import * as authorizationApi from '../api/authorization';
import * as usersApi from '../api/users';
import * as resourcesApi from '../api/resources';

vi.mock('../api/authorization', () => ({ checkAuthorizationApi: vi.fn() }));
vi.mock('../api/users', () => ({ getUsersApi: vi.fn() }));
vi.mock('../api/resources', () => ({ getResourcesApi: vi.fn() }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccessCheck />
    </MemoryRouter>,
  );

const user = {
  id: 'u-1',
  fullName: 'Alice Vance',
  email: 'alice@example.com',
  role: 'ADMIN',
  department: 'Security',
};
const resource = {
  id: 'r-1',
  name: 'Production DB',
  type: 'DATABASE',
  environment: 'PRODUCTION',
  criticality: 'HIGH',
};

describe('Access check simulator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.getUsersApi).mockResolvedValue([user]);
    vi.mocked(resourcesApi.getResourcesApi).mockResolvedValue([resource]);
  });

  it.each([
    ['ALLOW', 'AUTHORIZED'],
    ['DENY', 'INSUFFICIENT_ROLE_PERMISSIONS'],
    ['APPROVAL_REQUIRED', 'ELEVATED_ACCESS_REQUIRES_APPROVAL'],
  ] as const)('shows the %s decision and reason', async (decision, reason) => {
    vi.mocked(authorizationApi.checkAuthorizationApi).mockResolvedValueOnce({ decision, reason });
    const userEvents = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /evaluate access/i })).toBeEnabled(),
    );
    await userEvents.click(screen.getByRole('button', { name: /evaluate access/i }));
    await waitFor(() =>
      expect(screen.getByTestId('decision-result')).toHaveTextContent(decision.replace('_', ' ')),
    );
    expect(screen.getByTestId('decision-result')).toHaveTextContent(reason);
  });
});
