import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import {
  adminListOnboardingTickets,
  approveOnboardingTicket,
  rejectOnboardingTicket,
} from '../api/onboarding';
import { isApiError, normalizeApiError } from '../api/errors';
import { Modal } from '../components/common/Modal';
import { ErrorState, EmptyState, LoadingState } from '../components/common/StateViews';
import { OnboardingStatusBadge } from '../components/common/StatusBadge';
import type { ApiError, OnboardingTicket, OnboardingTicketStatus } from '../types/pam';

/**
 * Administration → Onboarding.
 *
 * Reviews public registration requests. Approving a ticket provisions the
 * user (Identity Service) and sends an activation email; rejecting notifies
 * the applicant with an optional reason.
 */

type FilterKey = 'ALL' | OnboardingTicketStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

export default function Onboarding() {
  const [tickets, setTickets] = useState<OnboardingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [filter, setFilter] = useState<FilterKey>('PENDING');

  const [approveTarget, setApproveTarget] = useState<OnboardingTicket | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OnboardingTicket | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTickets(await adminListOnboardingTickets());
    } catch (err) {
      setError(isApiError(err) ? err : normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  const handleApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await approveOnboardingTicket(approveTarget.id);
      setTickets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      setApproveTarget(null);
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setActionError('Please provide a reason for rejection.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const updated = await rejectOnboardingTicket(rejectTarget.id, rejectReason.trim());
      setTickets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Onboarding Requests</h1>
          <p className="page-subtitle">
            Review registration requests. Approving provisions the account and sends an activation
            email.
          </p>
        </div>
        <button
          type="button"
          className="wf-btn wf-btn-secondary"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh onboarding requests"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="wf-toolbar" role="tablist" aria-label="Filter onboarding requests">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`wf-filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && filtered.length === 0 ? (
        <ErrorState message={error.message} onRetry={() => void load()} />
      ) : null}

      {loading ? (
        <LoadingState message="Loading onboarding requests…" />
      ) : filtered.length === 0 && !error ? (
        <EmptyState
          title="No onboarding requests"
          message={
            filter === 'PENDING'
              ? 'There are no requests awaiting review.'
              : 'No requests match this filter.'
          }
        />
      ) : (
        <div className="wf-table-wrapper">
          <table className="wf-table">
            <thead>
              <tr>
                <th scope="col">Applicant</th>
                <th scope="col">Department</th>
                <th scope="col">Requested role</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <div className="wf-cell-primary">{ticket.fullName}</div>
                    <div className="wf-cell-secondary">{ticket.email}</div>
                  </td>
                  <td>{ticket.department || '—'}</td>
                  <td>{ticket.requestedRole || '—'}</td>
                  <td>{formatDateTime(ticket.createdAt)}</td>
                  <td>
                    <OnboardingStatusBadge status={ticket.status} />
                  </td>
                  <td>
                    {ticket.status === 'PENDING' ? (
                      <div className="wf-row-actions">
                        <button
                          type="button"
                          className="wf-btn wf-btn-primary wf-btn-sm"
                          onClick={() => setApproveTarget(ticket)}
                        >
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="wf-btn wf-btn-danger wf-btn-sm"
                          onClick={() => setRejectTarget(ticket)}
                        >
                          <XCircle size={14} aria-hidden="true" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="wf-cell-secondary">
                        {ticket.rejectionReason || 'Reviewed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {approveTarget && (
        <Modal
          title="Approve onboarding request"
          onClose={() => {
            setApproveTarget(null);
            setActionError(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="wf-btn wf-btn-secondary"
                onClick={() => setApproveTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wf-btn wf-btn-primary"
                onClick={() => void handleApprove()}
                disabled={busy}
              >
                {busy ? 'Approving…' : 'Approve & provision'}
              </button>
            </>
          }
        >
          <p>
            Approve <strong>{approveTarget.fullName}</strong> ({approveTarget.email}) as{' '}
            <strong>{approveTarget.requestedRole}</strong>?
          </p>
          <p className="wf-state-text">
            An account is created, the temporary password is generated, an activation email is sent,
            and the ticket is marked APPROVED.
          </p>
          {actionError && (
            <div className="wf-notice error" role="alert">
              {actionError}
            </div>
          )}
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          title="Reject onboarding request"
          onClose={() => {
            setRejectTarget(null);
            setRejectReason('');
            setActionError(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="wf-btn wf-btn-secondary"
                onClick={() => setRejectTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wf-btn wf-btn-danger"
                onClick={() => void handleReject()}
                disabled={busy}
              >
                {busy ? 'Rejecting…' : 'Reject request'}
              </button>
            </>
          }
        >
          <label htmlFor="wf-reject-reason" className="wf-label">
            Reason (sent to the applicant) *
          </label>
          <textarea
            id="wf-reject-reason"
            className="wf-textarea"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={busy}
          />
          {actionError && (
            <div className="wf-notice error" role="alert">
              {actionError}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
