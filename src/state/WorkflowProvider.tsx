import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WorkflowContext, type WorkflowContextValue } from './WorkflowContext';
import { getNotifications } from '../api/notifications';
import { getMyRequests } from '../api/approval';
import { isApiError } from '../api/errors';
import { capabilities, notificationPollIntervalMs } from '../api/config';
import { useAuth } from '../context/useAuth';
import type { ApprovalRequest, NotificationItem, RequestCounters } from '../types/pam';

const EMPTY_COUNTERS: RequestCounters = { total: 0, pending: 0, approved: 0, rejected: 0 };

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [myRequestCounters, setMyRequestCounters] = useState<RequestCounters>(EMPTY_COUNTERS);
  const [myRequestsLoading, setMyRequestsLoading] = useState<boolean>(false);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState<boolean>(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  // Track in-flight requests so a slow refresh cannot overwrite a newer result.
  const requestSeq = useRef(0);
  const myRequestsSeq = useRef(0);

  // Server-side history for the signed-in user. This is what makes "My Requests"
  // survive a page reload or a new browser session.
  const refreshMyRequests = useCallback(async () => {
    if (!isAuthenticated || !capabilities.approvalMyRequests) return;
    const seq = ++myRequestsSeq.current;
    setMyRequestsLoading(true);
    setMyRequestsError(null);
    try {
      const page = await getMyRequests();
      if (seq !== myRequestsSeq.current) return;
      setMyRequests(page.items);
      setMyRequestCounters(page.counters);
    } catch (error) {
      if (seq !== myRequestsSeq.current) return;
      // Keep whatever is already on screen; surface a message instead of crashing.
      setMyRequestsError(isApiError(error) ? error.message : 'Unable to load your requests.');
    } finally {
      if (seq === myRequestsSeq.current) setMyRequestsLoading(false);
    }
  }, [isAuthenticated]);

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
    // Optimistic prepend: the server response arrives via refreshMyRequests, but
    // the new row should be visible immediately after submitting.
    setMyRequests((current) => [request, ...current]);
    setMyRequestCounters((current) => ({
      ...current,
      total: current.total + 1,
      pending: current.pending + (request.status === 'PENDING' ? 1 : 0),
      approved: current.approved + (request.status === 'APPROVED' ? 1 : 0),
      rejected: current.rejected + (request.status === 'REJECTED' ? 1 : 0),
    }));
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

  // Load the request history once per session (and whenever auth changes).
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch from the server; the result arrives asynchronously and
    // populates the already-rendered table.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMyRequests();
  }, [isAuthenticated, refreshMyRequests]);

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
      setMyRequestCounters(EMPTY_COUNTERS);
      setMyRequestsError(null);
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
    myRequestCounters,
    myRequestsLoading,
    myRequestsError,
    refreshMyRequests,
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
