import { useEffect, useState } from 'react';
import { Edit3, Plus, RotateCw, ShieldOff, X } from 'lucide-react';
import {
  createPolicyApi,
  deactivatePolicyApi,
  getPoliciesApi,
  updatePolicyApi,
} from '../api/policies';
import type { AccessPolicy, AccessPolicyRequest } from '../types/policy';

const emptyForm: AccessPolicyRequest = {
  role: '',
  resourceType: '',
  environment: '',
  criticality: 'MEDIUM',
  maxAccessLevel: 1,
  requiresApprovalForElevated: true,
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to complete the policy request.';

export default function Policies() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<AccessPolicyRequest>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadPolicies = async () => {
    setIsLoading(true);
    setError('');
    try {
      setPolicies(await getPoliciesApi());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPolicies();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (policy: AccessPolicy) => {
    setEditingId(policy.id);
    setIsFormOpen(true);
    setForm({
      role: policy.role,
      resourceType: policy.resourceType,
      environment: policy.environment,
      criticality: policy.criticality,
      maxAccessLevel: policy.maxAccessLevel,
      requiresApprovalForElevated: policy.requiresApprovalForElevated,
    });
  };

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const saved = editingId
        ? await updatePolicyApi(editingId, form)
        : await createPolicyApi(form);
      setPolicies((current) =>
        editingId
          ? current.map((policy) => (policy.id === saved.id ? saved : policy))
          : [...current, saved],
      );
      setEditingId(null);
      setForm(emptyForm);
      setIsFormOpen(false);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const deactivate = async (policy: AccessPolicy) => {
    if (!window.confirm(`Deactivate the ${policy.role} policy?`)) return;
    try {
      const updated = await deactivatePolicyApi(policy.id);
      setPolicies((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Access Policies</h1>
          <p className="page-description">
            Shape how roles reach critical resources across each environment.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="secondary-action-btn"
            onClick={() => void loadPolicies()}
            disabled={isLoading}
          >
            <RotateCw size={16} className={isLoading ? 'spinning-icon' : ''} /> Refresh
          </button>
          <button className="primary-action-btn" onClick={openCreate}>
            <Plus size={16} /> New policy
          </button>
        </div>
      </div>

      {error && (
        <div className="policy-error" role="alert">
          {error}
        </div>
      )}

      {isFormOpen ? (
        <form className="policy-form-panel" onSubmit={savePolicy} aria-label="Policy form">
          <div className="policy-form-heading">
            <h2>{editingId ? 'Edit policy' : 'Create policy'}</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setIsFormOpen(false);
              }}
              aria-label="Close policy form"
            >
              <X size={18} />
            </button>
          </div>
          <div className="policy-form-grid">
            {(['role', 'resourceType', 'environment'] as const).map((field) => (
              <label className="form-group" key={field}>
                <span className="form-label">
                  {field === 'resourceType'
                    ? 'Resource type'
                    : field[0].toUpperCase() + field.slice(1)}
                </span>
                <input
                  className="form-input"
                  required
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                />
              </label>
            ))}
            <label className="form-group">
              <span className="form-label">Criticality</span>
              <select
                className="form-input"
                value={form.criticality}
                onChange={(event) => setForm({ ...form, criticality: event.target.value })}
              >
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">Max access level</span>
              <input
                className="form-input"
                type="number"
                min="0"
                max="5"
                required
                value={form.maxAccessLevel}
                onChange={(event) =>
                  setForm({ ...form, maxAccessLevel: Number(event.target.value) })
                }
              />
            </label>
            <label className="policy-checkbox">
              <input
                type="checkbox"
                checked={form.requiresApprovalForElevated}
                onChange={(event) =>
                  setForm({ ...form, requiresApprovalForElevated: event.target.checked })
                }
              />{' '}
              Require approval for elevated access
            </label>
          </div>
          <button className="primary-action-btn" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create policy'}
          </button>
        </form>
      ) : null}

      <div className="user-directory-card policy-table-card">
        {isLoading ? (
          <div className="directory-loading-container" data-testid="policy-loading" role="status">
            <div className="spinner" />
            <p className="loading-text">Loading access policies...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="directory-empty-state" data-testid="policy-empty">
            <h2 className="empty-heading">No policies found</h2>
            <p className="empty-description">Create a policy to begin authorizing access.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table" aria-label="Access policies">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Resource</th>
                  <th>Scope</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>
                      <strong>{policy.role}</strong>
                    </td>
                    <td>
                      {policy.resourceType}
                      <span className="table-subtext">{policy.criticality}</span>
                    </td>
                    <td>{policy.environment}</td>
                    <td>
                      Level {policy.maxAccessLevel}
                      <span className="table-subtext">
                        {policy.requiresApprovalForElevated
                          ? 'Approval for elevated'
                          : 'No approval required'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${policy.isActive ? 'active' : 'inactive'}`}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button"
                          onClick={() => openEdit(policy)}
                          disabled={!policy.isActive}
                          aria-label={`Edit ${policy.role} policy`}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => void deactivate(policy)}
                          disabled={!policy.isActive}
                          aria-label={`Deactivate ${policy.role} policy`}
                        >
                          <ShieldOff size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
