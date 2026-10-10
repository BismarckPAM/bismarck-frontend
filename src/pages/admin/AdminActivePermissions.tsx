import React, { useState, useEffect, useCallback } from 'react';
import { ShieldOff, AlertCircle, Loader2, X } from 'lucide-react';

/* ==========================================================================
   Types & Interfaces
   ========================================================================== */

export interface JitSession {
  id: string;
  userId: string;
  userEmail?: string;
  resourceId: string;
  resourceName?: string;
  action?: string;
  requestedLevel: 'read' | 'write' | 'admin' | string;
  grantedAt: string;
  expiresAt: string;
  provisioningStatus?: 'active' | 'provisioning' | 'failed' | string;
}

export interface Capabilities {
  jitList: boolean;
  jitRevoke: boolean;
}

export interface AdminActivePermissionsProps {
  capabilities?: Capabilities;
  fetchSessions?: () => Promise<JitSession[]>;
  onRevokeSession?: (sessionId: string, reason: string) => Promise<void>;
}

/* ==========================================================================
   Helper Functions
   ========================================================================== */

function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function remainingLabel(session: JitSession): string {
  const diffMs = new Date(session.expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m remaining`;

  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return `${diffHours}h ${remMins}m remaining`;
}

function levelLabel(level?: string): string {
  if (!level) return 'Standard';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/* ==========================================================================
   Subcomponents
   ========================================================================== */

interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, footer, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="wf-modal-overlay" role="presentation">
      <div
        className="wf-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wf-modal-title"
      >
        <div className="wf-modal-header">
          <h2 id="wf-modal-title">{title}</h2>
          <button
            type="button"
            className="wf-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="wf-modal-body">{children}</div>
        {footer && <div className="wf-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="wf-state-box">
    <Loader2 className="wf-spinner" size={24} />
    <p>{message}</p>
  </div>
);

const ErrorState: React.FC<{ title: string; message: string; onRetry: () => void }> = ({
  title,
  message,
  onRetry,
}) => (
  <div className="wf-state-box wf-state-error">
    <AlertCircle size={28} />
    <h3>{title}</h3>
    <p>{message}</p>
    <button type="button" className="secondary-action-btn" onClick={onRetry}>
      Retry
    </button>
  </div>
);

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="wf-state-box">
    <h3>{title}</h3>
    <p>{message}</p>
  </div>
);

/* ==========================================================================
   Main Component
   ========================================================================== */

export const AdminActivePermissions: React.FC<AdminActivePermissionsProps> = ({
  capabilities = { jitList: true, jitRevoke: true },
  fetchSessions,
  onRevokeSession,
}) => {
  // Loading starts true only if JIT listing is active
  const [loading, setLoading] = useState<boolean>(Boolean(capabilities.jitList));
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<JitSession[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ message: string } | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<JitSession | null>(null);
  const [reason, setReason] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  // Trigger state for event-driven reloads (retry button or post-revoke)
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Fetch logic directly in effect to avoid calling setState synchronously in the effect body
  useEffect(() => {
    if (!capabilities.jitList) {
      return;
    }

    let isMounted = true;

    async function fetchActiveSessions() {
      try {
        let data: JitSession[];
        if (fetchSessions) {
          data = await fetchSessions();
        } else {
          const res = await fetch('/api/jit/sessions');
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          data = await res.json();
        }

        if (isMounted) {
          setSessions(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error loading sessions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchActiveSessions();

    return () => {
      isMounted = false;
    };
  }, [capabilities.jitList, fetchSessions, refreshKey]);

  // Handle Revoke submission
  const handleRevoke = async () => {
    if (!revokeTarget || busy) return;

    setBusy(true);
    setActionError(null);

    try {
      if (onRevokeSession) {
        await onRevokeSession(revokeTarget.id, reason);
      } else {
        const res = await fetch(`/api/jit/sessions/${revokeTarget.id}/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });

        if (res.status === 409) {
          throw new Error('This session has already expired or has been revoked.');
        }
        if (res.status === 404) {
          throw new Error('Session could not be found.');
        }
        if (!res.ok) {
          throw new Error(`Failed to revoke session (HTTP ${res.status}).`);
        }
      }

      setMessage(
        `Successfully revoked permission for ${
          revokeTarget.resourceName || revokeTarget.resourceId
        }.`,
      );
      setRevokeTarget(null);
      setReason('');
      load();
    } catch (err: unknown) {
      setActionError({
        message: err instanceof Error ? err.message : 'Failed to revoke permission.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCloseModal = () => {
    if (!busy) {
      setActionError(null);
      setRevokeTarget(null);
      setReason('');
    }
  };

  return (
    <div className="wf-jit-panel">
      {/* Global Alerts */}
      {message && (
        <div className="wf-success" role="status">
          {message}
        </div>
      )}

      {!revokeTarget && actionError && (
        <div className="wf-error" role="alert">
          {actionError.message}
        </div>
      )}

      {/* Main Content Area */}
      {!capabilities.jitList ? (
        <EmptyState title="JIT listing disabled" message="Listing is disabled by configuration." />
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
                        aria-label={`Revoke permission for ${
                          session.resourceName || session.resourceId
                        }`}
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

      {/* Revocation Modal */}
      {revokeTarget && (
        <Modal
          title="Revoke temporary permission"
          onClose={handleCloseModal}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                disabled={busy}
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
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
            <strong>{revokeTarget.userEmail || revokeTarget.userId}</strong>? This terminates any
            live session immediately.
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
              placeholder="e.g. Work completed early"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminActivePermissions;
