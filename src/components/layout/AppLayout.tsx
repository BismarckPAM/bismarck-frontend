import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import { isApprover, canViewAudit } from '../../auth/roles';
import { BismarckMark } from '../../features/landing/Logo';

interface NavItemConfig {
  to: string;
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  aria: string;
}

interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastPath, setLastPath] = useState(location.pathname);
  const approver = isApprover(user);
  const auditVisible = canViewAudit(user);

  // Close the off-canvas sidebar whenever the route changes
  // (state adjusted during render — React's recommended pattern).
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setSidebarOpen(false);
  }

  // Lock body scroll while the mobile sidebar is open.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups: NavGroupConfig[] = [
    {
      label: 'Overview',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', aria: 'Dashboard' },
      ],
    },
    {
      label: 'Access',
      items: [
        {
          to: '/request-access',
          icon: FilePlus2,
          label: 'Request Access',
          aria: 'Request privileged access',
        },
        { to: '/my-requests', icon: FolderOpen, label: 'My Requests', aria: 'My access requests' },
        { to: '/jit-access', icon: KeyRound, label: 'JIT Access', aria: 'Just-in-time access' },
      ],
    },
    {
      label: 'Governance',
      items: [
        ...(approver
          ? [
              {
                to: '/approval-queue',
                icon: ClipboardCheck,
                label: 'Approval Queue',
                aria: 'Approval queue',
              },
            ]
          : []),
        { to: '/policies', icon: ListChecks, label: 'Access Policies', aria: 'Access policies' },
        {
          to: '/access-check',
          icon: ScanSearch,
          label: 'Check Simulator',
          aria: 'Access check simulator',
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        { to: '/users', icon: Users, label: 'Identities & Users', aria: 'Identities and Users' },
        {
          to: '/resources',
          icon: Server,
          label: 'Privileged Resources',
          aria: 'Privileged Resources',
        },
        ...(auditVisible
          ? [{ to: '/audit', icon: ScrollText, label: 'Audit Log', aria: 'Audit log' }]
          : []),
        { to: '/notifications', icon: Bell, label: 'Notifications', aria: 'Notifications' },
      ],
    },
  ];

  return (
    <div className="pam-app-shell">
      {/* Mobile backdrop */}
      <div
        className={`pam-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar navigation */}
      <aside className={`pam-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="pam-sidebar-brand">
          <div className="pam-brand-badge">
            <BismarckMark />
          </div>
          <div className="brand-titles">
            <span className="brand-main">Bismarck PAM</span>
            <span className="brand-tag">Privileged Access</span>
          </div>
          <button
            type="button"
            className="pam-topbar-menu-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            data-testid="sidebar-close-btn"
            style={{ marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="pam-sidebar-nav" aria-label="Main Navigation">
          {navGroups.map((group) => (
            <React.Fragment key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    aria-label={item.aria}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="pam-sidebar-footer">
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
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main column: slim topbar + routed content */}
      <div className="pam-shell-main">
        <header className="pam-topbar">
          <div className="pam-topbar-left">
            <button
              type="button"
              className="pam-topbar-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              data-testid="sidebar-toggle"
            >
              <Menu size={18} />
            </button>
            <span className="pam-topbar-context">Privileged Access Console</span>
          </div>
          <NotificationBell />
        </header>

        <main className="pam-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;