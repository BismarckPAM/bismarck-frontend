import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Resources from './Resources';
import * as resourcesApi from '../api/resources';
import type { Resource } from '../types/resource';

// Mock the API module — no real network calls in tests
vi.mock('../api/resources', () => ({
  getResourcesApi: vi.fn(),
}));

const mockResourcesList: Resource[] = [
  {
    id: 'res-001',
    name: 'prod-db-primary-cluster',
    type: 'PostgreSQL Database',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    description: 'Main production PostgreSQL datastore',
    ipAddress: '10.0.1.42',
  },
  {
    id: 'res-002',
    name: 'k8s-prod-control-plane',
    type: 'Kubernetes Cluster',
    environment: 'PRODUCTION',
    criticality: 'HIGH',
    description: 'Production core services cluster',
    ipAddress: '10.0.2.10',
  },
  {
    id: 'res-003',
    name: 'staging-bastion-ssh',
    type: 'Linux Bastion Host',
    environment: 'STAGING',
    criticality: 'MEDIUM',
    description: 'Jump host for staging VPC',
    ipAddress: '10.1.0.5',
  },
  {
    id: 'res-004',
    name: 'dev-redis-cache-node',
    type: 'Redis Cache',
    environment: 'DEVELOPMENT',
    criticality: 'LOW',
    description: 'Ephemeral dev cache',
    ipAddress: '10.2.0.18',
  },
];

const renderResourcesPage = () => {
  return render(
    <MemoryRouter>
      <Resources />
    </MemoryRouter>,
  );
};

describe('Resource List Screen (Resources Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state initially while request is in flight', async () => {
    let resolvePromise!: (value: Resource[]) => void;
    const promise = new Promise<Resource[]>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(resourcesApi.getResourcesApi).mockReturnValueOnce(promise);

    renderResourcesPage();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(
      screen.getByText(/fetching privileged resources from resource service/i),
    ).toBeInTheDocument();

    // Cleanly resolve to avoid leaking unhandled promises
    resolvePromise([]);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  it('renders the populated resource list correctly with type, environment, and visual criticality badges', async () => {
    vi.mocked(resourcesApi.getResourcesApi).mockResolvedValueOnce(mockResourcesList);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    // Table headers
    expect(screen.getByRole('table', { name: /privileged resources/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /environment/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /criticality/i })).toBeInTheDocument();

    // Resource items
    expect(screen.getByText('prod-db-primary-cluster')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Database')).toBeInTheDocument();
    expect(screen.getByTestId('criticality-badge-critical')).toHaveTextContent('CRITICAL');

    expect(screen.getByText('k8s-prod-control-plane')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes Cluster')).toBeInTheDocument();
    expect(screen.getByTestId('criticality-badge-high')).toHaveTextContent('HIGH');

    expect(screen.getByText('staging-bastion-ssh')).toBeInTheDocument();
    expect(screen.getByText('Linux Bastion Host')).toBeInTheDocument();
    expect(screen.getByTestId('criticality-badge-medium')).toHaveTextContent('MEDIUM');

    expect(screen.getByText('dev-redis-cache-node')).toBeInTheDocument();
    expect(screen.getByText('Redis Cache')).toBeInTheDocument();
    expect(screen.getByTestId('criticality-badge-low')).toHaveTextContent('LOW');
  });

  it('renders the empty state when the API returns an empty array', async () => {
    vi.mocked(resourcesApi.getResourcesApi).mockResolvedValueOnce([]);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /no resources found/i })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an error state when the API call fails or rejects', async () => {
    vi.mocked(resourcesApi.getResourcesApi).mockRejectedValueOnce(new Error('Network Error 500'));

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /failed to load resources/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /unable to load privileged resources\. please check your connection or try again\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries fetching data when clicking the Try Again button on error', async () => {
    const user = userEvent.setup();
    // Fail first, succeed on retry
    vi.mocked(resourcesApi.getResourcesApi)
      .mockRejectedValueOnce(new Error('Internal Server Error'))
      .mockResolvedValueOnce(mockResourcesList);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('prod-db-primary-cluster')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(resourcesApi.getResourcesApi).toHaveBeenCalledTimes(2);
  });

  it('filters resources dynamically when typing in the search input', async () => {
    const user = userEvent.setup();
    vi.mocked(resourcesApi.getResourcesApi).mockResolvedValueOnce(mockResourcesList);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.getByText('prod-db-primary-cluster')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search resources/i);
    await user.type(searchInput, 'bastion');

    // Only staging-bastion-ssh should be visible
    expect(screen.getByText('staging-bastion-ssh')).toBeInTheDocument();
    expect(screen.queryByText('prod-db-primary-cluster')).not.toBeInTheDocument();
    expect(screen.queryByText('k8s-prod-control-plane')).not.toBeInTheDocument();
  });

  it('filters resources by environment and criticality dropdowns', async () => {
    const user = userEvent.setup();
    vi.mocked(resourcesApi.getResourcesApi).mockResolvedValueOnce(mockResourcesList);

    renderResourcesPage();

    await waitFor(() => {
      expect(screen.getByText('prod-db-primary-cluster')).toBeInTheDocument();
    });

    const envSelect = screen.getByLabelText(/filter by environment/i);
    await user.selectOptions(envSelect, 'STAGING');

    expect(screen.getByText('staging-bastion-ssh')).toBeInTheDocument();
    expect(screen.queryByText('prod-db-primary-cluster')).not.toBeInTheDocument();
  });
});
