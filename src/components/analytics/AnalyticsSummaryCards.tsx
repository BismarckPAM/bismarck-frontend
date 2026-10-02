import React from 'react';
import { Send, CheckCircle2, XCircle, ShieldOff } from 'lucide-react';
import type { AnalyticsTotals } from '../../types/analytics';

/**
 * The four server-side Analytics totals for the selected range.
 *
 * These are *platform-wide historical* figures aggregated by the Analytics
 * Service from Kafka events. They are deliberately NOT the same thing as the
 * personal request counters at the top of the Dashboard, which are scoped to
 * the signed-in user; the heading and the section placement make that clear.
 *
 * Genuine zeros render as `0` rather than as a hidden or empty card, because
 * "no activity in this range" is a valid, meaningful answer.
 */
export interface AnalyticsSummaryCardsProps {
  totals: AnalyticsTotals;
  /** Human description of the active range, used for the section subtitle. */
  rangeLabel: string;
}

interface SummaryCard {
  key: keyof AnalyticsTotals;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ size?: number | string; 'aria-hidden'?: boolean }>;
}

const CARDS: SummaryCard[] = [
  {
    key: 'requests',
    label: 'Access requests',
    hint: 'ApprovalRequested events in range',
    Icon: Send,
  },
  {
    key: 'approvals',
    label: 'Approvals',
    hint: 'ApprovalGranted events in range',
    Icon: CheckCircle2,
  },
  {
    key: 'denials',
    label: 'Denials',
    hint: 'AccessDenied or ApprovalRejected events in range',
    Icon: XCircle,
  },
  {
    key: 'revocations',
    label: 'Revocations',
    hint: 'PermissionRevoked events in range, including JIT expiry',
    Icon: ShieldOff,
  },
];

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  totals,
  rangeLabel,
}) => (
  <section className="analytics-metrics" aria-labelledby="analytics-metrics-heading">
    <h3 className="panel-title" id="analytics-metrics-heading">
      Summary
    </h3>
    <p className="wf-hint">{rangeLabel}</p>

    <div className="metrics-grid analytics-metrics-grid">
      {CARDS.map(({ key, label, hint, Icon }) => (
        <article className="metric-card" key={key}>
          <Icon size={20} aria-hidden={true} />
          <span className="metric-value" data-testid={`analytics-total-${key}`}>
            {totals[key]}
          </span>
          <span className="metric-label">{label}</span>
          <span className="dashboard-list-meta">{hint}</span>
        </article>
      ))}
    </div>
  </section>
);

export default AnalyticsSummaryCards;
