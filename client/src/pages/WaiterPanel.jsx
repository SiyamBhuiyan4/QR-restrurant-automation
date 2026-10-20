import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  LogOut,
  Layers,
  Sparkles,
  MessageSquare,
  Flame,
  Volume2,
  VolumeX,
  ShieldAlert
} from 'lucide-react';
import { useSocket, useSocketListener } from '../context/SocketContext';
import { useRestaurant, DEFAULT_EMPLOYEE_ROSTER } from '../context/RestaurantContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';

/**
 * 2-Second Notification Ringtone / Chime Synthesizer
 * Built entirely with HTML5 Web Audio API (zero external audio files).
 * Synthesizes a pleasant 2.0-second harmonic chime sequence:
 * - Strike 1 (0.0s): Attention Strike (E5 659.25Hz + A5 880.0Hz with brass ping)
 * - Strike 2 (0.6s): Melodic chord resolution (C#6 1108.73Hz + G#6 1661.22Hz)
 * - Exponential decay tail fading to silent at exactly 2.0s
 */
class TwoSecondWaiterChime {
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

  unlock() {
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      // Prime audio hardware with a 1-sample silent buffer for iOS Safari
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (_) {}
  }

  play() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.4, now);
      master.connect(this.ctx.destination);

      // Strike 1 (0.0s - 0.7s): Dual harmonic ping (E5 659.25Hz + A5 880.0Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.4, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc1.connect(gain1);
      gain1.connect(master);
      osc1.start(now);
      osc1.stop(now + 0.8);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.exponentialRampToValueAtTime(0.3, now + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(now);
      osc2.stop(now + 0.7);

      // Crisp metallic transient (2640 Hz)
      const ping = this.ctx.createOscillator();
      const pingGain = this.ctx.createGain();
      ping.type = 'triangle';
      ping.frequency.setValueAtTime(2640, now);
      pingGain.gain.setValueAtTime(0.001, now);
      pingGain.gain.exponentialRampToValueAtTime(0.2, now + 0.008);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      ping.connect(pingGain);
      pingGain.connect(master);
      ping.start(now);
      ping.stop(now + 0.2);

      // Strike 2 (0.6s - 2.0s): Ascending chord resolution (C#6 1108.73Hz + G#6 1661.22Hz)
      const strike2Time = now + 0.6;
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1108.73, strike2Time);
      gain3.gain.setValueAtTime(0.001, strike2Time);
      gain3.gain.exponentialRampToValueAtTime(0.45, strike2Time + 0.015);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 2.0); // Rings out smoothly to exactly 2.0s
      osc3.connect(gain3);
      gain3.connect(master);
      osc3.start(strike2Time);
      osc3.stop(now + 2.0);

      const osc4 = this.ctx.createOscillator();
      const gain4 = this.ctx.createGain();
      osc4.type = 'triangle';
      osc4.frequency.setValueAtTime(1661.22, strike2Time);
      gain4.gain.setValueAtTime(0.001, strike2Time);
      gain4.gain.exponentialRampToValueAtTime(0.25, strike2Time + 0.015);
      gain4.gain.exponentialRampToValueAtTime(0.0001, now + 2.0); // Ends at exactly 2.0s
      osc4.connect(gain4);
      gain4.connect(master);
      osc4.start(strike2Time);
      osc4.stop(now + 2.0);
    } catch (e) {
      console.warn('[TwoSecondWaiterChime] Playback error:', e);
    }
  }
}

const chime = new TwoSecondWaiterChime();

/**
 * Trigger device vibration using navigator.vibrate([500, 200, 500, 200, 500])
 */
function triggerCallVibration() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([500, 200, 500, 200, 500]);
    } catch (_) {}
  }
}

/**
 * Format relative elapsed time with "Just now" support
 */
function formatCallTime(timestamp, currentTime) {
  const created = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp) || currentTime;
  const elapsed = Math.max(0, Math.floor((currentTime - created) / 1000));

  if (elapsed < 15) return 'Just now';
  if (elapsed < 60) return `${elapsed}s ago`;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  if (mins < 60) {
    return `${mins}m ${secs}s ago`;
  }
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function WaiterPanel() {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION STATE
  // If currentWaiter is null -> Show SCREEN 1 (Login Card ONLY)
  // If currentWaiter is set  -> Show SCREEN 2 (Personal Page ONLY)
  // ---------------------------------------------------------------------------
  const [currentWaiter, setCurrentWaiter] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('smartdine_logged_in_waiter');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return null;
  });

  // Screen 1: Login Form Inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Screen 2: Sound & Live Timer State
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('smartdine_waiter_muted') === 'true';
    }
    return false;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Restaurant Context & Real-Time Sync
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  const { socket } = useSocket();

  // Active Assistance Calls
  const [calls, setCalls] = useState(() => {
    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls)) {
      return restaurant.assistanceCalls;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('smartdine_active_assistance_calls');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  // Track notified call keys so vibration & chime only trigger once per new call
  const notifiedCallKeysRef = useRef(new Set());

  // Update chime mute state
  useEffect(() => {
    chime.isMuted = isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_muted', String(isMuted));
    }
  }, [isMuted]);

  // Live timer tick every second for relative timestamps (e.g., "Just now", "2m ago")
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial calls from API / backend
  useEffect(() => {
    fetch('/api/waiter/calls')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const list = Array.isArray(data) ? data : data.data || [];
        if (list.length > 0) {
          setCalls(prev => {
            const map = new Map();
            prev.forEach(c => map.set(String(c.id || c.tableNumber), c));
            list.forEach(c => map.set(String(c.id || c.tableNumber), c));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  // Sync calls from RestaurantContext
  useEffect(() => {
    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls)) {
      setCalls(restaurant.assistanceCalls);
    }
  }, [restaurant?.assistanceCalls]);

  // Convex Cloud integration (optional)
  let convexCalls = null;
  let resolveConvexCall = null;
  try {
    convexCalls = useQuery(api.waiter.getCalls, { status: 'pending' });
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  useEffect(() => {
    if (convexCalls && Array.isArray(convexCalls)) {
      setCalls(convexCalls.map(c => ({ ...c, id: c.id ?? c._id })));
    }
  }, [convexCalls]);

  // Real-time tab-to-tab BroadcastChannel listener
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('smartdine_restaurant_state');

    const handleBroadcastMessage = (e) => {
      const msg = e.data;
      if (!msg) return;

      if (msg.type === 'CALLS_UPDATED' && Array.isArray(msg.data)) {
        setCalls(msg.data);
      }
    };

    bc.addEventListener('message', handleBroadcastMessage);
    return () => {
      bc.removeEventListener('message', handleBroadcastMessage);
      bc.close();
    };
  }, []);

  // Real-time Socket.IO listeners
  useSocketListener('waiter:call', (newCall) => {
    if (!newCall) return;
    const callId = newCall.id ?? newCall._id ?? `call_${Date.now()}`;
    setCalls(prev => {
      if (prev.some(c => String(c.id) === String(callId))) return prev;
      return [{ ...newCall, id: callId }, ...prev];
    });
  });

  useSocketListener('waiter:resolve', (payload) => {
    const resolvedId = typeof payload === 'object' ? payload?.id : payload;
    const resolvedTable = typeof payload === 'object' ? payload?.table : null;
    if (resolvedId || resolvedTable) {
      setCalls(prev =>
        prev.filter(
          c =>
            String(c.id) !== String(resolvedId) &&
            (!resolvedTable || Number(c.table_number || c.tableNumber || c.table) !== Number(resolvedTable))
        )
      );
    }
  });

  // Compute this waiter's assigned tables (syncs live with Admin changes via RestaurantContext)
  const myAssignedTables = useMemo(() => {
    if (!currentWaiter) return [];
    if (restaurant?.employees && Array.isArray(restaurant.employees)) {
      const liveEmp = restaurant.employees.find(
        e =>
          e.id === currentWaiter.id ||
          String(e.numericId) === String(currentWaiter.numericId || currentWaiter.id) ||
          (e.username && e.username.toLowerCase() === (currentWaiter.username || '').toLowerCase())
      );
      if (liveEmp && Array.isArray(liveEmp.assignedTables)) {
        return liveEmp.assignedTables.map(Number).sort((a, b) => a - b);
      }
    }
    return (currentWaiter.assignedTables || currentWaiter.tables || []).map(Number).sort((a, b) => a - b);
  }, [restaurant?.employees, currentWaiter]);

  // Customer Calls List: Live calls coming ONLY from this waiter's assigned tables
  const myAssignedCalls = useMemo(() => {
    return calls.filter(call => {
      const tbl = Number(call.table_number || call.tableNumber || call.table);
      return myAssignedTables.includes(tbl);
    });
  }, [calls, myAssignedTables]);

  // STEP 4: Play 2-Second Chime & Vibrate when a new call arrives for an assigned table
  useEffect(() => {
    if (!currentWaiter || myAssignedCalls.length === 0) return;

    myAssignedCalls.forEach(call => {
      const callKey = String(call.id || `${call.tableNumber || call.table}_${call.timestamp}`);
      if (!notifiedCallKeysRef.current.has(callKey)) {
        notifiedCallKeysRef.current.add(callKey);

        // 1. Immediately trigger device vibration
        triggerCallVibration();

        // 2. Immediately play 2-second synthesized notification ringtone
        chime.play();
      }
    });
  }, [myAssignedCalls, currentWaiter]);

  // ---------------------------------------------------------------------------
  // STEP 2: LOGIN SUBMIT HANDLER
  // ---------------------------------------------------------------------------
  const handleLoginSubmit = (e) => {
    e.preventDefault();

    const username = usernameInput.trim();
    const password = passwordInput.trim();

    if (!username || !password) {
      setErrorMessage('Invalid username or password.');
      return;
    }

    // Unlock Web Audio API context during the user's synchronous login click
    chime.unlock();

    // Gather candidate employees from RestaurantContext, localStorage, or fallback default roster
    let candidateEmployees = [];
    if (restaurant?.employees && Array.isArray(restaurant.employees) && restaurant.employees.length > 0) {
      candidateEmployees.push(...restaurant.employees);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('smartdine_restaurant_employees');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) candidateEmployees.push(...parsed);
        }
        const storedRoster = localStorage.getItem('smartdine_floor_staff_roster');
        if (storedRoster) {
          const parsed = JSON.parse(storedRoster);
          if (Array.isArray(parsed)) candidateEmployees.push(...parsed);
        }
      } catch (_) {}
    }
    candidateEmployees.push(...DEFAULT_EMPLOYEE_ROSTER);

    const normUser = username.toLowerCase();

    // Match employee by username, account code, or name
    const matched = candidateEmployees.find(emp => {
      if (!emp) return false;
      const empUser = (emp.username || '').toLowerCase().trim();
      const empCode = (emp.accountCode || emp.waiterCode || '').toLowerCase().trim();
      const empName = (emp.name || '').toLowerCase().trim();
      const empFirstName = empName.split(' ')[0];

      const isUserMatch =
        (empUser && empUser === normUser) ||
        (empCode && empCode === normUser) ||
        empName === normUser ||
        empFirstName === normUser;

      if (!isUserMatch) return false;

      // Match password / passcode / pin
      const validPasscodes = [
        emp.password,
        emp.passcode,
        emp.pin,
        emp.waiterPin,
        '1234' // Default demo fallback
      ]
        .filter(Boolean)
        .map(p => String(p).trim());

      return validPasscodes.includes(password);
    });

    if (matched) {
      const session = {
        id: matched.id,
        numericId: matched.numericId || 1,
        name: matched.name,
        username: matched.username || username,
        role: matched.role || 'Floor Specialist',
        assignedTables: (matched.assignedTables || matched.tables || []).map(Number).sort((a, b) => a - b)
      };

      setCurrentWaiter(session);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('smartdine_logged_in_waiter', JSON.stringify(session));
        } catch (_) {}
      }
      setErrorMessage('');
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setErrorMessage('Invalid username or password.');
    }
  };

  // Logout handler -> returns to Screen 1 immediately
  const handleLogout = () => {
    setCurrentWaiter(null);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('smartdine_logged_in_waiter');
      } catch (_) {}
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 5: RESOLVING A CALL
  // ---------------------------------------------------------------------------
  const handleResolve = async (callId, tableNum) => {
    const finalTable = Number(tableNum);

    // 1. Immediately remove call from active alerts list on waiter's screen
    setCalls(prev =>
      prev.filter(
        c =>
          String(c.id) !== String(callId) &&
          (!finalTable || Number(c.table_number || c.tableNumber || c.table) !== finalTable)
      )
    );

    // 2. Update status to "Resolved" in RestaurantContext & Admin Panel (broadcasts across tabs)
    if (restaurant?.resolveAssistanceCall) {
      restaurant.resolveAssistanceCall(finalTable || callId);
    }

    // 3. Broadcast resolve event via Socket.IO
    if (socket?.connected) {
      socket.emit('waiter:resolve', { id: callId, table: finalTable });
    }

    // 4. Resolve in Convex Cloud if active
    if (resolveConvexCall && typeof callId === 'string' && !callId.startsWith('call_')) {
      try {
        await resolveConvexCall({ callId });
      } catch (_) {}
    }

    // 5. Update backend REST API
    fetch(`/api/waiter/calls/${callId}/resolve`, { method: 'PATCH' }).catch(() => {});
  };

  // ===========================================================================
  // SCREEN 1: SIMPLE LOGIN PAGE (Show ONLY this before login)
  // Shows ONLY a clean, centered Login Card on a dark background.
  // Card has ONLY: Title, Username input, Password input, Button.
  // ===========================================================================
  if (!currentWaiter) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080B10] antialiased select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* 1. Title */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Waiter Login
            </h1>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            {/* 2. Input 1: Username */}
            <div>
              <label
                htmlFor="waiter-username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="waiter-username"
                type="text"
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Enter username"
                value={usernameInput}
                onChange={e => {
                  setUsernameInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#080B10] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-medium"
              />
            </div>

            {/* 3. Input 2: Password */}
            <div>
              <label
                htmlFor="waiter-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="waiter-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#080B10] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm font-medium"
              />
            </div>

            {/* Error Message: Simple red error message on mismatch */}
            {errorMessage && (
              <p className="text-xs text-rose-500 font-semibold pt-0.5">
                {errorMessage}
              </p>
            )}

            {/* 4. Button: Login */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm tracking-wide transition shadow-lg shadow-amber-500/20 cursor-pointer mt-2"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN 2: WAITER'S PERSONAL PAGE (Show ONLY after login)
  // Full-screen, clean, responsive real web app (No fake phones, No blueprints).
  // 1. Top Bar: Logged-in Waiter's Name + Logout button
  // 2. My Assigned Tables: Small badges for tables assigned by Admin
  // 3. Customer Calls List: Live calls coming ONLY from this waiter's tables
  // ===========================================================================
  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* =======================================================================
          1. TOP BAR
          Show the logged-in Waiter's Name and a "Logout" button on the right.
          ======================================================================= */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Waiter's Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-amber-500/30">
              {currentWaiter.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-white truncate">
                {currentWaiter.name}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {currentWaiter.role || 'Floor Waiter'}
              </p>
            </div>
          </div>

          {/* Right: Sound Toggle + Logout Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={() => setIsMuted(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={isMuted ? 'Notification chime muted' : 'Notification chime active'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/80 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* =======================================================================
          MAIN CONTENT
          ======================================================================= */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-16">
        {/* =====================================================================
            2. MY ASSIGNED TABLES
            Small badges for the tables assigned to this waiter by the Admin
            (for example: Table 1, Table 2, Table 3).
            ===================================================================== */}
        <section className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
                My Assigned Tables
              </h2>
            </div>
            {myAssignedTables.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {myAssignedTables.length} {myAssignedTables.length === 1 ? 'Table' : 'Tables'}
              </span>
            )}
          </div>

          {/* Badges */}
          {myAssignedTables.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
              No tables assigned yet by the Admin.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {myAssignedTables.map(tblNum => {
                const hasActiveCall = myAssignedCalls.some(
                  c => Number(c.table_number || c.tableNumber || c.table) === tblNum
                );

                return (
                  <div
                    key={`assigned-table-${tblNum}`}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs sm:text-sm font-black transition shadow-sm ${
                      hasActiveCall
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/30 animate-pulse'
                        : 'bg-[#080B10] border-slate-800 text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        hasActiveCall ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    <span>Table {tblNum}</span>
                    {hasActiveCall && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white">
                        Calling
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================================
            3. CUSTOMER CALLS LIST
            Clean section showing live calls coming ONLY from assigned tables.
            Alert Card: Table Number, Customer Reason/Message, Time of Call,
            and "Mark as Resolved" button.
            ===================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
                Customer Calls
              </h2>
            </div>
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                myAssignedCalls.length > 0
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}
            >
              {myAssignedCalls.length > 0 ? `${myAssignedCalls.length} Active` : '0 Active'}
            </span>
          </div>

          {/* Empty State */}
          {myAssignedCalls.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">
                All tables peaceful • No active calls
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a customer at one of your assigned tables presses "Call Waiter", the call will appear here in real time.
              </p>
            </div>
          ) : (
            /* Live Call Cards */
            <div className="space-y-3.5">
              {myAssignedCalls.map(call => {
                const tableNum = call.table_number || call.tableNumber || call.table;
                const reasonText = call.reason || 'Assistance Requested';
                const customMessage = call.custom_message || call.customMessage || call.message || '';
                const timestamp = call.created_at || call.timestamp || currentTime;
                const timeText = formatCallTime(timestamp, currentTime);

                return (
                  <div
                    key={`call-card-${call.id}`}
                    className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-500/60 shadow-xl space-y-4"
                  >
                    {/* Header: Table Number & Time of Call */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-base sm:text-lg tracking-tight uppercase">
                        TABLE {tableNum}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-[#080B10] px-3 py-1.5 rounded-xl border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{timeText}</span>
                      </div>
                    </div>

                    {/* Customer's Reason & Message */}
                    <div className="p-3.5 rounded-2xl bg-[#080B10] border border-slate-800 space-y-1.5">
                      <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                        Reason
                      </p>
                      <h4 className="text-base sm:text-lg font-black text-white">
                        {reasonText}
                      </h4>
                      {customMessage && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-200 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="font-semibold italic">"{customMessage}"</p>
                        </div>
                      )}
                    </div>

                    {/* STEP 5: "Mark as Resolved" Button */}
                    <button
                      type="button"
                      onClick={() => handleResolve(call.id, tableNum)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
