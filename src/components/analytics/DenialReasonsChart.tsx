import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EmptyState } from '../common/StateViews';
import {
  buildDenialSlices,
  formatDenialTooltip,
  formatPercentage,
  type DenialChartSlice,
} from './analyticsFormat';
import type { DenialReasonsResponse } from '../../types/analytics';

/**
 * Chart 3 - the breakdown of denial reasons (AC-3).
 *
 * A doughnut (`PieChart` with an `innerRadius`) sourced from
 * `GET /api/analytics/denial-reasons`. Percentages come from the Analytics
 * Service, which computes them against the *total in range* and rounds to two
 * decimals; the frontend only falls back to deriving a share from that same
 * response's `totalDenials` if the field is ever absent, and a zero total
 * yields 0 rather than a division by zero.
 *
 * A range with no denials renders an empty state. No zero-value slice is ever
 * drawn, because an empty pie is both ugly and misleading.
 */
export interface DenialReasonsChartProps {
  denialReasons: DenialReasonsResponse;
}

export const DenialReasonsChart: React.FC<DenialReasonsChartProps> = ({ denialReasons }) => {
  const slices = buildDenialSlices(denialReasons.items, denialReasons.totalDenials);
  const hasData = denialReasons.totalDenials > 0 && slices.length > 0;

  return (
    <figure
      className="dashboard-panel analytics-chart-card"
      aria-labelledby="analytics-denial-reasons-title"
    >
      <figcaption>
        <h2 className="panel-title" id="analytics-denial-reasons-title">
          Denial reasons
        </h2>
        <p className="wf-hint">
          Why access was refused, across authorization denials and human rejections (
          {denialReasons.totalDenials} total denial
          {denialReasons.totalDenials === 1 ? '' : 's'}).
        </p>
      </figcaption>

      {!hasData ? (
        <EmptyState
          title="No denials for this date range."
          message="Nothing was denied in the selected window."
        />
      ) : (
        <>
          <div className="analytics-chart-container analytics-chart-doughnut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name, entry) =>
                    formatDenialTooltip(
                      value,
                      (entry as unknown as { payload?: DenialChartSlice }).payload,
                      name,
                    )
                  }
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(113, 0, 95, 0.15)',
                    fontSize: '0.85rem',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.82rem' }} />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="reason"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.reason} fill={slice.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Visible legend table: the same data without relying on colour. */}
          <table className="analytics-legend-table">
            <caption className="analytics-sr-only">
              Denial reasons with counts and share of all denials
            </caption>
            <thead>
              <tr>
                <th scope="col">Reason</th>
                <th scope="col">Denials</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice) => (
                <tr key={slice.reason}>
                  <th scope="row">{slice.reason}</th>
                  <td>{slice.count}</td>
                  <td>{formatPercentage(slice.percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
};

export default DenialReasonsChart;
