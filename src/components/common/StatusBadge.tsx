import React from 'react';
import type { ApprovalStatus, JitStatus } from '../../types/pam';
import { APPROVAL_STATUS_LABEL, JIT_STATUS_LABEL } from '../../utils/format';

/**
 * Status badge that conveys state by TEXT, not colour alone (accessibility).
 * Colour is an enhancement via CSS classes.
 */
export const ApprovalStatusBadge: React.FC<{ status: ApprovalStatus }> = ({ status }) => (
  <span className={`wf-badge wf-badge-${status.toLowerCase()}`} data-testid={`status-${status}`}>
    {APPROVAL_STATUS_LABEL[status]}
  </span>
);

export const JitStatusBadge: React.FC<{ status: JitStatus }> = ({ status }) => (
  <span className={`wf-badge wf-badge-jit-${status.toLowerCase()}`}>
    JIT · {JIT_STATUS_LABEL[status]}
  </span>
);