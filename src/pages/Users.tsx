import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  ShieldCheck,
  Building,
  Search,
  RotateCw,
  AlertTriangle,
  UserX,
  CheckCircle,
} from 'lucide-react';
import type { User } from '../types/auth';
import { getUsersApi } from '../api/users';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUsersApi();
      setUsers(data);
    } catch {
      setError('Unable to load user directory. Please check your connection or try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, [fetchUsers]);

  // Extract unique roles for the filter dropdown
  const uniqueRoles = Array.from(new Set(users.map((u) => u.role).filter(Boolean)));

  // Client-side filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.department ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.role ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role?.toLowerCase().includes('admin')).length;
  const uniqueDepartments = new Set(users.map((u) => u.department).filter(Boolean)).size;

  const getRoleBadgeClass = (role: string) => {
    const lower = role.toLowerCase();
    if (lower.includes('admin')) return 'role-badge admin';
    if (lower.includes('operator')) return 'role-badge operator';
    if (lower.includes('auditor')) return 'role-badge auditor';
    if (lower.includes('dev') || lower.includes('engineer')) return 'role-badge developer';
    return 'role-badge default';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Identities & Users</h1>
          <p className="page-description">
            Privileged user directory, identity roles, and department assignments.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="secondary-action-btn"
            title="Refresh user directory"
            aria-label="Refresh user directory"
          >
            <RotateCw size={16} className={isLoading ? 'spinning-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap cyan">
            <UsersIcon size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : users.length}</div>
            <div className="metric-label">Total Identities</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap emerald">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : adminCount}</div>
            <div className="metric-label">Administrators</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap purple">
            <Building size={22} />
          </div>
          <div>
            <div className="metric-value">{isLoading ? '—' : uniqueDepartments}</div>
            <div className="metric-label">Departments</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="user-directory-card">
        {/* Search & Filter Toolbar */}
        {!isLoading && !error && users.length > 0 && (
          <div className="table-toolbar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, role, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search users"
              />
            </div>

            {uniqueRoles.length > 0 && (
              <div className="filter-select-wrapper">
                <select
                  className="role-filter-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  aria-label="Filter by role"
                >
                  <option value="ALL">All Roles</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            className="directory-loading-container"
            data-testid="loading-state"
            role="status"
            aria-live="polite"
          >
            <div className="loading-spinner-wrap">
              <div className="spinner" />
              <p className="loading-text">Fetching user directory from Identity Service...</p>
            </div>
            <div className="skeleton-table" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-line long" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="directory-error-state" data-testid="error-state" role="alert">
            <div className="error-icon-wrap">
              <AlertTriangle size={36} />
            </div>
            <h2 className="error-heading">Failed to Load User Directory</h2>
            <p className="error-description">{error}</p>
            <button onClick={fetchUsers} className="retry-btn">
              <RotateCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State (0 users returned from API) */}
        {!isLoading && !error && users.length === 0 && (
          <div className="directory-empty-state" data-testid="empty-state">
            <div className="empty-icon-wrap">
              <UserX size={40} />
            </div>
            <h2 className="empty-heading">No users found</h2>
            <p className="empty-description">
              The Identity Service currently has no registered user accounts.
            </p>
          </div>
        )}

        {/* Empty Filter State (users exist, but query matches 0) */}
        {!isLoading && !error && users.length > 0 && filteredUsers.length === 0 && (
          <div className="directory-empty-state" data-testid="no-search-results">
            <div className="empty-icon-wrap">
              <Search size={36} />
            </div>
            <h2 className="empty-heading">No matching users found</h2>
            <p className="empty-description">
              No identities matched your search query &quot;{searchQuery}&quot;. Try adjusting your
              search term or role filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('ALL');
              }}
              className="clear-filter-btn"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Populated User Table */}
        {!isLoading && !error && filteredUsers.length > 0 && (
          <div className="table-responsive-wrapper">
            <table className="pam-data-table" aria-label="User Directory">
              <thead>
                <tr>
                  <th scope="col">User Identity</th>
                  <th scope="col">Email Address</th>
                  <th scope="col">Role</th>
                  <th scope="col">Department</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id || user.email} className="pam-table-row">
                    <td>
                      <div className="user-identity-cell">
                        <div className="user-avatar-initials" aria-hidden="true">
                          {getInitials(user.fullName)}
                        </div>
                        <div className="user-name-wrapper">
                          <span className="user-fullname">{user.fullName}</span>
                          {user.id && <span className="user-id-sub">ID: {user.id}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-email-text">{user.email}</span>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                    </td>
                    <td>
                      <span className="user-department-text">{user.department}</span>
                    </td>
                    <td>
                      <span className="status-badge-active">
                        <CheckCircle size={14} />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
