import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Server,
  LogOut,
  User as UserIcon,
  ListChecks,
  ScanSearch,
  LayoutDashboard,
  FilePlus2,
  FolderOpen,
  ClipboardCheck,
  KeyRound,
  ScrollText,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import { isApprover, canViewAudit } from '../../auth/roles';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const approver = isApprover(user);
  const auditVisible = canViewAudit(user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pam-app-layout">
      {/* Top Navigation Bar */}
      <header className="pam-header">
        <div className="pam-header-brand">
          <div className="brand-logo-icon">
            <Shield size={22} className="shield-icon-nav" />
          </div>
          <div className="brand-titles">
            <span className="brand-main">Bismarck PAM</span>
            <span className="brand-tag">Privileged Access</span>
          </div>
        </div>

        <nav className="pam-nav-links" aria-label="Main Navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Dashboard"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/request-access"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Request privileged access"
          >
            <FilePlus2 size={18} />
            <span>Request Access</span>
          </NavLink>
          <NavLink
            to="/my-requests"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="My access requests"
          >
            <FolderOpen size={18} />
            <span>My Requests</span>
          </NavLink>
          {approver && (
            <NavLink
              to="/approval-queue"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-label="Approval queue"
            >
              <ClipboardCheck size={18} />
              <span>Approval Queue</span>
            </NavLink>
          )}
          <NavLink
            to="/jit-access"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Just-in-time access"
          >
            <KeyRound size={18} />
            <span>JIT Access</span>
          </NavLink>
          {auditVisible && (
            <NavLink
              to="/audit"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-label="Audit log"
            >
              <ScrollText size={18} />
              <span>Audit Log</span>
            </NavLink>
          )}
          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span>Notifications</span>
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Identities and Users"
          >
            <Users size={18} />
            <span>Identities & Users</span>
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Privileged Resources"
          >
            <Server size={18} />
            <span>Privileged Resources</span>
          </NavLink>
          <NavLink
            to="/policies"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Access policies"
          >
            <ListChecks size={18} />
            <span>Access Policies</span>
          </NavLink>
          <NavLink
            to="/access-check"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            aria-label="Access check simulator"
          >
            <ScanSearch size={18} />
            <span>Check Simulator</span>
          </NavLink>
        </nav>

        <div className="pam-header-user-section">
          <NotificationBell />
          <div className="user-profile-chip" data-testid="user-profile-chip">
            <div className="user-avatar-circle" aria-hidden="true">
              <UserIcon size={16} />
            </div>
            <div className="user-details">
              <span className="user-email" data-testid="user-display-name">
                {user?.fullName || user?.email || 'Administrator'}
              </span>
              <span className="user-role-badge" data-testid="user-display-role">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="logout-button"
            title="Sign out of Bismarck PAM"
            aria-label="Logout"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pam-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
