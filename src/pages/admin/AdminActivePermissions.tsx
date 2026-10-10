import { useCallback, useEffect, useState } from 'react';
import { ShieldOff, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { listJitSessions, revokeTemporaryPermission } from '../../api/jit';
import { isApiError } from '../../api/errors';
import type { JitSession } from '../../types/pam';
import { formatDateTime, levelLabel } from '../../utils/format';
import { capabilities as backendCapabilities } from '../../api/config';

interface Capabilities {
  jitList: boolean;
  jitRevoke: boolean;
}

interface AdminActivePermissionsProps {
  capabilities?: Capabilities;
  fetchSessions?: () => Promise<JitSession[]>;
  onRevokeSession?: (sessionId: string, reason: string) => Promise<unknown>;
}

function remainingLabel(session: JitSession): string {
  const remaining = Math.max(
    0,
    Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 60000),
  );
  if (!Number.isFinite(remaining) || remaining === 0) return 'Expired';
  if (remaining < 60) return `${remaining}m remaining`;
  return `${Math.floor(remaining / 60)}h ${remaining % 60}m remaining`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function AdminActivePermissions({
  capabilities = backendCapabilities,
  fetchSessions,
  onRevokeSession,
}: AdminActivePermissionsProps) {
  const [sessions, setSessions] = useState<JitSession[]>([]);
  const [loading, setLoading] = useState(capabilities.jitList);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<JitSession | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((old) => old + 1);
  }, []);

  useEffect(() => {
    if (!capabilities.jitList) return;
    let live = true;
    const load = async () => {
      try {
        const rows = await (fetchSessions ? fetchSessions() : listJitSessions(true));
        if (live) {
          setSessions(rows.filter((row) => row.status === 'ACTIVE'));
          setError(null);
        }
      } catch (cause) {
        if (live) setError(errorMessage(cause, 'Unable to load active permissions.'));
      } finally {
        if (live) setLoading(false);
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [capabilities.jitList, fetchSessions, refreshKey]);

  const closeDialog = useCallback(() => {
    if (busy) return;
    setRevokeTarget(null);
    setReason('');
    setActionError(null);
  }, [busy]);

  useEffect(() => {
    if (!revokeTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revokeTarget, closeDialog]);

  const revoke = async () => {
    if (!revokeTarget || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      if (onRevokeSession) await onRevokeSession(revokeTarget.id, reason);
      else await revokeTemporaryPermission(revokeTarget.id, reason);
      const target = revokeTarget;
      // Only remove a row after the server has confirmed revocation.
      setSessions((current) => current.filter((session) => session.id !== target.id));
      setMessage(`Revoked permission for ${target.resourceName || target.resourceId}.`);
      setRevokeTarget(null);
      setReason('');
    } catch (cause) {
      // Keep the row on 409/conflict/network failures to avoid false success.
      setActionError(errorMessage(cause, 'Failed to revoke permission.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wf-jit-panel">
      <div className="page-header-row">
        <div />
        {capabilities.jitList && (
          <button
            type="button"
            className="secondary-action-btn"
            aria-label="Refresh active permissions"
            disabled={loading}
            onClick={refresh}
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
        )}
      </div>
      {message && (
        <div className="wf-success" role="status">
          {message}
        </div>
      )}
      {!capabilities.jitList ? (
        <div className="wf-state-box">
          <h3>JIT listing disabled</h3>
          <p>Listing is disabled by configuration.</p>
        </div>
      ) : loading ? (
        <div className="wf-state-box" data-testid="loading-state">
          <Loader2 className="wf-spinner" size={24} />
          <p>Loading active permissions…</p>
        </div>
      ) : error ? (
        <div className="wf-state-box wf-state-error" data-testid="error-state" role="alert">
          <AlertCircle size={28} />
          <h3>Failed to load active permissions</h3>
          <p>{error}</p>
          <button type="button" className="secondary-action-btn" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="wf-state-box">
          <h3>No active temporary permissions.</h3>
          <p>
            Nothing is currently granted. Temporary permissions appear here once an approval has
            been processed.
          </p>
        </div>
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
                          setRevokeTarget(session);
                          setReason('');
                          setActionError(null);
                          setMessage(null);
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
      {revokeTarget && (
        <div className="wf-modal-overlay" role="presentation">
          <div
            className="wf-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-revoke-title"
          >
            <div className="wf-modal-header">
              <h2 id="admin-revoke-title">Revoke temporary permission</h2>
              <button
                type="button"
                className="wf-modal-close-btn"
                aria-label="Close dialog"
                disabled={busy}
                onClick={closeDialog}
              >
                <X size={18} />
              </button>
            </div>
            <div className="wf-modal-body">
              {actionError && (
                <div className="wf-error" role="alert">
                  {actionError}
                </div>
              )}
              <p>
                Revoke the active permission for{' '}
                <strong>{revokeTarget.resourceName || revokeTarget.resourceId}</strong> held by{' '}
                <strong>{revokeTarget.userEmail || revokeTarget.userId}</strong>? This terminates
                any live session immediately.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-revoke-reason">
                  Reason (optional, recorded for audit)
                </label>
                <input
                  id="admin-revoke-reason"
                  className="form-input"
                  type="text"
                  disabled={busy}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Work completed early"
                />
              </div>
            </div>
            <div className="wf-modal-footer">
              <button
                type="button"
                className="secondary-action-btn"
                disabled={busy}
                onClick={closeDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                disabled={busy}
                onClick={() => void revoke()}
              >
                {busy ? 'Revoking…' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AdminActivePermissions };
