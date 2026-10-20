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
  Wifi,
  WifiOff,
  BellRing,
  RotateCcw,
  X
} from 'lucide-react';
import OrderCard from '../components/OrderCard.jsx';
import SocketContext, { resolveServerUrl } from '../context/SocketContext.jsx';
import { io } from 'socket.io-client';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import '../styles/staff.css';

// Module-scoped AudioContext singleton to prevent context leaks or hitting browser limits
let sharedKitchenAudioCtx = null;

const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!sharedKitchenAudioCtx || sharedKitchenAudioCtx.state === 'closed') {
    sharedKitchenAudioCtx = new AudioCtxClass();
  }
  if (sharedKitchenAudioCtx.state === 'suspended') {
    sharedKitchenAudioCtx.resume().catch(() => {});
  }
  return sharedKitchenAudioCtx;
};

/**
 * Web Audio API Kitchen Alert Synthesis
 * 
 * Synthesizes an authoritative, penetrating 4-note hospitality bell chime
 * without requiring any external audio files or network requests!
 */
export const playKitchenChime = () => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic sequence: F5 -> C6 -> A5 -> F6
    const notes = [
      { freq: 698.46, time: 0, duration: 0.35, gain: 0.28 },
      { freq: 1046.50, time: 0.02, duration: 0.45, gain: 0.22 },
      { freq: 880.00, time: 0.18, duration: 0.50, gain: 0.32 },
      { freq: 1396.91, time: 0.20, duration: 0.70, gain: 0.25 },
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
 * KitchenDisplay (KDS) Page & Embedded Component
 * 
 * High-contrast dark mode layout designed for kitchen screens, tablets, or hanging wall monitors.
 * Supports standalone mode or embedded mode inside EmployeeView or AdminDashboard.
 * 
 * Features:
 * - Real-time Socket.IO synchronization (`order:new`, `order:status_update`, `order:cancel`)
 * - Web Audio API synthesizer for instant attention-grabbing kitchen chimes
 * - Streamlined Tabbed Status Stream view (All Active, Active / Pending, In Kitchen, Ready for Pickup, Completed)
 * - Header bar with Live Digital Clock (HH:MM:SS), Active Ticket Counter, Mute/Unmute, Fullscreen toggle
 * - Clean embedded styling (`isEmbedded=true`) without duplicate page headers or awkward margins
 * - Ticket status progression: Pending -> Preparing -> Ready -> Served
 * - Live overdue indicators (>10m yellow warning, >20m red critical pulse)
 * - Multi-criteria search by Table #, Order #, dish name, or chef notes
 */
export default function KitchenDisplay({
  isEmbedded = false,
  showHeader = true,
  className = '',
  initialTab = 'all',
  initialViewMode = null,
  onOrderCountChange = null
}) {
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

  // Active status tab: 'all' | 'pending' | 'preparing' | 'ready' | 'completed'
  const [activeTab, setActiveTab] = useState(initialTab || 'all');

  // Search & filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [recentAlertMessage, setRecentAlertMessage] = useState(null);

  // Reference to track previous order IDs for real-time chime alerts
  const prevOrderIdsRef = useRef(new Set());

  // Convex Cloud real-time orders query and status mutation
  let convexOrders = null;
  let updateConvexStatus = null;
  try {
    convexOrders = useQuery(api.orders.getOrders, {});
    updateConvexStatus = useMutation(api.orders.updateOrderStatus);
  } catch (_) {}

  // 1. Digital Clock live updates
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

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

  // 2. Fullscreen state & listener
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // 3. Audio unlock on user interaction
  const unlockAudioContext = useCallback(() => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => setAudioUnlocked(true)).catch(() => {});
      } else {
        setAudioUnlocked(true);
      }
    } catch {
      setAudioUnlocked(true);
    }
  }, []);

  useEffect(() => {
    const handleInitialClick = () => {
      unlockAudioContext();
      window.removeEventListener('click', handleInitialClick);
      window.removeEventListener('touchstart', handleInitialClick);
      window.removeEventListener('keydown', handleInitialClick);
    };
    window.addEventListener('click', handleInitialClick);
    window.addEventListener('touchstart', handleInitialClick);
    window.addEventListener('keydown', handleInitialClick);
    return () => {
      window.removeEventListener('click', handleInitialClick);
      window.removeEventListener('touchstart', handleInitialClick);
      window.removeEventListener('keydown', handleInitialClick);
    };
  }, [unlockAudioContext]);

  // 4. Standalone Socket fallback if not wrapped in SocketProvider
  useEffect(() => {
    if (socketCtx?.socket) return;

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

  // Reference for alert message timeout
  const alertTimeoutRef = useRef(null);

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

  // 6. Sync Convex orders into KDS and trigger alerts on new incoming tickets
  useEffect(() => {
    if (convexOrders && Array.isArray(convexOrders)) {
      if (prevOrderIdsRef.current.size > 0) {
        // Detect newly added tickets from Convex
        convexOrders.forEach((o) => {
          const id = o.id || o._id;
          if (id && !prevOrderIdsRef.current.has(id)) {
            const rawStatus = (o.status || o.kitchenFlowStage || 'pending').toLowerCase();
            if (['pending', 'received', 'new', 'placed'].includes(rawStatus)) {
              triggerNewOrderAlert(o);
            }
          }
        });
      }

      setOrders(convexOrders);
      prevOrderIdsRef.current = new Set(convexOrders.map((o) => o.id || o._id));
      setIsLoading(false);
    }
  }, [convexOrders, triggerNewOrderAlert]);

  // 7. Socket.IO Listeners for real-time order events
  useEffect(() => {
    if (!activeSocket) return;

    // Listen to new order incoming
    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;
      const orderId = newOrder.id || newOrder._id || newOrder.order_id;
      setOrders((prev) => {
        const exists = prev.some((o) => (o.id || o._id || o.order_id) === orderId);
        if (exists) return prev;
        return [newOrder, ...prev];
      });

      if (orderId) {
        prevOrderIdsRef.current.add(orderId);
      }

      triggerNewOrderAlert(newOrder);
    };

    // Listen to status changes from server or other devices
    const handleStatusUpdate = (update) => {
      if (!update) return;
      const targetId = update.id || update._id || update.orderId || update.order_id;
      setOrders((prev) =>
        prev.map((order) => {
          const match = (order.id || order._id || order.order_id) === targetId;
          if (!match) return order;
          return {
            ...order,
            status: update.status || order.status,
            kitchenFlowStage: update.kitchenFlowStage || order.kitchenFlowStage,
            ...update
          };
        })
      );
    };

    // Listen to order cancellation
    const handleOrderCancel = ({ id }) => {
      if (!id) return;
      setOrders((prev) => prev.filter((o) => (o.id || o._id || o.order_id) !== id));
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

  // 8. Initial Fetch of Orders
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
          prevOrderIdsRef.current = new Set(list.map((o) => o.id || o._id || o.order_id));
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
      const demoList = [
        {
          id: 'ord_101',
          order_number: '101',
          table_no: '4',
          order_type: 'dine_in',
          status: 'pending',
          kitchenFlowStage: 'placed',
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
          kitchenFlowStage: 'preparing',
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
          kitchenFlowStage: 'ready_pickup',
          created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(), // >20m -> red critical
          items: [
            { name: 'Wood-Fired Margherita Pizza', quantity: 2, notes: 'Extra fresh basil leaves' },
            { name: 'House Berry Iced Tea', quantity: 2 }
          ]
        }
      ];
      prevOrderIdsRef.current = new Set(demoList.map((o) => o.id));
      return demoList;
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 9. Order Status Transition Handler with Dual Stage & Status Sync
  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId);

    // Map nextStatus to kitchenFlowStage equivalent
    let stageEquivalent = nextStatus;
    if (nextStatus === 'ready') stageEquivalent = 'ready_pickup';

    // Optimistic state update for instant snappy 0ms latency UI
    setOrders((prev) =>
      prev.map((o) => {
        if ((o.id || o._id || o.order_id) === orderId) {
          return {
            ...o,
            status: nextStatus,
            kitchenFlowStage: stageEquivalent,
            updated_at: new Date().toISOString()
          };
        }
        return o;
      })
    );

    // Emit via Socket so other kitchen devices/screens update immediately
    if (activeSocket) {
      activeSocket.emit('order:status_update', {
        id: orderId,
        orderId,
        status: nextStatus,
        kitchenFlowStage: stageEquivalent
      });
    }

    // Persist to Convex Cloud if available
    if (updateConvexStatus && orderId && typeof orderId === 'string' && !orderId.startsWith('ord_')) {
      try {
        await updateConvexStatus({ orderId, status: nextStatus });
      } catch (_) {}
    }

    // Persist to REST API
    try {
      const serverUrl = resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, kitchenFlowStage: stageEquivalent })
      });

      if (!res.ok) {
        // Fallback to PUT
        await fetch(`${serverUrl}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, kitchenFlowStage: stageEquivalent })
        });
      }
    } catch (err) {
      console.warn('Backend sync failed, saved in local state:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // 10. Audio Alert Mute / Unmute Toggle
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

  // 11. Test Chime Button
  const handleTestChime = () => {
    unlockAudioContext();
    playKitchenChime();
    setRecentAlertMessage('🔔 Kitchen Chime Test Successful!');
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setRecentAlertMessage(null), 3000);
  };

  // 12. Computed Order Categorization & Stats
  const { pendingOrders, preparingOrders, readyOrders, completedOrders } = useMemo(() => {
    const pending = [];
    const preparing = [];
    const ready = [];
    const completed = [];

    const query = searchQuery.trim().toLowerCase();

    orders.forEach((o) => {
      // 1. Filter by search query if present
      if (query) {
        const tableStr = String(o?.table_no ?? o?.tableNumber ?? o?.table ?? '').toLowerCase();
        const orderNumStr = String(o?.order_number ?? o?.orderNumber ?? o?.id ?? o?._id ?? '').toLowerCase();
        const generalNoteStr = String(o?.notes ?? o?.note ?? o?.special_instructions ?? '').toLowerCase();
        const hasDishMatch = (o?.items || o?.dishes || []).some((item) => {
          const name = String(item?.name || item?.dish_name || item?.title || '').toLowerCase();
          const itemNotes = String(item?.notes || item?.note || item?.special_instructions || '').toLowerCase();
          return name.includes(query) || itemNotes.includes(query);
        });

        if (!tableStr.includes(query) && !orderNumStr.includes(query) && !generalNoteStr.includes(query) && !hasDishMatch) {
          return;
        }
      }

      // 2. Normalize status & kitchen flow stage
      const rawStatus = String(o?.status || o?.kitchenFlowStage || 'pending').toLowerCase().trim();

      if (['pending', 'received', 'new', 'placed', 'order_placed'].includes(rawStatus)) {
        pending.push(o);
      } else if (['preparing', 'cooking', 'in_kitchen', 'in-progress', 'in_prep', 'in-kitchen'].includes(rawStatus)) {
        preparing.push(o);
      } else if (['ready', 'ready_pickup', 'ready-pickup', 'ready_for_pickup'].includes(rawStatus)) {
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

  // Notify parent component about active ticket count if callback provided
  useEffect(() => {
    if (typeof onOrderCountChange === 'function') {
      onOrderCountChange({
        active: activeCount,
        pending: pendingOrders.length,
        preparing: preparingOrders.length,
        ready: readyOrders.length,
        completed: completedOrders.length
      });
    }
  }, [activeCount, pendingOrders.length, preparingOrders.length, readyOrders.length, completedOrders.length, onOrderCountChange]);

  return (
    <div
      className={`staff-root ${
        isEmbedded ? 'w-full flex-1' : 'min-h-screen'
      } bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased ${className}`}
    >
      {/* =========================================================================
          TOP KITCHEN HEADER / TOOLBAR
          ========================================================================= */}
      {showHeader && (
        <header
          className={`sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 ${
            isEmbedded ? 'px-3 sm:px-4 py-2 shadow-md' : 'shadow-xl px-4 py-2.5 border-b-2'
          }`}
        >
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Left: Brand Identity & Active Order Counts */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isEmbedded ? (
                /* Sleek integrated Cook Station badge when embedded inside EmployeeView */
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black tracking-tight text-white">
                        KDS Station
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Live
                      </span>
                    </div>
                    {/* Socket Connection Pill */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="hidden sm:inline">Socket Live</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <WifiOff className="w-3 h-3 text-rose-500 animate-pulse" />
                          <span className="hidden sm:inline">Offline</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Standalone KDS Brand Header */
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
              )}

              {/* Active Tickets Summary Badge */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active:</span>
                <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                  {activeCount}
                </span>
                <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-[11px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {pendingOrders.length} New
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                    {preparingOrders.length} Cooking
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {readyOrders.length} Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Live Digital Clock */}
            <div className={`${isEmbedded ? 'hidden md:flex' : 'flex'} items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner`}>
              <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white leading-none">
                  {currentTimeStr || '00:00:00'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium leading-none mt-0.5">
                  {currentDateStr}
                </span>
              </div>
            </div>

            {/* Right: Search, Sound Alert Toggle, View Toggle & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Quick Search Input with Clear Button */}
              <div className="relative hidden sm:block w-36 md:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Table / Order / Dish..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sound Alert Toggle Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer shadow-md ${
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
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Test Kitchen Sound Alert"
              >
                <BellRing className="w-4 h-4 text-amber-400" />
                <span className="hidden xl:inline">Test Alert</span>
              </button>

              {/* Refresh / Sync Button */}
              <button
                type="button"
                onClick={fetchOrders}
                disabled={isLoading}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition cursor-pointer"
                title="Refresh Orders"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition cursor-pointer"
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
      )}

      {/* =========================================================================
          MAIN DISPLAY AREA
          ========================================================================= */}
      <main className={`flex-1 ${isEmbedded ? 'p-2 sm:p-4' : 'p-3 sm:p-5'} max-w-[1920px] w-full mx-auto flex flex-col`}>
        {/* Loading State */}
        {isLoading && orders.length === 0 ? (
          <div className="staff-empty flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="staff-spinner w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mb-4" />
            <h2 className="text-xl font-bold text-white">Loading Kitchen Display...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to live order stream</p>
          </div>
        ) : (
          /* =====================================================================
             TABBED STATUS STREAM VIEW (Permanent, high-efficiency kitchen workflow)
             ===================================================================== */
          <div className="flex flex-col gap-4 flex-1">
            {/* Category Filter Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. All Active */}
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-950 shadow-md shadow-white/10 ring-2 ring-white/30'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:text-white'
                  }`}
                >
                  <Layers className={`w-4 h-4 ${activeTab === 'all' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>All Active</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      activeTab === 'all'
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {activeCount}
                  </span>
                </button>

                {/* 2. Active / Pending */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    activeTab === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:text-amber-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeTab === 'pending' ? 'bg-slate-950' : 'bg-amber-400'} animate-ping`} />
                  <span>Active / Pending</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      activeTab === 'pending'
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {pendingOrders.length}
                  </span>
                </button>

                {/* 3. In Kitchen */}
                <button
                  type="button"
                  onClick={() => setActiveTab('preparing')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    activeTab === 'preparing'
                      ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 ring-2 ring-orange-400/50'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:text-orange-300'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${activeTab === 'preparing' ? 'text-slate-950 animate-bounce' : 'text-orange-400'}`} />
                  <span>In Kitchen</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      activeTab === 'preparing'
                        ? 'bg-slate-950 text-orange-300'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}
                  >
                    {preparingOrders.length}
                  </span>
                </button>

                {/* 4. Ready for Pickup */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ready')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    activeTab === 'ready'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:text-emerald-300'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${activeTab === 'ready' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Ready for Pickup</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      activeTab === 'ready'
                        ? 'bg-slate-950 text-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {readyOrders.length}
                  </span>
                </button>

                {/* 5. Completed */}
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    activeTab === 'completed'
                      ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20 ring-2 ring-slate-500/50'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:text-slate-100'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${activeTab === 'completed' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Completed</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      activeTab === 'completed'
                        ? 'bg-slate-950 text-slate-200'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {completedOrders.length}
                  </span>
                </button>
              </div>

              {/* Right Side: Active search filter indicator or view badge */}
              <div className="flex items-center gap-2 text-xs">
                {searchQuery && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>Filtered by: &quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="ml-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Clear Filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Live Stream</span>
                </div>
              </div>
            </div>

            {/* Tabbed Ticket Grid */}
            {(() => {
              let displayList = [];
              let tabLabel = '';
              let emptyDescription = '';

              if (activeTab === 'all') {
                displayList = [...pendingOrders, ...preparingOrders, ...readyOrders];
                tabLabel = 'Active Orders';
                emptyDescription = 'All caught up! No active kitchen tickets at the moment.';
              } else if (activeTab === 'pending') {
                displayList = pendingOrders;
                tabLabel = 'Active / Pending Orders';
                emptyDescription = 'No new pending orders in the queue.';
              } else if (activeTab === 'preparing') {
                displayList = preparingOrders;
                tabLabel = 'In Kitchen (Cooking)';
                emptyDescription = 'No tickets currently on the grill or in preparation.';
              } else if (activeTab === 'ready') {
                displayList = readyOrders;
                tabLabel = 'Ready for Pickup';
                emptyDescription = 'No orders currently waiting for server pickup.';
              } else {
                displayList = completedOrders;
                tabLabel = 'Completed Orders';
                emptyDescription = 'No completed orders recorded today.';
              }

              if (displayList.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 sm:p-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-3xl shadow-inner">
                      {activeTab === 'all' && '🍽️'}
                      {activeTab === 'pending' && '⏱️'}
                      {activeTab === 'preparing' && '🍳'}
                      {activeTab === 'ready' && '🛎️'}
                      {activeTab === 'completed' && '✨'}
                    </div>
                    <h3 className="text-lg font-black text-white">{tabLabel} Empty</h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
                      {searchQuery
                        ? `No tickets match your search "${searchQuery}".`
                        : emptyDescription}
                    </p>
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                      >
                        Clear Search Filter
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Listening for live orders</span>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                  {displayList.map((order) => (
                    <OrderCard
                      key={order.id || order._id}
                      order={order}
                      onStatusChange={handleStatusChange}
                      isUpdating={updatingOrderId === (order.id || order._id)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
