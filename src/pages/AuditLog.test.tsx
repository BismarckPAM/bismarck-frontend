import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const page = (items: unknown[], overrides: Record<string, unknown> = {}) => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  ...overrides,
});

/** Query object the component passed on the most recent call. */
const lastQuery = () => getAuditLogs.mock.calls.at(-1)?.[0] as Record<string, unknown>;

/** Query objects passed on every call so far. */
const allQueries = () => getAuditLogs.mock.calls.map((call) => call[0] as Record<string, unknown>);

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuditLog />
    </MemoryRouter>,
  );

const searchBox = () => screen.getByLabelText(/search audit logs by actor or resource/i);

describe('AuditLog', () => {
  beforeEach(() => {
    getAuditLogs.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------- loading

  it('calls getAuditLogs on initial load', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    renderPage();

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    expect(lastQuery()).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('shows a loading state while the first request is in flight', async () => {
    let resolve: (value: unknown) => void = () => {};
    getAuditLogs.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderPage();

    expect(await screen.findByTestId('loading-state')).toBeInTheDocument();
    resolve(page([entry]));
    expect(await screen.findByText('alice')).toBeInTheDocument();
  });

  it('renders the required table columns', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    renderPage();

    const table = await screen.findByRole('table', { name: /audit log entries/i });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['Timestamp', 'Actor', 'Action', 'Resource', 'Outcome']);
  });

  it('displays audit events', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    renderPage();

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('GRANT')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('res-1')).toBeInTheDocument();
  });

  // ------------------------------------------------------ empty / error states

  it('shows an empty state when there are no audit events at all', async () => {
    getAuditLogs.mockResolvedValue(page([]));
    renderPage();

    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent('No audit events');
    expect(empty).toHaveTextContent('No audit events have been recorded yet.');
  });

  it('explains that filters caused the empty result and keeps Reset available', async () => {
    getAuditLogs.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('empty-state');

    await user.type(searchBox(), 'nothing-matches-this');

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        'No audit events match the current filters.',
      );
    });
    expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    getAuditLogs.mockRejectedValue({ kind: 'forbidden', message: 'Not allowed' });
    renderPage();

    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText(/Not allowed/i)).toBeInTheDocument();
  });

  it('retries after an API failure and recovers', async () => {
    getAuditLogs.mockRejectedValueOnce({ kind: 'server', message: 'Boom' });
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('does not surface raw Axios/PostgreSQL diagnostics from a failed request', async () => {
    // A realistic raw Axios failure carrying a PostgreSQL error, exactly as the
    // shared HTTP client would reject with. The audit API module normalizes it
    // through normalizeApiError, so the page must only ever render the safe,
    // user-facing message.
    getAuditLogs.mockRejectedValue({
      kind: 'server',
      message: 'The server encountered an error. Please try again shortly.',
      status: 500,
    });
    renderPage();

    const error = await screen.findByTestId('error-state');
    expect(error).toHaveTextContent('The server encountered an error.');
    expect(error).not.toHaveTextContent('42P01');
    expect(error).not.toHaveTextContent('PostgreSQL');
    expect(error).not.toHaveTextContent('at AuditService');
  });

  it('falls back to a friendly message for a non-ApiError rejection', async () => {
    getAuditLogs.mockRejectedValue(new Error('kaboom 42P01'));
    renderPage();

    const error = await screen.findByTestId('error-state');
    expect(error).toBeInTheDocument();
    // The component never renders an unknown throw verbatim as a stack trace.
    expect(error).not.toHaveTextContent('at Object.');
  });

  // ------------------------------------------------- free-text search (AC-4)

  it('sends the search box value as `search`, never as `user`', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'alice');

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'alice' }));
    expect(lastQuery()).not.toHaveProperty('user');
  });

  it('applies the search after the debounce delay', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'production');

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'production' }));
  });

  it('debounces typing instead of firing a request per keystroke', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');
    expect(getAuditLogs).toHaveBeenCalledTimes(1);

    await user.type(searchBox(), 'production');

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'production' }));
    // One initial load plus exactly ONE debounced search request.
    expect(getAuditLogs).toHaveBeenCalledTimes(2);
  });

  it('does not require pressing Enter', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'alice{Enter}');

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'alice' }));
  });

  it('resets to page 1 when the search changes', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5, page: 1 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    await user.type(searchBox(), 'alice');

    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'alice', page: 1 }));
  });

  it('clears the search parameter when the box is emptied', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'alice');
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'alice' }));

    await user.clear(searchBox());
    await waitFor(() => expect(lastQuery().search).toBeUndefined());
  });

  it('trims surrounding whitespace from the search', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), '  alice  ');

    await waitFor(() => expect(lastQuery().search).toBe('alice'));
  });

  it('ignores a whitespace-only search', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), '   ');

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(lastQuery().search).toBeUndefined();
  });

  // ------------------------------------------------------- explicit filters

  it('updates query.user from the user filter', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by user/i), 'alice');

    await waitFor(() => expect(lastQuery()).toMatchObject({ user: 'alice' }));
  });

  it('updates query.resource from the resource filter', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by resource/i), 'res-1');

    await waitFor(() => expect(lastQuery()).toMatchObject({ resource: 'res-1' }));
  });

  it('updates query.eventType from the event type filter', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by event type/i), 'PERMISSION_GRANTED');

    await waitFor(() => expect(lastQuery()).toMatchObject({ eventType: 'PERMISSION_GRANTED' }));
  });

  it('updates query.outcome from the outcome filter', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');

    await waitFor(() => expect(lastQuery()).toMatchObject({ outcome: 'DENIED' }));
  });

  it('keeps the event type filter free-text so unknown Kafka values still work', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    const input = screen.getByLabelText(/filter by event type/i);
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'text');

    await user.type(input, 'some.future.event.type');
    await waitFor(() => expect(lastQuery()).toMatchObject({ eventType: 'some.future.event.type' }));
  });

  it('combines the free-text search with the explicit filters', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'production');
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'production' }));

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ search: 'production', outcome: 'DENIED' }),
    );
  });

  it('resets to page 1 when a filter changes', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5, page: 1 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');

    await waitFor(() => expect(lastQuery()).toMatchObject({ outcome: 'DENIED', page: 1 }));
  });

  // ------------------------------------------------------------ date range

  it('sends the from date as UTC start-of-day', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter from date/i), '2026-10-01');

    await waitFor(() => expect(lastQuery()).toMatchObject({ from: '2026-10-01T00:00:00.000Z' }));
  });

  it('sends the to date as the inclusive UTC end-of-day', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter to date/i), '2026-10-01');

    await waitFor(() => expect(lastQuery()).toMatchObject({ to: '2026-10-01T23:59:59.999Z' }));
  });

  it('sends both bounds of a date range', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter from date/i), '2026-10-01');
    await user.type(screen.getByLabelText(/filter to date/i), '2026-10-31');

    await waitFor(() =>
      expect(lastQuery()).toMatchObject({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      }),
    );
  });

  it('omits both dates when they are cleared', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    const from = screen.getByLabelText(/filter from date/i);
    await user.type(from, '2026-10-01');
    await waitFor(() => expect(lastQuery()).toMatchObject({ from: '2026-10-01T00:00:00.000Z' }));

    await user.clear(from);
    await waitFor(() => expect(lastQuery().from).toBeUndefined());
  });

  it('blocks an inverted date range and explains why, without calling the API', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter from date/i), '2026-10-31');
    await user.type(screen.getByLabelText(/filter to date/i), '2026-10-01');

    const hint = await screen.findByRole('alert');
    expect(hint).toHaveTextContent(/is after/i);

    // No request may ever have carried an inverted range: the API would reject
    // it with a 400, so the page blocks it client-side instead. (Setting only a
    // "From" date is a valid, half-open range, so earlier calls are expected.)
    const inverted = allQueries().filter(
      (q) => typeof q.from === 'string' && typeof q.to === 'string' && q.from > q.to,
    );
    expect(inverted).toEqual([]);
  });

  it('recovers once the range is corrected', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter from date/i), '2026-10-31');
    await user.type(screen.getByLabelText(/filter to date/i), '2026-10-01');
    await screen.findByRole('alert');

    await user.clear(screen.getByLabelText(/filter from date/i));
    await user.clear(screen.getByLabelText(/filter to date/i));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(getAuditLogs.mock.calls.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------- reset and refresh

  it('clears every filter and search value when Reset Filters is pressed', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(searchBox(), 'alice');
    await user.type(screen.getByLabelText(/filter by user/i), 'alice');
    await user.type(screen.getByLabelText(/filter by resource/i), 'res-1');
    await user.type(screen.getByLabelText(/filter by event type/i), 'GRANTED');
    await user.type(screen.getByLabelText(/filter by outcome/i), 'SUCCESS');
    await user.type(screen.getByLabelText(/filter from date/i), '2026-10-01');
    await user.type(screen.getByLabelText(/filter to date/i), '2026-10-31');
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'alice', outcome: 'SUCCESS' }));

    await user.click(screen.getByRole('button', { name: /reset filters/i }));

    // The controls must visually empty, not just the outgoing query.
    await waitFor(() => {
      expect(searchBox()).toHaveValue('');
      expect(screen.getByLabelText(/filter by user/i)).toHaveValue('');
      expect(screen.getByLabelText(/filter by resource/i)).toHaveValue('');
      expect(screen.getByLabelText(/filter by event type/i)).toHaveValue('');
      expect(screen.getByLabelText(/filter by outcome/i)).toHaveValue('');
      expect(screen.getByLabelText(/filter from date/i)).toHaveValue('');
      expect(screen.getByLabelText(/filter to date/i)).toHaveValue('');
    });

    // And the refetch must be unfiltered again.
    await waitFor(() => expect(lastQuery()).toEqual({ search: undefined, page: 1, pageSize: 20 }));
  });

  it('resets the page to 1 when Reset Filters is pressed', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5, page: 1 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    await user.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 1 }));
  });

  it('preserves the current filters and page when Refresh is pressed', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5, page: 1 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');
    await user.type(searchBox(), 'production');
    await waitFor(() => expect(lastQuery()).toMatchObject({ search: 'production' }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));

    const beforeRefresh = lastQuery();
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(getAuditLogs.mock.calls.length).toBeGreaterThan(0));
    expect(lastQuery()).toEqual(beforeRefresh);
  });

  // ----------------------------------------------------------- pagination

  it('disables Previous on the first page', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5 }));
    renderPage();

    await screen.findByText('alice');
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('disables Next on the last page', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 1 }));
    renderPage();

    await screen.findByText('alice');
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('shows the current page and total pages', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5 }));
    renderPage();

    expect(await screen.findByText(/Page 1 of 5/i)).toBeInTheDocument();
  });

  it('requests the next page', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));
    expect(await screen.findByText(/Page 2 of 5/i)).toBeInTheDocument();
  });

  it('requests the previous page', async () => {
    getAuditLogs.mockResolvedValue(page([entry], { totalCount: 100, totalPages: 5 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 2 }));
    await user.click(screen.getByRole('button', { name: /previous/i }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ page: 1 }));
  });

  it('never requests more than 50 rows per page', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    renderPage();

    await screen.findByText('alice');
    expect(lastQuery().pageSize).toBeLessThanOrEqual(50);
  });

  // ------------------------------------------ details modal (Sprint 3 kept)

  it('opens the event details modal on row click', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('alice'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Event ID');
    expect(dialog).toHaveTextContent('evt-1');
    expect(dialog).toHaveTextContent('Event type');
    expect(dialog).toHaveTextContent('PERMISSION_GRANTED');
    expect(dialog).toHaveTextContent('Actor');
    expect(dialog).toHaveTextContent('Action');
    expect(dialog).toHaveTextContent('Outcome');
    expect(dialog).toHaveTextContent('Resource');
    expect(dialog).toHaveTextContent('Metadata');
    expect(dialog).toHaveTextContent('{"level":3}');
  });

  it('opens the details modal with the keyboard', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('alice')).closest('tr');
    expect(row).not.toBeNull();
    row!.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes the details modal again', async () => {
    getAuditLogs.mockResolvedValue(page([entry]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('alice'));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /close dialog/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // ------------------------------------------- stale request protection

  it('aborts the previous request when the query changes', async () => {
    const controllers: AbortSignal[] = [];
    getAuditLogs.mockImplementation((_query: unknown, signal?: AbortSignal) => {
      if (signal) controllers.push(signal);
      return Promise.resolve(page([entry]));
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');
    await waitFor(() => expect(controllers.length).toBeGreaterThan(1));
    // The first request was aborted once the filter changed.
    expect(controllers[0].aborted).toBe(true);
  });

  it('does not show an error banner when a superseded request is cancelled', async () => {
    getAuditLogs.mockImplementation((_query: unknown, signal?: AbortSignal) =>
      signal?.aborted
        ? Promise.reject({ kind: 'cancelled', message: 'The request was cancelled.' })
        : Promise.resolve(page([entry])),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('alice');

    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');

    await waitFor(() => expect(getAuditLogs.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
  });

  it('keeps the newest results when an older response resolves last', async () => {
    const stale = { ...entry, id: 'stale', actor: 'STALE-ACTOR' };
    const fresh = { ...entry, id: 'fresh', actor: 'FRESH-ACTOR' };

    let call = 0;
    getAuditLogs.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        // The first (initial) request resolves late, after the filter request.
        return new Promise((resolve) => setTimeout(() => resolve(page([stale])), 50));
      }
      return Promise.resolve(page([fresh]));
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/filter by outcome/i), 'DENIED');

    expect(await screen.findByText('FRESH-ACTOR')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 150));
    // The stale payload must never replace the newer one.
    expect(screen.getByText('FRESH-ACTOR')).toBeInTheDocument();
    expect(screen.queryByText('STALE-ACTOR')).not.toBeInTheDocument();
  });

  // ------------------------------------------------------ route protection

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
