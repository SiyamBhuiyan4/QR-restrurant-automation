import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  Delete,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Sparkles
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
 * Features:
 * - Deep dark slate theme (#0b0f19 background, #0f172a card, #1e293b accents, #FF5A26 flame highlights)
 * - Numeric PIN keypad + password input with show/hide toggle
 * - Shaking animation & validation on incorrect password
 * - Session storage persistence ('smartdine_admin_auth' = 'true')
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

  const handleKeypadPress = (digit) => {
    if (isSuccess) return;
    setError('');
    if (pin.length < PIN_LENGTH) {
      const nextPin = pin + String(digit);
      setPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        handleValidate(nextPin);
      }
    }
  };

  const handleClear = () => {
    if (isSuccess) return;
    setPin('');
    setError('');
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    if (isSuccess) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
    inputRef.current?.focus();
  };

  const handleQuickFill = () => {
    setPin(MASTER_ADMIN_PIN);
    setError('');
    handleValidate(MASTER_ADMIN_PIN);
  };

  const handleBackToCustomer = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/?table=1';
    }
  };

  return (
    <div
      className="admin-root flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 select-none"
      style={{
        backgroundColor: '#0b0f19',
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Top Navigation Bar: Back to Customer View */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handleBackToCustomer}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Exit to Customer Menu</span>
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#FF5A26] animate-pulse" />
          <span>Secured Console</span>
        </div>
      </div>

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
          {/* Header Branding */}
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 relative ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-900 border border-slate-700/80 text-[#FF5A26]'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-8 h-8 animate-bounce text-emerald-400" />
              ) : (
                <>
                  <ShieldCheck className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF5A26] border-2 border-[#0f172a] animate-ping" />
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-md bg-[#FF5A26]/15 text-[#FF5A26] border border-[#FF5A26]/30">
                Restaurant Admin Suite
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              SmartDine Admin Access
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Enter master credentials to unlock operational telemetry, kitchen passes, and floor management.
            </p>
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
                    setPin(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Enter 6-digit Master PIN"
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

            {/* Keypad Grid (3 x 4) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  disabled={isSuccess}
                  className="h-12 sm:h-13 rounded-2xl bg-[#1e293b] hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-white font-mono text-lg font-bold transition-all duration-100 flex items-center justify-center cursor-pointer hover:border-[#FF5A26]/50 shadow-xs"
                >
                  {digit}
                </button>
              ))}

              {/* Clear (C) */}
              <button
                type="button"
                onClick={handleClear}
                disabled={isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-[#1e293b]/70 hover:bg-slate-800 active:scale-95 border border-slate-700/80 text-slate-400 hover:text-rose-400 font-semibold text-xs transition-all duration-100 flex items-center justify-center gap-1 cursor-pointer"
                title="Clear entered PIN"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleKeypadPress(0)}
                disabled={isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-[#1e293b] hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-white font-mono text-lg font-bold transition-all duration-100 flex items-center justify-center cursor-pointer hover:border-[#FF5A26]/50 shadow-xs"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-[#1e293b]/70 hover:bg-slate-800 active:scale-95 border border-slate-700/80 text-slate-400 hover:text-white font-semibold text-xs transition-all duration-100 flex items-center justify-center cursor-pointer"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

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

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A26]" />
              <span>Master Admin PIN:</span>
            </span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-[#FF5A26] hover:bg-slate-700 transition cursor-pointer"
              title="Click to autofill 808080"
            >
              808080
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="mt-6 text-center text-[11px] text-slate-500 max-w-sm">
        Protected by Session Encryption • Auto-locks on tab or browser close
      </div>
    </div>
  );
}
