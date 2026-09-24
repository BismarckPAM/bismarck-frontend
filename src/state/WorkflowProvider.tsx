import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WorkflowContext, type WorkflowContextValue } from './WorkflowContext';
import { getNotifications } from '../api/notifications';
import { isApiError } from '../api/errors';
import { capabilities, notificationPollIntervalMs } from '../api/config';
import { useAuth } from '../context/useAuth';
import type { ApprovalRequest, NotificationItem } from '../types/pam';

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState<boolean>(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  // Track in-flight requests so a slow refresh cannot overwrite a newer result.
  const requestSeq = useRef(0);

  const refreshNotifications = useCallback(async () => {
    if (!userId || !capabilities.notificationsList) return;
    const seq = ++requestSeq.current;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const page = await getNotifications(userId, 1, 20);
      if (seq === requestSeq.current) setNotifications(page.items);
    } catch (error) {
      // Keep the previous feed; surface a clear message instead of crashing.
      if (seq === requestSeq.current) {
        setNotificationsError(isApiError(error) ? error.message : 'Unable to load notifications.');
      }
    } finally {
      if (seq === requestSeq.current) setNotificationsLoading(false);
    }
  }, [userId]);

  const addMyRequest = useCallback((request: ApprovalRequest) => {
    setMyRequests((current) => [request, ...current]);
  }, []);

  const updateMyRequest = useCallback((id: string, patch: Partial<ApprovalRequest>) => {
    setMyRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, ...patch } : request)),
    );
  }, []);

  const markViewed = useCallback((id: string) => {
    // Local only: the Notification service has no mark-as-read endpoint.
    setViewedIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  // Initial load + polling. A single interval is created and cleaned up.
  useEffect(() => {
    if (!isAuthenticated || !userId || !capabilities.notificationsList) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshNotifications();
    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, notificationPollIntervalMs);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, userId, refreshNotifications]);

  // Reset everything when the session changes.
  useEffect(() => {
    if (!isAuthenticated) {
      // Intentional: clear all session-scoped state when the user logs out.
      /* eslint-disable react-hooks/set-state-in-effect */
      setMyRequests([]);
      setNotifications([]);
      setViewedIds([]);
      setNotificationsError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter(
    (item) => !item.isRead && !viewedIds.includes(item.id),
  ).length;

  const value: WorkflowContextValue = {
    myRequests,
    addMyRequest,
    updateMyRequest,
    notifications,
    unreadCount,
    notificationsLoading,
    notificationsError,
    viewedIds,
    markViewed,
    refreshNotifications,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};
