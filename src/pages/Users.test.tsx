import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Users from './Users';
import * as usersApi from '../api/users';
import type { User } from '../types/auth';

// Mock the API module — no real network calls in tests
vi.mock('../api/users', () => ({
  getUsersApi: vi.fn(),
}));

const mockUsersList: User[] = [
  {
    id: 'usr-001',
    fullName: 'Alice Vance',
    email: 'alice.vance@bismarck.sec',
    role: 'Administrator',
    department: 'Security Operations',
  },
  {
    id: 'usr-002',
    fullName: 'Bob Martinez',
    email: 'bob.m@bismarck.sec',
    role: 'Privileged Operator',
    department: 'Infrastructure',
  },
  {
    id: 'usr-003',
    fullName: 'Charlie Kim',
    email: 'charlie.k@bismarck.sec',
    role: 'Security Auditor',
    department: 'Compliance',
  },
];

const renderUsersPage = () => {
  return render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>,
  );
};

describe('User Directory Screen (Users Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state initially while request is in flight', async () => {
    let resolvePromise!: (value: User[]) => void;
    const promise = new Promise<User[]>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(usersApi.getUsersApi).mockReturnValueOnce(promise);

    renderUsersPage();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText(/fetching user directory from identity service/i)).toBeInTheDocument();

    // Cleanly resolve to avoid leaking unhandled promises
    resolvePromise([]);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  it('renders the user list correctly once data resolves', async () => {
    vi.mocked(usersApi.getUsersApi).mockResolvedValueOnce(mockUsersList);

    renderUsersPage();

    // Loading should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    // Table headers
    expect(screen.getByRole('table', { name: /user directory/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /user identity/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /department/i })).toBeInTheDocument();

    // User rows and attributes
    expect(screen.getByText('Alice Vance')).toBeInTheDocument();
    expect(screen.getByText('alice.vance@bismarck.sec')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /administrator/i })).toBeInTheDocument();
    expect(screen.getByText('Security Operations')).toBeInTheDocument();

    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
    expect(screen.getByText('bob.m@bismarck.sec')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /privileged operator/i })).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();

    expect(screen.getByText('Charlie Kim')).toBeInTheDocument();
    expect(screen.getByText('charlie.k@bismarck.sec')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /security auditor/i })).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('renders the empty state when the API returns an empty array', async () => {
    vi.mocked(usersApi.getUsersApi).mockResolvedValueOnce([]);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /no users found/i })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an error state when the API call fails or rejects', async () => {
    vi.mocked(usersApi.getUsersApi).mockRejectedValueOnce(new Error('Network Error 500'));

    renderUsersPage();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /failed to load user directory/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /unable to load user directory\. please check your connection or try again\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries fetching data when clicking the Try Again button on error', async () => {
    const user = userEvent.setup();
    // Fail first, succeed on retry
    vi.mocked(usersApi.getUsersApi)
      .mockRejectedValueOnce(new Error('Server Error'))
      .mockResolvedValueOnce(mockUsersList);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Alice Vance')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(usersApi.getUsersApi).toHaveBeenCalledTimes(2);
  });

  it('filters users dynamically when typing in the search input', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getUsersApi).mockResolvedValueOnce(mockUsersList);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Vance')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search users/i);
    await user.type(searchInput, 'Martinez');

    // Only Bob Martinez should be visible
    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
    expect(screen.queryByText('Alice Vance')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Kim')).not.toBeInTheDocument();
  });
});
