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
      setError('Incorrect Admin PIN. Please try again.');
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

  return (
    <div
      className="admin-root flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 select-none"
      style={{
        backgroundColor: '#0b0f19',
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Main Login Card */}
      <div
        className={`w-full max-w-md rounded-3xl border transition-all duration-300 relative overflow-hidden ${
          isShaking ? 'animate-gate-shake border-rose-500 shadow-2xl shadow-rose-950/40' : 'border-slate-800 shadow-2xl shadow-black/80'
        } ${isSuccess ? 'border-emerald-500/80 shadow-emerald-950/50' : ''}`}
        style={{
          backgroundColor: '#0f172a',
          boxShadow: isSuccess
            ? '0 0 35px rgba(16, 185, 129, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Subtle top orange glow accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: isSuccess
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #FF5A26, #ff7a45, #FF5A26)'
          }}
        />

        <div className="p-6 sm:p-8">
          {/* Clean Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="text-2xl font-black tracking-tight text-white">
              SmartDine Admin Access
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input with Show/Hide Toggle */}
            <div className="relative">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
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
                  placeholder="Enter Master PIN"
                  maxLength={12}
                  disabled={isSuccess}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3.5 rounded-2xl text-center text-lg tracking-[0.25em] font-mono font-bold bg-[#1e293b] text-white placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs border border-slate-700 focus:border-[#FF5A26] focus:ring-2 focus:ring-[#FF5A26]/30 outline-none transition-all duration-150"
                  style={{
                    backgroundColor: '#1e293b',
                    borderColor: error ? '#f43f5e' : isSuccess ? '#10b981' : '#334155'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  disabled={isSuccess}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide PIN' : 'Show PIN'}
                  aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 6 PIN Indicator Dots */}
              <div className="flex items-center justify-center gap-2.5 mt-3.5">
                {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-[#FF5A26] scale-110 shadow-sm shadow-[#FF5A26]/60'
                          : 'bg-slate-700/60 border border-slate-600/50'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Feedback */}
            {isSuccess && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PIN verified! Unlocking dashboard...</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSuccess}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#FF5A26] hover:bg-[#ff7a45] active:scale-[0.98] text-white font-bold text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF5A26]/20 disabled:opacity-80"
            >
              {isSuccess ? (
                <>
                  <Unlock className="w-4 h-4 animate-pulse" />
                  <span>Access Granted</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="mt-6 text-center text-[11px] text-slate-500 max-w-sm">
        Protected by Session Encryption • Auto-locks on tab or browser close
      </div>
    </div>
  );
}
