import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccessTrendChart from './AccessTrendChart';
import TopResourcesChart from './TopResourcesChart';
import DenialReasonsChart from './DenialReasonsChart';
import AnalyticsSummaryCards from './AnalyticsSummaryCards';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import AnalyticsDateRange from './AnalyticsDateRange';
import {
  buildTrendSeries,
  formatDenialTooltip,
  formatResourceTooltip,
  formatTrendBucketLabel,
  formatTrendTooltip,
  resolvePercentage,
} from './analyticsFormat';
import type {
  AnalyticsTotals,
  AnalyticsTrendPoint,
  DenialReasonsResponse,
  TopResourcesResponse,
} from '../../types/analytics';

/** Deliberately out of chronological order so the sort is actually exercised. */
const trend: AnalyticsTrendPoint[] = [
  { date: '2026-10-02', requests: 3, approvals: 2, denials: 1, revocations: 0 },
  { date: '2026-10-01', requests: 5, approvals: 3, denials: 0, revocations: 1 },
];

const topResources: TopResourcesResponse = {
  startDate: null,
  endDate: null,
  totalRequests: 6,
  items: [
    { rank: 1, resourceId: 'res-1', resourceName: 'prod-db-1', requestCount: 4, percentage: 66.67 },
    {
      rank: 2,
      resourceId: 'res-2',
      resourceName: 'staging-k8s',
      requestCount: 2,
      percentage: 33.33,
    },
  ],
};

const denialReasons: DenialReasonsResponse = {
  startDate: null,
  endDate: null,
  totalDenials: 9,
  items: [
    { reason: 'INSUFFICIENT_ROLE_PERMISSIONS', count: 5, percentage: 55.56 },
    { reason: 'RESOURCE_NOT_IN_SCOPE', count: 4, percentage: 44.44 },
  ],
};

const EMPTY_RESOURCES: TopResourcesResponse = {
  startDate: null,
  endDate: null,
  totalRequests: 0,
  items: [],
};

const NO_DENIALS: DenialReasonsResponse = {
  startDate: null,
  endDate: null,
  totalDenials: 0,
  items: [],
};

const zeroTotals: AnalyticsTotals = { requests: 0, approvals: 0, denials: 0, revocations: 0 };
const populatedTotals: AnalyticsTotals = {
  requests: 6,
  approvals: 4,
  denials: 1,
  revocations: 1,
};

const TREND_TABLE = /requests, approvals, denials and revocations per day/i;

// ---------------------------------------------------------------- summary

describe('AnalyticsSummaryCards', () => {
  it('renders every server-side total', () => {
    render(<AnalyticsSummaryCards totals={populatedTotals} rangeLabel="All available history" />);
    expect(screen.getByTestId('analytics-total-requests')).toHaveTextContent('6');
    expect(screen.getByTestId('analytics-total-approvals')).toHaveTextContent('4');
    expect(screen.getByTestId('analytics-total-denials')).toHaveTextContent('1');
    expect(screen.getByTestId('analytics-total-revocations')).toHaveTextContent('1');
  });

  it('renders zero totals safely rather than hiding the cards', () => {
    render(<AnalyticsSummaryCards totals={zeroTotals} rangeLabel="All available history" />);
    expect(screen.getByTestId('analytics-total-requests')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-total-approvals')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-total-denials')).toHaveTextContent('0');
    expect(screen.getByTestId('analytics-total-revocations')).toHaveTextContent('0');
  });

  it('labels the four metrics so their scope is unambiguous', () => {
    render(<AnalyticsSummaryCards totals={populatedTotals} rangeLabel="All available history" />);
    expect(screen.getByText('Access requests')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Denials')).toBeInTheDocument();
    expect(screen.getByText('Revocations')).toBeInTheDocument();
  });

  it('shows the active range so the numbers are not read as personal', () => {
    render(
      <AnalyticsSummaryCards
        totals={populatedTotals}
        rangeLabel="From 2026-10-01 to 2026-10-31 (UTC)"
      />,
    );
    expect(screen.getByText(/From 2026-10-01 to 2026-10-31/)).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ trend

describe('AccessTrendChart', () => {
  it('exposes all four series as an accessible table', () => {
    render(<AccessTrendChart trend={trend} />);
    const table = screen.getByRole('table', { name: TREND_TABLE });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['Day', 'Requests', 'Approvals', 'Denials', 'Revocations']);
  });

  it('renders the live trend values supplied by the API', () => {
    render(<AccessTrendChart trend={trend} />);
    const table = screen.getByRole('table', { name: TREND_TABLE });
    const rows = within(table).getAllByRole('row');
    // Oct 1 row: 5 requests, 3 approvals, 0 denials, 1 revocation.
    expect(
      within(rows[1])
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['5', '3', '0', '1']);
  });

  it('orders trend points chronologically regardless of input order', () => {
    render(<AccessTrendChart trend={trend} />);
    const table = screen.getByRole('table', { name: TREND_TABLE });
    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);
    expect(rowHeaders).toEqual(['Oct 1', 'Oct 2']);
  });

  it('shows a friendly empty state instead of an empty chart when there is no trend', () => {
    render(<AccessTrendChart trend={[]} />);
    expect(
      screen.getByRole('heading', { name: /no access activity for this date range/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not fabricate a placeholder series for zero data', () => {
    render(<AccessTrendChart trend={[]} />);
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });
});
// --------------------------------------------------------- top resources

describe('TopResourcesChart', () => {
  it('renders the resource names returned by the API', () => {
    render(<TopResourcesChart resources={topResources} />);
    const table = screen.getByRole('table', { name: /most requested resources/i });
    expect(within(table).getByRole('rowheader', { name: 'prod-db-1' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'staging-k8s' })).toBeInTheDocument();
  });

  it('represents the request counts from the response', () => {
    render(<TopResourcesChart resources={topResources} />);
    const table = screen.getByRole('table', { name: /most requested resources/i });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByRole('cell')).toHaveTextContent('4');
    expect(within(rows[2]).getByRole('cell')).toHaveTextContent('2');
  });

  it('shows a friendly empty state when no resources were requested', () => {
    render(<TopResourcesChart resources={EMPTY_RESOURCES} />);
    expect(
      screen.getByRole('heading', { name: /no resource requests for this date range/i }),
    ).toBeInTheDocument();
  });

  it('renders long resource names without failing and keeps them readable', () => {
    const longName = `prod-${'database-cluster-'.repeat(12)}eu-west-1`;
    const response: TopResourcesResponse = {
      startDate: null,
      endDate: null,
      totalRequests: 2,
      items: [
        { rank: 1, resourceId: 'r1', resourceName: longName, requestCount: 2, percentage: 100 },
      ],
    };
    expect(() => render(<TopResourcesChart resources={response} />)).not.toThrow();
    const table = screen.getByRole('table', { name: /most requested resources/i });
    // The untruncated name is still available to assistive technology.
    expect(within(table).getByRole('rowheader', { name: longName })).toBeInTheDocument();
  });

  it('falls back to the resource id when the name is null', () => {
    const response: TopResourcesResponse = {
      startDate: null,
      endDate: null,
      totalRequests: 1,
      items: [
        { rank: 1, resourceId: 'res-99', resourceName: null, requestCount: 1, percentage: 100 },
      ],
    };
    render(<TopResourcesChart resources={response} />);
    const table = screen.getByRole('table', { name: /most requested resources/i });
    expect(within(table).getByRole('rowheader', { name: 'res-99' })).toBeInTheDocument();
  });
});

// -------------------------------------------------------- denial reasons

describe('DenialReasonsChart', () => {
  it('renders the reason labels from the API', () => {
    render(<DenialReasonsChart denialReasons={denialReasons} />);
    expect(
      screen.getByRole('rowheader', { name: 'INSUFFICIENT_ROLE_PERMISSIONS' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'RESOURCE_NOT_IN_SCOPE' })).toBeInTheDocument();
  });

  it('represents the counts returned by the API', () => {
    render(<DenialReasonsChart denialReasons={denialReasons} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByRole('cell', { name: '5' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: '4' })).toBeInTheDocument();
  });

  it('displays the percentage supplied by the backend', () => {
    render(<DenialReasonsChart denialReasons={denialReasons} />);
    expect(screen.getByText('55.56%')).toBeInTheDocument();
    expect(screen.getByText('44.44%')).toBeInTheDocument();
  });

  it('derives a percentage from totalDenials when the API omits one', () => {
    const response: DenialReasonsResponse = {
      startDate: null,
      endDate: null,
      totalDenials: 4,
      items: [{ reason: 'POLICY_DENIED', count: 1, percentage: null }],
    };
    render(<DenialReasonsChart denialReasons={response} />);
    expect(screen.getByText('25.00%')).toBeInTheDocument();
  });

  it('shows a friendly empty state when there were no denials', () => {
    render(<DenialReasonsChart denialReasons={NO_DENIALS} />);
    expect(
      screen.getByRole('heading', { name: /no denials for this date range/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('never divides by zero when the total is zero', () => {
    render(<DenialReasonsChart denialReasons={NO_DENIALS} />);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
  });
});

// ------------------------------------------------------ skeleton / inputs

describe('AnalyticsSkeleton', () => {
  it('announces loading instead of rendering a blank panel', () => {
    render(<AnalyticsSkeleton />);
    expect(screen.getByTestId('analytics-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading access analytics/i);
  });
});

describe('AnalyticsDateRange', () => {
  const setup = (overrides: Partial<React.ComponentProps<typeof AnalyticsDateRange>> = {}) => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const onRefresh = vi.fn();
    render(
      <AnalyticsDateRange
        from=""
        to=""
        validationError={null}
        loading={false}
        onChange={onChange}
        onReset={onReset}
        onRefresh={onRefresh}
        {...overrides}
      />,
    );
    return { onChange, onReset, onRefresh };
  };

  it('renders real labels for both date inputs', () => {
    setup();
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all time/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('shows the inline validation message when the range is inverted', () => {
    setup({ validationError: 'Start date cannot be after end date.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/start date cannot be after end date/i);
  });

  it('marks the inputs invalid while the range is inverted', () => {
    setup({ validationError: 'Start date cannot be after end date.' });
    expect(screen.getByLabelText('From date')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('To date')).toHaveAttribute('aria-invalid', 'true');
  });
});

// ------------------------------------------------------------ pure helpers

describe('analytics formatting helpers', () => {
  it('formats a UTC bucket without shifting the day', () => {
    expect(formatTrendBucketLabel('2026-10-01')).toBe('Oct 1');
    expect(formatTrendBucketLabel('2026-01-31')).toBe('Jan 31');
  });

  it('leaves an unrecognised bucket untouched', () => {
    expect(formatTrendBucketLabel('not-a-date')).toBe('not-a-date');
  });

  it('sorts chronologically and does not mutate the input array', () => {
    const input = [...trend];
    const series = buildTrendSeries(input);
    expect(series.map((point) => point.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(input[0].date).toBe('2026-10-02');
  });

  it('prefers the backend percentage and guards the derived fallback', () => {
    expect(resolvePercentage(5, 9, 55.56)).toBe(55.56);
    expect(resolvePercentage(5, 0, null)).toBe(0);
    expect(resolvePercentage(5, 10, null)).toBe(50);
  });

  // The Recharts formatters are pure functions precisely so they can be
  // verified here: a tooltip can never be hovered in jsdom.
  it('formats the trend tooltip as a count plus the series name', () => {
    expect(formatTrendTooltip(5, 'Requests')).toEqual(['5', 'Requests']);
    expect(formatTrendTooltip(0, 'Denials')).toEqual(['0', 'Denials']);
  });

  it('never renders a non-numeric value into a trend tooltip', () => {
    expect(formatTrendTooltip(undefined, 'Approvals')).toEqual(['0', 'Approvals']);
    expect(formatTrendTooltip(Number.NaN, 'Revocations')).toEqual(['0', 'Revocations']);
    expect(formatTrendTooltip(null, 'Approvals')).toEqual(['0', 'Approvals']);
  });

  it('formats the resource tooltip with a pluralised count and the share', () => {
    const item = { requestCount: 4, percentage: 66.67, fullName: 'prod-db-1' };
    expect(formatResourceTooltip(4, item, 6)).toEqual(['4 requests · 66.67%', 'prod-db-1']);
  });

  it('uses the singular form for a single resource request', () => {
    const item = { requestCount: 1, percentage: null, fullName: 'staging-k8s' };
    expect(formatResourceTooltip(1, item, 3)).toEqual(['1 request · 33.33%', 'staging-k8s']);
  });

  it('formats the denial tooltip as count plus percentage', () => {
    const slice = { reason: 'POLICY_DENIED', count: 5, percentage: 55.56, fill: '#000' };
    expect(formatDenialTooltip(5, slice, 'ignored')).toEqual([
      '5 denials · 55.56%',
      'POLICY_DENIED',
    ]);
  });

  it('falls back to the raw value and series name when no slice payload exists', () => {
    expect(formatDenialTooltip(3, undefined, 'Other')).toEqual(['3 denials · 0.00%', 'Other']);
    expect(formatDenialTooltip(1, undefined, undefined)).toEqual(['1 denial · 0.00%', '']);
  });
});
