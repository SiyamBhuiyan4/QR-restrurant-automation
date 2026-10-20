import React, { useState, useCallback, useMemo } from 'react';
import {
  Check,
  CheckCheck,
  MapPin,
  Clock,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import vibrationHapticService, {
  vibrateAdminMessage,
  vibrateTaskResolved,
  vibrateNavigationTap
} from '../../services/vibrationHapticService';

/**
 * High-performance Web Audio Synthesizer fallback for instant haptic feedback
 */
export function playWaiterHapticPulse(frequency = 880, duration = 0.12) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
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
  } catch (_) {
    // Graceful fallback
  }
}

/**
 * CARD 2: ADMIN DIRECT CHAT / MESSAGE TASK
 *
 * Outline: Emerald-to-green glowing border indicating important Dispatch feed
 *          (border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)])
 * Header: Inline category icon with bold white text "💬 ADMIN: HEAD CHEF 🚨" and "5m ago" badge on the right
 * Body: Incoming message bubble in dark teal glass:
 *       "Table 3 has been waiting on appetizers for 15 mins. Please check-in."
 * Actions: Subtle input field with placeholder "Reply" inline, next to an outlined "[ Acknowledge ]" response button
 * Interactivity: Typing a reply or clicking [Acknowledge] updates status to "Acknowledged ✓" and triggers haptic pulse.
 */
export function AdminDirectChatCard({
  senderText = '💬 ADMIN: HEAD CHEF 🚨',
  timestamp = '5m ago',
  message = 'Table 3 has been waiting on appetizers for 15 mins. Please check-in.',
  isAcknowledged: controlledAcknowledged,
  acknowledgedReply: controlledReply,
  onAcknowledge,
  onReply,
  onHaptic,
  className = ''
}) {
  const [internalAcknowledged, setInternalAcknowledged] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [savedReply, setSavedReply] = useState('');

  const isAck = controlledAcknowledged !== undefined ? controlledAcknowledged : internalAcknowledged;
  const currentReply = controlledReply !== undefined ? controlledReply : savedReply;

  const handleAcknowledge = useCallback((customText = '') => {
    const textToCommit = (customText || replyInput).trim();
    if (controlledAcknowledged === undefined) {
      setInternalAcknowledged(true);
      if (textToCommit) {
        setSavedReply(textToCommit);
      }
    }

    // Trigger haptic pulse (using vibration service with local fallback)
    if (onHaptic) {
      onHaptic();
    } else {
      try {
        if (typeof vibrateAdminMessage === 'function') {
          vibrateAdminMessage();
        } else {
          playWaiterHapticPulse(920, 0.14);
        }
      } catch (_) {
        playWaiterHapticPulse(920, 0.14);
      }
    }

    if (onAcknowledge) {
      onAcknowledge(textToCommit || 'Acknowledged');
    }
    if (onReply && textToCommit) {
      onReply(textToCommit);
    }
  }, [controlledAcknowledged, replyInput, onHaptic, onAcknowledge, onReply]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    handleAcknowledge();
  };

  return (
    <div
      data-testid="admin-direct-chat-card"
      className={`p-3.5 sm:p-4 rounded-2xl bg-[#0F1824] border border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-200 space-y-2.5 ${
        isAck ? 'ring-1 ring-emerald-500/30' : 'ring-2 ring-emerald-500/20'
      } ${className}`}
    >
      {/* Header: Inline category icon with bold white text and "5m ago" badge on the right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white tracking-wide select-none">
          <span>{senderText}</span>
        </div>
        <span className="text-[10px] sm:text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shrink-0">
          {timestamp}
        </span>
      </div>

      {/* Body: Incoming message bubble in dark teal glass */}
      <div className="p-3 rounded-xl bg-teal-950/40 backdrop-blur-md border border-emerald-500/30 text-xs sm:text-sm text-slate-100 font-medium leading-relaxed shadow-inner">
        &ldquo;{message}&rdquo;
      </div>

      {/* Acknowledged status badge indicator */}
      {isAck && (
        <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-3 py-1.5 animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {currentReply ? `Replied: "${currentReply}"` : 'Status: Acknowledged ✓'}
            </span>
          </span>
          <span className="text-[10px] text-emerald-400/80 font-mono">Synced</span>
        </div>
      )}

      {/* Actions: Inline input field with placeholder "Reply" inline, next to outlined "[ Acknowledge ]" response button */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          disabled={isAck}
          placeholder={isAck ? 'Acknowledged ✓' : 'Reply'}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#080B10] border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 text-xs text-white placeholder-slate-500 outline-none transition disabled:opacity-75 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={() => handleAcknowledge()}
          disabled={isAck}
          className={`py-2 px-3 sm:px-3.5 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 shrink-0 ${
            isAck
              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 cursor-default'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:text-emerald-200 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{isAck ? 'Acknowledged ✓' : '[ Acknowledge ]'}</span>
        </button>
      </form>
    </div>
  );
}

/**
 * CARD 3: CUSTOMIZATION CALL TASK
 *
 * Outline: Muted dark card with white title
 * Header: Category tag "CUSTOMIZATION" and time Badge "3m ago"
 * Title: "TABLE 3 — CUSTOM REQUEST" in bold white
 * Body: "Extra ice, change sides" bullet list
 * Bottom Actions: "[ 📍 Go to Table ]" button alongside "[ ✓ Resolve ]" task closer button
 * Interactivity: Clicking resolve marks card resolved and updates live counter.
 */
export function CustomizationCallCard({
  category = 'CUSTOMIZATION',
  timestamp = '3m ago',
  title = 'TABLE 3 — CUSTOM REQUEST',
  items = ['Extra ice', 'Change sides'],
  tableNumber = 3,
  isResolved: controlledResolved,
  onGoToTable,
  onResolve,
  onHaptic,
  className = ''
}) {
  const [internalResolved, setInternalResolved] = useState(false);
  const isRes = controlledResolved !== undefined ? controlledResolved : internalResolved;

  const handleGoToTable = () => {
    if (onHaptic) {
      onHaptic();
    } else {
      try {
        if (typeof vibrateNavigationTap === 'function') {
          vibrateNavigationTap();
        } else {
          playWaiterHapticPulse(750, 0.1);
        }
      } catch (_) {
        playWaiterHapticPulse(750, 0.1);
      }
    }
    if (onGoToTable) {
      onGoToTable(tableNumber);
    }
  };

  const handleResolve = () => {
    if (isRes) return;
    if (controlledResolved === undefined) {
      setInternalResolved(true);
    }

    if (onHaptic) {
      onHaptic();
    } else {
      try {
        if (typeof vibrateTaskResolved === 'function') {
          vibrateTaskResolved();
        } else {
          playWaiterHapticPulse(880, 0.15);
        }
      } catch (_) {
        playWaiterHapticPulse(880, 0.15);
      }
    }

    if (onResolve) {
      onResolve(tableNumber);
    }
  };

  return (
    <div
      data-testid="customization-call-card"
      className={`p-3.5 sm:p-4 rounded-2xl bg-[#0F1420] border transition-all duration-300 space-y-3 ${
        isRes
          ? 'opacity-40 border-slate-800 scale-[0.99] grayscale-[30%]'
          : 'border-slate-700/80 hover:border-slate-600 shadow-md shadow-black/40'
      } ${className}`}
    >
      {/* Header: Category tag "CUSTOMIZATION" and time Badge "3m ago" */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 tracking-wider">
          {category}
        </span>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800/80 shrink-0">
          {timestamp}
        </span>
      </div>

      {/* Title: "TABLE 3 — CUSTOM REQUEST" in bold white */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm sm:text-base font-black text-white tracking-wide">
            {title}
          </h4>
          {isRes && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              RESOLVED ✓
            </span>
          )}
        </div>

        {/* Body: "Extra ice, change sides" bullet list */}
        <ul className="text-xs sm:text-sm text-slate-300 font-medium mt-2 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRes ? 'bg-slate-500' : 'bg-amber-400'}`} />
              <span className={isRes ? 'line-through text-slate-500' : 'text-slate-200'}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Actions: "[ 📍 Go to Table ]" alongside "[ ✓ Resolve ]" */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleGoToTable}
          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>[ 📍 Go to Table ]</span>
        </button>

        <button
          type="button"
          onClick={handleResolve}
          disabled={isRes}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
            isRes
              ? 'bg-slate-800/40 border-slate-700/60 text-slate-400 cursor-default'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 hover:text-emerald-200 cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{isRes ? '[ Resolved ✓ ]' : '[ ✓ Resolve ]'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * DEFAULT EXPORT: DineSyncAdminAndCustomCards
 * Combines Card 2 and Card 3 in View B dispatch feed with dynamic live task counter
 */
export default function DineSyncAdminAndCustomCards({
  onTaskResolved,
  onAdminAcknowledged,
  onGoToTable,
  onCounterChange,
  showLiveCounter = true,
  className = ''
}) {
  const [adminAcknowledged, setAdminAcknowledged] = useState(false);
  const [customizationResolved, setCustomizationResolved] = useState(false);
  const [adminReply, setAdminReply] = useState('');

  // Calculate live active tasks count
  const activeCount = useMemo(() => {
    let count = 2; // Card 2 + Card 3
    if (adminAcknowledged) count -= 1;
    if (customizationResolved) count -= 1;
    return Math.max(0, count);
  }, [adminAcknowledged, customizationResolved]);

  const handleAdminAcknowledge = useCallback((replyText) => {
    setAdminAcknowledged(true);
    setAdminReply(replyText);

    if (onAdminAcknowledged) {
      onAdminAcknowledged(replyText);
    }
    if (onCounterChange) {
      const nextCount = (customizationResolved ? 0 : 1);
      onCounterChange(nextCount);
    }
  }, [customizationResolved, onAdminAcknowledged, onCounterChange]);

  const handleCustomizationResolve = useCallback((tableNum) => {
    setCustomizationResolved(true);

    if (onTaskResolved) {
      onTaskResolved(tableNum);
    }
    if (onCounterChange) {
      const nextCount = (adminAcknowledged ? 0 : 1);
      onCounterChange(nextCount);
    }
  }, [adminAcknowledged, onTaskResolved, onCounterChange]);

  const handleResetCards = () => {
    setAdminAcknowledged(false);
    setCustomizationResolved(false);
    setAdminReply('');
    try {
      if (typeof vibrateNavigationTap === 'function') {
        vibrateNavigationTap();
      } else {
        playWaiterHapticPulse(600, 0.1);
      }
    } catch (_) {
      playWaiterHapticPulse(600, 0.1);
    }
    if (onCounterChange) {
      onCounterChange(2);
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Live Counter & Status Header */}
      {showLiveCounter && (
        <div className="flex items-center justify-between px-1 py-0.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              Dispatch Feed
            </span>
            <span
              className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-full transition-colors duration-300 ${
                activeCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {activeCount} Active Task{activeCount === 1 ? '' : 's'}
            </span>
          </div>

          {(adminAcknowledged || customizationResolved) && (
            <button
              type="button"
              onClick={handleResetCards}
              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo</span>
            </button>
          )}
        </div>
      )}

      {/* CARD 2: ADMIN Direct Chat / Message Task */}
      <AdminDirectChatCard
        isAcknowledged={adminAcknowledged}
        acknowledgedReply={adminReply}
        onAcknowledge={handleAdminAcknowledge}
      />

      {/* CARD 3: CUSTOMIZATION Call Task */}
      <CustomizationCallCard
        isResolved={customizationResolved}
        onResolve={handleCustomizationResolve}
        onGoToTable={onGoToTable}
      />
    </div>
  );
}

