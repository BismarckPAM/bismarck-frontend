import React, { useMemo, useState } from 'react';
import { ShieldOff, RefreshCw } from 'lucide-react';
import { useWorkflow } from '../state/WorkflowContext';
import { useAuth } from '../context/useAuth';
import { canRevokePermissions } from '../auth/roles';
import { revokeTemporaryPermission } from '../api/jit';
import { isApiError } from '../api/errors';
import { Modal } from '../components/common/Modal';
import { EmptyState, UnsupportedNotice } from '../components/common/StateViews';
import useResources from '../hooks/useResources';
import { formatDateTime, formatDuration, levelLabel } from '../utils/format';
import { capabilities } from '../api/config';
import type { ApiError } from '../types/pam';

/**
 * Just-In-Time access.
 *
 * Backend reality (verified): JIT grants are provisioned automatically when an
 * approval request is GRANTED (the `approval-granted` event creates the
 * temporary permission). There is NO standalone JIT request endpoint and NO
 * "list JIT permissions" endpoint. The only JIT mutation is an Admin-only
 * manual revoke: POST /api/authorization/permissions/{id}/revoke.
 */
export const JitAccess: React.FC = () => {
  const { myRequests, updateMyRequest, refreshNotifications } = useWorkflow();
  const { user } = useAuth();
  const { resourceName } = useResources();

  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const approved = useMemo(
    () => myRequests.filter((request) => request.status === 'APPROVED'),
    [myRequests],
  );

  const handleRevoke = async () => {
    if (!revokeId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await revokeTemporaryPermission(revokeId);
      setMessage(result.message || `Permission ${revokeId} revoked.`);
      updateMyRequest(revokeId, { status: 'APPROVED' });
      void refreshNotifications();
      setRevokeId(null);
      setRevokeReason('');
    } catch (err) {
      setError(
        isApiError(err)
          ? err
          : { kind: 'unknown', message: 'Unable to revoke the temporary permission.' },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">JIT Access</h1>
          <p className="page-description">
            Just-In-Time (temporary) privileged access. JIT grants are provisioned automatically
            when an approval request is approved.
          </p>
        </div>
      </div>

      <UnsupportedNotice message="The backend has no standalone JIT request endpoint and no 'list JIT permissions' endpoint. JIT grants are created by the approval-granted event. Only an Admin can manually revoke a temporary permission." />

      {message && (
        <div className="wf-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="wf-error" role="alert">
          {error.message}
        </div>
      )}

      <h2 className="panel-title">Active JIT sessions (from this session)</h2>
      {approved.length === 0 ? (
        <EmptyState
          title="No active JIT sessions"
          message="Approved requests in this session will appear here once a temporary grant is issued."
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="pam-data-table" aria-label="Active JIT sessions">
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Resource</th>
                <th scope="col">Level</th>
                <th scope="col">Granted</th>
                <th scope="col">Duration</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approved.map((request) => (
                <tr key={request.id} className="pam-table-row">
                  <td className="wf-mono">{request.id.slice(0, 8)}…</td>
                  <td>{resourceName(request.resourceId)}</td>
                  <td>{levelLabel(request.requestedLevel)}</td>
                  <td>{formatDateTime(request.reviewedAt)}</td>
                  <td>{formatDuration(request.durationMinutes)}</td>
                  <td className="wf-actions-cell">
                    {canRevokePermissions(user) && capabilities.jitRevoke ? (
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => {
                          setRevokeId(request.id);
                          setRevokeReason('');
                        }}
                      >
                        <ShieldOff size={16} aria-hidden="true" />
                        <span>Revoke</span>
                      </button>
                    ) : (
                      <span className="wf-hint">Admin only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeId && (
        <Modal
          title="Revoke temporary permission"
          onClose={() => setRevokeId(null)}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setRevokeId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                onClick={() => void handleRevoke()}
                disabled={busy}
              >
                {busy ? 'Revoking…' : 'Confirm Revoke'}
              </button>
            </>
          }
        >
          {error && (
            <div className="wf-error" role="alert">
              {error.message}
            </div>
          )}
          <p>
            Revoke the temporary permission for request <strong>{revokeId}</strong>? Endpoint:{' '}
            <code>POST /api/authorization/permissions/{revokeId}/revoke</code>.
          </p>
          <label className="form-group" htmlFor="revokeReason">
            <span className="form-label">Reason (optional, for your records)</span>
            <input
              id="revokeReason"
              className="form-input"
              type="text"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
            />
          </label>
          <p className="wf-hint">
            <RefreshCw size={14} aria-hidden="true" /> A 409 means the permission is already expired
            or revoked; a 404 means it was not found.
          </p>
        </Modal>
      )}
    </section>
  );
};

export default JitAccess;
