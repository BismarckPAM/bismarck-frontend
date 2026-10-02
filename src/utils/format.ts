import type { ApprovalStatus, JitStatus } from '../types/pam';

/** Human-readable date/time, tolerant of missing values. */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

/** Human-readable duration in minutes, e.g. "2h 30m". */
export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

/**
 * Start of the selected calendar day in UTC, as an ISO instant.
 *
 * `<input type="date">` yields a bare `YYYY-MM-DD`. Appending `T00:00:00Z`
 * converts the user's day selection into the instant the API expects, so
 * "2026-10-01" is sent as `2026-10-01T00:00:00.000Z`.
 */
export function utcDayStart(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

/**
 * Inclusive end of the selected calendar day in UTC, as an ISO instant.
 *
 * The API's `to` bound is inclusive (`OccurredAt <= to`), so sending midnight
 * would silently exclude every event that happened during that day. Ending at
 * `23:59:59.999` keeps the whole selected day.
 */
export function utcDayEnd(value: string): string | undefined {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

export const APPROVAL_LEVELS = [1, 2, 3, 4, 5] as const;

export function levelLabel(level: number): string {
  switch (level) {
    case 1:
      return 'Level 1 · Read';
    case 2:
      return 'Level 2 · Operate';
    case 3:
      return 'Level 3 · Write';
    case 4:
      return 'Level 4 · Admin';
    case 5:
      return 'Level 5 · Root';
    default:
      return `Level ${level}`;
  }
}

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const JIT_STATUS_LABEL: Record<JitStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/** Relative "x minutes ago" label for notification timestamps. */
export function timeAgo(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
