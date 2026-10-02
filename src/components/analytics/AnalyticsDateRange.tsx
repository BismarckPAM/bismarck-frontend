import React from 'react';
import { CalendarRange, RotateCcw, RefreshCw } from 'lucide-react';

/**
 * The single, global analytics date range (AC-4).
 *
 * One component owns the From / To inputs for all three analytics datasets, so
 * the charts can never disagree about which window they describe. Both inputs
 * use a native `<input type="date">`, so the values stay bare `yyyy-MM-dd`
 * strings and are converted to UTC instants by the caller.
 *
 * An empty pair means "All time": the whole stored history, with no invented
 * default window.
 */
export interface AnalyticsDateRangeProps {
  /** `yyyy-MM-dd` or empty. */
  from: string;
  /** `yyyy-MM-dd` or empty. */
  to: string;
  /** Set when the range is inverted; requests are suppressed while it is set. */
  validationError: string | null;
  /** True while a refresh is in flight, so the button can show progress. */
  loading: boolean;
  onChange: (next: { from: string; to: string }) => void;
  onReset: () => void;
  onRefresh: () => void;
}

export const AnalyticsDateRange: React.FC<AnalyticsDateRangeProps> = ({
  from,
  to,
  validationError,
  loading,
  onChange,
  onReset,
  onRefresh,
}) => (
  <div className="analytics-toolbar">
    <div className="analytics-date-controls">
      <div className="analytics-date-field">
        <label htmlFor="analytics-from-date">From date</label>
        <input
          id="analytics-from-date"
          type="date"
          className="analytics-date-input"
          value={from}
          aria-label="From date"
          aria-invalid={validationError ? true : undefined}
          onChange={(event) => onChange({ from: event.target.value, to })}
        />
      </div>

      <div className="analytics-date-field">
        <label htmlFor="analytics-to-date">To date</label>
        <input
          id="analytics-to-date"
          type="date"
          className="analytics-date-input"
          value={to}
          aria-label="To date"
          aria-invalid={validationError ? true : undefined}
          onChange={(event) => onChange({ from, to: event.target.value })}
        />
      </div>

      <button type="button" className="secondary-action-btn" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>All time</span>
      </button>

      <button
        type="button"
        className="secondary-action-btn"
        onClick={onRefresh}
        // Refreshing keeps the current range; it never resets the dates.
        disabled={loading}
      >
        <RefreshCw size={16} aria-hidden="true" className={loading ? 'spinning-icon' : ''} />
        <span>Refresh</span>
      </button>
    </div>

    {validationError ? (
      <p className="analytics-validation" role="alert" data-testid="analytics-range-error">
        <CalendarRange size={14} aria-hidden="true" />
        <span>{validationError}</span>
      </p>
    ) : (
      <p className="wf-hint">
        <CalendarRange size={14} aria-hidden="true" />
        <span>Leave both dates empty for all available history.</span>
      </p>
    )}
  </div>
);

export default AnalyticsDateRange;
