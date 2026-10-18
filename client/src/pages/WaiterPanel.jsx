import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Clock,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Flame,
  RefreshCw,
  CheckCheck,
  UserCheck,
  ArrowLeft,
  ExternalLink,
  Search,
  Filter,
  Wifi,
  WifiOff,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import { useSocket, useSocketListener } from '../context/SocketContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import '../styles/staff.css';

/**
 * High-fidelity restaurant desk calling bell synthesizer using Web Audio API.
 * Synthesizes an authentic metallic chime (G#5 / G#6 harmonics) with rapid attack and decay.
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

  play() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Fundamental metallic ring: 830.6 Hz (G#5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(830.6, now);
      // Slight pitch glide mimics striking physical brass
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
}

const bellSynthesizer = new BellAudioSynthesizer();

export default function WaiterPanel() {
  const [calls, setCalls] = useState([]);
  const [resolvedHistory, setResolvedHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'urgent' | 'acknowledged' | 'history'
  const [tableSearch, setTableSearch] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('smartdine_waiter_muted') === 'true';
    }
    return false;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [bannerAlert, setBannerAlert] = useState(null);

  // Convex Cloud real-time waiter calls subscription
  let convexCalls = null;
  let resolveConvexCall = null;
  try {
    convexCalls = useQuery(api.waiter.getCalls, { status: 'pending' });
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Sync Convex calls
  useEffect(() => {
    if (convexCalls && Array.isArray(convexCalls)) {
      // Convex docs expose `_id`, while the rest of this panel keys on `id`.
      setCalls(convexCalls.map((c) => ({ ...c, id: c.id ?? c._id })));
      setIsLoading(false);
    }
  }, [convexCalls]);

  // Socket Context
  const { isConnected, socket } = useSocket();

  // Sync mute state to synthesizer
  useEffect(() => {
    bellSynthesizer.isMuted = isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_muted', String(isMuted));
    }
  }, [isMuted]);

  // Live timer tick every 1000ms for accurate elapsed time calculation & urgency pulsing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active waiter calls from backend
  const fetchCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/waiter/calls', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        setCalls(data);
      } else {
        // Fallback to /api/waiter
        const fallback = await fetch('/api/waiter');
        if (fallback.ok) {
          const json = await fallback.json();
          setCalls(Array.isArray(json) ? json : json.data || []);
        }
      }
    } catch (err) {
      console.warn('[WaiterPanel] Failed to fetch active calls:', err);
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

  // Handle incoming real-time waiter call
  const handleIncomingCall = useCallback((newCall) => {
    if (!newCall) return;

    setCalls((prev) => {
      // Check if call already exists
      const exists = prev.some(
        (c) => c.id === newCall.id || (c.table_number === (newCall.table_number || newCall.tableNumber) && c.created_at === newCall.created_at)
      );
      if (exists) return prev;

      // Add to front of calls
      return [newCall, ...prev];
    });

    // Ring the calling bell!
    bellSynthesizer.play();

    // Trigger visual notification banner
    const tableNum = newCall.table_number || newCall.tableNumber || '?';
    setBannerAlert({
      tableNumber: tableNum,
      reason: newCall.reason || 'Service Requested',
      time: Date.now()
    });

    setTimeout(() => {
      setBannerAlert(null);
    }, 6000);
  }, []);

  // Handle incoming real-time resolved event
  const handleResolvedCall = useCallback((payload) => {
    const resolvedId = typeof payload === 'object' && payload !== null ? payload.id : payload;
    if (!resolvedId) return;

    setCalls((prev) => {
      const match = prev.find((c) => c.id === Number(resolvedId));
      if (match) {
        setResolvedHistory((hist) => [
          { ...match, status: 'resolved', resolvedAt: Date.now() },
          ...hist.slice(0, 49) // Keep last 50
        ]);
      }
      return prev.filter((c) => c.id !== Number(resolvedId));
    });

    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.delete(Number(resolvedId));
      return next;
    });
  }, []);

  // Real-time Socket.IO event listeners
  useSocketListener('waiter:call', handleIncomingCall);
  useSocketListener('waiter:resolved', handleResolvedCall);

  // Acknowledge a call ("I'm attending")
  const handleAcknowledge = (callId) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.add(callId);
      return next;
    });

    if (socket?.connected) {
      socket.emit('waiter:acknowledge', { id: callId });
    }
  };

  // Resolve a call ("Done / Resolved")
  const handleResolve = async (callId) => {
    const targetCall = calls.find((c) => c.id === callId);

    // Optimistic UI update
    setCalls((prev) => prev.filter((c) => c.id !== callId));
    if (targetCall) {
      setResolvedHistory((prev) => [
        { ...targetCall, status: 'resolved', resolvedAt: Date.now() },
        ...prev.slice(0, 49)
      ]);
    }
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      next.delete(callId);
      return next;
    });

    // Resolve in Convex Cloud if available
    if (resolveConvexCall && typeof callId === 'string' && !String(callId).startsWith('call_')) {
      try {
        await resolveConvexCall({ callId });
      } catch (_) {}
    }

    try {
      const res = await fetch(`/api/waiter/calls/${callId}/resolve`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        // Try POST fallback
        await fetch(`/api/waiter/calls/${callId}/resolve`, {
          method: 'POST',
          headers: { Accept: 'application/json' }
        });
      }
    } catch (err) {
      console.warn('[WaiterPanel] Resolve endpoint error:', err);
    }
  };

  // Helper to test bell audio
  const handleTestSound = () => {
    bellSynthesizer.init();
    bellSynthesizer.play();
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

  // Filtered calls
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const table = String(call.table_number || call.tableNumber || '');
      const reason = String(call.reason || '').toLowerCase();
      const matchesSearch =
        !tableSearch ||
        table.includes(tableSearch.trim()) ||
        reason.includes(tableSearch.toLowerCase().trim());

      if (!matchesSearch) return false;

      const { isUrgent } = getCallMetrics(call);
      const isAck = acknowledgedIds.has(call.id);

      if (activeTab === 'urgent') return isUrgent;
      if (activeTab === 'acknowledged') return isAck;
      return true; // 'all'
    });
  }, [calls, tableSearch, activeTab, acknowledgedIds, getCallMetrics]);

  // Aggregate stats
  const stats = useMemo(() => {
    let urgentCount = 0;
    let acknowledgedCount = 0;
    let maxElapsed = 0;

    calls.forEach((c) => {
      const { isUrgent, elapsedSeconds } = getCallMetrics(c);
      if (isUrgent) urgentCount++;
      if (acknowledgedIds.has(c.id)) acknowledgedCount++;
      if (elapsedSeconds > maxElapsed) maxElapsed = elapsedSeconds;
    });

    const maxWaitText =
      maxElapsed >= 60
        ? `${Math.floor(maxElapsed / 60)}m ${maxElapsed % 60}s`
        : `${maxElapsed}s`;

    return {
      total: calls.length,
      urgentCount,
      acknowledgedCount,
      maxWaitText: calls.length > 0 ? maxWaitText : '0s'
    };
  }, [calls, acknowledgedIds, getCallMetrics]);

  return (
    <div className="staff-root min-h-screen bg-transparent text-neutral-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Branding & Role */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <BellRing className="w-5 h-5 animate-wiggle" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">
                    Waiter Calling Bell
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Floor Panel
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-medium">
                  Instant Table Dispatch &amp; Assistance Alerts
                </p>
              </div>
            </div>

            {/* Socket Status indicator for mobile */}
            <div className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 text-[11px] font-semibold border border-neutral-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          {/* Center / Right: Live Status, Sound Toggle & Controls */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {/* Desktop Socket Status Badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/80 animate-pulse'
              }`}
              title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to Socket.IO server'}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Real-Time Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reconnecting...</span>
                </>
              )}
            </div>

            {/* Audio Bell Mute / Unmute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
              title={isMuted ? 'Sound alerts are muted. Tap to unmute.' : 'Sound alerts are active. Tap to mute.'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Sound ON</span>
                </>
              )}
            </button>

            {/* Test Bell Sound Button */}
            <button
              type="button"
              onClick={handleTestSound}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition active:scale-95 cursor-pointer"
              title="Test audio chime"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Bell</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={fetchCalls}
              disabled={isLoading}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Refresh calls"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Incoming Alert Banner */}
      {bannerAlert && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white px-4 py-2.5 shadow-xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-slide-up">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <span>
                <strong className="underline decoration-white/50">
                  TABLE {bannerAlert.tableNumber}
                </strong>{' '}
                just called waiter for:{' '}
                <span className="italic font-normal">{bannerAlert.reason}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerAlert(null)}
              className="text-white/80 hover:text-white px-2 py-0.5 rounded cursor-pointer"
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
          {/* Card 1: Active Calls */}
          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                Active Calls
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.total}
              </p>
            </div>
          </div>

          {/* Card 2: Urgent Calls (> 3m) */}
          <div
            className={`border rounded-2xl p-4 flex items-center gap-3.5 shadow-md transition-all ${
              stats.urgentCount > 0
                ? 'bg-rose-950/40 border-rose-600/80 text-rose-200 animate-pulse'
                : 'bg-neutral-800/80 border-neutral-700/80 text-neutral-400'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                stats.urgentCount > 0
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-neutral-700 text-neutral-400'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                Urgent (&gt; 3 min)
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  stats.urgentCount > 0 ? 'text-rose-400' : 'text-neutral-400'
                }`}
              >
                {stats.urgentCount}
              </p>
            </div>
          </div>

          {/* Card 3: Being Attended */}
          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                Attending
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.acknowledgedCount}
              </p>
            </div>
          </div>

          {/* Card 4: Max Wait Time */}
          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                Longest Wait
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.maxWaitText}
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bar & Table Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-800/50 p-2.5 rounded-2xl border border-neutral-700/60">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              All Calls ({calls.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'urgent'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : stats.urgentCount > 0
                  ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Urgent ({stats.urgentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('acknowledged')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'acknowledged'
                  ? 'bg-sky-500 text-neutral-950 shadow-md shadow-sky-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Attending ({stats.acknowledgedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-neutral-200 text-neutral-950 shadow-md'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              Resolved ({resolvedHistory.length})
            </button>
          </div>

          {/* Quick Table Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by table # or reason..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Display: Calls Grid OR History List */}
        {activeTab === 'history' ? (
          /* RESOLVED HISTORY LIST */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                Recently Resolved Today ({resolvedHistory.length})
              </h2>
              {resolvedHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setResolvedHistory([])}
                  className="text-xs text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {resolvedHistory.length === 0 ? (
              <div className="text-center py-12 bg-neutral-800/40 border border-neutral-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm font-semibold">
                  No resolved calls yet this session.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {resolvedHistory.map((item) => (
                  <div
                    key={'hist-' + item.id}
                    className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 opacity-80"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-700 text-neutral-200">
                        Table {item.table_number || item.tableNumber}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> Resolved
                      </span>
                    </div>
                    <p className="text-sm font-medium text-neutral-200 mt-2 truncate">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CALLS GRID */
          <div>
            {filteredCalls.length === 0 ? (
              /* Calming Empty State */
              <div className="staff-empty text-center py-16 px-4 bg-neutral-800/30 border border-dashed border-neutral-700 rounded-3xl space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/5">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    All Tables Attended To!
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mt-1">
                    No pending waiter service requests right now. The floor bell will
                    automatically ping when a customer taps "Call Waiter".
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs text-neutral-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Listening for calls on Table QR codes</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCalls.map((call) => {
                  const { isUrgent, timeText, elapsedMinutes } = getCallMetrics(call);
                  const isAcknowledged = acknowledgedIds.has(call.id);
                  const tableNum = call.table_number || call.tableNumber || '?';

                  // Dynamic Card Border & Styling
                  // Visual urgency requirement: "pulses red if a table has been waiting for more than 3 minutes"
                  let cardStyles =
                    'relative rounded-3xl p-5 border transition-all duration-300 shadow-xl flex flex-col justify-between ';

                  if (isUrgent) {
                    // PULSING RED URGENT STATE (> 3 minutes)
                    cardStyles +=
                      'bg-rose-950/70 border-rose-500 ring-4 ring-rose-500/40 shadow-rose-950/60 animate-pulse text-white';
                  } else if (isAcknowledged) {
                    // ACKNOWLEDGED ATTENDING STATE
                    cardStyles +=
                      'bg-sky-950/40 border-sky-500/60 ring-2 ring-sky-500/20 text-neutral-100';
                  } else {
                    // NORMAL ACTIVE STATE
                    cardStyles +=
                      'bg-neutral-800/90 border-neutral-700 hover:border-neutral-600 text-neutral-100';
                  }

                  return (
                    <div key={call.id} className={cardStyles}>
                      {/* Top Header inside Card */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {/* Table Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-black px-3.5 py-1.5 rounded-2xl shadow-sm tracking-tight ${
                                isUrgent
                                  ? 'bg-rose-500 text-white shadow-rose-900/50'
                                  : 'bg-amber-500 text-neutral-950'
                              }`}
                            >
                              TABLE {tableNum}
                            </span>

                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/50 text-[10px] font-extrabold uppercase tracking-wide">
                                <Flame className="w-3.5 h-3.5 text-rose-400" />
                                <span>&gt; 3m Wait</span>
                              </span>
                            )}
                          </div>

                          {/* Time Elapsed Badge */}
                          <div
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                              isUrgent
                                ? 'bg-rose-900/80 text-rose-200 border-rose-700'
                                : 'bg-neutral-900/80 text-neutral-300 border-neutral-700'
                            }`}
                            title={`Call placed at ${call.created_at || 'unknown'}`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeText}</span>
                          </div>
                        </div>

                        {/* Request Reason & Notes */}
                        <div className="my-3 p-3.5 rounded-2xl bg-black/25 border border-white/5 backdrop-blur-xs">
                          <p className="text-xs uppercase font-bold tracking-wider text-neutral-400 mb-1">
                            Requested Service
                          </p>
                          <p className="text-base font-extrabold text-white leading-snug">
                            {call.reason || 'Staff Assistance'}
                          </p>
                          {call.custom_message && (
                            <p className="mt-2 text-xs italic text-neutral-300 bg-white/5 p-2 rounded-xl border border-white/5">
                              "{call.custom_message}"
                            </p>
                          )}
                        </div>

                        {/* Acknowledged Status Pill */}
                        {isAcknowledged && (
                          <div className="mb-3 px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-semibold flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>Staff is attending this table now</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Acknowledge & Done / Resolved */}
                      <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                        {/* Acknowledge Button */}
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(call.id)}
                          disabled={isAcknowledged}
                          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                            isAcknowledged
                              ? 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                              : 'bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600'
                          }`}
                        >
                          {isAcknowledged ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Attending</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                              <span>Acknowledge</span>
                            </>
                          )}
                        </button>

                        {/* Done / Resolved Button */}
                        <button
                          type="button"
                          onClick={() => handleResolve(call.id)}
                          className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-900/40 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* Footer Navigation Bar */}
      <footer className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div className="flex items-center gap-2">
            <span>Floor Waiter Dispatch System &bull; Offline-First</span>
          </div>

          {/* Quick links to sister modules */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1"
            >
              <span>Customer View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/kds"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1"
            >
              <span>Kitchen Display (KDS)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/admin"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1"
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
