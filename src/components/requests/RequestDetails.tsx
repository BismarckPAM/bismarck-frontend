import React from 'react';
import type { ApprovalRequest } from '../../types/pam';
import { ApprovalStatusBadge } from '../common/StatusBadge';
import { formatDateTime, formatDuration, levelLabel } from '../../utils/format';

/**
 * Reusable request detail view used by My Requests, the Approval Queue,
 * the Dashboard, Notifications and Audit references.
 */
export const RequestDetails: React.FC<{
  request: ApprovalRequest;
  resourceName?: string;
}> = ({ request, resourceName }) => {
  // Only render timeline stages that actually apply to this request.
  const stages: Array<{ label: string; at?: string | null; done: boolean }> = [
    { label: 'Submitted', at: request.createdAt, done: true },
    { label: 'Pending', at: request.createdAt, done: true },
  ];
  if (request.status === 'APPROVED') {
    stages.push({ label: 'Approved', at: request.reviewedAt, done: true });
    stages.push({ label: 'Active (JIT)', at: request.reviewedAt, done: true });
  } else if (request.status === 'REJECTED') {
    stages.push({ label: 'Rejected', at: request.reviewedAt, done: true });
  } else {
    stages.push({ label: 'Decision', at: null, done: false });
  }

  return (
    <div className="wf-details" data-testid="request-details">
      <dl className="wf-detail-grid">
        <div>
          <dt>Request ID</dt>
          <dd className="wf-mono">{request.id}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <ApprovalStatusBadge status={request.status} />
          </dd>
        </div>
        <div>
          <dt>Requester</dt>
          <dd>{request.requesterUserId}</dd>
        </div>
        <div>
          <dt>Resource</dt>
          <dd>{resourceName || request.resourceId}</dd>
        </div>
        <div>
          <dt>Requested level</dt>
          <dd>{levelLabel(request.requestedLevel)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(request.durationMinutes)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDateTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{formatDateTime(request.reviewedAt)}</dd>
        </div>
        <div>
          <dt>Approver</dt>
          <dd>{request.reviewedByUserId || '—'}</dd>
        </div>
      </dl>

      <div className="wf-detail-block">
        <h3>Justification</h3>
        <p>{request.reason || '—'}</p>
      </div>

      {request.status === 'REJECTED' && (
        <div className="wf-detail-block wf-detail-rejected">
          <h3>Rejection reason</h3>
          <p>{request.rejectionReason || 'No reason provided.'}</p>
        </div>
      )}

      <div className="wf-detail-block">
        <h3>Status timeline</h3>
        <ol className="wf-timeline">
          {stages.map((stage) => (
            <li key={stage.label} className={stage.done ? 'done' : 'pending'}>
              <span className="wf-timeline-dot" aria-hidden="true" />
              <span className="wf-timeline-label">{stage.label}</span>
              <span className="wf-timeline-time">{stage.done ? formatDateTime(stage.at) : 'Awaiting decision'}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default RequestDetails;