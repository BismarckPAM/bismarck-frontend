/**
 * Typed contracts for the BIS-402 Analytics Service (`/api/analytics/*`).
 *
 * Every interface below mirrors the real ASP.NET DTOs in
 * `bismarck-backend/Analytics/DTOs/`, serialized with the framework default
 * camelCase policy:
 *
 *   AnalyticsSummaryResponse(StartDate, EndDate, Totals, Trend)
 *   AnalyticsTotals(Requests, Approvals, Denials, Revocations)
 *   AnalyticsTrendPoint(Date, Requests, Approvals, Denials, Revocations)
 *   TopResourcesResponse(StartDate, EndDate, TotalRequests, Items)
 *   TopResourceResponse(Rank, ResourceId, ResourceName, RequestCount, Percentage)
 *   DenialReasonsResponse(StartDate, EndDate, TotalDenials, Items)
 *   DenialReasonResponse(Reason, Count, Percentage)
 *
 * `AnalyticsTrendPoint.Date` is a `DateOnly`, which System.Text.Json writes as
 * a bare `"yyyy-MM-dd"` string. It is treated as an opaque UTC *bucket label*
 * and is never converted into a local timestamp (that would shift the day).
 */

/** The four canonical BIS-402 headline counts for the selected range. */
export interface AnalyticsTotals {
  requests: number;
  approvals: number;
  denials: number;
  revocations: number;
}

/** One daily UTC bucket in the summary time series. */
export interface AnalyticsTrendPoint {
  /** Bare `yyyy-MM-dd` UTC bucket, exactly as returned by the API. */
  date: string;
  requests: number;
  approvals: number;
  denials: number;
  revocations: number;
}

/** `GET /api/analytics/summary` response. */
export interface AnalyticsSummaryResponse {
  /** Echo of the applied range, or null when the range was unbounded. */
  startDate: string | null;
  endDate: string | null;
  totals: AnalyticsTotals;
  trend: AnalyticsTrendPoint[];
}

/** A single ranked entry in the most-requested-resources list. */
export interface TopResourceItem {
  rank: number;
  resourceId: string | null;
  resourceName: string | null;
  requestCount: number;
  /** Share of `totalRequests`, 2 decimals. Null only if the API omits it. */
  percentage: number | null;
}

/** `GET /api/analytics/top-resources` response. */
export interface TopResourcesResponse {
  startDate: string | null;
  endDate: string | null;
  totalRequests: number;
  items: TopResourceItem[];
}

/** A single entry in the denial-reason distribution. */
export interface DenialReasonItem {
  reason: string;
  count: number;
  /** Share of `totalDenials`, 2 decimals. Null only if the API omits it. */
  percentage: number | null;
}

/** `GET /api/analytics/denial-reasons` response. */
export interface DenialReasonsResponse {
  startDate: string | null;
  endDate: string | null;
  totalDenials: number;
  items: DenialReasonItem[];
}

/**
 * Query parameters shared by all three analytics endpoints.
 *
 * Both bounds are inclusive ISO-8601 UTC instants. An omitted bound means
 * "unbounded on that side", which is how "All time" is expressed.
 */
export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  /** Optional rank cap; the service already defaults to its own top 20. */
  limit?: number;
}

/**
 * Normalization helpers.
 *
 * The rule they enforce: a value that is genuinely absent (valid zero-data
 * behaviour) becomes 0, but a value that is present and malformed is a
 * contract violation and throws. That keeps `NaN` / `undefined` from ever
 * reaching Recharts, without quietly inventing fake zeros.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fail(path: string, expected: string): never {
  throw new Error(`Unexpected response from Analytics Service: "${path}" ${expected}.`);
}

function readObject(raw: unknown, path: string): Record<string, unknown> {
  if (!isRecord(raw)) fail(path, 'must be an object');
  return raw;
}

/** An absent collection is valid zero-data behaviour and becomes `[]`. */
function readItems(raw: unknown, path: string): unknown[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) fail(path, 'must be an array');
  return raw;
}

/** Absent count -> 0 (a real zero). Present-but-malformed -> contract error. */
function readCount(raw: unknown, path: string): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) fail(path, 'must be a finite number');
  return raw;
}

/** Percentages stay nullable so a missing value can be derived, not faked. */
function readPercentage(raw: unknown, path: string): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) fail(path, 'must be a finite number');
  return raw;
}

function readNullableText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function readText(raw: unknown, path: string): string {
  if (typeof raw !== 'string' || !raw.trim()) fail(path, 'must be a non-empty string');
  return raw;
}

export function normalizeAnalyticsSummary(data: unknown): AnalyticsSummaryResponse {
  const root = readObject(data, 'summary');
  const totals = readObject(root.totals, 'summary.totals');
  return {
    startDate: readNullableText(root.startDate),
    endDate: readNullableText(root.endDate),
    totals: {
      requests: readCount(totals.requests, 'summary.totals.requests'),
      approvals: readCount(totals.approvals, 'summary.totals.approvals'),
      denials: readCount(totals.denials, 'summary.totals.denials'),
      revocations: readCount(totals.revocations, 'summary.totals.revocations'),
    },
    trend: readItems(root.trend, 'summary.trend').map((raw, index) => {
      const point = readObject(raw, `summary.trend[${index}]`);
      return {
        date: readText(point.date, `summary.trend[${index}].date`),
        requests: readCount(point.requests, `summary.trend[${index}].requests`),
        approvals: readCount(point.approvals, `summary.trend[${index}].approvals`),
        denials: readCount(point.denials, `summary.trend[${index}].denials`),
        revocations: readCount(point.revocations, `summary.trend[${index}].revocations`),
      };
    }),
  };
}

export function normalizeTopResources(data: unknown): TopResourcesResponse {
  const root = readObject(data, 'topResources');
  return {
    startDate: readNullableText(root.startDate),
    endDate: readNullableText(root.endDate),
    totalRequests: readCount(root.totalRequests, 'topResources.totalRequests'),
    items: readItems(root.items, 'topResources.items').map((raw, index) => {
      const item = readObject(raw, `topResources.items[${index}]`);
      return {
        rank: readCount(item.rank, `topResources.items[${index}].rank`),
        resourceId: readNullableText(item.resourceId),
        resourceName: readNullableText(item.resourceName),
        requestCount: readCount(item.requestCount, `topResources.items[${index}].requestCount`),
        percentage: readPercentage(item.percentage, `topResources.items[${index}].percentage`),
      };
    }),
  };
}

export function normalizeDenialReasons(data: unknown): DenialReasonsResponse {
  const root = readObject(data, 'denialReasons');
  return {
    startDate: readNullableText(root.startDate),
    endDate: readNullableText(root.endDate),
    totalDenials: readCount(root.totalDenials, 'denialReasons.totalDenials'),
    items: readItems(root.items, 'denialReasons.items').map((raw, index) => {
      const item = readObject(raw, `denialReasons.items[${index}]`);
      return {
        reason: readText(item.reason, `denialReasons.items[${index}].reason`),
        count: readCount(item.count, `denialReasons.items[${index}].count`),
        percentage: readPercentage(item.percentage, `denialReasons.items[${index}].percentage`),
      };
    }),
  };
}
