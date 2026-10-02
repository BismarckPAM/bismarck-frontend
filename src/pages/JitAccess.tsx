import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ShieldOff, RefreshCw, Terminal as TerminalIcon } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { canRevokePermissions } from '../auth/roles';
import { listJitSessions, revokeTemporaryPermission } from '../api/jit';
import { getJitTerminalStatus, isTerminalSupported } from '../api/jitTerminal';
import { isApiError } from '../api/errors';
import { Modal } from '../components/common/Modal';
import { EmptyState, UnsupportedNotice } from '../components/common/StateViews';
import useResources from '../hooks/useResources';
import { formatDateTime, formatDuration, levelLabel } from '../utils/format';
import { capabilities } from '../api/config';
import type { ApiError } from '../types/pam';

// xterm.js is a large dependency and only needed once a terminal is actually
// opened, so it is split out of the main bundle rather than shipped to every
// page load.
const TerminalPanel = lazy(() => import('../components/terminal/TerminalPanel'));

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

  // ---- Brokered terminal ------------------------------------------------
  // Which session's terminal is open, and why a session cannot offer one.
  const [terminalFor, setTerminalFor] = useState<JitSession | null>(null);
  const [terminalLogin, setTerminalLogin] = useState<string | null>(null);
  const [terminalBlockReason, setTerminalBlockReason] = useState<string | null>(null);

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
    // Initial fetch of the authoritative session list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * Opens the brokered terminal for a session.
   *
   * The status probe runs first so the user is told which secret is missing
   * ("no key configured for user@x.com") instead of clicking through to a dead
   * terminal. A failure to probe is treated as "unavailable", never as a reason
   * to open a socket that cannot succeed.
   */
  const openTerminal = async (session: JitSession) => {
    setTerminalBlockReason(null);
    setTerminalLogin(null);

    if (!isTerminalSupported()) {
      setTerminalBlockReason('This browser does not support WebSockets.');
      setTerminalFor(session);
      return;
    }

    try {
      const status = await getJitTerminalStatus(session.id, session.userEmail);
      const login = status?.login ?? session.userEmail ?? null;

      if (!status?.brokerConfigured || !status?.keyAvailable) {
        setTerminalLogin(login);
        setTerminalBlockReason(
          status?.unavailableReason || 'The brokered terminal is not available for this session.',
        );
        setTerminalFor(session);
        return;
      }

      setTerminalLogin(login);
      setTerminalFor(session);
    } catch {
      setTerminalBlockReason(
        'Could not reach the terminal service. Check your connection and try again.',
      );
      setTerminalFor(session);
    }
  };

  const closeTerminal = () => {
    setTerminalFor(null);
    setTerminalLogin(null);
    setTerminalBlockReason(null);
  };

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

      {connectable.length > 0 && (
        <>
          <h2 className="panel-title">Connect to your granted machines</h2>
          <p className="wf-hint">
            These commands work only while the session is <strong>ACTIVE</strong>. Access is
            authorised by an Azure role assignment that is removed automatically when the timer
            reaches zero, or when an administrator revokes it.
          </p>
          {connectable.map((session) => (
            <div key={session.id} className="wf-connect-card">
              <div className="wf-connect-head">
                <div>
                  <strong>{session.resourceName || session.targetVmName || 'Machine'}</strong>
                  {session.targetVmName && (
                    <span className="wf-hint"> ({session.targetVmName})</span>
                  )}
                </div>
                <span className="wf-hint">{session.targetOsType || 'Linux'}</span>
              </div>
              <div className="wf-connect-command">
                <code>{session.connectionCommand}</code>
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={() => void copyCommand(session)}
                >
                  {copiedId === session.id ? 'Copied' : 'Copy'}
                </button>
                {/* Only Linux targets get the in-browser terminal: the broker
                    speaks SSH, and a Windows VM needs RDP. */}
                {capabilities.jitTerminal &&
                isTerminalSupported() &&
                (session.targetOsType || 'Linux').toLowerCase().startsWith('linux') ? (
                  <button
                    type="button"
                    className="primary-action-btn"
                    onClick={() => void openTerminal(session)}
                  >
                    <TerminalIcon size={16} aria-hidden="true" />
                    <span>Open terminal</span>
                  </button>
                ) : null}
              </div>
              <div className="wf-hint">
                Expires in {remainingLabel(session)}
                {session.provisioningStatus && ` · Provisioning: ${session.provisioningStatus}`}
              </div>
            </div>
          ))}
        </>
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

      {terminalFor && (
        <Modal
          title={`Terminal · ${terminalFor.resourceName || terminalFor.targetVmName || 'Machine'}`}
          onClose={closeTerminal}
          footer={
            <button type="button" className="secondary-action-btn" onClick={closeTerminal}>
              Close
            </button>
          }
        >
          {terminalBlockReason ? (
            <>
              <div className="wf-error" role="alert">
                {terminalBlockReason}
              </div>
              <p className="wf-hint">
                The brokered terminal runs on the Authorization Service, which holds the SSH key.
                {terminalLogin && (
                  <>
                    {' '}
                    It would connect as <code>{terminalLogin}</code>.
                  </>
                )}{' '}
                An administrator can supply the missing key and retry.
              </p>
            </>
          ) : (
            <>
              <p className="wf-hint">
                This shell is brokered by the server and dies automatically when the JIT session
                expires or is revoked.
                {terminalLogin && (
                  <>
                    {' '}
                    Connected as <code>{terminalLogin}</code>.
                  </>
                )}
              </p>
              {/* Keyed on the id so switching sessions rebuilds the xterm instance
                  rather than reusing a disposed one. */}
              <Suspense fallback={<LoadingState message="Loading terminal…" />}>
                <TerminalPanel
                  key={terminalFor.id}
                  permissionId={terminalFor.id}
                  login={terminalLogin}
                  label={terminalFor.targetVmName || terminalFor.resourceName || undefined}
                />
              </Suspense>
            </>
          )}
        </Modal>
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
