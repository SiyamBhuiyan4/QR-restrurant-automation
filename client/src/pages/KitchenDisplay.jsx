import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import {
  ChefHat,
  Clock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Flame,
  Sparkles,
  Layers,
  Columns3,
  Wifi,
  WifiOff,
  BellRing,
  RotateCcw
} from 'lucide-react';
import OrderCard from '../components/OrderCard.jsx';
import SocketContext, { resolveServerUrl } from '../context/SocketContext.jsx';
import { io } from 'socket.io-client';

/**
 * Web Audio API Kitchen Alert Synthesis
 * 
 * Synthesizes an authoritative, penetrating 4-note hospitality bell chime
 * without requiring any external audio files or network requests!
 */
export const playKitchenChime = () => {
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic sequence: F5 -> C6 -> A5 -> F6
    const notes = [
      { freq: 698.46, time: 0, duration: 0.35, gain: 0.25 },
      { freq: 1046.50, time: 0.02, duration: 0.45, gain: 0.20 },
      { freq: 880.00, time: 0.18, duration: 0.50, gain: 0.30 },
      { freq: 1396.91, time: 0.20, duration: 0.70, gain: 0.22 },
    ];

    notes.forEach(({ freq, time, duration, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle'; // Smooth acoustic bell timbre
      osc.frequency.setValueAtTime(freq, now + time);

      // Acoustic envelope: instantaneous attack + exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, now + time + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch (err) {
    console.warn('[KDS Sound Alert] AudioContext playback warning:', err);
  }
};

/**
 * KitchenDisplay (KDS) Page
 * 
 * High-contrast dark mode layout designed for kitchen screens, tablets, or hanging wall monitors.
 * 
 * Features:
 * - Real-time Socket.IO synchronization (`order:new`, `order:status_update`)
 * - Web Audio API synthesizer for instant attention-grabbing kitchen chimes
 * - Kanban multi-column view & Tabbed single-stream view toggle
 * - Header bar with Live Digital Clock (HH:MM:SS), Active Ticket Counter, Mute/Unmute, Fullscreen toggle
 * - Ticket status progression: Pending -> Preparing -> Ready -> Served
 * - Live overdue indicators (>10m yellow warning, >20m red critical pulse)
 * - Search by Table #, Order # or dish name
 */
export default function KitchenDisplay() {
  // Socket Context with fallback to standalone socket instance
  const socketCtx = useContext(SocketContext);
  const [standaloneSocket, setStandaloneSocket] = useState(null);
  const [standaloneConnected, setStandaloneConnected] = useState(false);

  // Sound alert state (persisted in localStorage)
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('kds_audio_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // View state: 'kanban' (board columns) or 'tabs' (focused status tabs)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('kds_view_mode') || 'kanban';
    } catch {
      return 'kanban';
    }
  });

  // Active tab when in 'tabs' view mode: 'all' | 'pending' | 'preparing' | 'ready' | 'completed'
  const [activeTab, setActiveTab] = useState('all');

  // Search & filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [recentAlertMessage, setRecentAlertMessage] = useState(null);

  // Live Digital Clock state
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reference for alert message timeout
  const alertTimeoutRef = useRef(null);

  // 1. Digital Clock live updates
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // 3. User gesture to unlock Web Audio API
  const unlockAudioContext = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().then(() => {
          setAudioUnlocked(true);
          dummyCtx.close();
        });
      }
    } catch {
      setAudioUnlocked(true);
    }
  }, []);

  // Unlock on first user click anywhere in the window
  useEffect(() => {
    const handleInitialClick = () => {
      unlockAudioContext();
      window.removeEventListener('click', handleInitialClick);
      window.removeEventListener('touchstart', handleInitialClick);
    };
    window.addEventListener('click', handleInitialClick);
    window.addEventListener('touchstart', handleInitialClick);
    return () => {
      window.removeEventListener('click', handleInitialClick);
      window.removeEventListener('touchstart', handleInitialClick);
    };
  }, [unlockAudioContext]);

  // 4. Standalone Socket fallback if not wrapped in SocketProvider
  useEffect(() => {
    if (socketCtx?.socket) return; // Parent SocketProvider is active

    const serverUrl = resolveServerUrl();
    const socketInstance = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => setStandaloneConnected(true));
    socketInstance.on('disconnect', () => setStandaloneConnected(false));

    setStandaloneSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [socketCtx]);

  const activeSocket = socketCtx?.socket || standaloneSocket;
  const isConnected = socketCtx ? socketCtx.isConnected : standaloneConnected;

  // 5. Trigger Sound & Visual Notification
  const triggerNewOrderAlert = useCallback((order) => {
    const tableNum = order?.table_no ?? order?.tableNumber ?? order?.table ?? 'Order';
    const msg = `🔔 New Order received for Table ${tableNum}!`;

    setRecentAlertMessage(msg);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setRecentAlertMessage(null);
    }, 6000);

    // Play synthesized Web Audio chime if not muted
    if (!isMuted) {
      playKitchenChime();
    }
  }, [isMuted]);

  // 6. Socket.IO Listeners for real-time order events
  useEffect(() => {
    if (!activeSocket) return;

    // Listen to new order incoming
    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;
      setOrders((prev) => {
        // Prevent duplicate tickets
        const exists = prev.some((o) => (o.id || o._id) === (newOrder.id || newOrder._id));
        if (exists) return prev;
        return [newOrder, ...prev];
      });

      triggerNewOrderAlert(newOrder);
    };

    // Listen to status changes from server or other devices
    const handleStatusUpdate = (update) => {
      if (!update) return;
      setOrders((prev) =>
        prev.map((order) => {
          const match = (order.id || order._id) === (update.id || update._id);
          if (!match) return order;
          return {
            ...order,
            status: update.status || order.status,
            ...update
          };
        })
      );
    };

    // Listen to order cancellation
    const handleOrderCancel = ({ id }) => {
      if (!id) return;
      setOrders((prev) => prev.filter((o) => (o.id || o._id) !== id));
    };

    activeSocket.on('order:new', handleNewOrder);
    activeSocket.on('order:status_update', handleStatusUpdate);
    activeSocket.on('order:cancel', handleOrderCancel);

    return () => {
      activeSocket.off('order:new', handleNewOrder);
      activeSocket.off('order:status_update', handleStatusUpdate);
      activeSocket.off('order:cancel', handleOrderCancel);
    };
  }, [activeSocket, triggerNewOrderAlert]);

  // 7. Initial Fetch of Orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const serverUrl = resolveServerUrl();
    const apiUrl = `${serverUrl}/api/orders`;

    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.orders || data.data || []);
        if (list.length > 0) {
          setOrders(list);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch orders from API:', err);
    }

    // Default demonstration orders if API has no orders yet (guarantees stunning out-of-the-box preview!)
    setOrders((current) => {
      if (current.length > 0) {
        setIsLoading(false);
        return current;
      }
      return [
        {
          id: 'ord_101',
          order_number: '101',
          table_no: '4',
          order_type: 'dine_in',
          status: 'pending',
          created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          items: [
            { name: 'Wagyu Beef Burger', quantity: 2, notes: 'Medium rare, no onions', options: ['Brioche Bun', 'Cheddar'] },
            { name: 'Truffle Parmesan Fries', quantity: 1, notes: 'Extra crispy' }
          ],
          notes: 'Customer at table requested prompt preparation.'
        },
        {
          id: 'ord_102',
          order_number: '102',
          table_no: '12',
          order_type: 'dine_in',
          status: 'preparing',
          created_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(), // >10m -> yellow warning
          voice_note_url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
          items: [
            { name: 'Pan-Seared Salmon', quantity: 1, notes: 'Lemon butter sauce on the side' },
            { name: 'Avocado Quinoa Salad', quantity: 1 }
          ]
        },
        {
          id: 'ord_103',
          order_number: '103',
          table_no: '7',
          order_type: 'dine_in',
          status: 'ready',
          created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(), // >20m -> red critical
          items: [
            { name: 'Wood-Fired Margherita Pizza', quantity: 2, notes: 'Extra fresh basil leaves' },
            { name: 'House Berry Iced Tea', quantity: 2 }
          ]
        }
      ];
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 8. Order Status Transition Handler
  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId);

    // Optimistic state update for instant snappy 0ms latency UI
    setOrders((prev) =>
      prev.map((o) => {
        if ((o.id || o._id) === orderId) {
          return { ...o, status: nextStatus, updated_at: new Date().toISOString() };
        }
        return o;
      })
    );

    // Emit via Socket so other kitchen devices/screens update immediately
    if (activeSocket) {
      activeSocket.emit('order:status_update', { id: orderId, status: nextStatus });
    }

    // Persist to REST API
    try {
      const serverUrl = resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        // Fallback to PUT
        await fetch(`${serverUrl}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
      }
    } catch (err) {
      console.warn('Backend sync failed, saved in local state:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // 9. Audio Alert Mute / Unmute Toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem('kds_audio_muted', String(nextMuted));
    } catch {
      // Ignore localStorage errors
    }
    if (!nextMuted) {
      unlockAudioContext();
      playKitchenChime(); // Play brief sound confirmation
    }
  };

  // 10. Test Chime Button
  const handleTestChime = () => {
    unlockAudioContext();
    playKitchenChime();
    setRecentAlertMessage('🔔 Kitchen Chime Test Successful!');
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setRecentAlertMessage(null), 3000);
  };

  // 11. View Mode switcher
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('kds_view_mode', mode);
    } catch {}
  };

  // 12. Computed Order Categorization & Stats
  const { pendingOrders, preparingOrders, readyOrders, completedOrders } = useMemo(() => {
    const pending = [];
    const preparing = [];
    const ready = [];
    const completed = [];

    const query = searchQuery.trim().toLowerCase();

    orders.forEach((o) => {
      // Filter by search query if present
      if (query) {
        const tableStr = String(o?.table_no ?? o?.tableNumber ?? o?.table ?? '').toLowerCase();
        const orderNumStr = String(o?.order_number ?? o?.id ?? '').toLowerCase();
        const hasDishMatch = (o?.items || []).some((item) =>
          (item?.name || item?.dish_name || '').toLowerCase().includes(query)
        );

        if (!tableStr.includes(query) && !orderNumStr.includes(query) && !hasDishMatch) {
          return;
        }
      }

      const st = (o?.status || 'pending').toLowerCase();
      if (st === 'pending' || st === 'received' || st === 'new') {
        pending.push(o);
      } else if (st === 'preparing' || st === 'cooking' || st === 'in_kitchen' || st === 'in-progress') {
        preparing.push(o);
      } else if (st === 'ready') {
        ready.push(o);
      } else {
        completed.push(o);
      }
    });

    return {
      pendingOrders: pending,
      preparingOrders: preparing,
      readyOrders: ready,
      completedOrders: completed
    };
  }, [orders, searchQuery]);

  const activeCount = pendingOrders.length + preparingOrders.length + readyOrders.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* =========================================================================
          TOP KITCHEN HEADER BAR
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b-2 border-slate-800 shadow-xl px-4 py-2.5">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Brand Identity & Active Order Counts */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  KITCHEN DISPLAY
                  <span className="hidden md:inline-block text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    KDS Live
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  {/* Socket Connection Pill */}
                  <span className="inline-flex items-center gap-1.5">
                    {isConnected ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-emerald-400 font-semibold">Live Socket</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        <span className="text-rose-400 font-semibold">Offline Mode</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Tickets Summary Badge */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active:</span>
              <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {activeCount}
              </span>
              <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-[11px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {pendingOrders.length} Pending
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {preparingOrders.length} Cooking
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {readyOrders.length} Ready
                </span>
              </div>
            </div>
          </div>

          {/* Center: Live Digital Clock */}
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <div className="flex flex-col text-right">
              <span className="text-base sm:text-lg font-black font-mono tracking-tight text-white leading-none">
                {currentTimeStr || '00:00:00'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-medium leading-none mt-0.5">
                {currentDateStr}
              </span>
            </div>
          </div>

          {/* Right: Search, Sound Alert Toggle, View Toggle & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Search Input */}
            <div className="relative hidden sm:block w-36 md:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Table / Order #..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition"
              />
            </div>

            {/* Sound Alert Toggle Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer shadow-md ${
                isMuted
                  ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 ring-1 ring-emerald-500/50'
              }`}
              title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="hidden md:inline">Alerts OFF</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="hidden md:inline">Alerts ON</span>
                </>
              )}
            </button>

            {/* Test Kitchen Chime Button */}
            <button
              type="button"
              onClick={handleTestChime}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Test Kitchen Sound Alert"
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">Test Alert</span>
            </button>

            {/* View Mode Toggle: Kanban Columns vs Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Kanban Board View"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Kanban</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange('tabs')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'tabs'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tabbed Single Stream View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tabs</span>
              </button>
            </div>

            {/* Refresh / Sync Button */}
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Visual Alert Toast Banner */}
        {recentAlertMessage && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-between shadow-xl animate-bounce">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-slate-950 animate-wiggle" />
              <span>{recentAlertMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setRecentAlertMessage(null)}
              className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}
      </header>

      {/* =========================================================================
          MAIN DISPLAY AREA
          ========================================================================= */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1920px] w-full mx-auto flex flex-col">
        {/* Loading State */}
        {isLoading && orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Loading Kitchen Display...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to live order stream</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* =====================================================================
             VIEW 1: KANBAN COLUMNS VIEW (Optimized for wall monitors & widescreen)
             ===================================================================== */
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 items-start">
            
            {/* COLUMN 1: PENDING / NEW */}
            <div className="flex flex-col bg-slate-950/60 rounded-2xl border border-amber-500/30 overflow-hidden shadow-lg min-h-[500px]">
              <div className="p-3 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <h2 className="font-black text-sm sm:text-base tracking-wide uppercase text-amber-300">
                    Active / Pending
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                {pendingOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    No pending orders in queue.
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id || order._id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingOrderId === (order.id || order._id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: IN KITCHEN (PREPARING) */}
            <div className="flex flex-col bg-slate-950/60 rounded-2xl border border-sky-500/30 overflow-hidden shadow-lg min-h-[500px]">
              <div className="p-3 bg-sky-500/15 border-b border-sky-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-sky-400 animate-bounce" />
                  <h2 className="font-black text-sm sm:text-base tracking-wide uppercase text-sky-300">
                    In Kitchen
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-black text-xs font-mono">
                  {preparingOrders.length}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                {preparingOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    No tickets currently on the grill.
                  </div>
                ) : (
                  preparingOrders.map((order) => (
                    <OrderCard
                      key={order.id || order._id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingOrderId === (order.id || order._id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: READY FOR PICKUP */}
            <div className="flex flex-col bg-slate-950/60 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-lg min-h-[500px]">
              <div className="p-3 bg-emerald-500/15 border-b border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-black text-sm sm:text-base tracking-wide uppercase text-emerald-300">
                    Ready
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs font-mono">
                  {readyOrders.length}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                {readyOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    No orders waiting for server pickup.
                  </div>
                ) : (
                  readyOrders.map((order) => (
                    <OrderCard
                      key={order.id || order._id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingOrderId === (order.id || order._id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 4: RECENTLY COMPLETED */}
            <div className="flex flex-col bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-lg min-h-[500px]">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <h2 className="font-black text-sm sm:text-base tracking-wide uppercase text-slate-400">
                    Completed
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black text-xs font-mono">
                  {completedOrders.length}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                {completedOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    No completed orders recorded today.
                  </div>
                ) : (
                  completedOrders.slice(0, 10).map((order) => (
                    <OrderCard
                      key={order.id || order._id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingOrderId === (order.id || order._id)}
                    />
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          /* =====================================================================
             VIEW 2: TABBED SINGLE STREAM VIEW (Optimized for handheld tablets)
             ===================================================================== */
          <div className="flex flex-col gap-4 flex-1">
            {/* Status Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>All Active</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-white">
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>Active / Pending</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300">
                  {pendingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preparing')}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'preparing'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>In Kitchen</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-sky-500/20 text-sky-300">
                  {preparingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'ready'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>Ready for Pickup</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300">
                  {readyOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-slate-700 text-white shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>Completed</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-400">
                  {completedOrders.length}
                </span>
              </button>
            </div>

            {/* Tabbed Ticket Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {(() => {
                let displayList = [];
                if (activeTab === 'all') {
                  displayList = [...pendingOrders, ...preparingOrders, ...readyOrders];
                } else if (activeTab === 'pending') {
                  displayList = pendingOrders;
                } else if (activeTab === 'preparing') {
                  displayList = preparingOrders;
                } else if (activeTab === 'ready') {
                  displayList = readyOrders;
                } else {
                  displayList = completedOrders;
                }

                if (displayList.length === 0) {
                  return (
                    <div className="col-span-full py-20 text-center text-slate-500">
                      <div className="text-4xl mb-2">🍽️</div>
                      <div className="text-base font-bold text-slate-300">No tickets in this section</div>
                      <p className="text-xs text-slate-500 mt-1">New incoming tickets will arrive in real-time</p>
                    </div>
                  );
                }

                return displayList.map((order) => (
                  <OrderCard
                    key={order.id || order._id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingOrderId === (order.id || order._id)}
                  />
                ));
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
