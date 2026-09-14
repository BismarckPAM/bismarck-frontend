import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { checkAuthorizationApi } from '../api/authorization';
import { getResourcesApi } from '../api/resources';
import { getUsersApi } from '../api/users';
import type { Resource } from '../types/resource';
import type { User } from '../types/auth';
import type { AuthorizationDecisionResult } from '../types/policy';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete the access check.';
const actionOptions = [
  ['READ_STATUS', 'Read status'],
  ['VIEW_LOGS', 'View logs'],
  ['EXECUTE_QUERY', 'Execute query'],
  ['APP_CONNECT', 'Application connect'],
  ['SSH_ACCESS', 'SSH access'],
  ['DEPLOY_BUILD', 'Deploy build'],
  ['CONFIG_WRITE', 'Configuration write'],
  ['ADMIN_WRITE', 'Administrative write'],
  ['ROOT_ACCESS', 'Root access'],
] as const;

export default function AccessCheck() {
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [userId, setUserId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [action, setAction] = useState('READ_STATUS');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(120);
  const [result, setResult] = useState<AuthorizationDecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [loadedUsers, loadedResources] = await Promise.all([getUsersApi(), getResourcesApi()]);
        setUsers(loadedUsers);
        setResources(loadedResources);
        setUserId(loadedUsers[0]?.id ?? '');
        const approvalResource = loadedResources.find(
          (resource) =>
            resource.environment?.toUpperCase() === 'PRODUCTION' ||
            resource.criticality?.toUpperCase() === 'CRITICAL',
        );
        setResourceId((approvalResource ?? loadedResources[0])?.id ?? '');
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    };
    void loadOptions();
  }, []);

  const runCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsChecking(true);
    setError('');
    try {
      setResult(await checkAuthorizationApi({ userId, resourceId, action, sessionDurationMinutes }));
    } catch (requestError) {
      setError(errorMessage(requestError));
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  };

  const decisionIcon = result?.decision === 'ALLOW' ? <CheckCircle2 /> : result?.decision === 'APPROVAL_REQUIRED' ? <Clock3 /> : <AlertTriangle />;

  return <section className="page-container"><div className="page-header-row"><div><h1 className="page-title">Access Check Simulator</h1><p className="page-description">Replay an authorization decision before granting a privileged session.</p></div></div>{error && <div className="policy-error" role="alert">{error}</div>}<div className="simulator-layout"><form className="simulator-panel" onSubmit={runCheck}><div className="simulator-panel-heading"><ShieldCheck size={20} /><h2>Run a check</h2></div>{isLoading ? <div className="simulator-loading" role="status"><div className="spinner" /> Loading users and resources...</div> : <><label className="form-group"><span className="form-label">User</span><select className="form-input" required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Select a user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>)}</select></label><label className="form-group"><span className="form-label">Resource</span><select className="form-input" value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Select a resource</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.environment}</option>)}</select></label><label className="form-group"><span className="form-label">Action</span><select className="form-input" value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-group"><span className="form-label">Session duration (minutes)</span><input className="form-input" type="number" min="1" max="1440" value={sessionDurationMinutes} onChange={(event) => setSessionDurationMinutes(Number(event.target.value))} /></label><button className="primary-action-btn simulator-submit" type="submit" disabled={isChecking || !userId || !resourceId}>{isChecking ? 'Checking...' : 'Evaluate access'}</button></>}</form>{result ? <div className={`decision-panel decision-${result.decision.toLowerCase()}`} data-testid="decision-result"><div className="decision-icon">{decisionIcon}</div><span className="decision-label">{result.decision.replace('_', ' ')}</span><h2>{result.reason}</h2>{result.details && <p>{result.details}</p>}{result.expiresAt && <p className="decision-meta">Session expires {new Date(result.expiresAt).toLocaleString()}</p>}</div> : <div className="decision-placeholder"><ShieldCheck size={32} /><h2>Ready to simulate</h2><p>Choose a user, resource, and action to see the authorization service decision.</p></div>}</div></section>;
}