import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div className="login-container">
      {/* Background ambient lighting effects */}
      <div className="login-backdrop-glow top-left" aria-hidden="true" />
      <div className="login-backdrop-glow bottom-right" aria-hidden="true" />

      <div className="login-card-wrapper">
        <div className="login-card">
          {/* Header & Brand */}
          <div className="brand-header">
            <div className="brand-icon-shield">
              <ShieldCheck className="shield-icon" size={32} />
              <KeyRound className="key-badge" size={16} />
            </div>
            <h1 className="brand-title">Bismarck PAM</h1>
            <p className="brand-subtitle">Privileged Access Management Portal</p>
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="error-banner" role="alert" aria-live="assertive">
              <AlertCircle className="error-icon" size={18} />
              <span className="error-text">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Corporate Email Address
              </label>
              <div className="input-field-wrapper">
                <Mail className="input-icon" size={18} aria-hidden="true" />
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
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Master Security Password
              </label>
              <div className="input-field-wrapper">
                <Lock className="input-icon" size={18} aria-hidden="true" />
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
                  className="form-input password-input"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight size={18} className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="login-footer">
            <div className="security-badge">
              <span className="dot-indicator" />
              <span>Zero-Trust Enforced Environment</span>
            </div>
            <p className="security-disclaimer">
              Authorized personnel only. All privileged sessions are audited and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
