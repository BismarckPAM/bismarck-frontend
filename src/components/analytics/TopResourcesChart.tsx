import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../common/StateViews';
import { formatResourceTooltip, resolveResourceLabel, truncateLabel } from './analyticsFormat';
import type { TopResourcesResponse } from '../../types/analytics';

/**
 * Chart 2 - the most-requested resources (AC-2).
 *
 * Sourced directly from `GET /api/analytics/top-resources`. The ranking is
 * already produced and limited by the Analytics Service, so the frontend never
 * re-aggregates and never discards rows the API chose to return.
 *
 * Horizontal bars are used because resource names are long. Each axis label is
 * truncated to keep the plot readable, but the untruncated name and the exact
 * count stay available through the tooltip and the text table below the chart.
 */
export interface TopResourcesChartProps {
  resources: TopResourcesResponse;
}

/** Row height for the bars, plus the room the axis labels and margins need. */
const ROW_HEIGHT = 32;
const MIN_CHART_HEIGHT = 200;
/** Fixed label column so long resource names cannot eat the whole plot. */
const AXIS_LABEL_WIDTH = 150;

export const TopResourcesChart: React.FC<TopResourcesChartProps> = ({ resources }) => {
  // Ranked descending by the API; sorting here is a cheap guarantee rather
  // than an assumption, and does not mutate the response.
  const items = [...resources.items]
    .sort((left, right) => left.rank - right.rank)
    .map((item) => {
      const fullName = resolveResourceLabel(item);
      return { ...item, fullName, label: truncateLabel(fullName, 22) };
    });

  const chartHeight = Math.max(MIN_CHART_HEIGHT, items.length * ROW_HEIGHT + 60);

  return (
    <figure
      className="dashboard-panel analytics-chart-card"
      aria-labelledby="analytics-top-resources-title"
    >
      <figcaption>
        <h2 className="panel-title" id="analytics-top-resources-title">
          Most requested resources
        </h2>
        <p className="wf-hint">
          Ranked by approved-request activity across the selected range ({resources.totalRequests}{' '}
          total request{resources.totalRequests === 1 ? '' : 's'}).
        </p>
      </figcaption>

      {items.length === 0 ? (
        <EmptyState
          title="No resource requests for this date range."
          message="No access requests were submitted in the selected window."
        />
      ) : (
        <>
          {/* Height follows the number of ranked rows so every bar is fully
              visible; the width still comes from ResponsiveContainer. */}
          <div className="analytics-chart-container" style={{ height: `${chartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
                barCategoryGap={8}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(113, 0, 95, 0.12)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#6f5b6d' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#6f5b6d' }}
                  tickLine={false}
                  axisLine={false}
                  width={AXIS_LABEL_WIDTH}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(113, 0, 95, 0.06)' }}
                  formatter={(value, _name, entry) =>
                    formatResourceTooltip(
                      value,
                      (entry as unknown as { payload: (typeof items)[number] }).payload,
                      resources.totalRequests,
                    )
                  }
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(113, 0, 95, 0.15)',
                    fontSize: '0.85rem',
                  }}
                />
                <Bar
                  dataKey="requestCount"
                  name="Requests"
                  fill="#71005f"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="requestCount" position="right" fill="#6f5b6d" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="analytics-sr-only">
            <caption>Most requested resources and their request counts</caption>
            <thead>
              <tr>
                <th scope="col">Resource</th>
                <th scope="col">Requests</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.rank}-${item.fullName}`}>
                  <th scope="row">{item.fullName}</th>
                  <td>{item.requestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
};

export default TopResourcesChart;
