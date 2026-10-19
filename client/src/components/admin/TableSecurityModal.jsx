import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

/**
 * Admin Table Security Confirmation Modal
 * 
 * Guards critical operations (e.g. changing total table count, adding tables, 
 * or removing tables) with admin password '808080' verification before execution.
 * 
 * Props:
 * - isOpen (boolean): Modal visibility state
 * - onClose (function): Callback when modal is cancelled or closed
 * - onConfirm (function): Callback with pendingData after successful verification
 * - actionTitle (string): Short label of the action (e.g., 'Update Venue Capacity')
 * - actionDescription (string): Detailed description of the exact change
 * - pendingData (any): Payload to pass to onConfirm when authorized
 */
export default function TableSecurityModal({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  actionTitle = 'Critical Table Operation',
  actionDescription = 'Authorize table modification',
  pendingData = null
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMessage('');
      setIsSuccess(false);

      // Auto-focus the input field on open
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage('Please enter the Admin PIN / Password (808080)');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    if (trimmed !== '808080') {
      setErrorMessage('Access Denied: Incorrect PIN. Please enter 808080.');
      if (inputRef.current) {
        inputRef.current.select();
        inputRef.current.focus();
      }
      return;
    }

    // Success
    setErrorMessage('');
    setIsSuccess(true);

    setTimeout(() => {
      onConfirm(pendingData);
      onClose();
    }, 250);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <div className="bg-[#0f172a] border border-[#334155] w-full max-w-md rounded-3xl p-6 shadow-2xl shadow-black relative text-[#f8fafc] space-y-5 animate-scaleUp">
        
        {/* Top Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-[#334155] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2
                id="security-modal-title"
                className="text-lg font-black tracking-tight text-[#f8fafc] flex items-center gap-2"
              >
                🔒 Admin Authorization Required
              </h2>
              {actionTitle && (
                <p className="text-xs font-semibold text-amber-400/90 tracking-wide mt-0.5">
                  {actionTitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-zinc-400 hover:text-[#f8fafc] border border-[#334155] flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close authorization modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Change Description Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Operation Details</span>
          </div>
          <p className="text-sm font-medium text-[#f8fafc] leading-relaxed break-words">
            {actionDescription}
          </p>
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Critical change: table inventory & live routing will update immediately.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-security-pin"
              className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Security PIN / Password
              </span>
            </label>

            <div className="relative">
              <input
                id="admin-security-pin"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter Admin PIN / Password"
                autoComplete="off"
                className={`w-full bg-[#1e293b] border ${
                  errorMessage
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-[#334155] focus:border-[#FF5A26] focus:ring-[#FF5A26]/20'
                } rounded-xl py-3 pl-4 pr-12 text-sm text-[#f8fafc] placeholder-zinc-500 outline-none focus:ring-2 transition font-mono`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success state */}
            {isSuccess && (
              <div className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>PIN Verified! Applying changes...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSuccess}
              className="px-4 py-2.5 rounded-xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-zinc-300 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSuccess}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A26] to-[#ff7a45] hover:from-[#ff6b3d] hover:to-[#ff8c5a] text-white text-xs font-bold shadow-lg shadow-[#FF5A26]/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Authorized</span>
                </>
              ) : (
                <>
                  <span>Confirm &amp; Apply (Authorize)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export { TableSecurityModal };
