import { useCallback, useEffect, useState } from 'react';
import { RotateCw, Search, ShieldOff, UserCheck, Users as UsersIcon } from 'lucide-react';
import { getAdminUsersApi, updateUserStatusApi } from '../../api/users';
import { isApiError } from '../../api/errors';
import { useAuth } from '../../context/useAuth';
import { Modal } from '../../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/StateViews';
import type { ManagedUser } from '../../types/managedUser';

/**
 * Administration → Users & Roles.
 *
 * Reads the Admin directory endpoint, which INCLUDES deactivated accounts (the
 * normal `/api/identity/users` list hides them behind the Identity `IsActive`
 * query filter, which would leave a switched-off account unrecoverable from the
 * UI). Every row renders the real `IsActive` value from the server.
 */
export default function AdminUsers() {
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<ManagedUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getAdminUsersApi());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Unable to load the user directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /**
   * Writes ONLY the row the server confirmed. On failure nothing is written, so
   * the table can never show a status the backend did not actually apply.
   */
  const applyStatus = useCallback(async (target: ManagedUser, isActive: boolean) => {
    setBusyId(target.id);
    setActionError(null);
    setMessage(null);
    try {
      const updated = await updateUserStatusApi(target.id, isActive);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(
        isActive
          ? `${updated.fullName} is now active and can sign in.`
          : `${updated.fullName} has been deactivated.`,
      );
      setPendingDeactivate(null);
    } catch (err) {
      // 401 / 403 / 404 / network all surface through the normal error
      // normalizer, so a stack trace is never shown to the operator.
      setActionError(
        isApiError(err) ? err.message : 'Unable to update the account status. Please retry.',
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  const query = search.trim().toLowerCase();
  const visible = query
    ? users.filter((item) =>
        [item.fullName, item.email, item.role, item.department].some((field) =>
          field.toLowerCase().includes(query),
        ),
      )
    : users;

  const activeCount = users.filter((item) => item.isActive).length;
  const inactiveCount = users.length - activeCount;

  return (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap cyan">
            <UsersIcon size={22} />
          </div>
          <div>
            <div className="metric-value">{loading ? '—' : users.length}</div>
            <div className="metric-label">Total Accounts</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap emerald">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="metric-value">{loading ? '—' : activeCount}</div>
            <div className="metric-label">Active</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap red">
            <ShieldOff size={22} />
          </div>
          <div>
            <div className="metric-value">{loading ? '—' : inactiveCount}</div>
            <div className="metric-label">Deactivated</div>
          </div>
        </div>
      </div>

      <div className="user-directory-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, role, or department..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search admin users"
            />
          </div>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh user directory"
          >
            <RotateCw size={16} className={loading ? 'spinning-icon' : ''} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {message && (
          <div className="wf-success" role="status">
            {message}
          </div>
        )}
        {actionError && (
          <div className="wf-error" role="alert">
            {actionError}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading user directory…" />
        ) : error ? (
          <ErrorState title="Failed to load user directory" message={error} onRetry={load} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No user accounts found"
            message="The Identity Service has no registered accounts yet."
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No matching accounts" message={`Nothing matched "${search}".`} />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="Admin user directory">
              <thead>
                <tr>
                  <th scope="col">Full name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Department</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const isSelf = user?.id === item.id;
                  const busy = busyId === item.id;
                  return (
                    <tr key={item.id} className="pam-table-row">
                      <td>{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>{item.role || 'Unassigned'}</td>
                      <td>{item.department}</td>
                      {/* Status is text, not colour alone (accessibility). */}
                      <td>
                        <span
                          className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}
                          data-testid={`user-status-${item.id}`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="wf-actions-cell">
                        {item.isActive ? (
                          <button
                            type="button"
                            className="reject-btn"
                            // Self-deactivation is blocked: an admin who switches
                            // their own account off loses console access, and the
                            // current token stays valid until it expires.
                            disabled={busy || isSelf}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own account'
                                : `Deactivate ${item.fullName}`
                            }
                            aria-label={`Deactivate ${item.fullName}`}
                            onClick={() => {
                              setActionError(null);
                              setMessage(null);
                              setPendingDeactivate(item);
                            }}
                          >
                            <ShieldOff size={16} aria-hidden="true" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="approve-btn"
                            disabled={busy}
                            title={`Activate ${item.fullName}`}
                            aria-label={`Activate ${item.fullName}`}
                            onClick={() => void applyStatus(item, true)}
                          >
                            <UserCheck size={16} aria-hidden="true" />
                            <span>Activate</span>
                          </button>
                        )}
                        {isSelf && (
                          <div className="wf-hint">You cannot deactivate your own account.</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingDeactivate && (
        <Modal
          title="Deactivate account"
          onClose={() => setPendingDeactivate(null)}
          footer={
            <>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setPendingDeactivate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                // Disabled while the request runs, so a double-click cannot
                // issue two status changes.
                disabled={busyId === pendingDeactivate.id}
                onClick={() => void applyStatus(pendingDeactivate, false)}
              >
                {busyId === pendingDeactivate.id ? 'Deactivating…' : 'Deactivate'}
              </button>
            </>
          }
        >
          <p>
            Deactivate <strong>{pendingDeactivate.fullName}</strong> ({pendingDeactivate.email})?
          </p>
          <p className="wf-hint">
            The account will no longer be able to sign in, and it will disappear from the standard
            user list. You can reactivate it at any time from this screen.
          </p>
        </Modal>
      )}
    </>
  );
}
