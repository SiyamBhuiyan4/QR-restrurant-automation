import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Radio,
  Navigation,
  RotateCcw,
  Volume2,
  AlertTriangle
} from 'lucide-react';

/**
 * High-performance Web Audio Synthesizer for tactile feedback
 */
function playHapticBeep(frequency = 880, duration = 0.12, type = 'sine') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

/**
 * Dual Haptic Feedback: Hardware device vibration + audio fallback
 */
function triggerHaptic(pattern = [80, 40, 80], toneFreq = 880, toneDuration = 0.12) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
  playHapticBeep(toneFreq, toneDuration);
}

/**
 * Subcomponent 1: Section 2 Live Task Updates Feed Header
 * Features:
 * - "Live Task Updates (3/5)" counter pill
 * - Toggle switch ("All Live" / "Urgent Only")
 */
export function LiveTaskUpdatesHeader({
  activeTasks = 3,
  totalTasks = 5,
  filter = 'all',
  onToggleFilter,
  className = ''
}) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      {/* Left Counter Pill */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-white tracking-tight">
            Live Task Updates
          </span>
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 shadow-xs">
            ({activeTasks}/{totalTasks})
          </span>
        </div>
      </div>

      {/* Right Toggle Switch ("All Live" / "Urgent Only") */}
      <button
        type="button"
        onClick={onToggleFilter}
        className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E1522] hover:bg-[#141E30] border border-slate-700/60 hover:border-amber-500/40 text-[10px] sm:text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 cursor-pointer shadow-inner select-none active:scale-98"
        title="Toggle between All Live tasks and Urgent Only"
        aria-pressed={filter === 'urgent'}
      >
        <span className={`transition-colors duration-200 ${filter === 'urgent' ? 'text-amber-400 font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
          {filter === 'urgent' ? 'Urgent Only' : 'All Live'}
        </span>

        {/* Smooth Toggle Pill Slider */}
        <div
          className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
            filter === 'urgent' ? 'bg-amber-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full bg-white shadow-xs transform transition-transform duration-200 ${
              filter === 'urgent' ? 'translate-x-3 bg-slate-950' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    </div>
  );
}

/**
 * Subcomponent 2: Card 1 (CRITICAL CUSTOMER CALL)
 * Requirements:
 * - Outline: Glowing red-to-amber thin border overlay
 *   (`border-rose-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]`)
 * - Badge "(📱 VIBRATION ACTIVE)" on top-left with pulsing dot
 * - Header: Crimson label "CRITICAL", order time indicator "12m ago" on the right
 * - Title: "TABLE 1 — CALL WAITER 🚨" in bold white
 * - Body: Custom request detail: "Custom Request: Needs fresh water & extra napkins"
 * - Bottom Double Actions:
 *   - Outlined label "[ 📍 Go to Table ]" with navigation pin icon
 *   - Vibrant high-contrast amber "[ ✓ Mark as Resolved ]" checkmark button
 * - Interactive Behavior:
 *   - Clicking "[ 📍 Go to Table ]" emits haptic navigation vibration and marks attending
 *   - Clicking "[ ✓ Mark as Resolved ]" transitions card to resolved state with green checkmark animation,
 *     emits soft haptic vibration, and updates task count.
 */
export function CriticalCustomerCallCard({
  task = {
    id: 'task-1',
    tableNumber: 1,
    title: 'TABLE 1 — CALL WAITER 🚨',
    timeAgo: '12m ago',
    requestDetail: 'Custom Request: Needs fresh water & extra napkins',
    priority: 'CRITICAL',
    vibrationLabel: '(📱 VIBRATION ACTIVE)'
  },
  status: controlledStatus,
  onStatusChange,
  onGoToTable,
  onResolve,
  className = ''
}) {
  // Internal state if not controlled from parent
  const [internalStatus, setInternalStatus] = useState('pending'); // 'pending' | 'attending' | 'resolved'
  const [showResolvedAnimation, setShowResolvedAnimation] = useState(false);

  const currentStatus = controlledStatus !== undefined ? controlledStatus : internalStatus;

  // Handle "[ 📍 Go to Table ]"
  const handleGoToTable = (e) => {
    if (e) e.stopPropagation();
    // Emit haptic navigation vibration
    triggerHaptic([60, 40, 60], 660, 0.12);

    if (controlledStatus === undefined) {
      setInternalStatus('attending');
    }
    if (onStatusChange) {
      onStatusChange('attending');
    }
    if (onGoToTable) {
      onGoToTable(task.tableNumber || 1);
    }
  };

  // Handle "[ ✓ Mark as Resolved ]"
  const handleMarkResolved = (e) => {
    if (e) e.stopPropagation();
    if (currentStatus === 'resolved') return;

    // Emit soft haptic vibration & pleasant success chime
    triggerHaptic([90, 50, 120], 1046, 0.2);

    setShowResolvedAnimation(true);
    setTimeout(() => {
      setShowResolvedAnimation(false);
    }, 1800);

    if (controlledStatus === undefined) {
      setInternalStatus('resolved');
    }
    if (onStatusChange) {
      onStatusChange('resolved');
    }
    if (onResolve) {
      onResolve(task.id || 'task-1');
    }
  };

  // Handle Re-open / Undo (Helper for interactive testing)
  const handleReopen = (e) => {
    if (e) e.stopPropagation();
    triggerHaptic([40], 520, 0.08);
    if (controlledStatus === undefined) {
      setInternalStatus('pending');
    }
    if (onStatusChange) {
      onStatusChange('pending');
    }
  };

  const isResolved = currentStatus === 'resolved';
  const isAttending = currentStatus === 'attending';

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 overflow-hidden ${
        isResolved
          ? 'bg-[#0A0E17]/80 border border-emerald-500/40 opacity-75 shadow-sm'
          : isAttending
          ? 'bg-[#0E1422] border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          : 'bg-[#0F1422] border-rose-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
      } border p-3.5 sm:p-4 space-y-3 ${className}`}
    >
      {/* Glowing Red-to-Amber Ambient Overlay (active when pending/attending) */}
      {!isResolved && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-rose-500/[0.04] via-amber-500/[0.03] to-transparent" />
      )}

      {/* HEADER SECTION */}
      <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Crimson Label "CRITICAL" */}
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 tracking-wider shadow-xs">
            {task.priority || 'CRITICAL'}
          </span>

          {/* Badge "(📱 VIBRATION ACTIVE)" on top-left with pulsing dot */}
          {!isResolved && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] sm:text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>{task.vibrationLabel || '(📱 VIBRATION ACTIVE)'}</span>
            </span>
          )}

          {/* Attending State Indicator */}
          {isAttending && !isResolved && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[9px] font-extrabold uppercase animate-pulse">
              <Navigation className="w-2.5 h-2.5" />
              <span>ATTENDING</span>
            </span>
          )}

          {/* Resolved State Badge */}
          {isResolved && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[9px] font-extrabold uppercase">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>RESOLVED</span>
            </span>
          )}
        </div>

        {/* Right: Order Time Indicator "12m ago" */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-mono text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{task.timeAgo || '12m ago'}</span>
        </div>
      </div>

      {/* TITLE: "TABLE 1 — CALL WAITER 🚨" in bold white */}
      <div className="relative z-10">
        <h4 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
          <span>{task.title || 'TABLE 1 — CALL WAITER 🚨'}</span>
        </h4>

        {/* BODY: Custom request detail: "Custom Request: Needs fresh water & extra napkins" */}
        <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900/70 border border-white/[0.06] text-xs text-slate-200 font-medium leading-relaxed flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-400 font-normal">Custom Request: </span>
            <span className="text-white font-semibold">
              {task.requestDetail
                ? task.requestDetail.replace(/^Custom Request:\s*/i, '')
                : 'Needs fresh water & extra napkins'}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM DOUBLE ACTIONS */}
      <div className="relative z-10 flex items-center gap-2 pt-1">
        {/* Action 1: Outlined label "[ 📍 Go to Table ]" with navigation pin icon */}
        <button
          type="button"
          onClick={handleGoToTable}
          disabled={isResolved}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            isResolved
              ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
              : isAttending
              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 hover:text-white'
          }`}
          title="Emit haptic navigation vibration and mark table as attending"
        >
          <MapPin
            className={`w-3.5 h-3.5 ${
              isAttending ? 'text-cyan-400 animate-bounce' : 'text-amber-400'
            }`}
          />
          <span>{isAttending ? '[ 📍 Attending Table 1 ]' : '[ 📍 Go to Table ]'}</span>
        </button>

        {/* Action 2: Vibrant high-contrast amber "[ ✓ Mark as Resolved ]" checkmark button */}
        <button
          type="button"
          onClick={handleMarkResolved}
          disabled={isResolved}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 select-none shadow-sm ${
            isResolved
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-amber-500/30 hover:shadow-amber-500/50 cursor-pointer'
          }`}
          title="Resolve call and trigger checkmark animation"
        >
          {isResolved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>[ ✓ Resolved ]</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>[ ✓ Mark as Resolved ]</span>
            </>
          )}
        </button>
      </div>

      {/* Undo option if resolved */}
      {isResolved && (
        <div className="relative z-10 flex items-center justify-end pt-0.5">
          <button
            type="button"
            onClick={handleReopen}
            className="text-[10px] text-slate-500 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Re-open Call</span>
          </button>
        </div>
      )}

      {/* GREEN CHECKMARK CELEBRATION ANIMATION OVERLAY */}
      {showResolvedAnimation && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] transform scale-110 transition-transform duration-300">
            <Check className="w-7 h-7 stroke-[3] text-emerald-300 animate-bounce" />
          </div>
          <p className="mt-2 text-xs font-black text-emerald-300 tracking-wide">
            ✓ Table 1 Call Resolved!
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Admin notified • Haptic emitted
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Main Combined Component: DineSyncCriticalTaskCard
 * Integrates:
 * 1. Live Task Updates Feed Header (3/5 count + All Live / Urgent Only toggle)
 * 2. Card 1 (CRITICAL CUSTOMER CALL) with full interactions
 */
export default function DineSyncCriticalTaskCard({
  // Initial / Controlled Counts
  totalTasks = 5,
  initialActiveTasks = 3,
  // Initial / Controlled Task
  task,
  // Status Control
  status: controlledStatus,
  onStatusChange,
  // Filter Control
  filter: controlledFilter,
  onFilterChange,
  // Event callbacks
  onGoToTable,
  onResolve,
  // Component display toggles
  showHeader = true,
  className = ''
}) {
  // Feed Filter state: 'all' | 'urgent'
  const [internalFilter, setInternalFilter] = useState('all');
  const activeFilter = controlledFilter !== undefined ? controlledFilter : internalFilter;

  // Task Card Status state: 'pending' | 'attending' | 'resolved'
  const [internalStatus, setInternalStatus] = useState('pending');
  const activeStatus = controlledStatus !== undefined ? controlledStatus : internalStatus;

  // Active task counter dynamically decreases by 1 when resolved
  const activeCount =
    activeStatus === 'resolved'
      ? Math.max(0, initialActiveTasks - 1)
      : initialActiveTasks;

  const handleToggleFilter = () => {
    const nextFilter = activeFilter === 'all' ? 'urgent' : 'all';
    triggerHaptic([30], 480, 0.06);
    if (controlledFilter === undefined) {
      setInternalFilter(nextFilter);
    }
    if (onFilterChange) {
      onFilterChange(nextFilter);
    }
  };

  const handleStatusChange = (newStatus) => {
    if (controlledStatus === undefined) {
      setInternalStatus(newStatus);
    }
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Live Task Updates Feed Header */}
      {showHeader && (
        <LiveTaskUpdatesHeader
          activeTasks={activeCount}
          totalTasks={totalTasks}
          filter={activeFilter}
          onToggleFilter={handleToggleFilter}
        />
      )}

      {/* 2. Card 1 (CRITICAL CUSTOMER CALL) */}
      <CriticalCustomerCallCard
        task={task}
        status={activeStatus}
        onStatusChange={handleStatusChange}
        onGoToTable={onGoToTable}
        onResolve={onResolve}
      />
    </div>
  );
}
