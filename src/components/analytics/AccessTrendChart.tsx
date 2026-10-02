import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../common/StateViews';
import {
  buildTrendSeries,
  formatTrendTooltip,
  SERIES_COLORS,
  TREND_SERIES,
} from './analyticsFormat';
import type { AnalyticsTrendPoint } from '../../types/analytics';

/**
 * Chart 1 - requests / approvals / denials / revocations over time (AC-1).
 *
 * Sourced from `GET /api/analytics/summary`, whose `trend` array is a real
 * daily UTC time series built by the Analytics Service. Nothing is derived in
 * the browser, and no value is ever invented: with no buckets the chart is
 * replaced by an empty state rather than an empty (or fabricated) plot.
 *
 * The container height is fixed in CSS and the width is 100%, so the
 * ResponsiveContainer adapts from a tablet down to a narrow phone without the
 * SVG ever exceeding its card.
 */
export interface AccessTrendChartProps {
  trend: AnalyticsTrendPoint[];
}

export const AccessTrendChart: React.FC<AccessTrendChartProps> = ({ trend }) => {
  const data = buildTrendSeries(trend);

  return (
    <figure
      className="dashboard-panel analytics-chart-card analytics-chart-large"
      aria-labelledby="analytics-trend-title"
    >
      <figcaption>
        <h2 className="panel-title" id="analytics-trend-title">
          Request &amp; access activity
        </h2>
        <p className="wf-hint">
          Daily UTC buckets across the selected range. Days without recorded access activity are not
          emitted by the Analytics Service, so a gap means no events, not missing data.
        </p>
      </figcaption>

      {data.length === 0 ? (
        <EmptyState
          title="No access activity for this date range."
          message="Nothing was requested, approved, denied or revoked in the selected window."
        />
      ) : (
        <>
          <div className="analytics-chart-container analytics-chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(113, 0, 95, 0.12)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#6f5b6d' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#6f5b6d' }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip
                  formatter={formatTrendTooltip}
                  labelFormatter={(label) => `Day bucket: ${label}`}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(113, 0, 95, 0.15)',
                    fontSize: '0.85rem',
                  }}
                />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: '0.85rem' }} />
                {TREND_SERIES.map(({ dataKey, label }) => (
                  <Line
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    name={label}
                    stroke={SERIES_COLORS[dataKey]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/*
            Text equivalent of the plot. Charts must not be purely visual
            black boxes, so every bucket and series is also exposed as readable
            text for screen readers (and for anyone using the page without the
            SVG). Visually hidden to avoid duplicating the chart on screen.
          */}
          <table className="analytics-sr-only">
            <caption>Requests, approvals, denials and revocations per day</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {TREND_SERIES.map(({ label }) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{point.label}</th>
                  {TREND_SERIES.map(({ dataKey }) => (
                    <td key={dataKey}>{point[dataKey]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
};

export default AccessTrendChart;
