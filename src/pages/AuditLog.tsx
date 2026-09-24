import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { getAuditLogs } from '../api/audit';
import { isApiError } from '../api/errors';
import { LoadingState, ErrorState, EmptyState } from '../components/common/StateViews';
import { Modal } from '../components/common/Modal';
import { formatDateTime } from '../utils/format';
import type { AuditLogEntry, AuditQuery } from '../types/pam';

const PAGE_SIZE = 20;

export const AuditLog: React.FC = () => {
  const [query, setQuery] = useState<AuditQuery>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs({ ...query, page, pageSize: PAGE_SIZE });
      setEntries(result.items);
      const computed = Math.ceil(result.totalCount / PAGE_SIZE) || 1;
      setTotalPages(result.totalPages ?? computed);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    // Intentional: refetch whenever the query/page dependency changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const applyFilter = (key: keyof AuditQuery, value: string) => {
    setPage(1);
    setQuery((current) => ({ ...current, [key]: value || undefined }));
  };

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-description">
            Security and access events. Endpoint: <code>GET /api/audit/logs</code>.
          </p>
        </div>
        <button type="button" className="secondary-action-btn" onClick={() => void load()}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="table-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by actor (user)…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              applyFilter('user', event.target.value);
            }}
            aria-label="Filter audit logs by actor"
          />
        </div>
        <div className="filter-controls-group">
          <input
            className="role-filter-select"
            placeholder="Action / eventType"
            aria-label="Filter by event type"
            onChange={(event) => applyFilter('eventType', event.target.value)}
          />
          <input
            className="role-filter-select"
            placeholder="Resource"
            aria-label="Filter by resource"
            onChange={(event) => applyFilter('resource', event.target.value)}
          />
          <input
            className="role-filter-select"
            type="date"
            aria-label="Filter from date"
            onChange={(event) =>
              applyFilter('from', event.target.value ? `${event.target.value}T00:00:00Z` : '')
            }
          />
        </div>
      </div>

      {loading && <LoadingState message="Loading audit logs…" />}
      {error && !loading && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && entries.length === 0 && (
        <EmptyState title="No audit events" message="No events match the current filters." />
      )}

      {!loading && !error && entries.length > 0 && (
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
