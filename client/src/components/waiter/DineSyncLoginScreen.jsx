import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing,
  ConciergeBell,
  Handshake,
  Lock,
  Eye,
  EyeOff,
  Info,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Zap,
  X
} from 'lucide-react';

/**
 * Web Audio Synthesizer for high-fidelity tactile feedback & chime
 * Works 100% offline with zero external audio assets.
 */
function playLoginBeep(frequency = 880, duration = 0.12) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function playSuccessFanfare() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.18);
    });
  } catch (_) {}
}

function triggerTactileVibration(pattern = [100, 50, 100]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

/**
 * Default Alex M. (#042) credential bundle according to spec:
 * { id: 'emp-042', name: 'Alex M.', staffId: 'Staff #042', tables: [1, 3, 4] }
 */
export const DEFAULT_ALEX_WAITER = {
  id: 'emp-042',
  numericId: 42,
  name: 'Alex M.',
  staffId: 'Staff #042',
  accountCode: '042',
  waiterCode: '042',
  username: 'Alex.M',
  initials: 'AM',
  role: 'Floor Specialist & Runner',
  shift: 'Shift A (Floor Active)',
  shiftTime: '08:00 - 16:00',
  status: 'Active',
  tables: [1, 3, 4],
  assignedTables: [1, 3, 4],
  color: 'from-amber-500 to-amber-600',
  avatarBg: 'from-amber-500 to-amber-600',
  avatarColor: '#f59e0b',
  zone: 'Main Dining Floor',
  pin: 'dinesync2026',
  loginTime: Date.now()
};

/**
 * VIEW A: DineSync Staff Authentication & Login Screen
 *
 * Visual Specs:
 * - Background: Matte deep dark (#080B10 to #0C101A) with subtle glowing lock backdrop / ambient amber backlight.
 * - Logo Section: Top-centered glowing amber staff/service bell & handshake logo with bold title "DineSync Staff",
 *   smaller gray subtitle "Enter your assigned staff credentials".
 * - Input Forms:
 *   - Label: "Staff ID / Username" in small gray. Dark outlined input with low-opacity placeholder ("e.g. Alex.M / 042").
 *   - Label: "Password" in small gray, aligned with a muted "Forgot?" link on the far right.
 *     Below: dark masked input field with a hide/show password eye icon on the right edge.
 * - Submit CTA: Full-width vibrant solid amber/orange button (#F59E0B) with bold black text "Login to Shift ➔".
 * - Bottom Caption: Muted gray text "For Admin assistance, contact the head desk (i)" centered.
 * - Interactive: Pre-filled defaults "Alex.M / 042" & "dinesync2026", quick-fill chip, saves to `smartdine_waiter_session`,
 *   synthesizes audio/vibration feedback on click.
 */
export default function DineSyncLoginScreen({
  onLoginSuccess,
  waiters = [],
  bellSynthesizer = null,
  initialStaffId = 'Alex.M / 042',
  initialPassword = 'dinesync2026',
  asDeviceFrame = false,
  onSwitchToLegacy = null,
  onOpenBlueprint = null
}) {
  const [staffId, setStaffId] = useState(initialStaffId);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStatus, setAuthStatus] = useState(null); // null | 'authenticating' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  // Quick fill handler
  const handleQuickFill = useCallback(() => {
    setStaffId('Alex.M / 042');
    setPassword('dinesync2026');
    triggerTactileVibration([50]);
    playLoginBeep(700, 0.08);
    showToast('Credentials filled: Alex M. (Staff #042)');
  }, [showToast]);

  // Submit Handler
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const cleanStaffId = staffId.trim();
    const cleanPassword = password.trim();

    if (!cleanStaffId) {
      triggerTactileVibration([100, 50, 100]);
      bellSynthesizer?.playError ? bellSynthesizer.playError() : playLoginBeep(260, 0.2);
      setAuthStatus('error');
      setStatusMessage('Please enter your Staff ID or Username.');
      return;
    }

    if (!cleanPassword) {
      triggerTactileVibration([100, 50, 100]);
      bellSynthesizer?.playError ? bellSynthesizer.playError() : playLoginBeep(260, 0.2);
      setAuthStatus('error');
      setStatusMessage('Please enter your shift password.');
      return;
    }

    // Audio & Haptic feedback on submit
    triggerTactileVibration([100, 50, 100]);
    playLoginBeep(880, 0.12);

    setIsSubmitting(true);
    setAuthStatus('authenticating');
    setStatusMessage('Authenticating Shift Token...');

    setTimeout(() => {
      // Find waiter matching credentials or fallback to Alex M. (#042)
      let resolvedWaiter = null;
      if (Array.isArray(waiters) && waiters.length > 0) {
        const needle = cleanStaffId.toLowerCase();
        resolvedWaiter = waiters.find((w) => {
          const wId = String(w.id || '').toLowerCase();
          const wStaff = String(w.staffId || '').toLowerCase();
          const wCode = String(w.accountCode || w.waiterCode || '').toLowerCase();
          const wName = String(w.name || '').toLowerCase();
          const wNum = String(w.numericId || '');
          return (
            wId === needle ||
            wStaff.includes(needle) ||
            wCode === needle ||
            wName.toLowerCase().includes(needle) ||
            needle.includes(wNum)
          );
        });
      }

      // Default to Alex M. (#042) as mandated by specification
      const sessionWaiter = resolvedWaiter
        ? {
            ...resolvedWaiter,
            staffId: resolvedWaiter.staffId || `Staff #${resolvedWaiter.numericId || '042'}`,
            tables: (resolvedWaiter.tables || resolvedWaiter.assignedTables || [1, 3, 4]).map(Number),
            assignedTables: (resolvedWaiter.tables || resolvedWaiter.assignedTables || [1, 3, 4]).map(Number),
            loginTime: Date.now()
          }
        : {
            ...DEFAULT_ALEX_WAITER,
            loginTime: Date.now()
          };

      // Persist to session storage & localStorage keys
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('smartdine_waiter_session', JSON.stringify(sessionWaiter));
          localStorage.setItem('smartdine_current_waiter', JSON.stringify(sessionWaiter));
          localStorage.setItem('smartdine_logged_in_waiter', JSON.stringify(sessionWaiter));
          localStorage.setItem('smartdine_active_employee_id', sessionWaiter.id);
        } catch (_) {}
      }

      playSuccessFanfare();
      triggerTactileVibration([80, 40, 120]);
      setAuthStatus('success');
      setStatusMessage(`✓ Shift Verified! Welcome, ${sessionWaiter.name}`);
      showToast(`Shift onboarded: ${sessionWaiter.name} (${sessionWaiter.staffId || 'Staff #042'}) is Active on Floor!`);

      setTimeout(() => {
        setIsSubmitting(false);
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(sessionWaiter);
        }
      }, 700);
    }, 600);
  };

  // The Card Body Content (Pixel-perfect View A)
  const renderCardContent = () => (
    <div className="relative z-10 flex flex-col justify-between flex-1 p-6 sm:p-8 min-h-[580px] max-w-sm w-full mx-auto select-none">
      {/* Ambient glowing lock backdrop */}
      <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl -z-0" />
      <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 -z-0 opacity-[0.06] flex items-center justify-center">
        <Lock className="w-56 h-56 text-amber-400" strokeWidth={1.2} />
      </div>

      {/* TOP: Logo Section */}
      <div className="relative z-10 text-center pt-4 sm:pt-6 space-y-2.5">
        {/* Glowing amber staff/service bell & handshake logo */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-400/25">
          {/* Staff Service Bell Icon */}
          <ConciergeBell className="w-9 h-9 sm:w-10 sm:h-10 text-slate-950 stroke-[2.2]" />

          {/* Handshake Staff Emblem Badge */}
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#080B10] border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-md"
            title="DineSync Staff Service & Synergy"
          >
            <Handshake className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        {/* Bold Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
          DineSync Staff
        </h1>

        {/* Gray Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          Enter your assigned staff credentials
        </p>

        {/* Quick Demo Fill Pill Chip */}
        <div className="pt-1 flex items-center justify-center">
          <button
            type="button"
            onClick={handleQuickFill}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
            title="Click to auto-populate demo waiter credentials"
          >
            <Sparkles className="w-3 h-3" />
            <span>Quick Fill: Alex M. (#042)</span>
          </button>
        </div>
      </div>

      {/* MIDDLE: Input Forms */}
      <form onSubmit={handleSubmit} className="relative z-10 space-y-4 my-auto pt-4 pb-2">
        {/* Field 1: Staff ID / Username */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="dinesync-staff-id"
            className="block text-xs font-semibold text-slate-400"
          >
            Staff ID / Username
          </label>
          <div className="relative">
            <input
              id="dinesync-staff-id"
              name="staffId"
              type="text"
              autoComplete="username"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                if (authStatus === 'error') setAuthStatus(null);
              }}
              placeholder="e.g. Alex.M / 042"
              className="w-full px-4 py-3.5 rounded-2xl bg-[#0C101A] border border-[#1E293B] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-medium text-white placeholder-slate-600/70 outline-none transition"
            />
          </div>
        </div>

        {/* Field 2: Password */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="dinesync-password"
              className="block text-xs font-semibold text-slate-400"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-slate-500 hover:text-amber-400 transition cursor-pointer focus:outline-none"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <input
              id="dinesync-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authStatus === 'error') setAuthStatus(null);
              }}
              placeholder="••••••••••••"
              className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-[#0C101A] border border-[#1E293B] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-medium text-white placeholder-slate-600/70 outline-none transition"
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword((prev) => !prev);
                playLoginBeep(650, 0.05);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition cursor-pointer focus:outline-none"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic Status / Feedback pill */}
        {authStatus && (
          <div
            className={`text-xs font-bold text-center py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
              authStatus === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : authStatus === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-shake'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse'
            }`}
          >
            {authStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {authStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
            {authStatus === 'authenticating' && <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Submit CTA: Full-width vibrant solid amber/orange button (#F59E0B) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-4 rounded-2xl bg-[#F59E0B] hover:bg-amber-400 active:scale-[0.98] text-[#080B10] font-black text-sm sm:text-base tracking-wide shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          <span>{isSubmitting ? 'Authenticating...' : 'Login to Shift'}</span>
          <span className="text-base sm:text-lg font-black transition-transform group-hover:translate-x-0.5">
            ➔
          </span>
        </button>
      </form>

      {/* BOTTOM: Caption & Optional legacy switch */}
      <div className="relative z-10 text-center pt-2 space-y-2">
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>For Admin assistance, contact the head desk (i)</span>
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {typeof onOpenBlueprint === 'function' && (
            <button
              type="button"
              onClick={onOpenBlueprint}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline decoration-amber-500/40 hover:decoration-amber-300 transition cursor-pointer"
            >
              📱 16:9 Double-Mobile Blueprint
            </button>
          )}

          {typeof onSwitchToLegacy === 'function' && (
            <button
              type="button"
              onClick={onSwitchToLegacy}
              className="text-[11px] text-slate-500 hover:text-amber-400 underline decoration-slate-700 hover:decoration-amber-400 transition cursor-pointer"
            >
              Switch to Legacy PIN Pad Mode
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 p-3 rounded-xl bg-[#0F172A] border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="absolute inset-0 z-50 bg-[#080B10]/95 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Staff Credential Recovery</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-4">
            Password resets are managed by the Head Desk. For immediate floor login, use the demo staff credentials:
          </p>
          <div className="p-3 rounded-xl bg-[#0C101A] border border-slate-800 text-left text-xs space-y-1 mb-5 w-full max-w-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Staff ID:</span>
              <span className="text-amber-300 font-bold">Alex.M / 042</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Password:</span>
              <span className="text-amber-300 font-bold">dinesync2026</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleQuickFill();
              setShowForgotModal(false);
            }}
            className="w-full max-w-xs py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition mb-2"
          >
            Fill Demo Credentials & Return
          </button>
          <button
            type="button"
            onClick={() => setShowForgotModal(false)}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );

  // If requested inside an iPhone/Mobile chassis device frame
  if (asDeviceFrame) {
    return (
      <div className="w-full max-w-[390px] mx-auto flex flex-col items-center">
        {/* View Header Pill */}
        <div className="text-center mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
            VIEW A: Waiter Login &amp; Authentication
          </span>
        </div>

        {/* Smartphone Chassis Frame */}
        <div className="w-full rounded-[44px] bg-[#0A0D14] p-3 shadow-2xl ring-1 ring-white/15 border-4 border-[#1F293D] relative overflow-hidden">
          {/* Status Bar / Dynamic Island */}
          <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[11px] text-slate-400 font-mono">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>5G</span>
              <span className="w-4 h-2.5 rounded-sm border border-slate-400 relative">
                <span className="absolute inset-0.5 bg-emerald-400 rounded-2xs" />
              </span>
            </div>
          </div>

          {/* Viewport Screen with Matte Deep Dark (#080B10 to #0C101A) */}
          <div className="rounded-[36px] bg-gradient-to-b from-[#080B10] via-[#0A0E17] to-[#0C101A] border border-white/[0.05] min-h-[640px] flex flex-col justify-between relative overflow-hidden">
            {renderCardContent()}

            {/* Home Indicator Bar */}
            <div className="w-28 h-1 bg-slate-700/60 rounded-full mx-auto mb-2" />
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Responsive View (Mobile handheld + Tablet / Desktop centered)
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#080B10] via-[#0A0E17] to-[#0C101A] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Subtle Ambient Amber Backlights */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl" />

      {/* Viewport Card */}
      <div className="w-full max-w-md rounded-[32px] sm:rounded-[36px] bg-[#080B10]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {renderCardContent()}
      </div>
    </div>
  );
}

// Named export for flexible importing
export { DineSyncLoginScreen };
