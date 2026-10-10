import { identityClient } from './client';
import { normalizeApiError } from './errors';
import {
  normalizeAnalyticsSummary,
  normalizeDenialReasons,
  normalizeTopResources,
  type AnalyticsQuery,
  type AnalyticsSummaryResponse,
  type DenialReasonsResponse,
  type TopResourcesResponse,
} from '../types/analytics';

/**
 * BIS-402 Analytics Service client (EPIC-06).
 *
 * All three endpoints sit behind the single API Gateway base URL and reuse the
 * shared `identityClient`, so the Bearer token, the 401 handling and the
 * normalized error model are exactly the same ones used by every other screen.
 * No second Axios instance and no duplicate JWT handling.
 *
 * Every function accepts an `AbortSignal` so a superseded date range can be
 * cancelled instead of racing the newer request to the screen.
 */

/** Drop unset bounds so "All time" sends no date parameters at all. */
function buildParams(query: AnalyticsQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query.startDate) params.startDate = query.startDate;
  if (query.endDate) params.endDate = query.endDate;
  if (query.limit !== undefined) params.limit = query.limit;
  return params;
}

async function withNormalizedError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Platform-wide request / approval / denial / revocation totals plus the daily
 * UTC trend series.
 *
 * GET /api/analytics/summary?startDate=&endDate=
 *   -> AnalyticsSummaryResponse
 */
export async function getAnalyticsSummary(
  query: AnalyticsQuery = {},
  signal?: AbortSignal,
): Promise<AnalyticsSummaryResponse> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.get('/api/analytics/summary', {
      params: buildParams(query),
      signal,
    });
    return normalizeAnalyticsSummary(data);
  });
}

/**
 * Ranked most-requested resources (derived server-side from ApprovalRequested
 * events only; the service already applies its own top-N limit).
 *
 * GET /api/analytics/top-resources?startDate=&endDate=&limit=
 *   -> TopResourcesResponse
 */
export async function getTopResources(
  query: AnalyticsQuery = {},
  signal?: AbortSignal,
): Promise<TopResourcesResponse> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.get('/api/analytics/top-resources', {
      params: buildParams(query),
      signal,
    });
    return normalizeTopResources(data);
  });
}

/**
 * Denial-reason distribution across AccessDenied and ApprovalRejected events.
 *
 * GET /api/analytics/denial-reasons?startDate=&endDate=&limit=
 *   -> DenialReasonsResponse
 */
export async function getDenialReasons(
  query: AnalyticsQuery = {},
  signal?: AbortSignal,
): Promise<DenialReasonsResponse> {
  return withNormalizedError(async () => {
    const { data } = await identityClient.get('/api/analytics/denial-reasons', {
      params: buildParams(query),
      signal,
    });
    return normalizeDenialReasons(data);
  });
}
