import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RotateCw } from 'lucide-react';
import { useWorkflow } from '../../state/WorkflowContext';
import { formatDateTime, timeAgo } from '../../utils/format';

/**
 * Notification bell + dropdown.
 *
 * The backend exposes only GET /api/notifications/{userId} (no mark-as-read),
 * so "read" state here is LOCAL to the session (see WorkflowProvider.markViewed)
 * and is never presented as persisted on the server.
 */
export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    notificationsError,
    refreshNotifications,
    viewedIds,
    markViewed,
  } = useWorkflow();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpenItem = (id: string) => {
    markViewed(id);
  };

  return (
    <div className="wf-bell" ref={containerRef}>
      <button
        type="button"
        className="wf-bell-button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        data-testid="notification-bell"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="wf-bell-count" data-testid="unread-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="wf-bell-panel" role="dialog" aria-label="Notifications">
          <div className="wf-bell-panel-header">
            <h3>Notifications</h3>
            <button
              type="button"
              className="wf-icon-btn"
              onClick={() => void refreshNotifications()}
              aria-label="Refresh notifications"
              disabled={notificationsLoading}
            >
              <RotateCw size={16} className={notificationsLoading ? 'spinning-icon' : ''} />
            </button>
          </div>

          {notificationsLoading && notifications.length === 0 && (
            <div className="wf-bell-message" role="status">
              Loading notifications…
            </div>
          )}

          {notificationsError && (
            <div className="wf-bell-message wf-bell-error" role="alert">
              <span>{notificationsError}</span>
              <button type="button" className="link-btn" onClick={() => void refreshNotifications()}>
                Retry
              </button>
            </div>
          )}

          {!notificationsError && notifications.length === 0 && !notificationsLoading && (
            <div className="wf-bell-message" data-testid="notifications-empty">
              You have no notifications yet.
            </div>
          )}

          {notifications.length > 0 && (
            <ul className="wf-bell-list">
              {notifications.map((item) => {
                const isUnread = !item.isRead && !viewedIds.includes(item.id);
                return (
                  <li
                    key={item.id}
                    className={`wf-bell-item ${isUnread ? 'unread' : ''}`}
                    data-testid="notification-item"
                  >
                    <button
                      type="button"
                      className="wf-bell-item-button"
                      onClick={() => handleOpenItem(item.id)}
                    >
                      <div className="wf-bell-item-top">
                        <span className="wf-bell-item-title">{item.title}</span>
                        {isUnread && (
                          <span className="wf-unread-dot" aria-label="Unread">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="wf-bell-item-message">{item.message}</p>
                      <span className="wf-bell-item-meta">
                        {item.eventType} · {timeAgo(item.createdAt)} (
                        {formatDateTime(item.createdAt)})
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="wf-bell-panel-footer">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;