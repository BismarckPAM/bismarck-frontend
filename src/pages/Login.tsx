import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Timer,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BismarckMark } from '../features/landing/Logo';

/** Trust pillars shown on the showcase panel — mirrors the landing page story. */
const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Zero-trust enforcement',
    desc: 'Every request verified against least-privilege policy.',
  },
  {
    icon: Timer,
    title: 'Just-in-time elevation',
    desc: 'Standing privileges replaced by time-boxed grants.',
  },
  {
    icon: ScrollText,
    title: 'Immutable audit trail',
    desc: 'Approvals, sessions and keystrokes — tamper-evident.',
  },
] as const;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to destination or /users
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/users';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Invalid email or password');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, password });
      const destination =
        (location.state as { from?: { pathname: string } })?.from?.pathname || '/users';
      navigate(destination, { replace: true });
    } catch {
      // Per specification (DOD-2): Always show a standardized error message without exposing backend details
      setErrorMessage('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lgx-shell">
      {/* ---------- Showcase panel (desktop only) ---------- */}
      <aside className="lgx-showcase">
        <div className="lgx-showcase-grid" aria-hidden="true" />
        <div className="lgx-showcase-glow" aria-hidden="true" />

        <div className="lgx-showcase-inner">
          <div className="lgx-showcase-brand">
            <BismarckMark className="lgx-mark" />
            <div className="lgx-wordmark">
              <span className="lgx-wordmark-name">Bismarck</span>
              <span className="lgx-wordmark-tag">PAM Platform</span>
            </div>
          </div>

          <div className="lgx-showcase-body">
            <p className="lgx-headline">
              Every privileged session,
              <br />
              accounted for.
            </p>
            <p className="lgx-lede">
              Vault your credentials, broker approvals and watch just-in-time access rise and
              expire — all from one governed console.
            </p>

            <ul className="lgx-pillars">
              {PILLARS.map((pillar) => (
                <li key={pillar.title} className="lgx-pillar">
                  <span className="lgx-pillar-icon">
                    <pillar.icon size={18} strokeWidth={2} />
                  </span>
                  <span className="lgx-pillar-copy">
                    <span className="lgx-pillar-title">{pillar.title}</span>
                    <span className="lgx-pillar-desc">{pillar.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lgx-showcase-foot">
            <div className="lgx-ticker" aria-hidden="true">
              <span className="lgx-ticker-dot" />
              <code>PAM-2481 · vault-rotate · approved · 22m remaining</code>
            </div>
            <p className="lgx-copyright">© 2026 Bismarck — privileged access, governed.</p>
          </div>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="lgx-panel">
        <div className="lgx-card">
          <Link to="/" className="lgx-back">
            <ArrowLeft size={15} />
            <span>Back to homepage</span>
          </Link>

          <span className="lgx-eyebrow">Sign in</span>
          <h1 className="lgx-title">Bismarck PAM</h1>
          <p className="lgx-subtitle">Privileged Access Management Portal</p>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="lgx-error" role="alert" aria-live="assertive">
              <AlertCircle className="lgx-error-icon" size={18} />
              <span className="lgx-error-text">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="lgx-form" onSubmit={handleSubmit} noValidate>
            <div className="lgx-group">
              <label htmlFor="email" className="lgx-label">
                Corporate Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@enterprise.corp"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="lgx-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="lgx-group">
              <label htmlFor="password" className="lgx-label">
                Master Security Password
              </label>
              <div className="lgx-password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="lgx-input lgx-input--password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="lgx-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" className="lgx-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="lgx-spinner" aria-hidden="true" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate &amp; Enter</span>
                  <ArrowRight size={18} className="lgx-submit-arrow" />
                </>
              )}
            </button>
          </form>

          <div className="lgx-divider">
            <span>Secure gateway · TLS 1.3</span>
          </div>

          <p className="lgx-alt">
            Need an account or access? <Link to="/">Raise a ticket on the homepage</Link>
          </p>

          {/* Footer Security Badge */}
          <div className="lgx-foot">
            <div className="lgx-badge">
              <span className="lgx-dot" />
              <span>Zero-Trust Enforced Environment</span>
            </div>
            <p className="lgx-disclaimer">
              Authorized personnel only. All privileged sessions are audited and logged.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;