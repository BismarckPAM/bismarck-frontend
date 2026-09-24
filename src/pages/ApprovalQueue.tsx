import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, RefreshCw, Search, Eye } from 'lucide-react';
import {
  listPendingApprovalRequests,
  approveApprovalRequest,
  rejectApprovalRequest,
} from '../api/approval';
import { isApiError } from '../api/errors';
import { useWorkflow } from '../state/WorkflowContext';
import useResources from '../hooks/useResources';
import { ApprovalStatusBadge } from '../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/common/StateViews';
import { RequestDetails } from '../components/requests/RequestDetails';
import { Modal } from '../components/common/Modal';
import { formatDateTime, formatDuration, levelLabel } from '../utils/format';
import type { ApprovalRequest } from '../types/pam';

export const ApprovalQueue: React.FC = () => {
  const { refreshNotifications } = useWorkflow();
  const { resourceName } = useResources();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<ApprovalRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listPendingApprovalRequests());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Unable to load the approval queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter(
      (request) =>
        request.resourceId.toLowerCase().includes(query) ||
        request.requesterUserId.toLowerCase().includes(query) ||
        request.reason.toLowerCase().includes(query),
    );
  }, [requests, search]);

  const handleApprove = async (request: ApprovalRequest) => {
    setBusyId(request.id);
    setActionError(null);
    try {
      const updated = await approveApprovalRequest(request.id);
      // Remove from the pending queue after successful approval.
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setConfirmApprove(null);
      void refreshNotifications();
      void updated;
    } catch (err) {
      setActionError(isApiError(err) ? err.message : 'Approval failed. Please retry.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('A rejection reason is required.');
      return;
    }
    setBusyId(rejectTarget.id);
    setRejectError(null);
    try {
      await rejectApprovalRequest(rejectTarget.id, { reason: rejectReason.trim() });
      setRequests((current) => current.filter((item) => item.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
      void refreshNotifications();
    } catch (err) {
      // Preserve the dialog input on failure.
      setRejectError(isApiError(err) ? err.message : 'Rejection failed. Please retry.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading approval queue…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p className="page-description">
            Pending access requests awaiting a decision. Endpoints:
            <code> GET /api/approval/requests</code>,{' '}
            <code>POST /api/approval/requests/{'{id}'}/approve</code>,{' '}
            <code>POST /api/approval/requests/{'{id}'}/reject</code>.
          </p>
        </div>
        <button type="button" className="secondary-action-btn" onClick={() => void load()}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {actionError && (
        <div className="wf-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="table-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by resource, requester, or reason…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search approval queue"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No pending requests"
          message="There are no access requests awaiting your approval."
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="pam-data-table" aria-label="Pending approval requests">
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Requester</th>
                <th scope="col">Resource</th>
                <th scope="col">Level</th>
                <th scope="col">Duration</th>
                <th scope="col">Created</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <tr key={request.id} className="pam-table-row">
                  <td className="wf-mono">{request.id.slice(0, 8)}…</td>
                  <td>{request.requesterUserId}</td>
                  <td>{resourceName(request.resourceId)}</td>
                  <td>{levelLabel(request.requestedLevel)}</td>
                  <td>{formatDuration(request.durationMinutes)}</td>
                  <td>{formatDateTime(request.createdAt)}</td>
                  <td>
                    <ApprovalStatusBadge status={request.status} />
                  </td>
                  <td className="wf-actions-cell">
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelected(request)}
                      aria-label={`View details for request ${request.id}`}
                    >
                      <Eye size={16} aria-hidden="true" />
                      <span>Details</span>
                    </button>
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => setConfirmApprove(request)}
                      disabled={busyId === request.id}
                    >
                      <Check size={16} aria-hidden="true" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      className="reject-btn"
                      onClick={() => {
                        setRejectTarget(request);
                        setRejectReason('');
                        setRejectError(null);
                      }}
                      disabled={busyId === request.id}
                    >
                      <X size={16} aria-hidden="true" />
                      <span>Reject</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmApprove && (
        <Modal
          title="Confirm approval"
          onClose={() => setConfirmApprove(null)}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setConfirmApprove(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-action-btn"
                onClick={() => void handleApprove(confirmApprove)}
                disabled={busyId === confirmApprove.id}
              >
                {busyId === confirmApprove.id ? 'Approving…' : 'Confirm Approve'}
              </button>
            </>
          }
        >
          <p>
            Approve request <strong>{confirmApprove.id}</strong> for resource{' '}
            <strong>{resourceName(confirmApprove.resourceId)}</strong>?
          </p>
        </Modal>
      )}

      {rejectTarget && (
        <Modal
          title="Reject request"
          onClose={() => setRejectTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                onClick={() => void handleReject()}
                disabled={busyId === rejectTarget.id}
              >
                {busyId === rejectTarget.id ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </>
          }
        >
          {rejectError && (
            <div className="wf-error" role="alert">
              {rejectError}
            </div>
          )}
          <label className="form-group" htmlFor="rejectReason">
            <span className="form-label">Rejection reason *</span>
            <textarea
              id="rejectReason"
              className="form-input"
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              aria-invalid={Boolean(rejectError)}
            />
          </label>
        </Modal>
      )}

      {selected && (
        <Modal title="Request details" onClose={() => setSelected(null)}>
          <RequestDetails request={selected} resourceName={resourceName(selected.resourceId)} />
        </Modal>
      )}
    </section>
  );
};

export default ApprovalQueue;
