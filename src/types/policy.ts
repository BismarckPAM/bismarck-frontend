export type AuthorizationDecision = 'ALLOW' | 'DENY' | 'APPROVAL_REQUIRED';

export interface AccessPolicy {
  id: string;
  role: string;
  resourceType: string;
  environment: string;
  criticality: string;
  maxAccessLevel: number;
  requiresApprovalForElevated: boolean;
  isActive: boolean;
}

export interface AccessPolicyRequest {
  role: string;
  resourceType: string;
  environment: string;
  criticality: string;
  maxAccessLevel: number;
  requiresApprovalForElevated: boolean;
}

export interface AuthorizationCheckRequest {
  userId: string;
  resourceId: string;
  action: string;
  sessionDurationMinutes: number;
}

export interface AuthorizationDecisionResult {
  decision: AuthorizationDecision;
  reason: string;
  expiresAt?: string;
  approvalRequirement?: string;
  details?: string;
}