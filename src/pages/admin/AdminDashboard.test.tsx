import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import RequireRole from '../../components/auth/RequireRole';
import { AuthProvider } from '../../context/AuthContext';
import { isAdminOrSecurityAdmin, isApprover } from '../../auth/roles';
import { TOKEN_KEY, EXPIRES_AT_KEY } from '../../api/client';

// The real child sections are covered by their own suites; this file is about
// ROUTING and the role guard, so the section bodies are lightweight stubs.
vi.mock('./AdminUsers', () => ({
  default: () => <div data-testid="admin-users">Users</div>,
}));
vi.mock('./AdminActivePermissions', () => ({
  default: () => <div data-testid="admin-permissions">Permissions</div>,
}));
vi.mock('../../pages/Resources', () => ({
  default: () => <div data-testid="admin-resources">Resources</div>,
}));
vi.mock('../../pages/Policies', () => ({
  default: () => <div data-testid="admin-policies">Policies</div>,
}));
vi.mock('../../pages/ApprovalQueue', () => ({
  default: () => <div data-testid="admin-approvals">Approvals</div>,
}));

const seedAuth = (role: string) => {
  localStorage.setItem(TOKEN_KEY, 'token');
  localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3_600_000).toISOString());
  localStorage.setItem(
    'bismarck_pam_user',
    JSON.stringify({ id: 'usr-1', fullName: 'Test User', email: 'me@x.io', role }),
  );
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

/**
 * Mirrors the nested /admin tree App.tsx mounts, plus the legacy /policies
 * route, so the guard is exercised exactly as it is in the real app.
 */
const renderAdmin = (initialPath: string, role: string) => {
  seedAuth(role);
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        {/* Outside <Routes> on purpose: a catch-all probe would unmount as soon
            as a real route matches, so the current path must be read here. */}
        <LocationProbe />
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole allowed={isAdminOrSecurityAdmin}>
                <AdminDashboard />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<div data-testid="admin-users">Users</div>} />
            <Route path="resources" element={<div data-testid="admin-resources">Resources</div>} />
            <Route path="policies" element={<div data-testid="admin-policies">Policies</div>} />
            <Route
              path="approvals"
              element={
                <RequireRole allowed={isApprover}>
                  <div data-testid="admin-approvals">Approvals</div>
                </RequireRole>
              }
            />
            <Route
              path="permissions"
              element={<div data-testid="admin-permissions">Permissions</div>}
            />
          </Route>
          <Route
            path="/policies"
            element={
              <RequireRole allowed={isAdminOrSecurityAdmin}>
                <div data-testid="legacy-policies">Legacy Policies</div>
              </RequireRole>
            }
          />
          <Route path="/not-found" element={<div data-testid="not-found" />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('Admin Dashboard routing & role guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lets Admin reach /admin/users', async () => {
    renderAdmin('/admin/users', 'Admin');
    expect(await screen.findByTestId('admin-users')).toBeInTheDocument();
  });

  it('lets Security Admin reach /admin/users', async () => {
    renderAdmin('/admin/users', 'Security Admin');
    expect(await screen.findByTestId('admin-users')).toBeInTheDocument();
  });

  it('blocks an ordinary authenticated user with "Access restricted"', async () => {
    renderAdmin('/admin/users', 'Developer');

    expect(await screen.findByTestId('forbidden')).toHaveTextContent(/access restricted/i);
    expect(screen.queryByTestId('admin-users')).toBeNull();
  });

  it('blocks a Manager, who is not a dashboard admin', async () => {
    renderAdmin('/admin/users', 'Manager');
    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
  });

  it('blocks an Auditor', async () => {
    renderAdmin('/admin/permissions', 'Auditor');
    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
  });

  it('cannot bypass the guard by navigating directly to /admin/policies', async () => {
    renderAdmin('/admin/policies', 'Developer');

    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-policies')).toBeNull();
  });

  it('cannot bypass the guard by navigating directly to /admin/permissions', async () => {
    renderAdmin('/admin/permissions', 'Developer');

    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-permissions')).toBeNull();
  });

  it('cannot bypass the Admin guard through the legacy /policies route', async () => {
    renderAdmin('/policies', 'Developer');

    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-policies')).toBeNull();
  });

  it('still allows Admin through the legacy /policies route', async () => {
    renderAdmin('/policies', 'Admin');
    expect(await screen.findByTestId('legacy-policies')).toBeInTheDocument();
  });

  it('redirects the default /admin route to /admin/users', async () => {
    renderAdmin('/admin', 'Admin');

    expect(await screen.findByTestId('admin-users')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/users'));
  });

  it('navigates between sections with React Router and no page reload', async () => {
    const user = userEvent.setup();
    const unloadSpy = vi.fn();
    window.addEventListener('beforeunload', unloadSpy);
    renderAdmin('/admin/users', 'Admin');
    await screen.findByTestId('admin-users');

    await user.click(screen.getByRole('link', { name: /admin resources/i }));
    expect(await screen.findByTestId('admin-resources')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/resources'),
    );

    await user.click(screen.getByRole('link', { name: /admin policies/i }));
    expect(await screen.findByTestId('admin-policies')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /admin active temporary permissions/i }));
    expect(await screen.findByTestId('admin-permissions')).toBeInTheDocument();

    // Client-side routing only: no document unload.
    expect(unloadSpy).not.toHaveBeenCalled();
    window.removeEventListener('beforeunload', unloadSpy);
  });

  it('marks the active section and leaves siblings unmarked', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/users', 'Admin');
    await screen.findByTestId('admin-users');

    expect(screen.getByRole('link', { name: /admin users and roles/i })).toHaveClass('active');

    await user.click(screen.getByRole('link', { name: /admin resources/i }));
    await screen.findByTestId('admin-resources');

    expect(screen.getByRole('link', { name: /admin resources/i })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /admin users and roles/i })).not.toHaveClass('active');
  });

  it('renders every consolidated admin section link', async () => {
    renderAdmin('/admin/users', 'Admin');
    await screen.findByTestId('admin-users');

    expect(
      screen.getByRole('navigation', { name: /administration sections/i }),
    ).toBeInTheDocument();
    for (const name of [
      /admin users and roles/i,
      /admin resources/i,
      /admin policies/i,
      /admin approval queue/i,
      /admin active temporary permissions/i,
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('keeps approval authority separate: a Security Admin is not an approver', async () => {
    renderAdmin('/admin/approvals', 'Security Admin');

    // Reaching the dashboard must not silently grant human approval rights.
    expect(await screen.findByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-approvals')).toBeNull();
  });

  it('shows the approval queue for an Admin, who is a configured approver', async () => {
    renderAdmin('/admin/approvals', 'Admin');
    expect(await screen.findByTestId('admin-approvals')).toBeInTheDocument();
  });
});
