import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

/**
 * Route-level role guard for usability only.
 * The backend remains the authoritative authorization source; every mutating
 * request is re-checked server-side and a 403 is handled gracefully.
 */
export const RequireRole: React.FC<{
  allowed: (user: ReturnType<typeof useAuth>['user']) => boolean;
  children: React.ReactNode;
}> = ({ allowed, children }) => {
  const { user } = useAuth();
  if (!allowed(user)) {
    return (
      <section className="page-container">
        <div className="wf-state wf-state-error" role="alert" data-testid="forbidden">
          <ShieldAlert size={32} aria-hidden="true" />
          <h2 className="wf-state-title">Access restricted</h2>
          <p className="wf-state-text">
            You do not have permission to view this screen. If you believe this is an error, contact
            an administrator.
          </p>
          <Link to="/dashboard" className="link-btn">
            Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }
  return <>{children}</>;
};

export default RequireRole;
