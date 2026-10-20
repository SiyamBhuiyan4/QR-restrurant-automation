import React, { useCallback } from 'react';
import {
  Zap,
  FolderArchive,
  HelpCircle,
  LogOut
} from 'lucide-react';

/**
 * High-performance Web Audio haptic click fallback for iOS Safari and desktop environments
 */
function playTactileClick(freq = 1200, duration = 0.04) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {
    // Graceful degradation when audio context is blocked
  }
}

/**
 * Universal Haptic Vibration dispatcher
 * Combines navigator.vibrate with audio tick feedback
 *
 * @param {number|number[]} pattern - Vibration duration or pattern in ms
 */
export function triggerHandheldHaptic(pattern = [35]) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
  const isWarning = Array.isArray(pattern) && pattern.length > 1;
  playTactileClick(isWarning ? 520 : 1100, isWarning ? 0.08 : 0.035);
}

/**
 * DineSync Handheld Footer Navigation
 * Single-tap touch-optimized navigation engineered for single-handed restaurant floor ergonomics:
 * 1. Active Tasks Icon: Emerald Highlighting with visual focus, glowing dot indicator, and label "Active Tasks"
 * 2. Task Archive folder icon: Muted outline with label "Archive"
 * 3. Support center "?" icon: Muted outline with label "Support"
 * 4. Exit Shift icon: Muted door/logout icon with label "Sign Out Shift" on the rightmost
 * 5. Bottom Home indicator bar (iPhone / flagship Android gesture bar styling)
 * 6. Tactile press states (active:scale-95), haptic vibration click callback, and tab switching handlers
 *
 * @param {Object} props
 * @param {'tasks'|'archive'|'support'|string} [props.activeTab='tasks'] - Current active navigation tab
 * @param {(tabId: string) => void} [props.onTabChange] - Tab change handler callback
 * @param {(tabId: string) => void} [props.setActiveTab] - Fallback tab change handler callback
 * @param {() => void} [props.onSignOut] - Handler for signing out of the current shift
 * @param {() => void} [props.onExitShift] - Alias for onSignOut
 * @param {() => void} [props.onSupportClick] - Optional custom handler for Support Center
 * @param {number} [props.activeTaskCount=0] - Number of active/urgent tasks to display as badge
 * @param {number} [props.archiveCount=0] - Number of archived tasks to display as badge
 * @param {boolean} [props.hasActiveIndicator=true] - Shows glowing live dot indicator on Active Tasks
 * @param {(pattern?: number|number[]) => void} [props.triggerHaptic] - Optional external haptic handler
 * @param {boolean} [props.showHomeIndicator=true] - Display the flagship iOS/Android home gesture bar
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 */
export default function DineSyncFooterNav({
  activeTab = 'tasks',
  onTabChange,
  setActiveTab,
  onSignOut,
  onExitShift,
  onSupportClick,
  activeTaskCount = 0,
  archiveCount = 0,
  hasActiveIndicator = true,
  triggerHaptic: customTriggerHaptic,
  showHomeIndicator = true,
  className = ''
}) {
  const handleHaptic = useCallback((pattern = [35]) => {
    if (typeof customTriggerHaptic === 'function') {
      try {
        customTriggerHaptic(pattern);
      } catch (_) {
        triggerHandheldHaptic(pattern);
      }
    } else {
      triggerHandheldHaptic(pattern);
    }
  }, [customTriggerHaptic]);

  const handleTabSwitch = useCallback((tabId) => {
    handleHaptic([35]);
    if (typeof onTabChange === 'function') {
      onTabChange(tabId);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
  }, [handleHaptic, onTabChange, setActiveTab]);

  const handleSupportAction = useCallback(() => {
    handleHaptic([40]);
    if (typeof onSupportClick === 'function') {
      onSupportClick();
    } else {
      handleTabSwitch('support');
    }
  }, [handleHaptic, onSupportClick, handleTabSwitch]);

  const handleSignOutAction = useCallback(() => {
    handleHaptic([80, 50, 80]);
    const exitCallback = onSignOut || onExitShift;
    if (typeof exitCallback === 'function') {
      exitCallback();
    }
  }, [handleHaptic, onSignOut, onExitShift]);

  const isTasksActive = activeTab === 'tasks';
  const isArchiveActive = activeTab === 'archive';
  const isSupportActive = activeTab === 'support';

  return (
    <nav
      role="navigation"
      aria-label="Handheld Shift Navigation"
      className={`w-full border-t border-white/[0.08] bg-[#0C101A]/95 backdrop-blur-xl px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,8px),8px)] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none touch-manipulation z-40 ${className}`}
    >
      <div className="grid grid-cols-4 gap-1.5 max-w-md mx-auto items-stretch">
        {/* 1. Active Tasks (Emerald Highlight Focus & Glowing Dot Indicator) */}
        <button
          type="button"
          role="tab"
          aria-selected={isTasksActive}
          aria-label="Active Tasks"
          onClick={() => handleTabSwitch('tasks')}
          className={`relative group flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[54px] transition-all duration-150 transform-gpu active:scale-95 cursor-pointer border ${
            isTasksActive
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.22)]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Zap
              className={`w-5 h-5 transition-transform duration-200 ${
                isTasksActive
                  ? 'scale-110 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'group-hover:scale-105'
              }`}
            />
            {/* Glowing Dot Indicator */}
            {hasActiveIndicator && (
              <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5 items-center justify-center pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1">
            <span
              className={`text-[10px] font-bold tracking-tight transition-colors ${
                isTasksActive ? 'text-emerald-300 font-extrabold' : 'text-slate-400'
              }`}
            >
              Active Tasks
            </span>
            {activeTaskCount > 0 && (
              <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-full leading-none">
                {activeTaskCount}
              </span>
            )}
          </div>
        </button>

        {/* 2. Task Archive (Muted Outline) */}
        <button
          type="button"
          role="tab"
          aria-selected={isArchiveActive}
          aria-label="Archive"
          onClick={() => handleTabSwitch('archive')}
          className={`relative group flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[54px] transition-all duration-150 transform-gpu active:scale-95 cursor-pointer border ${
            isArchiveActive
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
              : 'border-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <FolderArchive
              className={`w-5 h-5 transition-transform duration-200 ${
                isArchiveActive
                  ? 'scale-110 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : 'group-hover:scale-105'
              }`}
            />
            {archiveCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                {archiveCount}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-bold tracking-tight mt-1 transition-colors ${
              isArchiveActive ? 'text-amber-300 font-extrabold' : 'text-slate-400'
            }`}
          >
            Archive
          </span>
        </button>

        {/* 3. Support Center (Muted Outline with "?" Icon) */}
        <button
          type="button"
          role="tab"
          aria-selected={isSupportActive}
          aria-label="Support"
          onClick={handleSupportAction}
          className={`relative group flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[54px] transition-all duration-150 transform-gpu active:scale-95 cursor-pointer border ${
            isSupportActive
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.2)]'
              : 'border-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <HelpCircle
              className={`w-5 h-5 transition-transform duration-200 ${
                isSupportActive
                  ? 'scale-110 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                  : 'group-hover:scale-105'
              }`}
            />
          </div>
          <span
            className={`text-[10px] font-bold tracking-tight mt-1 transition-colors ${
              isSupportActive ? 'text-sky-300 font-extrabold' : 'text-slate-400'
            }`}
          >
            Support
          </span>
        </button>

        {/* 4. Exit Shift (Muted Door/Logout Outline on Rightmost) */}
        <button
          type="button"
          role="button"
          aria-label="Sign Out Shift"
          onClick={handleSignOutAction}
          className="relative group flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[54px] transition-all duration-150 transform-gpu active:scale-95 cursor-pointer border border-white/[0.04] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 active:bg-rose-500/20"
        >
          <div className="relative flex items-center justify-center">
            <LogOut
              className="w-5 h-5 transition-transform duration-200 group-hover:scale-105 group-hover:text-rose-400 group-active:translate-x-0.5"
            />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 text-slate-400 group-hover:text-rose-400 transition-colors">
            Sign Out Shift
          </span>
        </button>
      </div>

      {/* 5. Bottom Home Indicator Bar (iPhone / Flagship Android Gesture Bar Styling) */}
      {showHomeIndicator && (
        <div className="pt-2 pb-0.5 flex justify-center items-center pointer-events-none">
          <div
            className="w-28 sm:w-32 h-1 bg-white/20 hover:bg-white/40 rounded-full transition-all duration-200"
            aria-hidden="true"
          />
        </div>
      )}
    </nav>
  );
}
