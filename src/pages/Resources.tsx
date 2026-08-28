import React from 'react';
import { Server, Database, Cloud, Shield, Plus } from 'lucide-react';

export const Resources: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Privileged Resources</h1>
          <p className="page-description">
            Protected infrastructure, bastion hosts, databases, and secure service endpoints.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="primary-action-btn" disabled title="Coming in Part 3">
            <Plus size={16} />
            <span>Register Resource</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <Server size={22} />
          </div>
          <div>
            <div className="metric-value">Compute Bastions</div>
            <div className="metric-label">SSH / RDP Gateways</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap purple">
            <Database size={22} />
          </div>
          <div>
            <div className="metric-value">Secure Datastores</div>
            <div className="metric-label">Vault-Secured Clusters</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap cyan">
            <Cloud size={22} />
          </div>
          <div>
            <div className="metric-value">Cloud Endpoints</div>
            <div className="metric-label">Zero-Trust Boundaries</div>
          </div>
        </div>
      </div>

      {/* Placeholder Body */}
      <div className="placeholder-card">
        <div className="placeholder-icon-wrap">
          <Shield size={48} className="placeholder-icon" />
        </div>
        <h2>Resource Gateway Ready</h2>
        <p>
          Routing shell and privileged token propagation established. Resource inventory, session
          brokering, and just-in-time elevation will be integrated in Part 3.
        </p>
      </div>
    </div>
  );
};

export default Resources;
