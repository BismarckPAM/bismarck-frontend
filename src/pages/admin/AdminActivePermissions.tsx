import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldOff } from 'lucide-react';
import { listJitSessions, revokeTemporaryPermission } from '../../api/jit';
import { isApiError } from '../../api/errors';
import { capabilities } from '../../api/config';
import { Modal } from '../../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/StateViews';
import { formatDateTime, levelLabel } from '../../utils/format';
import type { ApiError, JitSession } from '../../types/pam';

/**
 * Administration → Active Permissions.
 *
 * Lists ACTIVE temporary permissions from the AUTHORITATIVE JIT endpoint
 * (`GET /api/jit/sessions?activeOnly=true`). It is deliberately not derived from
 * the Approval Queue, browser state or the Audit Log — a grant only exists once
 * the Authorization Service has recorded a `TemporaryPermission`.
 *
 * Revocation calls `POST /api/jit/sessions/{id}/revoke`, which has immediate
 * effect: it closes the live brokered terminal, revokes the cloud grant (best
 * effort), flips the row to REVOKED and publishes the revocation event.
 *
 * No secret material is rendered here: the SSH private key stays on the server.
 */
export default function AdminActivePermissions() {
  const [sessions, setSessions] = useState<JitSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<JitSession | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // activeOnly=true: the server, not the client, decides what "active" means.
      setSessions(await listJitSessions(true));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Unable to load active permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await revokeTemporaryPermission(revokeTarget.id, reason);
      // Drop it from the active view immediately — no page reload.
      setSessions((current) => current.filter((item) => item.id !== revokeTarget.id));
      setMessage(
        `Revoked permission for ${revokeTarget.resourceName || revokeTarget.userEmail || revokeTarget.id}.`,
      );
      setRevokeTarget(null);
      setReason('');
    } catch (err) {
      // The row is left untouched on failure, so the UI keeps showing the
      // server's real state rather than an optimistic lie.
      setActionError(
        isApiError(err) ? err : { kind: 'unknown', message: 'Unable to revoke this permission.' },
      );
    } finally {
      setBusy(false);
    }
  };

  const remainingLabel = (session: JitSession): string => {
    const seconds = Math.max(
      0,
      Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    );
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60);
    return m > 0 ? `${m}m` : `${seconds}s`;
  };

  return (
    <>
      <div className="user-directory-card">
        <div className="table-toolbar">
          <p className="wf-hint" style={{ margin: 0 }}>
            Active Just-In-Time grants across all users. Revoking takes effect immediately: the live
            terminal is closed and the cloud grant is removed.
          </p>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh active permissions"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>

        {message && (
          <div className="wf-success" role="status">
            {message}
          </div>
        )}
        {actionError && (
          <div className="wf-error" role="alert">
            {actionError.message}
          </div>
        )}

        {!capabilities.jitList ? (
          <EmptyState
            title="JIT listing disabled"
            message="Listing is disabled by configuration."
          />
        ) : loading ? (
          <LoadingState message="Loading active permissions…" />
        ) : error ? (
          <ErrorState title="Failed to load active permissions" message={error} onRetry={load} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No active temporary permissions."
            message="Nothing is currently granted. Temporary permissions appear here once an approval has been processed."
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="Active temporary permissions">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Action</th>
                  <th scope="col">Level</th>
                  <th scope="col">Granted</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Remaining</th>
                  <th scope="col">Provisioning</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="pam-table-row">
                    <td>{session.userEmail || session.userId}</td>
                    <td>{session.resourceName || session.resourceId}</td>
                    <td>{session.action || '—'}</td>
                    <td>{levelLabel(session.requestedLevel)}</td>
                    <td>{formatDateTime(session.grantedAt)}</td>
                    <td>{formatDateTime(session.expiresAt)}</td>
                    <td>{remainingLabel(session)}</td>
                    <td>{session.provisioningStatus || '—'}</td>
                    <td className="wf-actions-cell">
                      {capabilities.jitRevoke ? (
                        <button
                          type="button"
                          className="reject-btn"
                          aria-label={`Revoke permission for ${session.resourceName || session.resourceId}`}
                          onClick={() => {
                            setActionError(null);
                            setMessage(null);
                            setReason('');
                            setRevokeTarget(session);
                          }}
                        >
                          <ShieldOff size={16} aria-hidden="true" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <span className="wf-hint">Disabled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {revokeTarget && (
        <Modal
          title="Revoke temporary permission"
          onClose={() => setRevokeTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                // Prevents a duplicate submit while the revoke is in flight.
                disabled={busy}
                onClick={() => void handleRevoke()}
              >
                {busy ? 'Revoking…' : 'Confirm Revoke'}
              </button>
            </>
          }
        >
          {actionError && (
            <div className="wf-error" role="alert">
              {actionError.message}
            </div>
          )}
          <p>
            Revoke the active permission for{' '}
            <strong>{revokeTarget.resourceName || revokeTarget.resourceId}</strong> held by{' '}
            <strong>{revokeTarget.userEmail || revokeTarget.userId}</strong>? This closes any live
            session immediately.
          </p>
          <label className="form-group" htmlFor="admin-revoke-reason">
            <span className="form-label">Reason (optional, recorded for audit)</span>
            <input
              id="admin-revoke-reason"
              className="form-input"
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <p className="wf-hint">
            Endpoint <code>POST /api/jit/sessions/{revokeTarget.id}/revoke</code>. A 409 means the
            session already expired or was revoked; a 404 means it was not found.
          </p>
        </Modal>
      )}
    </>
  );
}
