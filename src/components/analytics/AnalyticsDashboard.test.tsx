import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsDashboard from './AnalyticsDashboard';
import { getAnalyticsSummary, getDenialReasons, getTopResources } from '../../api/analytics';
import type { AnalyticsSummaryResponse } from '../../types/analytics';

vi.mock('../../api/analytics', () => ({
  getAnalyticsSummary: vi.fn(),
  getTopResources: vi.fn(),
  getDenialReasons: vi.fn(),
}));

const summary = (requests: number) => ({
  startDate: null,
  endDate: null,
  totals: { requests, approvals: 0, denials: 0, revocations: 0 },
  trend: [{ date: '2026-10-01', requests, approvals: 0, denials: 0, revocations: 0 }],
});

const noResources = { startDate: null, endDate: null, totalRequests: 0, items: [] };
const noDenials = { startDate: null, endDate: null, totalDenials: 0, items: [] };

/** Resolve all three endpoints with a successful, coherent payload. */
const resolveAll = (requests = 5): void => {
  vi.mocked(getAnalyticsSummary).mockResolvedValue(summary(requests));
  vi.mocked(getTopResources).mockResolvedValue(noResources);
  vi.mocked(getDenialReasons).mockResolvedValue(noDenials);
};

const renderDashboard = () => render(<AnalyticsDashboard />);

const fromInput = () => screen.getByLabelText('From date');
const toInput = () => screen.getByLabelText('To date');

/** Any of the three analytics endpoints; they share the same query shape. */
type AnalyticsEndpoint =
  typeof getAnalyticsSummary | typeof getTopResources | typeof getDenialReasons;

/** Query passed to the most recent call of the given endpoint mock. */
const lastQuery = (fn: AnalyticsEndpoint) =>
  (vi.mocked(fn).mock.calls.at(-1)?.[0] ?? {}) as Record<string, string | undefined>;

/** Call count of an endpoint mock. */
const callCount = (fn: AnalyticsEndpoint) => vi.mocked(fn).mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
  resolveAll();
});

describe('AnalyticsDashboard - initial and all-time load', () => {
  it('calls all three analytics endpoints exactly once on mount', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));
    expect(getTopResources).toHaveBeenCalledTimes(1);
    expect(getDenialReasons).toHaveBeenCalledTimes(1);
  });

  it('sends no date parameters for the initial all-time load', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));
    expect(lastQuery(getAnalyticsSummary)).toEqual({});
    expect(lastQuery(getTopResources)).toEqual({});
    expect(lastQuery(getDenialReasons)).toEqual({});
  });

  it('renders the totals returned by the summary endpoint', async () => {
    renderDashboard();
    expect(await screen.findByTestId('analytics-total-requests')).toHaveTextContent('5');
  });

  it('shows the loading skeleton while the requests are in flight', async () => {
    vi.mocked(getAnalyticsSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(getTopResources).mockReturnValue(new Promise(() => {}));
    vi.mocked(getDenialReasons).mockReturnValue(new Promise(() => {}));
    renderDashboard();

    expect(await screen.findByTestId('analytics-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('analytics-total-requests')).not.toBeInTheDocument();
  });
});

describe('AnalyticsDashboard - global date range', () => {
  it('refetches all three endpoints when the From date changes', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
    expect(getTopResources).toHaveBeenCalledTimes(2);
    expect(getDenialReasons).toHaveBeenCalledTimes(2);
  });

  it('refetches all three endpoints when the To date changes', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(toInput(), { target: { value: '2026-10-31' } });

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
    expect(getTopResources).toHaveBeenCalledTimes(2);
    expect(getDenialReasons).toHaveBeenCalledTimes(2);
  });

  it('converts From to the start of the UTC day and To to the end of the UTC day', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(toInput(), { target: { value: '2026-10-31' } });

    await waitFor(() => {
      expect(lastQuery(getAnalyticsSummary)).toEqual({
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.999Z',
      });
    });
    // The end bound must not be midnight, or the whole final day is excluded.
    expect(lastQuery(getAnalyticsSummary).endDate).toBe('2026-10-31T23:59:59.999Z');
  });

  it('sends the identical range to all three endpoints', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-05' } });
    fireEvent.change(toInput(), { target: { value: '2026-10-20' } });

    // Two edits => two refetches on top of the initial load.
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(3));
    const expected = {
      startDate: '2026-10-05T00:00:00.000Z',
      endDate: '2026-10-20T23:59:59.999Z',
    };
    expect(lastQuery(getAnalyticsSummary)).toEqual(expected);
    expect(lastQuery(getTopResources)).toEqual(expected);
    expect(lastQuery(getDenialReasons)).toEqual(expected);
  });
});
describe('AnalyticsDashboard - invalid ranges, reset and refresh', () => {
  it('shows an inline validation message when From is after To', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(toInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(fromInput(), { target: { value: '2026-10-31' } });

    expect(await screen.findByTestId('analytics-range-error')).toHaveTextContent(
      /start date cannot be after end date/i,
    );
  });

  it('does not send any analytics request while the range is invalid', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    // A To-only range is still valid, so this one refetch is expected.
    fireEvent.change(toInput(), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));

    // This makes the range inverted.
    fireEvent.change(fromInput(), { target: { value: '2026-10-31' } });
    await screen.findByTestId('analytics-range-error');
    const callsWhenInvalid = callCount(getAnalyticsSummary);

    // Further edits while inverted must not reach the API at all.
    fireEvent.change(fromInput(), { target: { value: '2026-10-15' } });
    fireEvent.change(toInput(), { target: { value: '2026-09-01' } });
    await screen.findByTestId('analytics-range-error');

    expect(getAnalyticsSummary).toHaveBeenCalledTimes(callsWhenInvalid);
    expect(getTopResources).toHaveBeenCalledTimes(callsWhenInvalid);
    expect(getDenialReasons).toHaveBeenCalledTimes(callsWhenInvalid);
  });

  it('never silently swaps the dates to make an invalid range valid', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(toInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(fromInput(), { target: { value: '2026-10-31' } });
    await screen.findByTestId('analytics-range-error');

    expect(fromInput()).toHaveValue('2026-10-31');
    expect(toInput()).toHaveValue('2026-10-01');
  });

  it('refetches as soon as the range becomes valid again', async () => {
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(toInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(fromInput(), { target: { value: '2026-10-31' } });
    await screen.findByTestId('analytics-range-error');
    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    await waitFor(() =>
      expect(screen.queryByTestId('analytics-range-error')).not.toBeInTheDocument(),
    );
    expect(getAnalyticsSummary).toHaveBeenCalledTimes(3);
  });

  it('clears the range and returns to all-time via the All time button', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(toInput(), { target: { value: '2026-10-31' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(3));

    await user.click(screen.getByRole('button', { name: /all time/i }));

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(4));
    expect(lastQuery(getAnalyticsSummary)).toEqual({});
    expect(fromInput()).toHaveValue('');
    expect(toInput()).toHaveValue('');
  });

  it('preserves the selected dates when Refresh is pressed', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    fireEvent.change(toInput(), { target: { value: '2026-10-31' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(3));
    const before = callCount(getAnalyticsSummary);

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(before + 1));
    expect(lastQuery(getAnalyticsSummary)).toEqual({
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
    });
    expect(fromInput()).toHaveValue('2026-10-01');
    expect(toInput()).toHaveValue('2026-10-31');
  });
});

describe('AnalyticsDashboard - error handling and retry', () => {
  it('shows the analytics error state without breaking the section', async () => {
    vi.mocked(getAnalyticsSummary).mockRejectedValue({
      kind: 'server',
      message: 'The server encountered an error. Please try again shortly.',
    });
    renderDashboard();

    expect(await screen.findByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText(/server encountered an error/i)).toBeInTheDocument();
    // The date controls remain usable so the user can retry or change range.
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries with the current date range when Try Again is pressed', async () => {
    const user = userEvent.setup();
    // Initial load succeeds, the first ranged load fails, the retry succeeds.
    vi.mocked(getAnalyticsSummary)
      .mockResolvedValueOnce(summary(5))
      .mockRejectedValueOnce({ kind: 'server', message: 'Boom' })
      .mockResolvedValue(summary(5));
    renderDashboard();

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
    await screen.findByTestId('error-state');

    const before = callCount(getAnalyticsSummary);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(before + 1));
    expect(lastQuery(getAnalyticsSummary)).toEqual({ startDate: '2026-10-01T00:00:00.000Z' });
    await waitFor(() => expect(screen.queryByTestId('error-state')).not.toBeInTheDocument());
  });

  it('does not present a partial mixture of ranges when one endpoint fails', async () => {
    vi.mocked(getTopResources).mockRejectedValue({
      kind: 'server',
      message: 'Resource data failed',
    });
    renderDashboard();

    await screen.findByTestId('error-state');
    // The summary must not be shown on its own as if the range were valid.
    expect(screen.queryByTestId('analytics-total-requests')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analytics-skeleton')).not.toBeInTheDocument();
  });
});
describe('AnalyticsDashboard - stale request protection', () => {
  it('aborts the previous in-flight request when the range changes', async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(getAnalyticsSummary).mockImplementation((_query, signal) => {
      if (signal) signals.push(signal);
      return Promise.resolve(summary(5));
    });
    renderDashboard();
    await waitFor(() => expect(signals.length).toBe(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(signals.length).toBe(2));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('does not let a late older response overwrite the newest range', async () => {
    let resolveStale: (value: AnalyticsSummaryResponse) => void = () => {};
    // The first (all-time) load resolves late; the second resolves immediately.
    vi.mocked(getAnalyticsSummary)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockImplementation(() => Promise.resolve(summary(2)));

    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('analytics-total-requests')).toHaveTextContent('2');

    // The superseded request finally answers with different numbers.
    resolveStale(summary(99));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.getByTestId('analytics-total-requests')).toHaveTextContent('2');
  });

  it('does not show an error banner when a superseded request is cancelled', async () => {
    vi.mocked(getAnalyticsSummary).mockImplementation((_query, signal) =>
      signal?.aborted
        ? Promise.reject({ kind: 'cancelled', message: 'The request was cancelled.' })
        : Promise.resolve(summary(5)),
    );
    renderDashboard();
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(1));

    fireEvent.change(fromInput(), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
    await screen.findByTestId('analytics-total-requests');

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
  });

  it('shows friendly zero-data states when the range has no activity', async () => {
    resolveAll(0);
    vi.mocked(getAnalyticsSummary).mockResolvedValue({
      startDate: null,
      endDate: null,
      totals: { requests: 0, approvals: 0, denials: 0, revocations: 0 },
      trend: [],
    });
    renderDashboard();

    expect(await screen.findByTestId('analytics-total-requests')).toHaveTextContent('0');
    expect(
      await screen.findByRole('heading', { name: /no access activity for this date range/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /no resource requests for this date range/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /no denials for this date range/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
