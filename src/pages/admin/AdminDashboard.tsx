import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface AdminSection {
  to: string;
  label: string;
  /** Accessible name — must be unique and descriptive, never colour-only. */
  aria: string;
}

/**
 * Administration shell for BIS-405.
 *
 * Consolidates the day-to-day admin surfaces (user directory, resources,
 * policies, approval queue, active temporary permissions) into one place so an
 * administrator never has to call APIs directly.
 *
 * Navigation is React Router `NavLink` + a nested `<Outlet />`: switching
 * section is a client-side route change, never a full page reload.
 *
 * Resources, Policies and the Approval Queue are NOT re-implemented here — they
 * are rendered by the existing page components, so their behaviour and their
 * backend permission model stay exactly as they were.
 */
const SECTIONS: AdminSection[] = [
  { to: '/admin/users', label: 'Users & Roles', aria: 'Admin users and roles' },
  { to: '/admin/resources', label: 'Resources', aria: 'Admin resources' },
  { to: '/admin/policies', label: 'Policies', aria: 'Admin policies' },
  { to: '/admin/approvals', label: 'Approval Queue', aria: 'Admin approval queue' },
  {
    to: '/admin/permissions',
    label: 'Active Permissions',
    aria: 'Admin active temporary permissions',
  },
];

export default function AdminDashboard() {
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-description">
            Manage identities, resources, access policies, approval workflows and active privileged
            sessions.
          </p>
        </div>
        <span className="admin-dashboard-badge" aria-hidden="true">
          <ShieldCheck size={16} />
          Admin
        </span>
      </div>

      {/* Section navigation. end={true} keeps "Users & Roles" from staying lit
          while on a sibling route, which is what users expect from a tab bar. */}
      <nav className="admin-nav" aria-label="Administration sections">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={true}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            aria-label={section.aria}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      {/* Nested section content, routed by React Router. */}
      <Outlet />
    </div>
  );
}
