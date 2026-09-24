import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Clock, CheckCircle2, XCircle, Bell, ShieldCheck } from 'lucide-react';
import { useWorkflow } from '../state/WorkflowContext';
import { useAuth } from '../context/useAuth';
import { isApprover, canViewAudit } from '../auth/roles';
import { listPendingApprovalRequests } from '../api/approval';
import { isApiError } from '../api/errors';
import { LoadingState, EmptyState, UnsupportedNotice } from '../components/common/StateViews';
import { formatDateTime, timeAgo } from '../utils/format';
import { capabilities } from '../api/config';
import type { ApprovalRequest } from '../types/pam';

export const Dashboard: React.FC = () => {
  const { myRequests, notifications, unreadCount, notificationsError } = useWorkflow();
  const { user } = useAuth();
  const approver = isApprover(user);

  const [queue, setQueue] = useState<ApprovalRequest[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // The approval queue is optional on the dashboard: a failure must not break it.
  useEffect(() => {
    if (!approver || !capabilities.approvalPendingQueue) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueueLoading(true);
    void (async () => {
      try {
        const data = await listPendingApprovalRequests();
        if (active) setQueue(data);
      } catch (error) {
        if (active) setQueueError(isApiError(error) ? error.message : 'Queue unavailable.');
      } finally {
        if (active) setQueueLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [approver]);

  const counts = useMemo(() => {
    return {
      total: myRequests.length,
      pending: myRequests.filter((request) => request.status === 'PENDING').length,
      approved: myRequests.filter((request) => request.status === 'APPROVED').length,
      rejected: myRequests.filter((request) => request.status === 'REJECTED').length,
    };
  }, [myRequests]);

  const recentNotifications = notifications.slice(0, 5);

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Welcome back, {user?.fullName || 'user'} · Role: {user?.role || '—'}
          </p>
        </div>
      </div>

      <UnsupportedNotice message="Counters below reflect requests submitted during this browser session: the backend exposes no 'my requests' or JIT 'list' endpoints, so a full server-side history is not available." />

      <div className="metrics-grid">
        <article className="metric-card">
          <Send size={20} aria-hidden="true" />
          <span className="metric-value" data-testid="metric-total">
            {counts.total}
          </span>
          <span className="metric-label">Total requests</span>
        </article>
        <article className="metric-card">
          <Clock size={20} aria-hidden="true" />
          <span className="metric-value" data-testid="metric-pending">
            {counts.pending}
          </span>
          <span className="metric-label">Pending</span>
        </article>
        <article className="metric-card">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span className="metric-value" data-testid="metric-approved">
            {counts.approved}
          </span>
          <span className="metric-label">Approved</span>
        </article>
        <article className="metric-card">
          <XCircle size={20} aria-hidden="true" />
          <span className="metric-value" data-testid="metric-rejected">
            {counts.rejected}
          </span>
          <span className="metric-label">Rejected</span>
        </article>
        <article className="metric-card">
          <Bell size={20} aria-hidden="true" />
          <span className="metric-value" data-testid="metric-unread">
            {unreadCount}
          </span>
          <span className="metric-label">Unread notifications</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <h2 className="panel-title">Recent notifications</h2>
          {notificationsError && <p className="wf-hint">{notificationsError}</p>}
          {recentNotifications.length === 0 ? (
            <EmptyState title="No notifications" message="You are all caught up." />
          ) : (
            <ul className="dashboard-list">
              {recentNotifications.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span className="dashboard-list-meta">
                    {item.message} · {timeAgo(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link className="link-btn" to="/notifications">
            View all notifications
          </Link>
        </div>

        {approver && (
          <div className="dashboard-panel">
            <h2 className="panel-title">Requests awaiting your approval</h2>
            {queueLoading && <LoadingState message="Loading queue…" />}
            {queueError && <p className="wf-hint">{queueError}</p>}
            {!queueLoading && !queueError && (queue?.length ?? 0) === 0 && (
              <EmptyState title="Nothing to approve" message="No pending requests right now." />
            )}
            {!queueLoading && queue && queue.length > 0 && (
              <ul className="dashboard-list">
                {queue.slice(0, 5).map((request) => (
                  <li key={request.id}>
                    <strong>{request.resourceId}</strong>
                    <span className="dashboard-list-meta">
                      {request.requesterUserId} · {formatDateTime(request.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="link-btn" to="/approval-queue">
              Go to Approval Queue
            </Link>
          </div>
        )}

        {canViewAudit(user) && (
          <div className="dashboard-panel">
            <h2 className="panel-title">Audit & security</h2>
            <p className="wf-hint">
              <ShieldCheck size={14} aria-hidden="true" /> You have access to the audit log.
            </p>
            <Link className="link-btn" to="/audit">
              Open Audit Log
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
