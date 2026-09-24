import React from 'react';
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';

/** Consistent loading state — never a blank page while data loads. */
export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
  <div className="wf-state" data-testid="loading-state" role="status" aria-live="polite">
    <div className="spinner" aria-hidden="true" />
    <p className="wf-state-text">{message}</p>
  </div>
);

/** Consistent error state with a retry action. */
export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
  title?: string;
}> = ({ message, onRetry, title = 'Something went wrong' }) => (
  <div className="wf-state wf-state-error" data-testid="error-state" role="alert">
    <AlertTriangle size={32} aria-hidden="true" />
    <h2 className="wf-state-title">{title}</h2>
    <p className="wf-state-text">{message}</p>
    {onRetry && (
      <button type="button" className="retry-btn" onClick={onRetry}>
        <RotateCw size={16} aria-hidden="true" />
        <span>Try Again</span>
      </button>
    )}
  </div>
);

/** Consistent empty state. */
export const EmptyState: React.FC<{
  title: string;
  message?: string;
  action?: React.ReactNode;
}> = ({ title, message, action }) => (
  <div className="wf-state wf-state-empty" data-testid="empty-state">
    <Inbox size={32} aria-hidden="true" />
    <h2 className="wf-state-title">{title}</h2>
    {message && <p className="wf-state-text">{message}</p>}
    {action}
  </div>
);

/** Inline "not configured / not supported" notice for missing endpoints. */
export const UnsupportedNotice: React.FC<{ message: string }> = ({ message }) => (
  <div className="wf-notice" data-testid="unsupported-notice" role="note">
    <AlertTriangle size={16} aria-hidden="true" />
    <span>{message}</span>
  </div>
);
