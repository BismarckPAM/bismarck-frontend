import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterX, RefreshCw, Search } from 'lucide-react';
import { getAuditLogs } from '../api/audit';
import { isApiError } from '../api/errors';
import { LoadingState, ErrorState, EmptyState } from '../components/common/StateViews';
import { Modal } from '../components/common/Modal';
import { formatDateTime, utcDayEnd, utcDayStart } from '../utils/format';
import type { AuditLogEntry, AuditQuery } from '../types/pam';

const PAGE_SIZE = 20;

/**
 * Debounce for the free-text box. AC-4 wants live search, but firing one
 * request per keystroke would hammer the Audit Service; 300ms is long enough
 * to coalesce a burst of typing and short enough to still feel live.
 */
const SEARCH_DEBOUNCE_MS = 300;

/** The explicit (exact-match) filters, held as raw UI values. */
interface AuditFilterInputs {
  user: string;
  resource: string;
  eventType: string;
  outcome: string;
  /** `<input type="date">` values, i.e. bare `YYYY-MM-DD`. */
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilterInputs = {
  user: '',
  resource: '',
  eventType: '',
  outcome: '',
  from: '',
  to: '',
};

const orUndefined = (value: string): string | undefined => value.trim() || undefined;

export const AuditLog: React.FC = () => {
  const [filters, setFilters] = useState<AuditFilterInputs>(EMPTY_FILTERS);
  // `searchInput` is what the user sees; `search` is the debounced value that
  // actually reaches the API.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Invalidate the previous request whenever the query or page changes, so a
  // slow early response can never overwrite a newer one.
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  // Derive the API query from the UI state. Date bounds are converted to
  // inclusive UTC instants; an unset date is omitted entirely.
  const query = useMemo<AuditQuery>(() => {
    const next: AuditQuery = { search: orUndefined(search) };
    const user = orUndefined(filters.user);
    const resource = orUndefined(filters.resource);
    const eventType = orUndefined(filters.eventType);
    const outcome = orUndefined(filters.outcome);
    if (user) next.user = user;
    if (resource) next.resource = resource;
    if (eventType) next.eventType = eventType;
    if (outcome) next.outcome = outcome;
    const from = utcDayStart(filters.from);
    if (from) next.from = from;
    const to = utcDayEnd(filters.to);
    if (to) next.to = to;
    return next;
  }, [filters, search]);

  // An obviously inverted range is never sent: the API would reject it with a
  // 400 anyway, and this keeps the screen readable. The backend remains the
  // authority for anything that slips through.
  const rangeError =
    filters.from && filters.to && filters.from > filters.to
      ? 'The "From" date is after the "To" date. Please choose an earlier start date.'
      : null;

  const hasActiveFilters = Boolean(
    orUndefined(search) ||
    orUndefined(filters.user) ||
    orUndefined(filters.resource) ||
    orUndefined(filters.eventType) ||
    orUndefined(filters.outcome) ||
    filters.from ||
    filters.to,
  );

  // While the range is inverted there is no valid result to show at all, so the
  // previous rows must not linger on screen pretending to be current.
  const showLoading = loading && !rangeError;
  const showResults = !loading && !error && !rangeError && entries.length > 0;
  const showEmpty = !loading && !error && !rangeError && entries.length === 0;

  const load = useCallback(async () => {
    // Abort whatever was still in flight before starting a new request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++requestSeq.current;

    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs({ ...query, page, pageSize: PAGE_SIZE }, controller.signal);
      // Drop the response if a newer request has been started since.
      if (seq !== requestSeq.current) return;
      setEntries(result.items);
      const computed = Math.ceil(result.totalCount / PAGE_SIZE) || 1;
      setTotalPages(result.totalPages ?? computed);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      // An abort is a consequence of the user's own next keystroke, never a
      // failure worth an error banner.
      if (isApiError(err) && err.kind === 'cancelled') return;
      setError(isApiError(err) ? err.message : 'Unable to load audit logs.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    if (rangeError) {
      // Nothing may reach the API with an inverted range. `showLoading` below
      // already hides the stale rows, so no state update is needed here.
      abortRef.current?.abort();
      requestSeq.current += 1;
      return;
    }
    // Intentional: refetch whenever the query/page dependency changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, rangeError]);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Debounce the free-text box into the real search parameter.
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;

    const timer = window.setTimeout(() => {
      setSearch(trimmed);
      // A new search must start from the first page, or the user could land on
      // page 5 of a result set that only has one page.
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const applyFilter = (key: keyof AuditFilterInputs, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    // Clear the visible input immediately, then the debounced search, so the
    // fields visibly empty the moment Reset is pressed.
    setSearchInput('');
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-description">Security and access events.</p>
        </div>
        <button type="button" className="secondary-action-btn" onClick={() => void load()}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="audit-filters">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              placeholder="Search actor or resource…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search audit logs by actor or resource"
            />
          </div>
          <button type="button" className="secondary-action-btn" onClick={resetFilters}>
            <FilterX size={16} aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="filter-controls-group">
          <input
            className="role-filter-select"
            type="text"
            placeholder="User / Actor"
            aria-label="Filter by user"
            value={filters.user}
            onChange={(event) => applyFilter('user', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="text"
            placeholder="Resource"
            aria-label="Filter by resource"
            value={filters.resource}
            onChange={(event) => applyFilter('resource', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="text"
            placeholder="Event Type"
            aria-label="Filter by event type"
            value={filters.eventType}
            onChange={(event) => applyFilter('eventType', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="text"
            placeholder="Outcome"
            aria-label="Filter by outcome"
            value={filters.outcome}
            onChange={(event) => applyFilter('outcome', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="date"
            aria-label="Filter from date"
            value={filters.from}
            onChange={(event) => applyFilter('from', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="date"
            aria-label="Filter to date"
            value={filters.to}
            onChange={(event) => applyFilter('to', event.target.value)}
          />
        </div>

        {rangeError && (
          <p className="audit-filter-hint" role="alert">
            {rangeError}
          </p>
        )}
      </div>

      {showLoading && <LoadingState message="Loading audit logs…" />}
      {error && !loading && <ErrorState message={error} onRetry={() => void load()} />}
      {showEmpty && (
        <EmptyState
          title="No audit events"
          message={
            hasActiveFilters
              ? 'No audit events match the current filters.'
              : 'No audit events have been recorded yet.'
          }
        />
      )}

      {showResults && (
        <>
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="Audit log entries">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="pam-table-row"
                    onClick={() => setSelected(entry)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setSelected(entry);
                    }}
                  >
                    <td>{formatDateTime(entry.occurredAt)}</td>
                    <td>{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td>{entry.resource || '—'}</td>
                    <td>{entry.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}

      {selected && (
        <Modal title="Audit event" onClose={() => setSelected(null)}>
          <dl className="wf-detail-grid">
            <div>
              <dt>Event ID</dt>
              <dd className="wf-mono">{selected.eventId}</dd>
            </div>
            <div>
              <dt>Event type</dt>
              <dd>{selected.eventType}</dd>
            </div>
            <div>
              <dt>Occurred</dt>
              <dd>{formatDateTime(selected.occurredAt)}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>{selected.actor}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{selected.action}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{selected.outcome}</dd>
            </div>
            <div>
              <dt>Resource</dt>
              <dd>{selected.resource || '—'}</dd>
            </div>
          </dl>
          <div className="wf-detail-block">
            <h3>Metadata</h3>
            <pre className="wf-pre">{selected.metadata || '—'}</pre>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default AuditLog;
