/**
 * Pure presentation helpers shared by the BIS-404 analytics charts.
 *
 * Kept out of the component files on purpose: `AnalyticsDashboard`, the chart
 * components and `AnalyticsDateRange` all need these, and exporting
 * non-components from a `.tsx` module would trip the `react-refresh` lint rule.
 */

import type { AnalyticsTrendPoint, DenialReasonItem } from '../../types/analytics';

/**
 * The four trend series, in a fixed order so the legend never reorders itself.
 *
 * `dataKey` matches the fields on a trend point, which is also what the line
 * chart reads, so the legend text, the tooltip and the screen-reader summary
 * can never drift apart.
 */
export const TREND_SERIES = [
  { dataKey: 'requests', label: 'Requests' },
  { dataKey: 'approvals', label: 'Approvals' },
  { dataKey: 'denials', label: 'Denials' },
  { dataKey: 'revocations', label: 'Revocations' },
] as const;

export type TrendSeriesKey = (typeof TREND_SERIES)[number]['dataKey'];

/**
 * Series colours, chosen to match the Bismarck CSS variables in `index.css`
 * (`--accent-brand`, `--accent-emerald`, `--accent-rose`, `--accent-info`).
 *
 * Recharts needs literal colour values in SVG attributes and cannot resolve a
 * `var(--…)` reference inside those, so the hex values are mirrored here. They
 * are intentionally ordered brand -> emerald -> rose -> indigo: they are
 * distinguishable in the common forms of colour vision deficiency, and every
 * series is additionally identified by its legend label and tooltip text, so
 * colour is never the only channel.
 */
export const SERIES_COLORS: Record<TrendSeriesKey, string> = {
  requests: '#71005f', // --accent-brand
  approvals: '#059669', // --accent-emerald
  denials: '#e11d48', // --accent-rose
  revocations: '#4f46e5', // --accent-info
};

/** Categorical palette for the denial-reason doughnut. */
export const SLICE_COLORS = [
  '#71005f', // --accent-brand
  '#e11d48', // --accent-rose
  '#4f46e5', // --accent-info
  '#d97706', // --accent-amber
  '#059669', // --accent-emerald
  '#7c3aed', // --accent-violet
];

/** A trend point enriched with its human-friendly, timezone-safe axis label. */
export interface TrendChartPoint extends AnalyticsTrendPoint {
  label: string;
}

const UTC_BUCKET = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Turn a `yyyy-MM-dd` UTC bucket into a short, locale-stable axis label
 * ("Oct 1").
 *
 * The parts are read directly and rebuilt with `Date.UTC`, then formatted with
 * `timeZone: 'UTC'`. Parsing the string as a local timestamp would shift the
 * day backwards for anyone west of Greenwich, which would misrepresent the
 * data. `en-US` is pinned so the label is deterministic in every environment,
 * including CI.
 */
export function formatTrendBucketLabel(value: string): string {
  const match = UTC_BUCKET.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  const bucket = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(bucket.getTime())) return value;
  return bucket.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Order the trend chronologically and attach display labels.
 *
 * The service already returns ascending UTC buckets, but sorting here makes the
 * chart correct regardless. `localeCompare` on an ISO `yyyy-MM-dd` string is a
 * true chronological comparison (unlike sorting the formatted labels, where
 * "Apr 2" would sort before "Aug 1"). The original sort is never mutated.
 */
export function buildTrendSeries(trend: readonly AnalyticsTrendPoint[]): TrendChartPoint[] {
  return [...trend]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((point) => ({ ...point, label: formatTrendBucketLabel(point.date) }));
}

/**
 * Percentage for a slice, preferring the value the service calculated.
 *
 * When the API omits it we derive it from the *same response's* total, and
 * never divide by zero: a zero or non-finite total yields 0 rather than NaN.
 */
export function resolvePercentage(count: number, total: number, supplied: number | null): number {
  if (supplied !== null) return supplied;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return (count / total) * 100;
}

/** Match the service's 2-decimal rounding so the UI and API agree exactly. */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Shorten a label so one long resource name cannot destroy the layout. */
export function truncateLabel(value: string, maxLength = 26): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

/**
 * The best available label for a resource.
 *
 * The service prefers `Metadata.ResourceName` and falls back to the resource
 * identifier; a resource with neither is labelled explicitly rather than
 * rendered as an empty axis tick.
 */
export function resolveResourceLabel(item: {
  resourceName: string | null;
  resourceId: string | null;
}): string {
  return item.resourceName ?? item.resourceId ?? 'Unknown resource';
}

/** A denial slice enriched with its label, share and slice colour. */
export interface DenialChartSlice {
  reason: string;
  count: number;
  percentage: number;
  fill: string;
}

/** Build doughnut slices, guarding against a zero total entirely. */
export function buildDenialSlices(
  items: readonly DenialReasonItem[],
  total: number,
): DenialChartSlice[] {
  return items.map((item, index) => ({
    reason: item.reason,
    count: item.count,
    percentage: resolvePercentage(item.count, total, item.percentage),
    fill: SLICE_COLORS[index % SLICE_COLORS.length],
  }));
}
// --------------------------------------------------------------- tooltips
//
// Recharts only invokes a `formatter` when a tooltip is actually hovered, which
// cannot happen in jsdom. Keeping the formatting here as plain functions makes
// it unit-testable and keeps the chart components free of formatting logic.

/** Coerce whatever Recharts hands us into a safe, displayable number. */
function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Trend tooltip: the count alongside the series name. */
export function formatTrendTooltip(value: unknown, name: unknown): [string, string] {
  return [`${toCount(value)}`, String(name ?? '')];
}

/** Resource tooltip: "4 requests · 66.67%", keyed by the full resource name. */
export function formatResourceTooltip(
  value: unknown,
  item: { requestCount: number; percentage: number | null; fullName: string },
  totalRequests: number,
): [string, string] {
  const count = toCount(value);
  const share = resolvePercentage(item.requestCount, totalRequests, item.percentage);
  return [`${count} request${count === 1 ? '' : 's'} · ${formatPercentage(share)}`, item.fullName];
}

/** Denial tooltip: "5 denials · 55.56%", keyed by the reason. */
export function formatDenialTooltip(
  value: unknown,
  slice: DenialChartSlice | undefined,
  fallbackName: unknown,
): [string, string] {
  const count = slice?.count ?? toCount(value);
  const percentage = slice?.percentage ?? 0;
  return [
    `${count} denial${count === 1 ? '' : 's'} · ${formatPercentage(percentage)}`,
    slice?.reason ?? String(fallbackName ?? ''),
  ];
}
