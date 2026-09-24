import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './state/WorkflowProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RequireRole from './components/auth/RequireRole';
import AppLayout from './components/layout/AppLayout';
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
import NotFound from './pages/NotFound';
import { isApprover, canViewAudit } from './auth/roles';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkflowProvider>
          <Routes>
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
                <Route path="/policies" element={<Policies />} />
                <Route path="/access-check" element={<AccessCheck />} />
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
