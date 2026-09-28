import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ticket as TicketIcon, Send, Loader2, X, CheckCircle2 } from 'lucide-react';
import {
  createOnboardingTicket,
  OnboardingSubmitError,
  type OnboardingSubmitErrorCode,
} from '@/api/onboarding';
import { useTurnstile } from '@/hooks/useTurnstile';

/** Roles a prospective user may request; final assignment is by an administrator. */
const REQUESTED_ROLES = ['User', 'Manager', 'Admin'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TicketDialogProps {
  open: boolean;
  onClose: () => void;
  /** Lenis instance controller: stop page scroll while dialog is open. */
  onScrollLockChange?: (locked: boolean) => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function TicketDialog({ open, onClose, onScrollLockChange }: TicketDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [requestedRole, setRequestedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);

  // Cloudflare Turnstile is only wired up while the dialog is open.
  const sitekey = import.meta.env.VITE_TURNSTILE_SITEKEY;
  const turnstile = useTurnstile(open ? sitekey : undefined, turnstileRef);
  const captchaBlocked = turnstile.isConfigured && !turnstile.token;

  // Lock page scroll (Lenis + native) while open; restore on close.
  useEffect(() => {
    if (!open) return;
    onScrollLockChange?.(true);
    return () => onScrollLockChange?.(false);
  }, [open, onScrollLockChange]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setName('');
    setEmail('');
    setDepartment('');
    setRequestedRole('');
    setJustification('');
    setStatus('idle');
    setErrorDetail(null);
    setTicketRef(null);
    turnstile.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);

    if (!name.trim() || !email || !requestedRole || !justification.trim()) {
      setStatus('error');
      setErrorDetail(
        'Please fill in your full name, work email, requested role, and justification.',
      );
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setStatus('error');
      setErrorDetail('Enter a valid work email address.');
      return;
    }
    if (captchaBlocked) {
      setStatus('error');
      setErrorDetail('Please complete the human verification challenge before submitting.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await createOnboardingTicket({
        fullName: name.trim(),
        email,
        department: department.trim(),
        requestedRole,
        justification: justification.trim(),
        turnstileToken: turnstile.token ?? '',
      });
      setTicketRef(res.ticketId);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const code: OnboardingSubmitErrorCode =
        err instanceof OnboardingSubmitError ? err.code : 'UNKNOWN';
      if (code === 'DUPLICATE') {
        setErrorDetail(
          'An account or pending request already exists for this email address. Sign in or contact an administrator.',
        );
      } else if (code === 'INVALID_CAPTCHA') {
        setErrorDetail(
          'Human verification failed. Please complete the verification and try again.',
        );
        turnstile.reset();
      } else {
        setErrorDetail(
          'Could not reach the onboarding service. If this persists, email us directly at pam-onboarding@bismarck.security.',
        );
      }
    }
  };

  return createPortal(
    <div
      className="lnd-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lnd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lnd-ticket-title"
        ref={panelRef}
        tabIndex={-1}
        data-lenis-prevent
      >
        <button
          type="button"
          className="lnd-dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {status === 'success' ? (
          <div className="lnd-success">
            <span className="lnd-success-icon">
              <CheckCircle2 size={28} />
            </span>
            <p className="lnd-success-title">Ticket submitted</p>
            {ticketRef && <p className="lnd-success-ref">{ticketRef}</p>}
            <p className="lnd-success-sub">
              Our team will reach out within one business day.
              <br />
              Keep the reference for your records.
            </p>
            <div className="lnd-form-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="lnd-btn lnd-btn-primary" onClick={reset}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="lnd-dialog-icon">
              <TicketIcon size={22} />
            </span>
            <h2 id="lnd-ticket-title" className="lnd-dialog-title">
              Raise a ticket
            </h2>
            <p className="lnd-dialog-desc">
              Request access to Bismarck, book a demo, or get support. We respond within one
              business day.
            </p>

            <form className="lnd-form" onSubmit={handleSubmit} noValidate>
              <div className="lnd-form-row">
                <div className="lnd-field">
                  <label htmlFor="lnd-t-name" className="lnd-label">
                    Full name *
                  </label>
                  <input
                    id="lnd-t-name"
                    className="lnd-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Kumar"
                    disabled={status === 'submitting'}
                    autoComplete="name"
                  />
                </div>
                <div className="lnd-field">
                  <label htmlFor="lnd-t-email" className="lnd-label">
                    Work email *
                  </label>
                  <input
                    id="lnd-t-email"
                    type="email"
                    className="lnd-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    disabled={status === 'submitting'}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="lnd-form-row">
                <div className="lnd-field">
                  <label htmlFor="lnd-t-department" className="lnd-label">
                    Department
                  </label>
                  <input
                    id="lnd-t-department"
                    className="lnd-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering"
                    disabled={status === 'submitting'}
                    autoComplete="organization"
                  />
                </div>
                <div className="lnd-field">
                  <label htmlFor="lnd-t-role" className="lnd-label">
                    Requested role *
                  </label>
                  <select
                    id="lnd-t-role"
                    className="lnd-select"
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    disabled={status === 'submitting'}
                  >
                    <option value="" disabled>
                      Select a role
                    </option>
                    {REQUESTED_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lnd-field">
                <label htmlFor="lnd-t-justification" className="lnd-label">
                  Justification *
                </label>
                <textarea
                  id="lnd-t-justification"
                  className="lnd-textarea"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Describe your role and why you need access to privileged resources."
                  rows={4}
                  disabled={status === 'submitting'}
                />
              </div>

              {turnstile.isConfigured ? (
                <div ref={turnstileRef} className="lnd-turnstile" aria-live="polite" />
              ) : (
                <div className="lnd-notice" role="note">
                  Human verification is disabled in this environment.
                </div>
              )}

              {status === 'error' && errorDetail && (
                <div className="lnd-notice error" role="alert">
                  {errorDetail}
                </div>
              )}

              <div className="lnd-form-actions">
                <button
                  type="button"
                  className="lnd-btn lnd-btn-outline"
                  onClick={onClose}
                  disabled={status === 'submitting'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lnd-btn lnd-btn-primary"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 size={16} className="lnd-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
