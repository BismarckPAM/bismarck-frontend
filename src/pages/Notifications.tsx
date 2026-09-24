import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useWorkflow } from '../state/WorkflowContext';
import { LoadingState, ErrorState, EmptyState, UnsupportedNotice } from '../components/common/StateViews';
import { formatDateTime, timeAgo } from '../utils/format';

export const Notifications: React.FC = () => {
  const {
    notifications,
    notificationsLoading,
    notificationsError,
    refreshNotifications,
    viewedIds,
    markViewed,
  } = useWorkflow();

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-description">Events for your access requests and security activity.</p>
        </div>
        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => void refreshNotifications()}
          disabled={notificationsLoading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      <UnsupportedNotice message="Notifications are an immutable server-side log; the backend exposes no mark-as-read endpoint, so 'read' state is local to this session only." />

      {notificationsLoading && notifications.length === 0 && (
        <LoadingState message="Loading notifications…" />
      )}

      {notificationsError && (
        <ErrorState message={notificationsError} onRetry={() => void refreshNotifications()} />
      )}

      {!notificationsLoading && !notificationsError && notifications.length === 0 && (
        <EmptyState title="No notifications" message="You have no notifications yet." />
      )}

      {notifications.length > 0 && (
        <ul className="notification-feed" data-testid="notification-feed">
          {notifications.map((item) => {
            const isUnread = !item.isRead && !viewedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={`notification-feed-item ${isUnread ? 'unread' : ''}`}
                data-testid="feed-item"
              >
                <div className="notification-feed-header">
                  <span className="notification-feed-title">{item.title}</span>
                  <span className="notification-feed-type">{item.eventType}</span>
                </div>
                <p className="notification-feed-message">{item.message}</p>
                <div className="notification-feed-footer">
                  <span title={formatDateTime(item.createdAt)}>{timeAgo(item.createdAt)}</span>
                  {isUnread && (
                    <button type="button" className="link-btn" onClick={() => markViewed(item.id)}>
                      Mark as read (local)
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default Notifications;