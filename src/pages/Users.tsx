import React from 'react';
import { Users as UsersIcon, UserPlus, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export const Users: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Identities & Users</h1>
          <p className="page-description">
            Manage administrative personnel, privileged roles, and access credentials.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="primary-action-btn" disabled title="Coming in Part 2">
            <UserPlus size={16} />
            <span>Create Identity</span>
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
            <div className="metric-value">Active Directory</div>
            <div className="metric-label">Identity Management System</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap emerald">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="metric-value">Zero-Trust Active</div>
            <div className="metric-label">RBAC Enforcement Engine</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap amber">
            <Clock size={22} />
          </div>
          <div>
            <div className="metric-value">Real-Time Sync</div>
            <div className="metric-label">Identity Service Connected</div>
          </div>
        </div>
      </div>

      {/* Placeholder Body */}
      <div className="placeholder-card">
        <div className="placeholder-icon-wrap">
          <ShieldAlert size={48} className="placeholder-icon" />
        </div>
        <h2>User Management Pipeline Ready</h2>
        <p>
          Routing shell and secure session context established. Full user directory table, role
          assignment, and credential provisioning will be integrated in Part 2.
        </p>
      </div>
    </div>
  );
};

export default Users;
