import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Server, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Identities & Users</span>
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Server size={18} />
            <span>Privileged Resources</span>
          </NavLink>
        </nav>

        <div className="pam-header-user-section">
          <div className="user-profile-chip">
            <div className="user-avatar-circle">
              <UserIcon size={16} />
            </div>
            <div className="user-details">
              <span className="user-email">{user?.email || 'Administrator'}</span>
              <span className="user-role-badge">Admin</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="logout-button"
            title="Sign out of Bismarck PAM"
            aria-label="Logout"
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
