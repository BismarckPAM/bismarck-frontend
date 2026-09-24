import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RequestAccess from './RequestAccess';
import { AuthProvider } from '../context/AuthContext';
import { WorkflowProvider } from '../state/WorkflowProvider';

vi.mock('../api/resources', () => ({
  getResourcesApi: vi
    .fn()
    .mockResolvedValue([
      { id: 'res-1', name: 'Prod DB', type: 'DATABASE', environment: 'PRODUCTION' },
    ]),
}));

const createApprovalRequest = vi.fn();
vi.mock('../api/approval', () => ({
  createApprovalRequest: (...args: unknown[]) => createApprovalRequest(...args),
}));

const renderForm = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <WorkflowProvider>
          <RequestAccess />
        </WorkflowProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await waitFor(() => expect(screen.getByLabelText(/resource \*/i)).toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText(/resource \*/i), 'res-1');
  await user.selectOptions(screen.getByLabelText(/access level \*/i), '3');
  await user.type(
    screen.getByLabelText(/justification/i),
    'Need write access to rotate credentials for incident 42.',
  );
  await user.type(screen.getByLabelText(/duration \(minutes\)/i), '60');
};

describe('RequestAccess form', () => {
  beforeEach(() => {
    createApprovalRequest.mockReset();
  });

  it('renders all required fields', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/resource \*/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/access level \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/justification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration \(minutes\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
  });

  it('shows required-field validation errors and does not call the API', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/resource \*/i)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText(/resource is required/i)).toBeInTheDocument();
    expect(screen.getByText(/access level is required/i)).toBeInTheDocument();
    expect(screen.getByText(/justification is required/i)).toBeInTheDocument();
    expect(screen.getByText(/duration is required/i)).toBeInTheDocument();
    expect(createApprovalRequest).not.toHaveBeenCalled();
  });

  it('rejects a non-positive duration', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/resource \*/i)).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/resource \*/i), 'res-1');
    await user.selectOptions(screen.getByLabelText(/access level \*/i), '1');
    await user.type(screen.getByLabelText(/justification/i), 'A sufficiently long justification.');
    await user.type(screen.getByLabelText(/duration \(minutes\)/i), '-5');

    await user.click(screen.getByRole('button', { name: /submit request/i }));
    expect(await screen.findByText(/positive number of minutes/i)).toBeInTheDocument();
    expect(createApprovalRequest).not.toHaveBeenCalled();
  });

  it('submits successfully and shows the created id and status', async () => {
    createApprovalRequest.mockResolvedValue({
      id: 'req-123',
      status: 'PENDING',
      resourceId: 'res-1',
      requestedLevel: 3,
      reason: 'x',
      durationMinutes: 60,
      requesterUserId: 'u1',
      createdAt: '2024-01-01T00:00:00Z',
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(createApprovalRequest).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('submit-success')).toHaveTextContent(/req-123/);
    expect(screen.getByTestId('submit-success')).toHaveTextContent(/PENDING/);
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolve!: (value: unknown) => void;
    createApprovalRequest.mockImplementation(() => new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);

    const submit = screen.getByRole('button', { name: /submit request/i });
    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    resolve({
      id: 'req-9',
      status: 'PENDING',
      resourceId: 'res-1',
      requestedLevel: 3,
      reason: 'x',
      durationMinutes: 60,
      requesterUserId: 'u1',
      createdAt: '2024-01-01T00:00:00Z',
    });
  });

  it('surfaces backend validation errors and keeps entered values', async () => {
    createApprovalRequest.mockRejectedValue({
      kind: 'validation',
      message: 'Validation failed',
      fieldErrors: { Reason: ['Justification too short'] },
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByTestId('submit-error')).toHaveTextContent(/Validation failed/i);
    // Entered value preserved.
    expect(screen.getByLabelText(/duration \(minutes\)/i)).toHaveValue(60);
  });

  it('shows a generic error on network failure', async () => {
    createApprovalRequest.mockRejectedValue({
      kind: 'network',
      message: 'Network error. Please check your connection.',
    });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByTestId('submit-error')).toHaveTextContent(/Network error/i);
  });
});
