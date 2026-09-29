import { createContext, useContext } from 'react';
import type { ApprovalRequest, NotificationItem, RequestCounters } from '../types/pam';

/**
 * Cross-screen workflow state.
 *
 * `myRequests` is served by the backend (`GET /api/approval/requests/me`) and is
 * therefore a full server-side history that survives page reloads and new
 * browser sessions. `addMyRequest` still optimistically prepends a newly
 * created request so the UI updates immediately without waiting for a refetch.
 */
export interface WorkflowContextValue {
  /** The authenticated user's requests, newest first, from the server. */
  myRequests: ApprovalRequest[];
  /** Aggregate counters from the server response (total/pending/approved/rejected). */
  myRequestCounters: RequestCounters;
  myRequestsLoading: boolean;
  myRequestsError: string | null;
  addMyRequest: (request: ApprovalRequest) => void;
  updateMyRequest: (id: string, patch: Partial<ApprovalRequest>) => void;
  refreshMyRequests: () => Promise<void>;

  /** Notifications for the current user. */
  notifications: NotificationItem[];
  unreadCount: number;
  notificationsLoading: boolean;
  notificationsError: string | null;
  /** Locally viewed notification ids (mark-as-read is NOT supported by backend). */
  viewedIds: string[];
  markViewed: (id: string) => void;
  refreshNotifications: () => Promise<void>;
}

export const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export function useWorkflow(): WorkflowContextValue {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
