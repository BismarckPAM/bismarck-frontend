import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './state/WorkflowProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RequireRole from './components/auth/RequireRole';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './features/landing/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestAccess from './pages/RequestAccess';
import MyRequests from './pages/MyRequests';
import ApprovalQueue from './pages/ApprovalQueue';
import JitAccess from './pages/JitAccess';
import Notifications from './pages/Notifications';
import AuditLog from './pages/AuditLog';
import Users from './pages/Users';
import Resources from './pages/Resources';
import Policies from './pages/Policies';
import AccessCheck from './pages/AccessCheck';
import Onboarding from './pages/Onboarding';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminActivePermissions from './pages/admin/AdminActivePermissions';
import { isApprover, canViewAudit, isAdmin, isAdminOrSecurityAdmin } from './auth/roles';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkflowProvider>
          <Routes>
            {/* Public Marketing Landing */}
            <Route path="/" element={<LandingPage />} />
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/request-access" element={<RequestAccess />} />
                <Route path="/my-requests" element={<MyRequests />} />
                <Route
                  path="/approval-queue"
                  element={
                    <RequireRole allowed={isApprover}>
                      <ApprovalQueue />
                    </RequireRole>
                  }
                />
                <Route path="/jit-access" element={<JitAccess />} />
                <Route
                  path="/audit"
                  element={
                    <RequireRole allowed={canViewAudit}>
                      <AuditLog />
                    </RequireRole>
                  }
                />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/users" element={<Users />} />
                <Route path="/resources" element={<Resources />} />
                {/* Legacy standalone policy route, kept for backward compatibility but
                    now behind the same guard as the Admin Dashboard, so a normal
                    authenticated user cannot reach policy management through it. */}
                <Route
                  path="/policies"
                  element={
                    <RequireRole allowed={isAdminOrSecurityAdmin}>
                      <Policies />
                    </RequireRole>
                  }
                />
                <Route path="/access-check" element={<AccessCheck />} />

                {/* BIS-405 Admin Dashboard.
                    Nested React Router routes guarded as a single subtree: a direct
                    hit on any child (/admin/users, /admin/policies, ...) lands on the
                    same guard, so the sidebar link cannot be bypassed by typing a URL.
                    Resources / Policies / Approval Queue are the EXISTING components —
                    their behaviour and backend permission model are unchanged. */}
                <Route
                  path="/admin"
                  element={
                    <RequireRole allowed={isAdminOrSecurityAdmin}>
                      <AdminDashboard />
                    </RequireRole>
                  }
                >
                  <Route index element={<Navigate to="/admin/users" replace />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="resources" element={<Resources />} />
                  <Route path="policies" element={<Policies />} />
                  {/* Approval authority is a separate capability: a Security Admin can
                      reach the dashboard but is NOT automatically an approver. The
                      existing isApprover check (and the Approval Service's own
                      backend authorization) still decides. */}
                  <Route
                    path="approvals"
                    element={
                      <RequireRole allowed={isApprover}>
                        <ApprovalQueue />
                      </RequireRole>
                    }
                  />
                  <Route path="permissions" element={<AdminActivePermissions />} />
                </Route>
                <Route
                  path="/onboarding"
                  element={
                    <RequireRole allowed={isAdmin}>
                      <Onboarding />
                    </RequireRole>
                  }
                />
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkflowProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
