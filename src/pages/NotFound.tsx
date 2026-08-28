import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="login-container">
      <div className="login-card-wrapper">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="brand-icon-shield" style={{ margin: '0 auto 1.5rem' }}>
            <ShieldX size={36} color="#ef4444" />
          </div>
          <h1 className="brand-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            404 - Access Point Not Found
          </h1>
          <p className="brand-subtitle" style={{ marginBottom: '2rem' }}>
            The privileged route or resource you requested does not exist or has been relocated.
          </p>
          <Link
            to="/users"
            className="submit-btn"
            style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center' }}
          >
            <Home size={18} style={{ marginRight: '8px' }} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
