import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="lgx-shell lgx-shell--center">
      <div className="lgx-card lgx-card--center">
        <div className="lgx-mark-badge">
          <ShieldX size={34} color="#e11d48" />
        </div>
        <h1 className="lgx-title">404 - Access Point Not Found</h1>
        <p className="lgx-subtitle" style={{ marginBottom: '1.75rem' }}>
          The privileged route or resource you requested does not exist or has been relocated.
        </p>
        <Link
          to="/users"
          className="lgx-submit"
          style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}
        >
          <Home size={18} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;