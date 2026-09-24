import { createContext, useContext } from 'react';
import type { ApprovalRequest, NotificationItem } from '../types/pam';

/**
 * Session-scoped workflow state.
 *
 * IMPORTANT: the backend has no "list my own requests" endpoint, so requests a
 * user submits are tracked client-side for the current session only. They are
 * clearly labelled in the UI as session-scoped and are not presented as a
 * complete server-side history.
 */
export interface WorkflowContextValue {
  /** Requests submitted by the current user during this browser session. */
  myRequests: ApprovalRequest[];
  addMyRequest: (request: ApprovalRequest) => void;
  updateMyRequest: (id: string, patch: Partial<ApprovalRequest>) => void;

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