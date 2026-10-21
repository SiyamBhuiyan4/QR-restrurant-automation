import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import '../../styles/admin.css';

/**
 * Master Admin Access Key
 * Strictly required: '808080'
 */
const MASTER_ADMIN_PIN = '808080';
const PIN_LENGTH = 6;

/**
 * AdminLoginGate Component
 * 
 * Secure Master Admin authentication gate protecting the SmartDine Restaurant Admin Suite.
 */
export default function AdminLoginGate({ onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);

  // Autofocus input on initial mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Validation routine
  const handleValidate = (candidatePin) => {
    const entered = (candidatePin !== undefined ? candidatePin : pin).trim();
    if (entered === MASTER_ADMIN_PIN) {
      setError('');
      setIsSuccess(true);
      try {
        sessionStorage.setItem('smartdine_admin_auth', 'true');
      } catch (err) {
        console.warn('[AdminLoginGate] sessionStorage write error:', err);
      }
      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess();
        }
      }, 400);
    } else {
      setIsShaking(true);
      setError('That PIN is not correct. Check the 6-digit code and try again.');
      setPin('');
      setTimeout(() => {
        setIsShaking(false);
        inputRef.current?.focus();
      }, 500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSuccess) return;
    if (!pin) {
      setError('Please enter the 6-digit Master PIN.');
      inputRef.current?.focus();
      return;
    }
    handleValidate(pin);
  };

  const hasError = Boolean(error);

  return (
    <div className="admin-root admin-login">
      <div className={`admin-login-card ${isShaking ? 'animate-gate-shake is-error' : ''} ${isSuccess ? 'is-success' : ''}`}>
        <div className="admin-login-brand">
          <span className="admin-login-icon">
            <Lock className="w-5 h-5" />
          </span>
          <h1 className="admin-login-title">Admin sign in</h1>
          <p className="admin-login-sub">Enter the 6-digit master PIN to open the SmartDine admin.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <label htmlFor="admin-pin" className="admin-login-label">Master PIN</label>
          <div className="admin-login-field">
            <KeyRound className="admin-login-field-icon w-4 h-4" aria-hidden="true" />
            <input
              id="admin-pin"
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                const val = e.target.value;
                setPin(val);
                if (error) setError('');
                if (val.trim().length === PIN_LENGTH) {
                  handleValidate(val.trim());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
              placeholder="••••••"
              maxLength={12}
              disabled={isSuccess}
              autoComplete="current-password"
              aria-invalid={hasError}
              aria-describedby="admin-pin-help"
              className="admin-login-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              disabled={isSuccess}
              className="admin-login-toggle"
              title={showPassword ? 'Hide PIN' : 'Show PIN'}
              aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="admin-login-dots" aria-hidden="true">
            {Array.from({ length: PIN_LENGTH }).map((_, idx) => (
              <span key={idx} className={`admin-login-dot ${pin.length > idx ? 'is-filled' : ''}`} />
            ))}
          </div>

          <p id="admin-pin-help" className={`admin-login-help ${hasError ? 'is-error' : ''}`} role={hasError ? 'alert' : undefined}>
            {hasError ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>PIN verified. Opening the dashboard...</span>
              </>
            ) : (
              <span>Your session stays unlocked until you sign out or close the browser tab.</span>
            )}
          </p>

          <button type="submit" disabled={isSuccess} className="admin-login-submit">
            {isSuccess ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Access granted</span>
              </>
            ) : (
              <>
                <span>Unlock dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="admin-login-footer">Restricted area. Authorised staff only.</p>
    </div>
  );
}
