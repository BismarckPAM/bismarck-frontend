import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { createApprovalRequest } from '../api/approval';
import { isApiError } from '../api/errors';
import { useWorkflow } from '../state/WorkflowContext';
import useResources from '../hooks/useResources';
import { LoadingState, ErrorState } from '../components/common/StateViews';
import { APPROVAL_LEVELS, levelLabel } from '../utils/format';
import type { ApiError } from '../types/pam';

const MIN_REASON_LENGTH = 20;
const MAX_DURATION_MINUTES = 1440;

interface FormState {
  resourceId: string;
  requestedLevel: string;
  reason: string;
  durationMinutes: string;
}

const emptyForm: FormState = {
  resourceId: '',
  requestedLevel: '',
  reason: '',
  durationMinutes: '',
};

/** Client-side validation mirroring the Approval Service rules. */
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.resourceId) errors.resourceId = 'Resource is required.';

  const level = Number(form.requestedLevel);
  if (!form.requestedLevel) errors.requestedLevel = 'Access level is required.';
  else if (!Number.isInteger(level) || level < 1 || level > 5)
    errors.requestedLevel = 'Access level must be between 1 and 5.';

  const reason = form.reason.trim();
  if (!reason) errors.reason = 'Justification is required.';
  else if (reason.length < MIN_REASON_LENGTH)
    errors.reason = `Justification must be at least ${MIN_REASON_LENGTH} characters.`;

  const duration = Number(form.durationMinutes);
  if (!form.durationMinutes) errors.durationMinutes = 'Duration is required.';
  else if (!Number.isFinite(duration) || duration <= 0)
    errors.durationMinutes = 'Duration must be a positive number of minutes.';
  else if (duration > MAX_DURATION_MINUTES)
    errors.durationMinutes = `Duration cannot exceed ${MAX_DURATION_MINUTES} minutes (24h).`;

  return errors;
}

export const RequestAccess: React.FC = () => {
  const { resources, isLoading: resourcesLoading, error: resourcesError } = useResources();
  const { addMyRequest, refreshNotifications } = useWorkflow();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; status: string } | null>(null);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccess(null);
    setGeneralError(null);

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const created = await createApprovalRequest({
        resourceId: form.resourceId,
        requestedLevel: Number(form.requestedLevel),
        reason: form.reason.trim(),
        durationMinutes: Number(form.durationMinutes),
      });
      // Update state in place without a full reload.
      addMyRequest(created);
      void refreshNotifications();
      setSuccess({ id: created.id, status: created.status });
      setForm(emptyForm);
      // Navigate to My Requests after a brief confirmation delay.
      window.setTimeout(() => navigate('/my-requests'), 900);
    } catch (error) {
      if (isApiError(error)) {
        setGeneralError(error);
        if (error.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [key, value] of Object.entries(error.fieldErrors)) {
            mapped[key.charAt(0).toLowerCase() + key.slice(1)] = value.join(' ');
          }
          setFieldErrors((current) => ({ ...current, ...mapped }));
        }
      } else {
        setGeneralError({ kind: 'unknown', message: 'Unable to submit the request.' });
      }
      // Keep entered form values on failure.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setGeneralError(null);
    setSuccess(null);
  };

  if (resourcesLoading) return <LoadingState message="Loading resources…" />;
  if (resourcesError) return <ErrorState message={resourcesError} />;

  return (
    <section className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Request Access</h1>
          <p className="page-description">
            Submit a privileged-access request for approval. Endpoint:{' '}
            <code>POST /api/approval/requests</code>.
          </p>
        </div>
      </div>

      {success && (
        <div className="wf-success" role="status" data-testid="submit-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>
            Request <strong>{success.id}</strong> submitted with status{' '}
            <strong>{success.status}</strong>. Redirecting to My Requests…
          </span>
        </div>
      )}

      {generalError && (
        <div className="wf-error" role="alert" data-testid="submit-error">
          {generalError.message}
        </div>
      )}

      <form className="wf-form" onSubmit={handleSubmit} noValidate>
        <label className="form-group" htmlFor="resourceId">
          <span className="form-label">Resource *</span>
          <select
            id="resourceId"
            className="form-input"
            value={form.resourceId}
            onChange={(event) => update('resourceId', event.target.value)}
            aria-invalid={Boolean(fieldErrors.resourceId)}
          >
            <option value="">Select a privileged resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} · {resource.type} · {resource.environment}
              </option>
            ))}
          </select>
          {fieldErrors.resourceId && <span className="field-error">{fieldErrors.resourceId}</span>}
        </label>

        <label className="form-group" htmlFor="requestedLevel">
          <span className="form-label">Access level *</span>
          <select
            id="requestedLevel"
            className="form-input"
            value={form.requestedLevel}
            onChange={(event) => update('requestedLevel', event.target.value)}
            aria-invalid={Boolean(fieldErrors.requestedLevel)}
          >
            <option value="">Select an access level</option>
            {APPROVAL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
          {fieldErrors.requestedLevel && (
            <span className="field-error">{fieldErrors.requestedLevel}</span>
          )}
        </label>

        <label className="form-group" htmlFor="reason">
          <span className="form-label">Justification * (min {MIN_REASON_LENGTH} characters)</span>
          <textarea
            id="reason"
            className="form-input"
            rows={4}
            value={form.reason}
            onChange={(event) => update('reason', event.target.value)}
            aria-invalid={Boolean(fieldErrors.reason)}
          />
          {fieldErrors.reason && <span className="field-error">{fieldErrors.reason}</span>}
        </label>

        <label className="form-group" htmlFor="durationMinutes">
          <span className="form-label">Duration (minutes) *</span>
          <input
            id="durationMinutes"
            className="form-input"
            type="number"
            min={1}
            max={MAX_DURATION_MINUTES}
            value={form.durationMinutes}
            onChange={(event) => update('durationMinutes', event.target.value)}
            aria-invalid={Boolean(fieldErrors.durationMinutes)}
          />
          {fieldErrors.durationMinutes && (
            <span className="field-error">{fieldErrors.durationMinutes}</span>
          )}
        </label>

        <div className="wf-form-actions">
          <button type="submit" className="primary-action-btn" disabled={isSubmitting}>
            <Send size={16} aria-hidden="true" />
            <span>{isSubmitting ? 'Submitting…' : 'Submit Request'}</span>
          </button>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};

export default RequestAccess;
