import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { getAnalyticsSummary, getDenialReasons, getTopResources } from '../../api/analytics';
import { isApiError } from '../../api/errors';
import { utcDayEnd, utcDayStart } from '../../utils/format';
import { ErrorState } from '../common/StateViews';
import type {
  AnalyticsQuery,
  AnalyticsSummaryResponse,
  DenialReasonsResponse,
  TopResourcesResponse,
} from '../../types/analytics';
import AnalyticsDateRange from './AnalyticsDateRange';
import AnalyticsSummaryCards from './AnalyticsSummaryCards';
import AccessTrendChart from './AccessTrendChart';
import TopResourcesChart from './TopResourcesChart';
import DenialReasonsChart from './DenialReasonsChart';
import AnalyticsSkeleton from './AnalyticsSkeleton';

/** The three datasets that must always describe the same window. */
interface AnalyticsData {
  summary: AnalyticsSummaryResponse;
  topResources: TopResourcesResponse;
  denialReasons: DenialReasonsResponse;
}

const EMPTY_RANGE = { from: '', to: '' };

/**
 * The Access Analytics section (BIS-404).
 *
 * Owns exactly one date-range state that is shared by all three BIS-402
 * endpoints. Changing it rebuilds one query object and refetches the summary,
 * the top resources and the denial reasons together, so the charts can never
 * disagree about which window they describe.
 *
 * The section is self-contained: if analytics fails it shows its own error and
 * retry, and leaves the rest of the dashboard completely untouched.
 */
export const AnalyticsDashboard: React.FC = () => {
  const [{ from, to }, setRange] = useState(EMPTY_RANGE);
  /** Bumped by Refresh to re-run the loader without touching the dates. */
  const [refreshToken, setRefreshToken] = useState(0);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Two independent guards against a stale response overwriting a newer one:
  // the AbortController cancels the in-flight HTTP requests, and the sequence
  // number discards anything that still settles late (e.g. already buffered).
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  /**
   * An inverted range is never sent. The API would reject it with a 400 anyway,
   * and silently swapping the dates would quietly answer the wrong question.
   */
  const validationError = from && to && from > to ? 'Start date cannot be after end date.' : null;

  /**
   * Convert the calendar selections into the inclusive UTC instants the
   * service expects. `utcDayStart` / `utcDayEnd` (added for the Audit Log) are
   * reused verbatim: `2026-10-01` -> `2026-10-01T00:00:00.000Z` and
   * `2026-10-31` -> `2026-10-31T23:59:59.999Z`, so the final day is fully
   * included instead of being cut off at midnight. An unset bound is omitted.
   */
  const query = useMemo<AnalyticsQuery>(() => {
    const next: AnalyticsQuery = {};
    const start = utcDayStart(from);
    if (start) next.startDate = start;
    const end = utcDayEnd(to);
    if (end) next.endDate = end;
    return next;
  }, [from, to]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    requestSeq.current += 1;
    const seq = requestSeq.current;

    setLoading(true);
    setError(null);

    try {
      // One Promise.all, committed as a single unit: a partial failure must
      // never present a new summary next to old resource and denial data as if
      // they all belonged to the same range.
      const [summary, topResources, denialReasons] = await Promise.all([
        getAnalyticsSummary(query, controller.signal),
        getTopResources(query, controller.signal),
        getDenialReasons(query, controller.signal),
      ]);

      if (seq !== requestSeq.current) return;
      setData({ summary, topResources, denialReasons });
    } catch (caught) {
      if (seq !== requestSeq.current) return;
      // A cancelled request is a normal consequence of the user changing the
      // range quickly; it is never surfaced as an error.
      if (isApiError(caught) && caught.kind === 'cancelled') return;
      setData(null);
      setError(
        isApiError(caught)
          ? caught.message
          : 'Access analytics are unavailable right now. Please try again.',
      );
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    if (validationError) {
      abortRef.current?.abort();
      requestSeq.current += 1;
      return;
    }
    // Intentional: refetch whenever the effective range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshToken, validationError]);

  // Never leave a request running against an unmounted dashboard.
  useEffect(() => () => abortRef.current?.abort(), []);

  const rangeLabel = useMemo(() => {
    if (from && to) return `From ${from} to ${to} (UTC)`;
    if (from) return `From ${from} onwards (UTC)`;
    if (to) return `Up to ${to} (UTC)`;
    return 'All available history';
  }, [from, to]);

  // While the range is invalid nothing is shown but the validation message: a
  // stale chart would otherwise describe a window the user just abandoned.
  const showSkeleton = !validationError && (loading || (!data && !error));

  return (
    <section className="dashboard-panel analytics-section" aria-labelledby="analytics-heading">
      <div className="analytics-section-head">
        <h2 className="panel-title" id="analytics-heading">
          <BarChart3 size={18} aria-hidden="true" /> Access Analytics
        </h2>
        <p className="wf-hint">
          Platform-wide access metrics reported by the Analytics Service, not your personal request
          history.
        </p>
      </div>

      <AnalyticsDateRange
        from={from}
        to={to}
        validationError={validationError}
        loading={loading}
        onChange={setRange}
        onReset={() => setRange({ ...EMPTY_RANGE })}
        onRefresh={() => setRefreshToken((token) => token + 1)}
      />

      {showSkeleton && <AnalyticsSkeleton />}

      {!validationError && !loading && error && (
        <ErrorState
          title="Analytics unavailable"
          message={error}
          // Retry reuses the currently selected range.
          onRetry={() => setRefreshToken((token) => token + 1)}
        />
      )}

      {!validationError && !loading && !error && data && (
        <div className="analytics-body">
          <AnalyticsSummaryCards totals={data.summary.totals} rangeLabel={rangeLabel} />

          <AccessTrendChart trend={data.summary.trend} />

          <div className="analytics-chart-grid">
            <TopResourcesChart resources={data.topResources} />
            <DenialReasonsChart denialReasons={data.denialReasons} />
          </div>
        </div>
      )}
    </section>
  );
};

export default AnalyticsDashboard;
