import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BellRing,
  Clock,
  Check,
  CheckCircle2,
  Flame,
  CheckCheck,
  UserCheck,
  ExternalLink,
  Search,
  Users,
  User,
  ShieldCheck,
  ChevronDown,
  X,
  Radio,
  Zap,
  LogOut,
  Layers,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Lock,
  RotateCcw,
  Key,
  Delete,
  ArrowLeft,
  ShieldAlert,
  BadgeCheck
} from 'lucide-react';
import DineSyncLoginScreen from '../components/waiter/DineSyncLoginScreen';
import { useSocket, useSocketListener } from '../context/SocketContext';
import { useRestaurant, DEFAULT_EMPLOYEE_ROSTER } from '../context/RestaurantContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import DineSyncStaffBlueprint from '../components/DineSyncStaffBlueprint';
import '../styles/staff.css';

// Re-export modern DineSync authentication screen for convenience
export { DineSyncLoginScreen };

/**
 * High-fidelity restaurant desk calling chime synthesizer using Web Audio API.
 * Synthesizes authentic metallic chime harmonics with rapid attack and decay.
 * Includes a distinct, high-urgency dual-tone chime when a table assigned specifically
 * to the logged-in waiter calls for service.
 * Works 100% offline with zero external audio assets!
 */
class BellAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async play() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;

      // 1. Fundamental metallic ring: 830.6 Hz (G#5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(830.6, now);
      osc1.frequency.exponentialRampToValueAtTime(820, now + 1.2);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.5);

      // 2. High harmonic chime: 1661 Hz (G#6)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1661.2, now);
      gain2.gain.setValueAtTime(0.25, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.2);

      // 3. Crisp brass ping transient: 2489 Hz
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(2489, now);
      gain3.gain.setValueAtTime(0.18, now);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now);
      osc3.stop(now + 0.4);
    } catch (e) {
      console.warn('[BellAudioSynthesizer] Audio playback error:', e);
    }
  }

  // High-priority targeted chime: Alerting the assigned waiter specifically
  async playTargetedChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;

      // Tone 1: High energetic alert (C6 - 1046 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: Crisp accent chime (G6 - 1568 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, now + 0.18);
      gain2.gain.setValueAtTime(0.45, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 1.4);

      // Tone 3: Harmonious brass ping (E7 - 2637 Hz)
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2637.02, now + 0.32);
      gain3.gain.setValueAtTime(0.3, now + 0.32);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.32);
      osc3.stop(now + 1.6);
    } catch (e) {
      console.warn('[BellAudioSynthesizer] Targeted chime error:', e);
    }
  }

  // Celebratory success chime when PIN is correctly entered
  async playSuccess() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;
      // Uplifting 3-tone arpeggio: C5 (523.25) -> G5 (783.99) -> C6 (1046.50)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.1);
      gain2.gain.setValueAtTime(0.35, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.38);

      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1046.5, now + 0.2);
      gain3.gain.setValueAtTime(0.4, now + 0.2);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.2);
      osc3.stop(now + 0.8);
    } catch (e) {
      console.warn('[BellAudioSynthesizer] Success chime error:', e);
    }
  }

  // Subtle error tone on incorrect PIN
  async playError() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(130, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (_) {}
  }
}

const bellSynthesizer = new BellAudioSynthesizer();

// Total floor tables in the venue
const TOTAL_FLOOR_TABLES = 12;

// Standard Floor Employee Roster with security PINs and credentials
export const DEFAULT_FLOOR_EMPLOYEES = DEFAULT_EMPLOYEE_ROSTER.map((e, idx) => ({
  ...e,
  accountCode: e.accountCode || e.waiterCode || `WAIT-${101 + idx}`,
  waiterCode: e.waiterCode || e.accountCode || `WAIT-${101 + idx}`,
  pin: e.pin || e.waiterPin || `${1001 + idx}`,
  waiterPin: e.waiterPin || e.pin || `${1001 + idx}`,
  shiftTime: e.shiftTime || (idx === 3 ? '12:00 - 20:00' : idx === 4 ? '16:00 - 00:00' : '08:00 - 16:00'),
  tables: (e.assignedTables || e.tables || []).map(Number),
  assignedTables: (e.assignedTables || e.tables || []).map(Number)
}));

export const HIRED_WAITERS = DEFAULT_FLOOR_EMPLOYEES;

// Default High-Fidelity Demo Assistance Requests for On-Field Waiter Testing
export const DEFAULT_DEMO_CALLS = [
  {
    id: 'call-demo-1',
    tableNumber: 1,
    table_number: 1,
    table: 1,
    reason: 'Need Extra Napkins & Cutlery',
    custom_message: 'Please bring 2 extra forks, soup spoons, and napkins.',
    status: 'pending',
    created_at: new Date(Date.now() - 45 * 1000).toISOString(),
    createdAt: Date.now() - 45 * 1000
  },
  {
    id: 'call-demo-2',
    tableNumber: 6,
    table_number: 6,
    table: 6,
    reason: 'Refill Water & Ice',
    custom_message: 'Sparkling chilled water and extra ice bucket.',
    status: 'pending',
    created_at: new Date(Date.now() - 95 * 1000).toISOString(),
    createdAt: Date.now() - 95 * 1000
  },
  {
    id: 'call-demo-3',
    tableNumber: 2,
    table_number: 2,
    table: 2,
    reason: 'Bill & Payment Request',
    custom_message: 'Ready to settle the bill via Card / bKash.',
    status: 'pending',
    created_at: new Date(Date.now() - 215 * 1000).toISOString(), // > 3 min -> triggers Urgent (> 3 min)
    createdAt: Date.now() - 215 * 1000
  },
  {
    id: 'call-demo-4',
    tableNumber: 4,
    table_number: 4,
    table: 4,
    reason: 'Food & Allergy Inquiry',
    custom_message: 'Guest wants to know if the truffle tagliatelle contains peanut traces.',
    status: 'pending',
    created_at: new Date(Date.now() - 30 * 1000).toISOString(),
    createdAt: Date.now() - 30 * 1000
  }
];

/**
 * WaiterLoginScreen: Ultra-sleek, premium, mobile-optimized authentication gate.
 * Features:
 * - Dual Mode Selection: Quick Staff Select (Default) & Account ID Entry
 * - Visual Avatars, Shift Times, and Assigned Tables Badges for each hired waiter
 * - Tactile 4-Digit PIN Pad with glowing indicator slots, clear/delete keys, and desktop keyboard support
 * - Helpful Demo Hint Chip with 1-click test fill
 * - Shake animation & red error feedback on incorrect PIN
 * - Audio confirmation chime synthesis on successful login
 */
export function WaiterLoginScreen({
  waiters = DEFAULT_FLOOR_EMPLOYEES,
  onLoginSuccess,
  bellSynthesizer,
  onOpenBlueprint,
  onSwitchToDineSync
}) {
  const [loginMode, setLoginMode] = useState('quick'); // 'quick' | 'account'
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  const [accountIdInput, setAccountIdInput] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Active target waiter resolution
  const activeTargetWaiter = useMemo(() => {
    if (loginMode === 'quick') {
      return selectedWaiter;
    }
    const clean = accountIdInput.trim().toUpperCase();
    if (!clean) return null;
    return (
      waiters.find((w) => {
        const code = (w.accountCode || w.waiterCode || '').toUpperCase();
        const id = (w.id || '').toUpperCase();
        const numId = String(w.numericId || '');
        const name = (w.name || '').toLowerCase();
        return (
          code === clean ||
          id === clean ||
          numId === clean ||
          name.includes(clean.toLowerCase())
        );
      }) || null
    );
  }, [loginMode, selectedWaiter, accountIdInput, waiters]);

  // Handle PIN verification
  const verifyPin = useCallback(
    (pinToTest, target) => {
      if (!target) {
        setPinError('Please select a waiter profile or enter a valid Account ID.');
        setIsShaking(true);
        bellSynthesizer?.playError();
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      const expectedPin = String(target.pin || target.waiterPin || '1001');

      if (pinToTest === expectedPin) {
        setIsSuccess(true);
        setPinError(null);
        bellSynthesizer?.playSuccess();
        setTimeout(() => {
          onLoginSuccess(target);
        }, 300);
      } else {
        setIsShaking(true);
        setPinError(`Incorrect PIN for ${target.name}. Please try again.`);
        bellSynthesizer?.playError();
        setTimeout(() => {
          setPin('');
          setIsShaking(false);
        }, 600);
      }
    },
    [bellSynthesizer, onLoginSuccess]
  );

  // Auto-trigger verification when 4 digits are typed
  const handleAppendDigit = useCallback(
    (digit) => {
      if (pin.length >= 4 || isSuccess) return;
      const nextPin = pin + digit;
      setPin(nextPin);
      setPinError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin, activeTargetWaiter);
      }
    },
    [pin, isSuccess, activeTargetWaiter, verifyPin]
  );

  const handleBackspacePin = useCallback(() => {
    if (isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  }, [isSuccess]);

  const handleClearPin = useCallback(() => {
    if (isSuccess) return;
    setPin('');
    setPinError(null);
  }, [isSuccess]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (e.key >= '0' && e.key <= '9') {
        handleAppendDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspacePin();
      } else if (e.key === 'Escape') {
        if (selectedWaiter) {
          setSelectedWaiter(null);
          setPin('');
          setPinError(null);
        } else {
          handleClearPin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAppendDigit, handleBackspacePin, handleClearPin, selectedWaiter]);

  // Quick Demo Auto-fill Helper
  const handleQuickDemoLogin = (waiter) => {
    const waiterPin = String(waiter.pin || waiter.waiterPin || '1001');
    if (loginMode === 'account') {
      setAccountIdInput(waiter.accountCode || waiter.waiterCode || 'WAIT-101');
    } else {
      setSelectedWaiter(waiter);
    }
    setPin(waiterPin);
    setPinError(null);
    verifyPin(waiterPin, waiter);
  };

  return (
    <div className="staff-root min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden p-4 sm:p-6 lg:p-8 justify-center items-center">
      {/* Dynamic Keyframes for PIN Shake & Amber Glow */}
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .pin-shake {
          animation: pin-shake 420ms ease-in-out;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.96); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 0.3; }
          100% { transform: scale(0.96); opacity: 0.8; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2.8s infinite ease-in-out;
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Container Card */}
      <div
        className={`w-full max-w-xl bg-[#0c1220]/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6 relative z-10 transition-all ${
          isShaking ? 'pin-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/25 animate-pulse-ring blur-md" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 relative z-10">
              <BellRing className="w-7 h-7 text-slate-950 animate-wiggle" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>SmartDine On-Field Waiter Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Waiter Duty Authentication
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
              Select your waiter profile or enter your assigned account ID &amp; PIN to start your shift.
            </p>
          </div>
        </div>

        {/* DineSync Staff Blueprint Quick Launcher */}
        {onOpenBlueprint && (
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={onOpenBlueprint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-500/10 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>DineSync Staff 16:9 Blueprint Showcase</span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 ml-1">
                View
              </span>
            </button>
          </div>
        )}

        {/* Switch to DineSync Staff Authentication Mode */}
        {onSwitchToDineSync && (
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={onSwitchToDineSync}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-500/10 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Switch to Modern DineSync Staff Login</span>
              <span className="text-amber-400 font-bold ml-1">➔</span>
            </button>
          </div>
        )}

        {/* Dual Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setLoginMode('quick');
              setPin('');
              setPinError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginMode === 'quick'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Quick Staff Select</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('account');
              setSelectedWaiter(null);
              setPin('');
              setPinError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginMode === 'account'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Account ID Entry</span>
          </button>
        </div>

        {/* Helpful Demo Hint Chip with One-Click Testing */}
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Waiter PIN Directory</span>
            </div>
            <span className="text-[10px] text-slate-400">Click any waiter for instant test</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {waiters.map((w) => {
              const code = w.accountCode || w.waiterCode || 'WAIT-101';
              const p = w.pin || w.waiterPin || '1001';
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(w)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 border border-slate-700/80 hover:border-amber-400/50 text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  title={`Test login as ${w.name} (Code: ${code}, PIN: ${p})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-white font-bold">{w.name}</span>
                  <span className="text-amber-300 font-mono font-bold">({p})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode 1: Quick Staff Select */}
        {loginMode === 'quick' && !selectedWaiter && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Active Hired Floor Staff ({waiters.length})
              </p>
              <span className="text-[11px] text-amber-400 font-semibold">Tap profile to enter PIN</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {waiters.map((waiter) => {
                const assignedList = waiter.tables || waiter.assignedTables || [];
                const tableString = assignedList.map((t) => `T${t}`).join(', ') || 'None';
                const code = waiter.accountCode || waiter.waiterCode || 'WAIT-101';

                return (
                  <button
                    key={waiter.id}
                    type="button"
                    onClick={() => {
                      setSelectedWaiter(waiter);
                      setPin('');
                      setPinError(null);
                    }}
                    className="group text-left p-3.5 rounded-2xl bg-gradient-to-b from-[#111827]/90 to-[#0b101d]/90 hover:from-[#1e293b]/90 hover:to-[#111827]/90 border border-slate-700/70 hover:border-amber-500/50 transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-amber-500/10 flex flex-col justify-between gap-2.5 cursor-pointer"
                  >
                    {/* Header: Avatar + Name + Account Code */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${
                            waiter.avatarBg || waiter.color || 'from-orange-500 to-amber-600'
                          } flex items-center justify-center text-slate-950 font-black text-sm shadow-md group-hover:scale-105 transition-transform`}
                        >
                          {waiter.initials || waiter.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0b101d]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                            {waiter.name}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold shrink-0">
                            {code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {waiter.role}
                        </p>
                      </div>
                    </div>

                    {/* Shift & Tables Details */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{waiter.shiftTime || '08:00 - 16:00'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tables:</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-amber-300 font-mono text-[11px] font-black border border-slate-700">
                          {tableString}
                        </span>
                      </div>
                    </div>

                    {/* Enter PIN Trigger Button */}
                    <div className="w-full py-1.5 px-3 rounded-xl bg-slate-800/60 group-hover:bg-amber-500/20 text-slate-300 group-hover:text-amber-200 text-xs font-bold text-center transition flex items-center justify-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enter Security PIN &rarr;</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode 1 PIN Entry (When waiter is tapped) */}
        {loginMode === 'quick' && selectedWaiter && (
          <div className="space-y-4">
            {/* Selected Waiter Card Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-800/70 to-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
                    selectedWaiter.avatarBg || selectedWaiter.color || 'from-orange-500 to-amber-600'
                  } flex items-center justify-center text-slate-950 font-black text-base shadow-lg`}
                >
                  {selectedWaiter.initials || selectedWaiter.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">{selectedWaiter.name}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                      {selectedWaiter.accountCode || selectedWaiter.waiterCode || 'WAIT-101'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedWaiter.role} &bull; Tables:{' '}
                    <span className="text-amber-300 font-bold">
                      {(selectedWaiter.tables || selectedWaiter.assignedTables || []).join(', ')}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWaiter(null);
                  setPin('');
                  setPinError(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Switch to another waiter profile"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Switch</span>
              </button>
            </div>

            {/* Instruction */}
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Enter 4-Digit Security PIN
              </p>
              <p className="text-xs text-slate-400">
                Demo PIN:{' '}
                <span className="font-mono text-amber-300 font-bold">
                  {selectedWaiter.pin || selectedWaiter.waiterPin || '1001'}
                </span>
              </p>
            </div>

            {/* PIN Dots feedback */}
            <div className="flex items-center justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      pinError
                        ? 'bg-rose-500 ring-4 ring-rose-500/30 scale-110 shadow-lg shadow-rose-500/50'
                        : isSuccess
                        ? 'bg-emerald-400 ring-4 ring-emerald-400/40 scale-125 shadow-lg shadow-emerald-400/50'
                        : isFilled
                        ? 'bg-amber-400 ring-4 ring-amber-400/30 scale-110 shadow-lg shadow-amber-400/50'
                        : 'bg-slate-800 border-2 border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Feedback */}
            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => {
                if (k === 'C') {
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={handleClearPin}
                      className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center cursor-pointer select-none"
                    >
                      Clear
                    </button>
                  );
                }
                if (k === 'DEL') {
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={handleBackspacePin}
                      className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-300 font-bold transition flex items-center justify-center cursor-pointer select-none"
                      aria-label="Backspace"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleAppendDigit(k)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 hover:border-amber-500/50 border border-slate-700 text-white font-extrabold text-xl transition flex items-center justify-center cursor-pointer shadow-sm select-none"
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode 2: Account ID Entry */}
        {loginMode === 'account' && (
          <div className="space-y-4">
            {/* Account ID input */}
            <div className="space-y-2">
              <label
                htmlFor="waiter-account-id-input"
                className="text-xs font-black uppercase tracking-wider text-slate-300 block"
              >
                Enter Assigned Account ID or Waiter Code
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="waiter-account-id-input"
                  type="text"
                  value={accountIdInput}
                  onChange={(e) => {
                    setAccountIdInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="e.g. WAIT-101, WAIT-102, WAIT-103..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white font-mono text-sm uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none transition"
                />
              </div>

              {/* Quick Pick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold self-center mr-1">
                  Quick Select:
                </span>
                {waiters.map((w) => {
                  const code = w.accountCode || w.waiterCode || 'WAIT-101';
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setAccountIdInput(code);
                        setPinError(null);
                      }}
                      className={`px-2 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer active:scale-95 ${
                        activeTargetWaiter?.id === w.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {code} ({w.name.split(' ')[0]})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matched Profile Preview */}
            {activeTargetWaiter ? (
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-amber-500/40 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${
                      activeTargetWaiter.avatarBg || activeTargetWaiter.color || 'from-orange-500 to-amber-600'
                    } flex items-center justify-center text-slate-950 font-black text-sm`}
                  >
                    {activeTargetWaiter.initials || activeTargetWaiter.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-sm">{activeTargetWaiter.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                        {activeTargetWaiter.accountCode || activeTargetWaiter.waiterCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeTargetWaiter.role} &bull; Tables:{' '}
                      <span className="text-amber-300 font-bold">
                        {(activeTargetWaiter.tables || activeTargetWaiter.assignedTables || []).join(', ')}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified
                </span>
              </div>
            ) : accountIdInput.trim().length > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
                No waiter found with code &ldquo;{accountIdInput}&rdquo;. Select one of WAIT-101 through WAIT-105 above.
              </div>
            ) : null}

            {/* PIN Section */}
            <div className="space-y-3 pt-2">
              <div className="text-center space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enter 4-Digit Security PIN
                </p>
                {activeTargetWaiter && (
                  <p className="text-xs text-slate-400">
                    Demo PIN:{' '}
                    <span className="font-mono text-amber-300 font-bold">
                      {activeTargetWaiter.pin || activeTargetWaiter.waiterPin || '1001'}
                    </span>
                  </p>
                )}
              </div>

              {/* PIN Dots feedback */}
              <div className="flex items-center justify-center gap-4 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        pinError
                          ? 'bg-rose-500 ring-4 ring-rose-500/30 scale-110 shadow-lg shadow-rose-500/50'
                          : isSuccess
                          ? 'bg-emerald-400 ring-4 ring-emerald-400/40 scale-125 shadow-lg shadow-emerald-400/50'
                          : isFilled
                          ? 'bg-amber-400 ring-4 ring-amber-400/30 scale-110 shadow-lg shadow-amber-400/50'
                          : 'bg-slate-800 border-2 border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error Feedback */}
              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Tactile Keypad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => {
                  if (k === 'C') {
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={handleClearPin}
                        className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center cursor-pointer select-none"
                      >
                        Clear
                      </button>
                    );
                  }
                  if (k === 'DEL') {
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={handleBackspacePin}
                        className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700/60 text-slate-300 font-bold transition flex items-center justify-center cursor-pointer select-none"
                        aria-label="Backspace"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleAppendDigit(k)}
                      className="h-13 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 hover:border-amber-500/50 border border-slate-700 text-white font-extrabold text-xl transition flex items-center justify-center cursor-pointer shadow-sm select-none"
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation & Sister Module Shortcuts */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Handheld Floor Gate</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="/"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Customer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/employee"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Employee</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/admin"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Admin</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaiterPanel() {
  // DineSync View Mode: 'blueprint' (16:9 double-mobile mockup) | 'handheld' (direct mobile) | 'console' (live on-floor console)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode') || params.get('view');
      if (urlMode === 'console' || urlMode === 'legacy' || urlMode === 'live') return 'console';
      if (urlMode === 'handheld') return 'handheld';
      if (urlMode === 'blueprint') return 'blueprint';
      const saved = localStorage.getItem('smartdine_waiter_view_mode');
      if (saved) return saved;
    }
    return 'blueprint';
  });

  const handleSwitchToConsole = useCallback(() => {
    setViewMode('console');
    try {
      localStorage.setItem('smartdine_waiter_view_mode', 'console');
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'console');
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  }, []);

  const handleSwitchToBlueprint = useCallback((mode = 'blueprint') => {
    setViewMode(mode);
    try {
      localStorage.setItem('smartdine_waiter_view_mode', mode);
      const url = new URL(window.location.href);
      url.searchParams.set('view', mode);
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  }, []);

  // Modern DineSync Login flavor vs legacy pinpad
  const [useDineSyncLogin, setUseDineSyncLogin] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('smartdine_waiter_login_flavor');
      if (saved === 'legacy') return false;
    }
    return true;
  });

  const handleToggleLoginFlavor = useCallback((flavor) => {
    setUseDineSyncLogin(flavor === 'dinesync');
    try {
      localStorage.setItem('smartdine_waiter_login_flavor', flavor);
    } catch (_) {}
  }, []);

  // Table Assignments State (Floor Employee Roster)
  const [employeeRoster, setEmployeeRoster] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('smartdine_waiter_accounts') ||
          localStorage.getItem('smartdine_floor_employee_roster') ||
          localStorage.getItem('smartdine_floor_staff_roster');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((e, idx) => ({
              ...DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length],
              ...e,
              accountCode: e.accountCode || e.waiterCode || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].accountCode,
              waiterCode: e.waiterCode || e.accountCode || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].accountCode,
              pin: e.pin || e.waiterPin || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].pin,
              waiterPin: e.waiterPin || e.pin || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].pin,
              tables: (e.assignedTables || e.tables || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].tables).map(Number),
              assignedTables: (e.assignedTables || e.tables || DEFAULT_FLOOR_EMPLOYEES[idx % DEFAULT_FLOOR_EMPLOYEES.length].tables).map(Number)
            }));
          }
        }
      } catch (_) {}
    }
    return DEFAULT_FLOOR_EMPLOYEES;
  });

  // Logged-in Waiter Profile state (Restored from authenticated session, or null for Login Gate)
  const [currentWaiter, setCurrentWaiter] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('smartdine_waiter_session') ||
          localStorage.getItem('smartdine_current_waiter') ||
          localStorage.getItem('smartdine_logged_in_waiter') ||
          localStorage.getItem('smartdine_waiter_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name) return parsed;
        }
      } catch (_) {}
    }
    return null;
  });

  const [calls, setCalls] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('smartdine_waiter_calls') ||
          localStorage.getItem('smartdine_active_assistance_calls');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_DEMO_CALLS;
  });

  const [resolvedHistory, setResolvedHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Default active tab is 'my-tables' as requested!
  const [activeTab, setActiveTab] = useState('my-tables'); // 'my-tables' | 'all' (backup) | 'urgent' | 'resolved-by-me'
  const [tableSearch, setTableSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [acknowledgedMap, setAcknowledgedMap] = useState(() => {
    return {
      'call-demo-3': {
        staffName: 'Hasan Mahmud',
        employeeId: 'emp-2',
        coveringFor: null,
        timestamp: Date.now() - 60 * 1000
      }
    };
  }); // callId -> { staffName, employeeId, coveringFor, timestamp }
  const [callEmployeeOverrides, setCallEmployeeOverrides] = useState({}); // callId -> employeeId
  const [bannerAlert, setBannerAlert] = useState(null);
  const [isChimeAnimating, setIsChimeAnimating] = useState(false);
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);

  // Restaurant Context for dynamic tables and employee coverage
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  // Sync employee roster from centralized context
  useEffect(() => {
    if (restaurant?.employees && Array.isArray(restaurant.employees) && restaurant.employees.length > 0) {
      setEmployeeRoster(
        restaurant.employees.map((e) => ({
          id: e.id,
          numericId: e.numericId,
          name: e.name,
          initials: e.initials,
          role: e.role,
          tables: e.assignedTables || e.tables || [],
          color: e.color || 'from-orange-500 to-amber-600',
          avatarBg: e.avatarBg || e.color || 'from-orange-500 to-amber-600',
          zone: e.zone,
          status: e.status
        }))
      );
    }
  }, [restaurant?.employees]);

  // Sync assistance calls from centralized context
  useEffect(() => {
    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls) && restaurant.assistanceCalls.length > 0) {
      setCalls((prev) => {
        const map = new Map();
        prev.forEach((c) => map.set(String(c.id ?? c.tableNumber), c));
        restaurant.assistanceCalls.forEach((c) => map.set(String(c.id ?? c.tableNumber), c));
        return Array.from(map.values());
      });
      setIsLoading(false);
    }
  }, [restaurant?.assistanceCalls]);

  const totalFloorTables = restaurant?.tableCount || TOTAL_FLOOR_TABLES;
  const displayTables = useMemo(
    () => Array.from({ length: totalFloorTables }, (_, i) => i + 1),
    [totalFloorTables]
  );

  // Assigned tables for the currently logged-in waiter
  const myAssignedTables = useMemo(() => {
    if (!currentWaiter) return [];
    return (currentWaiter.assignedTables || currentWaiter.tables || []).map(Number);
  }, [currentWaiter]);

  // Persist current waiter session
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      if (currentWaiter) {
        localStorage.setItem('smartdine_waiter_session', JSON.stringify(currentWaiter));
        localStorage.setItem('smartdine_current_waiter', JSON.stringify(currentWaiter));
        localStorage.setItem('smartdine_logged_in_waiter', JSON.stringify(currentWaiter));
        localStorage.setItem('smartdine_active_employee_id', currentWaiter.id);
      } else {
        localStorage.removeItem('smartdine_waiter_session');
        localStorage.removeItem('smartdine_current_waiter');
        localStorage.removeItem('smartdine_logged_in_waiter');
        localStorage.removeItem('smartdine_active_employee_id');
      }
    }
  }, [currentWaiter]);

  // Persist employee roster
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_floor_employee_roster', JSON.stringify(employeeRoster));
    }
  }, [employeeRoster]);

  // Persist active waiter calls
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_calls', JSON.stringify(calls));
    }
  }, [calls]);

  // Convex Cloud real-time waiter calls subscription
  let convexCalls = null;
  let resolveConvexCall = null;
  try {
    convexCalls = useQuery(api.waiter.getCalls, { status: 'pending' });
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Sync Convex calls
  useEffect(() => {
    if (convexCalls && Array.isArray(convexCalls) && convexCalls.length > 0) {
      setCalls(convexCalls.map((c) => ({ ...c, id: c.id ?? c._id })));
      setIsLoading(false);
    }
  }, [convexCalls]);

  // Socket Context
  const { socket } = useSocket();

  // Live timer tick every 1000ms for accurate elapsed time calculation & urgency pulsing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active assistance calls from backend
  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/waiter/calls', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        if (data.length > 0) {
          setCalls(data);
        }
      } else {
        const fallback = await fetch('/api/waiter');
        if (fallback.ok) {
          const json = await fallback.json();
          const data = Array.isArray(json) ? json : json.data || [];
          if (data.length > 0) {
            setCalls(data);
          }
        }
      }
    } catch (err) {
      console.warn('[WaiterPanel] Using local / demo calls:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Unlock Web Audio Context on first user click anywhere
  useEffect(() => {
    const handleFirstInteraction = () => {
      bellSynthesizer.init();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Resolve assigned employee for a given table number
  const getAssignedEmployeeForTable = useCallback(
    (tbl) => {
      const num = Number(tbl);
      if (!num || isNaN(num)) return null;
      return employeeRoster.find((s) => s.tables && s.tables.includes(num)) || null;
    },
    [employeeRoster]
  );

  // Trigger audio chime (regular or targeted)
  const triggerChime = useCallback((isTargeted = false) => {
    bellSynthesizer.init();
    if (isTargeted) {
      bellSynthesizer.playTargetedChime();
    } else {
      bellSynthesizer.play();
    }
    setIsChimeAnimating(true);
    setTimeout(() => {
      setIsChimeAnimating(false);
    }, 1800);
  }, []);

  // Handle incoming real-time assistance request
  const handleIncomingCall = useCallback(
    (newCall) => {
      if (!newCall) return;

      const callId = newCall.id ?? newCall._id ?? Date.now();
      const formattedCall = { ...newCall, id: callId };

      setCalls((prev) => {
        const exists = prev.some(
          (c) =>
            c.id === formattedCall.id ||
            (c.table_number === (formattedCall.table_number || formattedCall.tableNumber) &&
              c.created_at === formattedCall.created_at)
        );
        if (exists) return prev;
        return [formattedCall, ...prev];
      });

      const tableNum = Number(
        formattedCall.table_number ||
          formattedCall.tableNumber ||
          formattedCall.table ||
          0
      );
      const assigned = getAssignedEmployeeForTable(tableNum);
      const isTargetedToMe = myAssignedTables.includes(tableNum);

      // Synthesizes audio chime alerting them specifically when call is from their tables
      triggerChime(isTargetedToMe);

      // Trigger floating alert banner
      setBannerAlert({
        tableNumber: tableNum || '?',
        reason: formattedCall.reason || 'Assistance Requested',
        assignedTo: assigned?.name || 'Unassigned (General Pool)',
        isTargetedToMe,
        time: Date.now()
      });

      setTimeout(() => {
        setBannerAlert(null);
      }, 7000);
    },
    [triggerChime, getAssignedEmployeeForTable, myAssignedTables]
  );

  // Handle incoming real-time resolved event
  const handleResolvedCall = useCallback((payload) => {
    const resolvedId =
      typeof payload === 'object' && payload !== null
        ? payload.id ?? payload.call_id ?? (payload.call && payload.call.id)
        : payload;
    if (!resolvedId) return;

    setCalls((prev) => {
      const match = prev.find((c) => String(c.id) === String(resolvedId));
      if (match) {
        setResolvedHistory((hist) => [
          { ...match, status: 'resolved', resolvedAt: Date.now() },
          ...hist.slice(0, 49) // Keep last 50
        ]);
      }
      return prev.filter((c) => String(c.id) !== String(resolvedId));
    });

    setAcknowledgedMap((prev) => {
      const next = { ...prev };
      delete next[resolvedId];
      return next;
    });
  }, []);

  // Handle incoming real-time acknowledge event (multi-device sync)
  const handleIncomingAcknowledge = useCallback((payload) => {
    if (!payload?.id) return;
    setAcknowledgedMap((prev) => ({
      ...prev,
      [payload.id]: {
        staffName: payload.staffName || payload.employeeName || 'Floor Specialist',
        employeeId: payload.staffId || payload.employeeId || null,
        coveringFor: payload.coveringFor || null,
        timestamp: Date.now()
      }
    }));
  }, []);

  // Handle incoming real-time table assignment sync
  const handleIncomingAssignment = useCallback((payload) => {
    if (!payload) return;
    const employeeId = payload.employeeId || payload.staffId;
    if (payload.callId && employeeId) {
      setCallEmployeeOverrides((prev) => ({
        ...prev,
        [payload.callId]: employeeId
      }));
    }
  }, []);

  // Real-time Socket.IO event listeners
  useSocketListener('waiter:call', handleIncomingCall);
  useSocketListener('waiter:resolved', handleResolvedCall);
  useSocketListener('waiter:resolve', handleResolvedCall);
  useSocketListener('waiter:acknowledge', handleIncomingAcknowledge);
  useSocketListener('waiter:assigned', handleIncomingAssignment);

  // Logout / Switch Waiter Handler
  const handleLogout = useCallback(() => {
    setCurrentWaiter(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('smartdine_waiter_session');
      localStorage.removeItem('smartdine_current_waiter');
      localStorage.removeItem('smartdine_logged_in_waiter');
      localStorage.removeItem('smartdine_waiter_profile');
      localStorage.removeItem('smartdine_active_employee_id');
    }
  }, []);

  // Waiter Profile Selection / Login
  const handleSelectWaiter = useCallback((waiter) => {
    const sessionData = {
      ...waiter,
      employeeId: waiter.id,
      id: waiter.id,
      numericId: waiter.numericId,
      name: waiter.name,
      initials: waiter.initials,
      role: waiter.role,
      accountCode: waiter.accountCode || waiter.waiterCode || 'WAIT-101',
      waiterCode: waiter.accountCode || waiter.waiterCode || 'WAIT-101',
      pin: waiter.pin || waiter.waiterPin || '1001',
      waiterPin: waiter.pin || waiter.waiterPin || '1001',
      tables: (waiter.tables || waiter.assignedTables || []).map(Number),
      assignedTables: (waiter.tables || waiter.assignedTables || []).map(Number),
      shift: waiter.shift || 'Morning Shift (08:00 - 16:00)',
      shiftTime: waiter.shiftTime || '08:00 - 16:00',
      color: waiter.color || 'from-orange-500 to-amber-600',
      avatarBg: waiter.avatarBg || waiter.color || 'from-orange-500 to-amber-600',
      zone: waiter.zone || 'Zone 1 (Main Hall)',
      loginTime: Date.now()
    };
    setCurrentWaiter(sessionData);
    setActiveTab('my-tables'); // Automatically reset to My Tables on login
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_session', JSON.stringify(sessionData));
      localStorage.setItem('smartdine_current_waiter', JSON.stringify(sessionData));
      localStorage.setItem('smartdine_logged_in_waiter', JSON.stringify(sessionData));
      localStorage.setItem('smartdine_active_employee_id', waiter.id);
    }
  }, []);

  const handleLoginSuccess = handleSelectWaiter;

  // Acknowledge a request ("Attending Table")
  const handleAcknowledge = (call) => {
    const callId = call.id;
    const tableNum = Number(call.table_number || call.tableNumber || call.table);
    const isTargetedToMe = myAssignedTables.includes(tableNum);
    const assignedColleague = getAssignedEmployeeForTable(tableNum);

    // If it's a colleague's table, note covering status
    const coveringFor =
      !isTargetedToMe && assignedColleague && assignedColleague.id !== currentWaiter?.id
        ? assignedColleague.name
        : null;

    const staffName = currentWaiter?.name || 'Floor Specialist';

    setAcknowledgedMap((prev) => ({
      ...prev,
      [callId]: {
        staffName,
        employeeId: currentWaiter?.id || null,
        coveringFor,
        timestamp: Date.now()
      }
    }));

    if (socket?.connected) {
      socket.emit('waiter:acknowledge', {
        id: callId,
        staffId: currentWaiter?.id || null,
        employeeId: currentWaiter?.id || null,
        staffName,
        employeeName: staffName,
        coveringFor,
        tableNumber: tableNum
      });
    }
  };

  // Assign request to a specific floor employee
  const handleAssignCall = (callId, employeeId) => {
    setCallEmployeeOverrides((prev) => ({
      ...prev,
      [callId]: employeeId
    }));

    if (socket?.connected) {
      socket.emit('waiter:assigned', {
        id: callId,
        callId,
        staffId: employeeId,
        employeeId
      });
    }
  };

  // Resolve a call ("Done / Resolved")
  const handleResolve = async (callId) => {
    const targetCall = calls.find((c) => c.id === callId);
    const ack = acknowledgedMap[callId];
    const resolvedRecord = {
      ...targetCall,
      status: 'resolved',
      resolvedAt: Date.now(),
      resolvedBy: currentWaiter?.name || ack?.staffName || 'Floor Specialist',
      attendingStaff: ack?.staffName || currentWaiter?.name || 'Floor Specialist',
      coveringFor: ack?.coveringFor || null
    };

    // Optimistic UI update
    setCalls((prev) => prev.filter((c) => c.id !== callId));
    if (targetCall) {
      setResolvedHistory((prev) => [resolvedRecord, ...prev.slice(0, 49)]);
    }
    setAcknowledgedMap((prev) => {
      const next = { ...prev };
      delete next[callId];
      return next;
    });

    // Also resolve in Restaurant Context
    if (restaurant?.resolveAssistanceCall) {
      restaurant.resolveAssistanceCall(
        targetCall?.tableNumber || targetCall?.table_number || callId
      );
    }

    // Broadcast resolve over Socket.IO immediately
    if (socket?.connected) {
      socket.emit('waiter:resolve', {
        id: callId,
        resolvedBy: currentWaiter?.name,
        staffName: currentWaiter?.name
      });
    }

    // Resolve in Convex Cloud if available
    if (resolveConvexCall && typeof callId === 'string' && !String(callId).startsWith('call_')) {
      try {
        await resolveConvexCall({ callId });
      } catch (_) {}
    }

    // Resolve in backend DB
    try {
      const res = await fetch(`/api/waiter/calls/${callId}/resolve`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        await fetch(`/api/waiter/calls/${callId}/resolve`, {
          method: 'POST',
          headers: { Accept: 'application/json' }
        });
      }
    } catch (err) {
      console.warn('[WaiterPanel] Resolve endpoint error:', err);
    }
  };

  // Reassign table to employee in the roster
  const handleReassignTable = (tableNumber, newEmployeeId) => {
    if (restaurant?.assignTableToEmployee) {
      restaurant.assignTableToEmployee(tableNumber, newEmployeeId);
    }
    setEmployeeRoster((prev) =>
      prev.map((emp) => {
        const hasTable = (emp.tables || []).includes(tableNumber);
        if (emp.id === newEmployeeId) {
          if (!hasTable) {
            return { ...emp, tables: [...(emp.tables || []), tableNumber].sort((a, b) => a - b) };
          }
          return emp;
        } else if (hasTable) {
          return { ...emp, tables: (emp.tables || []).filter((t) => t !== tableNumber) };
        }
        return emp;
      })
    );
  };

  // Simulate an incoming call targeted to the logged-in waiter's tables
  const handleSimulateMyTableCall = () => {
    const targetTable =
      myAssignedTables.length > 0
        ? myAssignedTables[Math.floor(Math.random() * myAssignedTables.length)]
        : 1;

    const sampleReasons = [
      { reason: 'Table Service Needed', msg: 'Guest has requested their assigned waiter at table.' },
      { reason: 'Cocktails & Beverage Reorder', msg: 'Would like another round of mojitos and craft iced tea.' },
      { reason: 'Extra Cutlery & Condiments', msg: 'Please bring 2 extra forks, chili flakes, and garlic oil.' },
      { reason: 'Dessert Menu Recommendation', msg: 'Ready for warm chocolate fondant and cappuccino.' }
    ];
    const randomItem = sampleReasons[Math.floor(Math.random() * sampleReasons.length)];

    const newCall = {
      id: `call-sim-my-${Date.now()}`,
      tableNumber: targetTable,
      table_number: targetTable,
      table: targetTable,
      reason: randomItem.reason,
      custom_message: randomItem.msg,
      status: 'pending',
      created_at: new Date().toISOString(),
      createdAt: Date.now()
    };

    setCalls((prev) => {
      const next = [newCall, ...prev];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('smartdine_waiter_calls', JSON.stringify(next));
      }
      return next;
    });

    // Targeted high-priority chime!
    triggerChime(true);

    setBannerAlert({
      tableNumber: targetTable,
      reason: randomItem.reason,
      assignedTo: currentWaiter?.name || 'You',
      isTargetedToMe: true,
      time: Date.now()
    });
    setTimeout(() => setBannerAlert(null), 7000);
  };

  // Simulate an incoming call from a colleague's table (Full Floor Backup test)
  const handleSimulateColleagueCall = () => {
    const colleagueTables = displayTables.filter((t) => !myAssignedTables.includes(t));
    const randomTable =
      colleagueTables.length > 0
        ? colleagueTables[Math.floor(Math.random() * colleagueTables.length)]
        : 2;

    const sampleReasons = [
      { reason: 'Bill & Payment Request', msg: 'Ready to settle bill with split card payment.' },
      { reason: 'Water & Ice Refill', msg: 'Chilled mineral water and lemon slices requested.' },
      { reason: 'Food & Allergy Inquiry', msg: 'Guest asking about shellfish preparation in kitchen.' }
    ];
    const randomItem = sampleReasons[Math.floor(Math.random() * sampleReasons.length)];
    const assignedColleague = getAssignedEmployeeForTable(randomTable);

    const newCall = {
      id: `call-sim-colleague-${Date.now()}`,
      tableNumber: randomTable,
      table_number: randomTable,
      table: randomTable,
      reason: randomItem.reason,
      custom_message: randomItem.msg,
      status: 'pending',
      created_at: new Date().toISOString(),
      createdAt: Date.now()
    };

    setCalls((prev) => {
      const next = [newCall, ...prev];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('smartdine_waiter_calls', JSON.stringify(next));
      }
      return next;
    });

    triggerChime(false);

    setBannerAlert({
      tableNumber: randomTable,
      reason: randomItem.reason,
      assignedTo: assignedColleague?.name || 'Colleague Table',
      isTargetedToMe: false,
      time: Date.now()
    });
    setTimeout(() => setBannerAlert(null), 7000);
  };

  // Reset or reload the 4 default demo requests
  const handleResetDemoCalls = () => {
    const timestampNow = Date.now();
    const freshCalls = [
      {
        id: `call-demo-1-${timestampNow}`,
        tableNumber: 1,
        table_number: 1,
        table: 1,
        reason: 'Need Extra Napkins & Cutlery',
        custom_message: 'Please bring 2 extra forks, soup spoons, and napkins.',
        status: 'pending',
        created_at: new Date(timestampNow - 45 * 1000).toISOString(),
        createdAt: timestampNow - 45 * 1000
      },
      {
        id: `call-demo-2-${timestampNow}`,
        tableNumber: 6,
        table_number: 6,
        table: 6,
        reason: 'Refill Water & Ice',
        custom_message: 'Sparkling chilled water and extra ice bucket.',
        status: 'pending',
        created_at: new Date(timestampNow - 95 * 1000).toISOString(),
        createdAt: timestampNow - 95 * 1000
      },
      {
        id: `call-demo-3-${timestampNow}`,
        tableNumber: 2,
        table_number: 2,
        table: 2,
        reason: 'Bill & Payment Request',
        custom_message: 'Ready to settle the bill via Card / bKash.',
        status: 'pending',
        created_at: new Date(timestampNow - 215 * 1000).toISOString(), // > 3 min -> triggers Urgent (> 3 min)
        createdAt: timestampNow - 215 * 1000
      },
      {
        id: `call-demo-4-${timestampNow}`,
        tableNumber: 4,
        table_number: 4,
        table: 4,
        reason: 'Food & Allergy Inquiry',
        custom_message: 'Guest wants to know if the truffle tagliatelle contains peanut traces.',
        status: 'pending',
        created_at: new Date(timestampNow - 30 * 1000).toISOString(),
        createdAt: timestampNow - 30 * 1000
      }
    ];

    setCalls(freshCalls);
    setAcknowledgedMap({
      [`call-demo-3-${timestampNow}`]: {
        staffName: 'Hasan Mahmud',
        employeeId: 'emp-2',
        coveringFor: null,
        timestamp: timestampNow - 60 * 1000
      }
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_calls', JSON.stringify(freshCalls));
    }

    bellSynthesizer.play();
    setIsChimeAnimating(true);
    setTimeout(() => setIsChimeAnimating(false), 2000);
  };

  // Calculate elapsed time & check if urgent (> 3 minutes / 180 seconds)
  const getCallMetrics = useCallback(
    (call) => {
      const createdTime = call.created_at ? new Date(call.created_at).getTime() : currentTime;
      const elapsedMs = Math.max(0, currentTime - createdTime);
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const remainingSeconds = elapsedSeconds % 60;

      // 3 minutes = 180 seconds
      const isUrgent = elapsedSeconds >= 180;

      let timeText = '';
      if (elapsedSeconds < 60) {
        timeText = `${elapsedSeconds}s ago`;
      } else if (elapsedMinutes < 60) {
        timeText = `${elapsedMinutes}m ${remainingSeconds}s ago`;
      } else {
        const hours = Math.floor(elapsedMinutes / 60);
        timeText = `${hours}h ${elapsedMinutes % 60}m ago`;
      }

      return {
        elapsedSeconds,
        elapsedMinutes,
        isUrgent,
        timeText
      };
    },
    [currentTime]
  );

  // Tab 1: Calls for tables assigned specifically to current waiter
  const myAssignedCalls = useMemo(() => {
    return calls.filter((call) => {
      const tbl = Number(call.table_number || call.tableNumber || call.table);
      return myAssignedTables.includes(tbl);
    });
  }, [calls, myAssignedTables]);

  // Tab 3: Urgent calls (> 3m wait)
  const urgentCalls = useMemo(() => {
    return calls.filter((call) => {
      const { isUrgent } = getCallMetrics(call);
      return isUrgent;
    });
  }, [calls, getCallMetrics]);

  // Tab 4: Requests resolved by current waiter or involving their tables
  const myResolved = useMemo(() => {
    return resolvedHistory.filter((item) => {
      const tbl = Number(item.table_number || item.tableNumber || item.table);
      return (
        item.resolvedBy === currentWaiter?.name ||
        item.attendingStaff === currentWaiter?.name ||
        myAssignedTables.includes(tbl)
      );
    });
  }, [resolvedHistory, currentWaiter, myAssignedTables]);

  // Filtered calls displayed according to activeTab and table search query
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const table = String(call.table_number || call.tableNumber || call.table || '');
      const tableNum = Number(table);
      const reason = String(call.reason || '').toLowerCase();
      const customMsg = String(call.custom_message || '').toLowerCase();

      // Resolve effective assigned employee
      const overrideEmployeeId = callEmployeeOverrides[call.id];
      const defaultAssigned = getAssignedEmployeeForTable(tableNum);
      const effectiveEmployee = overrideEmployeeId
        ? employeeRoster.find((s) => s.id === overrideEmployeeId)
        : defaultAssigned;

      const employeeName = effectiveEmployee ? effectiveEmployee.name.toLowerCase() : '';

      // Search match
      const query = tableSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        table.includes(query) ||
        reason.includes(query) ||
        customMsg.includes(query) ||
        employeeName.includes(query);

      if (!matchesSearch) return false;

      const { isUrgent } = getCallMetrics(call);
      const isMyTable = myAssignedTables.includes(tableNum);

      // Tab filtering
      if (activeTab === 'my-tables') {
        return isMyTable;
      }
      if (activeTab === 'urgent') {
        return isUrgent;
      }
      // 'all' tab is "Full Floor Backup" -> shows all floor calls!
      return true;
    });
  }, [
    calls,
    tableSearch,
    activeTab,
    myAssignedTables,
    callEmployeeOverrides,
    getAssignedEmployeeForTable,
    employeeRoster,
    getCallMetrics
  ]);

  // Aggregate stats
  const stats = useMemo(() => {
    let maxElapsed = 0;
    calls.forEach((c) => {
      const { elapsedSeconds } = getCallMetrics(c);
      if (elapsedSeconds > maxElapsed) maxElapsed = elapsedSeconds;
    });

    const maxWaitText =
      maxElapsed >= 60
        ? `${Math.floor(maxElapsed / 60)}m ${maxElapsed % 60}s`
        : `${maxElapsed}s`;

    return {
      total: calls.length,
      myAssignedCount: myAssignedCalls.length,
      urgentCount: urgentCalls.length,
      maxWaitText: calls.length > 0 ? maxWaitText : '0s'
    };
  }, [calls, myAssignedCalls.length, urgentCalls.length, getCallMetrics]);

  // Formatted string for table badges (e.g. "T1, T6, T11")
  const myTablePillText = useMemo(() => {
    if (!currentWaiter) return 'None';
    const tbls = currentWaiter.assignedTables || currentWaiter.tables || [];
    if (!tbls || tbls.length === 0) return 'None';
    return tbls.map((t) => `T${t}`).join(', ');
  }, [currentWaiter]);

  // =========================================================================
  // DINESYNC STAFF 16:9 BLUEPRINT / HANDHELD VIEW (Primary Mockup Showcase)
  // =========================================================================
  if (viewMode === 'blueprint' || viewMode === 'handheld') {
    return (
      <DineSyncStaffBlueprint
        initialDisplayMode={viewMode === 'handheld' ? 'handheld' : 'blueprint'}
        onSwitchToLegacy={handleSwitchToConsole}
      />
    );
  }

  // =========================================================================
  // LOGIN / AUTHENTICATION GATE VIEW (When !currentWaiter)
  // =========================================================================
  if (!currentWaiter) {
    if (useDineSyncLogin) {
      return (
        <DineSyncLoginScreen
          waiters={employeeRoster}
          onLoginSuccess={handleLoginSuccess}
          bellSynthesizer={bellSynthesizer}
          onOpenBlueprint={() => handleSwitchToBlueprint('blueprint')}
          onSwitchToLegacy={() => handleToggleLoginFlavor('legacy')}
        />
      );
    }
    return (
      <WaiterLoginScreen
        waiters={employeeRoster}
        onLoginSuccess={handleLoginSuccess}
        bellSynthesizer={bellSynthesizer}
        onOpenBlueprint={() => handleSwitchToBlueprint('blueprint')}
        onSwitchToDineSync={() => handleToggleLoginFlavor('dinesync')}
      />
    );
  }

  // =========================================================================
  // MAIN PERSONALIZED DUTY CONSOLE (When currentWaiter is logged in)
  // =========================================================================
  return (
    <div className="staff-root min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header Personalized to Logged-in Waiter */}
      <header className="sticky top-0 z-30 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Waiter Avatar, Identity & Glowing Assigned Tables Pill */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Avatar Circle with Initials & Active Chime Ping */}
            <div
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr ${
                currentWaiter.avatarBg || currentWaiter.color || 'from-amber-500 to-orange-600'
              } text-white font-black text-sm sm:text-base flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50 shrink-0 transition-transform ${
                isChimeAnimating ? 'scale-110 ring-4 ring-amber-400' : ''
              }`}
            >
              <span>{currentWaiter.initials || 'RA'}</span>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0b0f19] ring-2 ring-emerald-500/50" />
            </div>

            {/* Waiter Details & Duty Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  {currentWaiter.name}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  {currentWaiter.role || 'Floor Specialist'}
                </span>
              </div>

              {/* Glowing Pill: "Your Tables: T1, T6, T11 • Zone 1" */}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>
                    Your Tables: {myTablePillText} &bull; {currentWaiter.zone || 'Zone 1'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Controls: Simulate, Tables Matrix & Switch Waiter / Logout */}
          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* DineSync Staff Blueprint Switcher */}
            <button
              type="button"
              onClick={() => handleSwitchToBlueprint('blueprint')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
              title="Showcase DineSync Staff 16:9 Double-Mobile Mockup Blueprint"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>DineSync Blueprint (16:9)</span>
            </button>

            {/* Quick Simulate My Table Call */}
            <button
              type="button"
              onClick={handleSimulateMyTableCall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-black border border-amber-500/40 hover:border-amber-400 transition active:scale-95 cursor-pointer shadow-sm"
              title="Simulate a call specifically from one of YOUR assigned tables"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Simulate My Table</span>
            </button>

            {/* Quick Simulate Colleague Table Call */}
            <button
              type="button"
              onClick={handleSimulateColleagueCall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 hover:border-sky-500/40 transition active:scale-95 cursor-pointer shadow-sm"
              title="Simulate a call from a colleague's table (Full Floor Backup test)"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Simulate Colleague</span>
            </button>

            {/* Table Assignments Overview Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsAssignmentsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 cursor-pointer"
              title="View and reassign table zones among floor employees"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Assignments</span>
            </button>

            {/* Action Button: [ ↺ Switch Waiter / Logout ] with LogOut icon */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
              title="Switch waiter or sign out of duty shift"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Switch Waiter / Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Incoming Alert Banner */}
      {bannerAlert && (
        <div
          className={`text-white px-4 py-2.5 shadow-xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-slide-up border-b ${
            bannerAlert.isTargetedToMe
              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 border-amber-300/40 ring-4 ring-amber-400/30 animate-pulse'
              : 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-slate-700'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🔔</span>
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                {bannerAlert.isTargetedToMe ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-amber-400 text-amber-200 font-black tracking-wide">
                    🚨 CALLING YOU: Table #{bannerAlert.tableNumber}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/20 text-white font-black tracking-wide">
                    Table #{bannerAlert.tableNumber} requested assistance
                  </span>
                )}
                <span className="text-white/90 font-bold">&rarr;</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/20 font-black text-amber-100 border border-white/30">
                  {bannerAlert.isTargetedToMe
                    ? 'Assigned to YOU (' + currentWaiter.name + ')'
                    : 'Assigned colleague: ' + bannerAlert.assignedTo}
                </span>
                {bannerAlert.reason && (
                  <span className="text-white/80 font-medium text-xs ml-1">
                    ({bannerAlert.reason})
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerAlert(null)}
              className="text-white hover:text-amber-200 px-2 py-0.5 rounded cursor-pointer font-black text-sm shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Floor KPI Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: My Tables Pending */}
          <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-amber-300 font-black uppercase tracking-wider">
                My Tables Calls
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.myAssignedCount}
              </p>
            </div>
          </div>

          {/* Card 2: Full Floor Total Active */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                Full Floor Active
              </p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.total}</p>
            </div>
          </div>

          {/* Card 3: Urgent Calls (> 3m) */}
          <div
            className={`border rounded-2xl p-4 flex items-center gap-3.5 shadow-md transition-all ${
              stats.urgentCount > 0
                ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-100 animate-pulse'
                : 'bg-[#0f172a] border border-slate-700 text-slate-300'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                stats.urgentCount > 0
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Urgent (&gt; 3 min)
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  stats.urgentCount > 0 ? 'text-rose-300' : 'text-slate-200'
                }`}
              >
                {stats.urgentCount}
              </p>
            </div>
          </div>

          {/* Card 4: Max Wait Time */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                Longest Wait
              </p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.maxWaitText}</p>
            </div>
          </div>
        </section>

        {/* Filter Bar, Active Tabs & Table Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f172a]/80 p-2.5 rounded-2xl border border-slate-700">
          {/* Filter Tabs - Tab 1 is My Tables by default! */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Tab 1: My Tables */}
            <button
              type="button"
              onClick={() => setActiveTab('my-tables')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my-tables'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Tables ({myAssignedCalls.length})</span>
            </button>

            {/* Tab 2: Full Floor Backup */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30 font-black'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Floor Backup ({calls.length})</span>
            </button>

            {/* Tab 3: Urgent */}
            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'urgent'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : urgentCalls.length > 0
                  ? 'bg-rose-950/80 text-rose-200 hover:bg-rose-900/80 border border-rose-700'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Urgent ({urgentCalls.length})</span>
            </button>

            {/* Tab 4: Resolved by Me */}
            <button
              type="button"
              onClick={() => setActiveTab('resolved-by-me')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'resolved-by-me'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-black'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resolved by Me ({myResolved.length})</span>
            </button>
          </div>

          {/* Quick Table / Service Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table, reason..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Display: Calls Grid OR Resolved by Me List */}
        {activeTab === 'resolved-by-me' ? (
          /* TAB 4: RESOLVED BY ME LIST */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                Resolved by {currentWaiter.name} Today ({myResolved.length})
              </h2>
              {myResolved.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setResolvedHistory((prev) =>
                      prev.filter((c) => !myResolved.some((m) => m.id === c.id))
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer font-semibold"
                >
                  Clear My Resolved History
                </button>
              )}
            </div>

            {myResolved.length === 0 ? (
              <div className="text-center py-12 bg-[#0f172a] border border-slate-700 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-slate-200 text-sm font-bold">
                  No resolved assistance requests yet for this shift.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  When you resolve calls from your tables or assist colleagues, they will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myResolved.map((item) => {
                  const tbl = item.table_number || item.tableNumber || item.table;
                  const isMyTable = myAssignedTables.includes(Number(tbl));
                  return (
                    <div
                      key={'hist-' + item.id}
                      className="p-4 rounded-2xl bg-[#0f172a] border border-slate-700 shadow-md space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                            isMyTable
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          Table {tbl} {isMyTable ? '(Your Table)' : '(Backup)'}
                        </span>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Resolved
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-100 truncate">{item.reason}</p>
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Staff: {item.resolvedBy || currentWaiter.name}</span>
                        {item.coveringFor && (
                          <span className="text-amber-300 font-bold">
                            Covering for {item.coveringFor}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CALLS GRID (My Tables / Full Floor Backup / Urgent) */
          <div>
            {filteredCalls.length === 0 ? (
              /* Empty State */
              <div className="staff-empty text-center py-16 px-4 bg-[#0f172a]/60 border border-dashed border-slate-700 rounded-3xl space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {activeTab === 'my-tables'
                      ? 'All Your Tables Are Attended!'
                      : 'All Tables Attended To!'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
                    {activeTab === 'my-tables'
                      ? `No pending requests from your assigned tables (${myTablePillText}). The console chime will sound immediately if a guest calls.`
                      : 'No active calls matching this view.'}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b0f19] border border-slate-700 text-xs text-slate-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Listening for calls targeted to {currentWaiter.name} ({myTablePillText})</span>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSimulateMyTableCall}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Simulate Call to My Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDemoCalls}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset 4 Demo Requests</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCalls.map((call) => {
                  const { isUrgent, timeText } = getCallMetrics(call);
                  const isAcknowledged = !!acknowledgedMap[call.id];
                  const ackInfo = acknowledgedMap[call.id];
                  const tableNum = Number(
                    call.table_number || call.tableNumber || call.table || 0
                  );

                  // Is this call from one of the currently logged-in waiter's assigned tables?
                  const isCallingYou = myAssignedTables.includes(tableNum);

                  // Assigned employee resolution
                  const overrideEmployeeId = callEmployeeOverrides[call.id];
                  const defaultColleague = getAssignedEmployeeForTable(tableNum);
                  const effectiveEmployee = overrideEmployeeId
                    ? employeeRoster.find((s) => s.id === overrideEmployeeId)
                    : defaultColleague;

                  // High-contrast, accessible card styling
                  let cardStyles =
                    'relative rounded-3xl p-5 border transition-all duration-300 shadow-xl flex flex-col justify-between ';

                  if (isUrgent) {
                    // Pulsing red urgent state (> 3 minutes)
                    cardStyles +=
                      'bg-rose-950/80 border-2 border-rose-500 ring-4 ring-rose-500/30 text-white animate-pulse ';
                  } else if (isCallingYou) {
                    // Prominent vibrant amber-orange glowing border for "Targeted to YOU"
                    cardStyles +=
                      'bg-gradient-to-b from-[#131d33] to-[#0f172a] border-2 border-amber-400 ring-4 ring-amber-500/25 text-slate-100 shadow-[0_0_25px_rgba(245,158,11,0.25)] ';
                  } else if (isAcknowledged) {
                    // Acknowledged attending state
                    cardStyles +=
                      'bg-[#0f172a] border-2 border-emerald-500/80 ring-2 ring-emerald-500/20 text-slate-100 ';
                  } else {
                    // Normal colleague call state
                    cardStyles +=
                      'bg-[#0f172a] border border-slate-700 hover:border-slate-600 text-slate-100 ';
                  }

                  return (
                    <div key={call.id} className={cardStyles}>
                      {/* Top Header inside Card */}
                      <div>
                        {/* Direct Dispatch & "Targeted to YOU" Badge */}
                        {isCallingYou ? (
                          <div className="mb-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-red-500/20 border-2 border-amber-400 text-amber-200 text-xs font-black flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0 animate-bounce">🚨</span>
                              <span className="tracking-wide text-white uppercase font-black text-xs">
                                CALLING YOU: Table #{tableNum}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase shrink-0">
                              YOUR TABLE
                            </span>
                          </div>
                        ) : (
                          /* Colleague Call Header Banner */
                          <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">
                                Assigned Colleague:{' '}
                                <strong className="text-white">
                                  {effectiveEmployee ? effectiveEmployee.name : 'General Staff'}
                                </strong>{' '}
                                <span className="text-slate-400 text-[11px]">
                                  (Tables {(effectiveEmployee?.tables || []).join(', ') || 'General'})
                                </span>
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shrink-0">
                              Floor Backup
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-3">
                          {/* Table Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black px-3.5 py-1 rounded-2xl shadow-sm tracking-tight ${
                                isUrgent
                                  ? 'bg-rose-500 text-white shadow-rose-950/60'
                                  : isCallingYou
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-700 text-white font-bold'
                              }`}
                            >
                              TABLE {tableNum}
                            </span>

                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white border border-rose-400 text-[10px] font-black uppercase tracking-wide">
                                <Flame className="w-3.5 h-3.5 text-white" />
                                <span>&gt; 3m Wait</span>
                              </span>
                            )}
                          </div>

                          {/* Elapsed Time Badge */}
                          <div
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                              isUrgent
                                ? 'bg-rose-900/90 text-rose-100 border-rose-600'
                                : 'bg-[#0b0f19] text-slate-200 border-slate-700'
                            }`}
                            title={`Call placed at ${call.created_at || 'unknown'}`}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{timeText}</span>
                          </div>
                        </div>

                        {/* Request Reason & Guest Notes */}
                        <div className="my-3 p-3.5 rounded-2xl bg-[#0b0f19]/90 border border-slate-700/80">
                          <p className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">
                            Requested Service
                          </p>
                          <p className="text-base font-black text-white leading-snug">
                            {call.reason || 'Floor Assistance Needed'}
                          </p>
                          {call.custom_message && (
                            <p className="mt-2 text-xs text-slate-200 bg-slate-800 border border-slate-700 p-2.5 rounded-xl font-medium">
                              "{call.custom_message}"
                            </p>
                          )}
                        </div>

                        {/* Acknowledged Status Pill */}
                        {isAcknowledged && (
                          <div
                            className={`mb-3 px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                              ackInfo?.coveringFor
                                ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                                : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                            }`}
                          >
                            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Attending:{' '}
                              <strong className="text-white">
                                {ackInfo?.staffName || 'Floor Specialist'}
                              </strong>{' '}
                              {ackInfo?.coveringFor ? (
                                <span className="text-amber-300 font-extrabold">
                                  (Covering for {ackInfo.coveringFor})
                                </span>
                              ) : (
                                'is assisting this table'
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Acknowledge & Done / Resolved */}
                      <div className="pt-3 border-t border-slate-700/80 flex items-center gap-2">
                        {/* Acknowledge Button - Sets currentWaiter.name directly without needing employee selector */}
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(call)}
                          disabled={isAcknowledged}
                          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                            isAcknowledged
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/60'
                              : isCallingYou
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                          }`}
                        >
                          {isAcknowledged ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Attending</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isCallingYou ? 'Acknowledge' : 'Assist (Cover Table)'}</span>
                            </>
                          )}
                        </button>

                        {/* Done / Resolved Button */}
                        <button
                          type="button"
                          onClick={() => handleResolve(call.id)}
                          className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Done / Resolved</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Table Assignments Management Modal */}
      {isAssignmentsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Floor Table Assignments Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Assign tables to dedicated floor employees for instant personalized dispatch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Table Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayTables.map((tblNum) => {
                const assigned = getAssignedEmployeeForTable(tblNum);
                const isMyTable = myAssignedTables.includes(tblNum);
                const hasActiveCall = calls.some(
                  (c) => Number(c.table_number || c.tableNumber || c.table) === tblNum
                );

                return (
                  <div
                    key={'assign-tbl-' + tblNum}
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isMyTable
                        ? 'bg-[#131d33] border-amber-500/60 ring-1 ring-amber-500/30'
                        : 'bg-[#0f172a] border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">
                        Table {tblNum} {isMyTable && <span className="text-amber-400 text-xs">(Yours)</span>}
                      </span>
                      {hasActiveCall ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`modal-assign-table-${tblNum}`}
                        className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1"
                      >
                        Assigned Waiter
                      </label>
                      <select
                        id={`modal-assign-table-${tblNum}`}
                        aria-label={`Assigned Waiter for Table ${tblNum}`}
                        value={assigned?.id || ''}
                        onChange={(e) => handleReassignTable(tblNum, e.target.value)}
                        className="w-full bg-[#0b0f19] border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#0b0f19] text-slate-400">
                          Select employee...
                        </option>
                        {employeeRoster.map((st) => (
                          <option
                            key={st.id}
                            value={st.id}
                            className="bg-[#0b0f19] text-slate-100"
                          >
                            {st.name} {st.id === currentWaiter.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAssignmentsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <footer className="bg-[#0b0f19] border-t border-slate-800 px-4 py-3 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span>
              On-Field Waiter Console &bull; Logged in as{' '}
              <strong className="text-white">{currentWaiter.name}</strong> ({myTablePillText})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Customer View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/employee?tab=kitchen"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Employee View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/admin"
              className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Admin Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
