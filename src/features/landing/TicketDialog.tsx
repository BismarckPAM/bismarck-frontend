import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ticket as TicketIcon, Send, Loader2, X, CheckCircle2 } from 'lucide-react';
import { createTicket } from '@/api/tickets';
import type { TicketRequestType } from '@/api/tickets';

const REQUEST_TYPES: Array<{ value: TicketRequestType; label: string }> = [
  { value: 'access', label: 'Access Request (PAM account)' },
  { value: 'demo', label: 'Product Demo / Sandbox' },
  { value: 'support', label: 'Technical Support' },
  { value: 'pilot', label: 'Pilot / Proof of Concept' },
  { value: 'other', label: 'Other' },
];

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
  const [company, setCompany] = useState('');
  const [requestType, setRequestType] = useState<'' | TicketRequestType>('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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
    setCompany('');
    setRequestType('');
    setMessage('');
    setStatus('idle');
    setErrorDetail(null);
    setTicketRef(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);

    if (!name.trim() || !email || !requestType || !message.trim()) {
      setStatus('error');
      setErrorDetail('Please fill in name, work email, request type, and message.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setStatus('error');
      setErrorDetail('Enter a valid work email address.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await createTicket({
        name: name.trim(),
        email,
        company: company.trim() || undefined,
        requestType,
        message: message.trim(),
      });
      setTicketRef(res.ticketId);
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorDetail(
        'Could not reach the ticket service. If this persists, email us directly at pam-onboarding@bismarck.security.',
      );
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
                  <label htmlFor="lnd-t-company" className="lnd-label">
                    Organization
                  </label>
                  <input
                    id="lnd-t-company"
                    className="lnd-input"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    disabled={status === 'submitting'}
                    autoComplete="organization"
                  />
                </div>
                <div className="lnd-field">
                  <label htmlFor="lnd-t-type" className="lnd-label">
                    Request type *
                  </label>
                  <select
                    id="lnd-t-type"
                    className="lnd-select"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as '' | TicketRequestType)}
                    disabled={status === 'submitting'}
                  >
                    <option value="" disabled>
                      Select a type
                    </option>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lnd-field">
                <label htmlFor="lnd-t-message" className="lnd-label">
                  Message *
                </label>
                <textarea
                  id="lnd-t-message"
                  className="lnd-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your environment — number of privileged accounts, targets (servers, databases, cloud consoles), and what you'd like to achieve."
                  rows={4}
                  disabled={status === 'submitting'}
                />
              </div>

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
