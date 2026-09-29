import React, { useCallback, useEffect, useState } from 'react';
import { ShieldOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { canRevokePermissions } from '../auth/roles';
import { listJitSessions, revokeTemporaryPermission } from '../api/jit';
import { isApiError } from '../api/errors';
import { Modal } from '../components/common/Modal';
import {
  EmptyState,
  LoadingState,
  UnsupportedNotice,
} from '../components/common/StateViews';
import useResources from '../hooks/useResources';
import { formatDateTime, levelLabel } from '../utils/format';
import { capabilities } from '../api/config';
import type { ApiError, JitSession } from '../types/pam';

/**
 * Just-In-Time access.
 *
 * Reads the AUTHORITATIVE list of JIT sessions from the Authorization Service
 * (`GET /api/jit/sessions`). A session is a `TemporaryPermission` row created
 * when the Authorization Service consumes the `approval-granted` Kafka event —
 * so if this list is empty after an approval, the event has not been processed
 * yet (or the broker is unreachable). It is NOT derived from approval requests.
 *
 * `provisioningStatus` distinguishes a real cloud grant (`ACTIVE`, the Azure ARM
 * role assignment succeeded) from `LOCAL_ONLY`, which is the expected state in
 * local dev / CI where no Azure tenant is configured. A local-only session is
 * still a real, tracked, expiring session.
 *
 * The only JIT mutation is an Admin-only manual revoke.
 */
export const JitAccess: React.FC = () => {
  const { user } = useAuth();
  const { resourceName } = useResources();

  const [sessions, setSessions] = useState<JitSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Local ticking clock so the countdown updates without hammering the API.
  // The authoritative values come from the server on each load.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!capabilities.jitList) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setSessions(await listJitSessions());
    } catch (err) {
      setLoadError(isApiError(err) ? err.message : 'Unable to load JIT sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async () => {
    if (!revokeId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await revokeTemporaryPermission(revokeId);
      setMessage(result.message || `Permission ${revokeId} revoked.`);
      setRevokeId(null);
      setRevokeReason('');
      // Re-read from the server so the row flips to REVOKED authoritatively.
      void load();
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

  const active = sessions.filter((session) => session.status === 'ACTIVE');
  const history = sessions.filter((session) => session.status !== 'ACTIVE');

  const remainingLabel = (session: JitSession): string => {
    if (session.status !== 'ACTIVE') return '—';
    const seconds = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000));
    if (seconds <= 0) return 'Expired';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const renderRow = (session: JitSession) => (
    <tr key={session.id} className="pam-table-row">
      <td className="wf-mono">{session.id.slice(0, 8)}…</td>
      <td>{session.resourceName || resourceName(session.resourceId)}</td>
      <td>{levelLabel(session.requestedLevel)}</td>
      <td>{formatDateTime(session.grantedAt)}</td>
      <td>
        {remainingLabel(session)}
        {session.provisioningStatus && (
          <div className="wf-hint">Provisioning: {session.provisioningStatus}</div>
        )}
      </td>
      <td className="wf-actions-cell">
        {session.status === 'ACTIVE' && canRevokePermissions(user) && capabilities.jitRevoke ? (
          <button
            type="button"
            className="reject-btn"
            onClick={() => {
              setRevokeId(session.id);
              setRevokeReason('');
            }}
          >
            <ShieldOff size={16} aria-hidden="true" />
            <span>Revoke</span>
          </button>
        ) : (
          <span className="wf-hint">
            {session.status === 'ACTIVE' ? 'Admin only' : session.status}
          </span>
        )}
      </td>
    </tr>
  );

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">JIT Access</h1>
          <p className="page-description">
            Just-In-Time (temporary) privileged access. A session is created automatically when an
            approval request is approved, and expires on its own.
          </p>
        </div>
        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => void load()}
          disabled={loading}
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
      {loadError && (
        <div className="wf-error" role="alert">
          {loadError}
        </div>
      )}
      {error && (
        <div className="wf-error" role="alert">
          {error.message}
        </div>
      )}

      <h2 className="panel-title">Active JIT sessions</h2>
      {!capabilities.jitList ? (
        <UnsupportedNotice message="JIT session listing is disabled by configuration." />
      ) : loading && sessions.length === 0 ? (
        <LoadingState message="Loading JIT sessions…" />
      ) : active.length === 0 ? (
        <EmptyState
          title="No active JIT sessions"
          message="Once an approval request is approved, the temporary grant appears here and counts down to automatic expiry."
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="pam-data-table" aria-label="Active JIT sessions">
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Resource</th>
                <th scope="col">Level</th>
                <th scope="col">Granted</th>
                <th scope="col">Remaining</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>{active.map(renderRow)}</tbody>
          </table>
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="panel-title">Expired &amp; revoked sessions</h2>
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="Expired and revoked JIT sessions">
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Level</th>
                  <th scope="col">Granted</th>
                  <th scope="col">Remaining</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>{history.map(renderRow)}</tbody>
            </table>
          </div>
        </>
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
            Revoke the temporary permission for session <strong>{revokeId}</strong>? Endpoint:{' '}
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
