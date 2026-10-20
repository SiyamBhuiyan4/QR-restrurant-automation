import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  MoreHorizontal,
  Sparkles,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Sliders,
  X
} from 'lucide-react';

// Optional integration with shared vibration haptic service
import vibrationHapticService, {
  vibrateCriticalCall,
  vibrateNavigationTap,
  isVibrationSupported as isFloorVibrationSupported
} from '../../services/vibrationHapticService.js';

/**
 * Web Audio Synthesizer fallback for high-fidelity tactile haptic beep & vibration simulation
 * Emits double-pulse low-frequency buzz that mimics hardware vibration motors
 */
function playHapticBeepFallback(frequency = 180, duration = 0.12, repeat = 2) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    for (let i = 0; i < repeat; i++) {
      const startTime = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Triangle wave for tactile motor vibration feel
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, startTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.75, startTime + duration);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
  } catch (_) {}
}

/**
 * Default assigned tables initial state
 * T1, T3, T4 are active / glowing amber gradient
 * T2, T5, T6+ are dimmed unassigned (opacity 40%)
 */
export const DEFAULT_VIEW_B_TABLES = [
  { id: 'T1', label: 'T1', assigned: true, guests: 4, notes: '2 Live Requests' },
  { id: 'T2', label: 'T2', assigned: false, guests: 2, notes: 'Available' },
  { id: 'T3', label: 'T3', assigned: true, guests: 6, notes: 'Water Refill' },
  { id: 'T4', label: 'T4', assigned: true, guests: 2, notes: 'Bill Requested' },
  { id: 'T5', label: 'T5', assigned: false, guests: 4, notes: 'Available' },
  { id: 'T6+', label: 'T6+', assigned: false, guests: 8, notes: 'Large Booth' },
];

/**
 * DineSyncHeaderAndTables
 *
 * Section 1 & Topbar for View B (Active Personal Dashboard for Waiter "Alex M."):
 * 1. Title & Shift Status (Topbar):
 *    - Left: Avatar in muted blue-grey with bold white initials "AM", name "Alex M." in bold white, "Staff #042" below.
 *    - Right: Vibe Indicator capsule containing "⚡ LIVE CALLS & TASKS" on top, "(Vibration Alerts Active)" below,
 *      accompanied by a pulsing orange siren/beacon icon.
 * 2. Section 1: Assigned Tables Monitor:
 *    - Row header: "Assigned Tables" (left) & unaligned "..." options on the right.
 *    - Inline labels: "Active" (left) and "Unassigned" (right).
 *    - Card view grid:
 *      - Glowing amber gradient capsules for T1, T3, T4 (active glowing borders, bright amber text, pulsing dot).
 *      - Dimmed muted dark grey inactive buttons for T2, T5, T6+ (not assigned, opacity 40%).
 * 3. Interactive features:
 *    - Click toggles to assign/unassign or focus tables
 *    - Vibration preview test (with haptic vibration + audio buzz + ripple animation)
 *    - Options dropdown menu ("...") with quick station reset, bulk toggles & haptics test
 */
export default function DineSyncHeaderAndTables({
  staff = {
    name: 'Alex M.',
    id: 'Staff #042',
    initials: 'AM',
    role: 'Floor Captain',
    shift: 'Active Floor'
  },
  tables: controlledTables,
  onTableChange,
  onTableSelect,
  selectedTable = null,
  isVibrationActive: controlledVibration,
  onVibrationToggle,
  onToast,
  className = ''
}) {
  // Tables state (controlled or autonomous default)
  const [internalTables, setInternalTables] = useState(DEFAULT_VIEW_B_TABLES);
  const tables = controlledTables || internalTables;

  // Vibration alert state
  const [internalVibration, setInternalVibration] = useState(true);
  const isVibrationActive = controlledVibration !== undefined ? controlledVibration : internalVibration;

  // UI state for vibration test animation & options dropdown
  const [isTestingVibe, setIsTestingVibe] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [localToast, setLocalToast] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const dropdownRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Trigger feedback toast helper
  const notify = useCallback((message) => {
    if (onToast) {
      onToast(message);
    }
    setLocalToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setLocalToast(null);
    }, 3200);
  }, [onToast]);

  // Execute hardware vibration + synthesized motor sound
  const triggerHapticFallback = useCallback((pattern = [180, 80, 180]) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
    playHapticBeepFallback(190, 0.12, 2);
  }, []);

  // Handle vibration test preview
  const handleVibrationPreview = useCallback(() => {
    setIsTestingVibe(true);
    
    // Attempt shared service call first, fallback to internal engine
    try {
      if (typeof vibrateCriticalCall === 'function') {
        vibrateCriticalCall();
      } else {
        triggerHapticFallback([180, 80, 180, 80, 220]);
      }
    } catch (_) {
      triggerHapticFallback([180, 80, 180, 80, 220]);
    }

    notify(
      isVibrationActive
        ? '📳 Vibration Test Sent: 2x Haptic Burst Active on Handheld'
        : '🔇 Vibration alerts currently muted — Tap options to re-enable'
    );

    setTimeout(() => {
      setIsTestingVibe(false);
    }, 1200);
  }, [isVibrationActive, triggerHapticFallback, notify]);

  // Toggle table assignment (T1 - T6+)
  const handleTableToggle = useCallback((tableId) => {
    // Subtle navigation tap
    try {
      if (typeof vibrateNavigationTap === 'function') {
        vibrateNavigationTap();
      } else {
        triggerHapticFallback([90]);
      }
    } catch (_) {
      triggerHapticFallback([90]);
    }

    const updated = tables.map((t) => {
      if (t.id === tableId) {
        const nextState = !t.assigned;
        notify(
          nextState
            ? `✓ Table ${t.label} assigned to ${staff.name}`
            : `Table ${t.label} marked unassigned`
        );
        return { ...t, assigned: nextState };
      }
      return t;
    });

    if (controlledTables === undefined) {
      setInternalTables(updated);
    }
    if (onTableChange) {
      onTableChange(updated, tableId);
    }
    if (onTableSelect) {
      onTableSelect(tableId);
    }
  }, [tables, controlledTables, onTableChange, onTableSelect, staff.name, triggerHapticFallback, notify]);

  // Quick preset: Reset to default assignments (T1, T3, T4 active)
  const handleResetToDefault = useCallback(() => {
    try {
      vibrateNavigationTap();
    } catch (_) {
      triggerHapticFallback([100]);
    }
    const reset = DEFAULT_VIEW_B_TABLES;
    if (controlledTables === undefined) {
      setInternalTables(reset);
    }
    if (onTableChange) {
      onTableChange(reset);
    }
    setIsOptionsOpen(false);
    notify('Station restored: T1, T3, T4 Active (Alex M. default)');
  }, [controlledTables, onTableChange, triggerHapticFallback, notify]);

  // Quick preset: Claim all tables
  const handleClaimAll = useCallback(() => {
    try {
      vibrateNavigationTap();
    } catch (_) {
      triggerHapticFallback([100]);
    }
    const claimedAll = tables.map((t) => ({ ...t, assigned: true }));
    if (controlledTables === undefined) {
      setInternalTables(claimedAll);
    }
    if (onTableChange) {
      onTableChange(claimedAll);
    }
    setIsOptionsOpen(false);
    notify('All 6 floor stations claimed by Alex M.');
  }, [tables, controlledTables, onTableChange, triggerHapticFallback, notify]);

  // Quick preset: Unassign all
  const handleClearAll = useCallback(() => {
    try {
      vibrateNavigationTap();
    } catch (_) {
      triggerHapticFallback([70]);
    }
    const cleared = tables.map((t) => ({ ...t, assigned: false }));
    if (controlledTables === undefined) {
      setInternalTables(cleared);
    }
    if (onTableChange) {
      onTableChange(cleared);
    }
    setIsOptionsOpen(false);
    notify('All table assignments released for shift transfer');
  }, [tables, controlledTables, onTableChange, triggerHapticFallback, notify]);

  // Toggle vibration alert state
  const handleToggleVibrationState = useCallback(() => {
    const nextVal = !isVibrationActive;
    if (controlledVibration === undefined) {
      setInternalVibration(nextVal);
    }
    if (onVibrationToggle) {
      onVibrationToggle(nextVal);
    }
    try {
      if (vibrationHapticService && typeof vibrationHapticService.setVibrationEnabled === 'function') {
        vibrationHapticService.setVibrationEnabled(nextVal);
      }
    } catch (_) {}

    try {
      vibrateNavigationTap();
    } catch (_) {
      triggerHapticFallback([80]);
    }
    notify(nextVal ? 'Vibration alerts ENABLED' : 'Vibration alerts MUTED (Visual only)');
    setIsOptionsOpen(false);
  }, [isVibrationActive, controlledVibration, onVibrationToggle, triggerHapticFallback, notify]);

  // Click outside listener for options dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOptionsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOptionsOpen(false);
      }
    }
    if (isOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOptionsOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const activeCount = tables.filter((t) => t.assigned).length;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* =========================================================================
          TOPBAR: TITLE & SHIFT STATUS (ALEX M.)
          ========================================================================= */}
      <div className="p-4 border-b border-white/[0.08] bg-[#0C101A]/95 backdrop-blur-md relative z-20">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Circular Avatar & Identity */}
          <div className="flex items-center gap-3">
            {/* Circular avatar in muted blue-grey with bold white initials "AM" */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full bg-[#1E293B] border border-slate-700/90 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-inner ring-1 ring-white/10"
                aria-label={`Avatar for ${staff.name}`}
              >
                {staff.initials || 'AM'}
              </div>
              {/* Online indicator dot */}
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0C101A]"
                title="Active on floor"
              />
            </div>

            <div>
              {/* Name "Alex M." in bold white */}
              <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{staff.name || 'Alex M.'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              {/* "Staff #042" directly below in smaller font */}
              <div className="text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">
                {staff.id || 'Staff #042'}
              </div>
            </div>
          </div>

          {/* Right: Vibe Indicator & Live Calls Badge */}
          <div className="relative text-right">
            <button
              type="button"
              onClick={handleVibrationPreview}
              className={`group flex flex-col items-end text-right rounded-2xl p-1 -m-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
                isTestingVibe ? 'scale-95' : 'hover:scale-[1.02]'
              }`}
              title="Click to test vibration & haptic alerts on handheld"
              aria-label="Vibration alert status & preview"
            >
              {/* Capsule badge containing "⚡ LIVE CALLS & TASKS" on top */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
                  isVibrationActive
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-xs shadow-amber-500/20 group-hover:bg-amber-500/25 group-hover:border-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-tight flex items-center gap-1">
                  <span>⚡ LIVE CALLS &amp; TASKS</span>
                </span>
              </div>

              {/* "(Vibration Alerts Active)" below, accompanied by pulsing orange siren/beacon icon */}
              <div className="flex items-center justify-end gap-1.5 text-[9px] font-semibold mt-1">
                {isVibrationActive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                    </span>
                    <span className="text-amber-300 font-medium tracking-tight">
                      (Vibration Alerts Active)
                    </span>
                    {/* Pulsing orange siren / beacon icon */}
                    <div
                      className={`relative flex items-center justify-center p-0.5 rounded-full transition-transform ${
                        isTestingVibe ? 'scale-125' : ''
                      }`}
                    >
                      <span className="absolute -inset-1 rounded-full bg-orange-500/30 animate-pulse pointer-events-none" />
                      <Radio className="w-3 h-3 text-orange-400 animate-pulse shrink-0" />
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500 font-medium">
                    (Vibration Alerts Muted)
                  </span>
                )}
              </div>
            </button>

            {/* Visual ripple wave effect when vibration test is active */}
            {isTestingVibe && (
              <span className="absolute -inset-2 rounded-2xl border-2 border-amber-400/80 animate-ping pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Floating mini-toast for instant local tactile feedback */}
      {localToast && (
        <div className="px-4 pt-2 -mb-1 animate-fade-in">
          <div className="py-1 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-between shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{localToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocalToast(null)}
              className="text-amber-400/70 hover:text-amber-300 ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: ASSIGNED TABLES MONITOR
          ========================================================================= */}
      <div className="p-4 space-y-2 relative">
        {/* Row header: "Assigned Tables" (left) & unaligned "..." options on the right */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 tracking-tight">
              Assigned Tables
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
              {activeCount}/6
            </span>
          </div>

          {/* Options Dropdown Trigger Button ("...") */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOptionsOpen((prev) => !prev)}
              aria-label="Table reallocation & settings options"
              aria-haspopup="true"
              aria-expanded={isOptionsOpen}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isOptionsOpen
                  ? 'bg-white/10 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Interactive Options Dropdown Menu */}
            {isOptionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl bg-[#0F1422] border border-white/10 shadow-2xl shadow-black/80 p-2 z-50 text-left backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    Table Matrix Control
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Shift #042
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  {/* Preset 1: Default T1, T3, T4 */}
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-[11px]">
                        Default Station (T1, T3, T4)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400/80">
                      Standard
                    </span>
                  </button>

                  {/* Preset 2: Claim All */}
                  <button
                    type="button"
                    onClick={handleClaimAll}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-[11px]">
                      Claim All Tables (T1–T6+)
                    </span>
                  </button>

                  {/* Preset 3: Clear All */}
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 transition text-left cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-semibold text-[11px]">
                      Release All Assignments
                    </span>
                  </button>

                  <div className="h-px bg-white/[0.08] my-1" />

                  {/* Vibration alerts toggle */}
                  <button
                    type="button"
                    onClick={handleToggleVibrationState}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isVibrationActive ? (
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="font-semibold text-[11px]">
                        Vibration Alerts
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isVibrationActive
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isVibrationActive ? 'ON' : 'MUTED'}
                    </span>
                  </button>

                  {/* Vibration test */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOptionsOpen(false);
                      handleVibrationPreview();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-200 hover:text-amber-300 hover:bg-amber-500/10 transition text-left cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-[11px]">
                      Test Floor Haptic Chime
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Below row header: inline labels "Active" on the left, "Unassigned" on the right */}
        <div className="flex items-center justify-between text-[10px] font-semibold px-0.5">
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Unassigned</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* =====================================================================
            CARD VIEW GRID WITH BORDER HIGHLIGHTS:
            - Glowing amber gradient capsules for T1, T3, T4 (active glowing borders, bright amber text, pulsing dot)
            - Dimmed, muted dark grey inactive buttons for T2, T5, T6+ (not assigned, opacity 40%)
            ===================================================================== */}
        <div className="grid grid-cols-6 gap-1.5">
          {tables.map((table) => {
            const isAssigned = !!table.assigned;
            const isSelected = selectedTable === table.id;

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => handleTableToggle(table.id)}
                onMouseEnter={() => setActiveTooltip(table.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                aria-label={`Table ${table.label}: ${isAssigned ? 'Active assigned' : 'Unassigned'}. Click to toggle.`}
                className={`col-span-1 py-2 px-1 rounded-xl text-center transition-all duration-200 relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isAssigned
                    ? 'bg-gradient-to-b from-amber-500/25 to-orange-500/25 border border-amber-400 text-amber-300 shadow-xs shadow-amber-500/20 hover:scale-[1.04] active:scale-95 ring-1 ring-amber-400/30'
                    : 'bg-slate-900/60 border border-slate-800 text-slate-500 opacity-40 hover:opacity-80 hover:border-slate-700 active:scale-95'
                } ${isSelected ? 'ring-2 ring-white shadow-lg' : ''}`}
              >
                {/* Table ID Label */}
                <span
                  className={`text-xs block tracking-tight ${
                    isAssigned ? 'font-black text-amber-300' : 'font-bold text-slate-500'
                  }`}
                >
                  {table.label}
                </span>

                {/* Sub-indicator: Pulsing dot for Active, dash for Unassigned */}
                {isAssigned ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto block mt-1 animate-pulse shadow-xs shadow-amber-400" />
                ) : (
                  <span className="text-[9px] text-slate-600 block mt-1 leading-none font-bold">
                    -
                  </span>
                )}

                {/* Active hover indicator / tooltip */}
                {activeTooltip === table.id && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-[9px] font-mono text-slate-200 whitespace-nowrap shadow-lg pointer-events-none z-30">
                    {isAssigned ? `Active (${table.guests}p)` : 'Claim'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
