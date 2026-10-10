import React from 'react';

/**
 * Lightweight analytics loading skeleton (DoD-3).
 *
 * The dashboard must never flash a blank white panel while the Analytics
 * requests are in flight. The shape mirrors the real section - four metric
 * cards, one large chart, then two side-by-side charts - so the layout does not
 * jump when the data lands.
 *
 * It reuses the project's existing `skeleton-row` / `pulseSkeleton` styling
 * rather than introducing a second skeleton system, and needs no dependency.
 * The whole block is `aria-hidden` and the status text below announces it to
 * assistive technology.
 */
export const AnalyticsSkeleton: React.FC = () => (
  <div className="analytics-skeleton" data-testid="analytics-skeleton">
    <div className="metrics-grid analytics-metrics-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div className="skeleton-row" key={index}>
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>

    <div className="dashboard-panel analytics-chart-large" aria-hidden="true">
      <div className="skeleton-table">
        <div className="skeleton-line long" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line long" />
      </div>
    </div>

    <div className="analytics-chart-grid" aria-hidden="true">
      <div className="dashboard-panel analytics-chart-card">
        <div className="skeleton-table">
          <div className="skeleton-line medium" />
          <div className="skeleton-line short" />
        </div>
      </div>
      <div className="dashboard-panel analytics-chart-card">
        <div className="skeleton-table">
          <div className="skeleton-line medium" />
          <div className="skeleton-line short" />
        </div>
      </div>
    </div>

    <p className="wf-hint" role="status" aria-live="polite">
      Loading access analytics…
    </p>
  </div>
);

export default AnalyticsSkeleton;
