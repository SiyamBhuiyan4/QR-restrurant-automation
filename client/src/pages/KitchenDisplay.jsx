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
  WifiOff,
  BellRing,
  Check,
  X
} from 'lucide-react';
import AudioPlayer from '../components/AudioPlayer.jsx';
import SocketContext, { resolveServerUrl } from '../context/SocketContext.jsx';
import { io } from 'socket.io-client';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import { convex } from '../convexClient.js';
import { mapConvexOrders } from '../utils/convexOrders.js';
import { useRestaurant } from '../context/RestaurantContext';
import '../styles/staff.css';
import '../styles/kds.css';

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

/** Parse the order's start timestamp (ms), or null when unknown */
const getStartMs = (o) => {
  const raw = o?.created_at || o?.createdAt || o?.timestamp;
  const ms = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(ms) ? null : ms;
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
  onOrderCountChange = null,
  currentEmployee = null
}) {
  const restaurant = useRestaurant();
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
  // New orders stay flagged until a cook moves them forward (no timed dismiss)
  const [unackedOrderIds, setUnackedOrderIds] = useState(() => new Set());

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
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
      setNowMs(now.getTime());
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
    const orderKey = order?.id || order?._id || order?.order_id;
    if (orderKey) {
      setUnackedOrderIds((prev) => new Set(prev).add(orderKey));
    }

    // Play synthesized Web Audio chime if not muted
    if (!isMuted) {
      playKitchenChime();
    }
  }, [isMuted]);

  // 6. Sync Convex orders into KDS and trigger alerts on new incoming tickets
  const kdsOrders = useMemo(() => (Array.isArray(convexOrders) ? mapConvexOrders(convexOrders) : null), [convexOrders]);
  useEffect(() => {
    if (kdsOrders && Array.isArray(kdsOrders)) {
      if (prevOrderIdsRef.current.size > 0) {
        // Detect newly added tickets from Convex
        kdsOrders.forEach((o) => {
          const id = o.id || o._id;
          if (id && !prevOrderIdsRef.current.has(id)) {
            const rawStatus = (o.status || o.kitchenFlowStage || 'pending').toLowerCase();
            if (['pending', 'received', 'new', 'placed'].includes(rawStatus)) {
              triggerNewOrderAlert(o);
            }
          }
        });
      }

      setOrders(kdsOrders);
      prevOrderIdsRef.current = new Set(kdsOrders.map((o) => o.id || o._id));
      setIsLoading(false);
    }
  }, [kdsOrders, triggerNewOrderAlert]);

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

    try {
      const list = mapConvexOrders(await convex.query(api.orders.getOrders, {}));
      if (list.length > 0) {
        setOrders(list);
        prevOrderIdsRef.current = new Set(list.map((o) => o.id || o._id || o.order_id));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Could not fetch orders from Convex:', err);
    }

    // Default demonstration orders if API has no orders yet (guarantees stunning out-of-the-box preview!)
    setOrders((current) => {
      if (current.length > 0) {
        setIsLoading(false);
        return current;
      }
      const demoList = [
        {
          id: 'ord_kbbk',
          order_number: 'KBBK',
          table_no: '1',
          order_type: 'dine_in',
          status: 'pending',
          kitchenFlowStage: 'placed',
          placedTime: '03:06 PM',
          timeElapsedMinutes: 1285,
          created_at: new Date(Date.now() - 1285 * 60 * 1000).toISOString(),
          items: [
            { name: 'The Signature Wagyu Smash', category: 'Signature Burgers', quantity: 1, notes: 'Medium rare, house sauce' },
            { name: 'Grilled Herb Ribeye Steak', category: 'Prime Steaks', quantity: 1, notes: 'Chef special garlic butter' },
            { name: 'Creamy Truffle Tagliatelle', category: 'Handmade Pasta', quantity: 1, notes: 'Extra shaved black truffle' }
          ]
        },
        {
          id: 'ord_krsp',
          order_number: 'KRSP',
          table_no: '2',
          order_type: 'dine_in',
          status: 'pending',
          kitchenFlowStage: 'placed',
          placedTime: '03:06 PM',
          timeElapsedMinutes: 1285,
          created_at: new Date(Date.now() - 1285 * 60 * 1000).toISOString(),
          items: [
            { name: 'The Signature Wagyu Smash', category: 'Signature Burgers', quantity: 1, notes: 'Extra aged cheddar' }
          ]
        },
        {
          id: 'ord_kmwb',
          order_number: 'KMWB',
          table_no: '3',
          order_type: 'dine_in',
          status: 'pending',
          kitchenFlowStage: 'placed',
          placedTime: '03:06 PM',
          timeElapsedMinutes: 1285,
          created_at: new Date(Date.now() - 1285 * 60 * 1000).toISOString(),
          items: [
            { name: 'Warm Molten Lava Cake', category: 'Artisan Desserts', quantity: 1, notes: 'Vanilla bean gelato' }
          ]
        },
        {
          id: 'ord_kd7p',
          order_number: 'KD7P',
          table_no: '5',
          order_type: 'dine_in',
          status: 'pending',
          kitchenFlowStage: 'placed',
          placedTime: '03:06 PM',
          timeElapsedMinutes: 1285,
          created_at: new Date(Date.now() - 1285 * 60 * 1000).toISOString(),
          items: [
            { name: 'Grilled Herb Ribeye Steak', category: 'Prime Steaks', quantity: 1 },
            { name: 'Truffle Parmesan Fries', category: 'Artisan Sides', quantity: 1, notes: 'Extra crispy' }
          ]
        },
        {
          id: 'ord_kpg1',
          order_number: 'KPG1',
          table_no: '6',
          order_type: 'dine_in',
          status: 'preparing',
          kitchenFlowStage: 'preparing',
          created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
          voice_note_url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
          items: [
            { name: 'Pan-Seared Chilean Seabass', category: 'Fresh Catch', quantity: 1, notes: 'Lemon butter emulsion' },
            { name: 'Wild Mushroom Risotto', category: 'Italian Classics', quantity: 1 }
          ]
        },
        {
          id: 'ord_kpg2',
          order_number: 'KPG2',
          table_no: '8',
          order_type: 'dine_in',
          status: 'preparing',
          kitchenFlowStage: 'preparing',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          items: [
            { name: 'Smoked Beef Brisket', category: 'Smoked Specialties', quantity: 1, notes: 'House BBQ glaze' }
          ]
        },
        {
          id: 'ord_kpg3',
          order_number: 'KPG3',
          table_no: '10',
          order_type: 'dine_in',
          status: 'preparing',
          kitchenFlowStage: 'preparing',
          created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          items: [
            { name: 'Artisanal Margherita Pizza', category: 'Wood-Fired Pizza', quantity: 1, notes: 'Fresh buffalo mozzarella' },
            { name: 'Caesar Salad', category: 'Fresh Greens', quantity: 1 }
          ]
        },
        {
          id: 'ord_kpg4',
          order_number: 'KPG4',
          table_no: '11',
          order_type: 'dine_in',
          status: 'preparing',
          kitchenFlowStage: 'preparing',
          created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
          items: [
            { name: 'Creamy Truffle Tagliatelle', category: 'Handmade Pasta', quantity: 1, notes: 'Parmigiano Reggiano' }
          ]
        },
        {
          id: 'ord_kcp1',
          order_number: 'KCP1',
          table_no: '4',
          order_type: 'dine_in',
          status: 'completed',
          kitchenFlowStage: 'served',
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          items: [
            { name: 'Balado Sauce Wings', category: 'Starters', quantity: 2 },
            { name: 'House Mojito', category: 'Beverages', quantity: 2 }
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
    if (nextStatus !== 'pending') {
      setUnackedOrderIds((prev) => {
        if (!prev.has(orderId)) return prev;
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }

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

    // Record action in shared employee audit history
    try {
      const activeActor = currentEmployee || (() => {
        try {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('smartdine_logged_in_employee') : null;
          return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
      })();

      if (restaurant?.recordActivity) {
        restaurant.recordActivity({
          actorType: activeActor ? 'employee' : 'admin',
          actorId: activeActor?.id || 'admin',
          actorName: activeActor?.name || (isEmbedded ? 'Head Desk / Admin' : 'Kitchen Staff'),
          actorRole: activeActor?.role || (isEmbedded ? 'Admin' : 'Kitchen Staff'),
          actorStaffId: activeActor?.staffId || activeActor?.numericId || (isEmbedded ? 'ADMIN' : 'CHEF'),
          actionType: 'STAGE_ADVANCE',
          description: `${activeActor?.name || (isEmbedded ? 'Admin' : 'Kitchen Staff')} advanced Order #${String(orderId).slice(-4)} to "${nextStatus.toUpperCase()}"`,
          target: `Order #${String(orderId).slice(-4)}`,
          details: `Stage updated to ${stageEquivalent}`
        });
      }
    } catch (_) {}

    setUpdatingOrderId(null);
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

  const TABS = [
    { key: 'all', label: 'All Active', count: activeCount, icon: Layers },
    { key: 'pending', label: 'Pending', count: pendingOrders.length, icon: BellRing },
    { key: 'preparing', label: 'Preparing', count: preparingOrders.length, icon: Flame },
    { key: 'ready', label: 'Ready', count: readyOrders.length, icon: Sparkles },
    { key: 'completed', label: 'Served', count: completedOrders.length, icon: CheckCircle2 }
  ];

  // Board columns: one per kitchen status, each with its one-tap next step
  const columns = [
    { key: 'pending', title: 'Pending', list: pendingOrders, nextStatus: 'preparing', actionLabel: 'Start Cooking', icon: BellRing, empty: 'No new orders in the queue.' },
    { key: 'preparing', title: 'Preparing', list: preparingOrders, nextStatus: 'ready', actionLabel: 'Mark Ready', icon: Flame, empty: 'Nothing on the grill right now.' },
    { key: 'ready', title: 'Ready', list: readyOrders, nextStatus: 'served', actionLabel: 'Mark Served', icon: Sparkles, empty: 'No orders waiting for pickup.' },
    { key: 'completed', title: 'Served', list: completedOrders, nextStatus: null, actionLabel: null, icon: CheckCircle2, empty: 'No served orders yet today.' }
  ];

  const visibleColumns = activeTab === 'all' ? columns : columns.filter((c) => c.key === activeTab);
  const totalVisibleTickets = visibleColumns.reduce((sum, c) => sum + c.list.length, 0);

  return (
    <div className={`kds-root staff-root ${isEmbedded ? 'kds-root--embedded' : 'kds-root--page'} ${className}`}>
      {/* =========================================================================
          HEADER: brand, live connection, clock, search and controls
          ========================================================================= */}
      {showHeader && (
        <header className="kds-header">
          <div className="kds-header__row">
            <div className="kds-brand">
              <div className="kds-brand__mark">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="kds-brand__title">Kitchen Display</h1>
                <div className={`kds-conn ${isConnected ? 'is-live' : 'is-off'}`}>
                  {isConnected ? (
                    <>
                      <span className="kds-conn__dot" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="kds-clock">
              <Clock className="w-4 h-4" />
              <span className="kds-clock__time">{currentTimeStr || '--:--:--'}</span>
              <span className="kds-clock__date">{currentDateStr}</span>
            </div>

            <div className="kds-tools">
              <div className="kds-search">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Table, order or dish"
                  aria-label="Search tickets"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="kds-search__clear" aria-label="Clear search">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button type="button" onClick={fetchOrders} className="kds-icon-btn" title="Refresh orders" aria-label="Refresh orders">
                <RefreshCw className="w-5 h-5" />
              </button>

              {!isEmbedded && (
                <button type="button" onClick={toggleFullscreen} className="kds-icon-btn" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleMute}
                className={`kds-sound ${isMuted ? 'is-muted' : 'is-on'}`}
                title={isMuted ? 'Turn on audio alerts' : 'Turn off audio alerts'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                <span>{isMuted ? 'Alerts Off' : 'Alerts On'}</span>
              </button>
            </div>
          </div>

          {recentAlertMessage && unackedOrderIds.size === 0 && (
            <div className="kds-toast kds-toast--info" role="status">
              <div className="kds-toast__msg">
                <BellRing className="w-5 h-5" />
                <span>{recentAlertMessage}</span>
              </div>
            </div>
          )}

          {unackedOrderIds.size > 0 && (
            <div className="kds-toast" role="alert" aria-live="assertive">
              <div className="kds-toast__msg">
                <BellRing className="w-5 h-5" />
                <span>
                  {unackedOrderIds.size} new {unackedOrderIds.size === 1 ? 'order' : 'orders'} waiting. Tap Start Cooking to acknowledge.
                </span>
              </div>
            </div>
          )}
        </header>
      )}

      {/* =========================================================================
          MAIN: status filter tabs + board
          ========================================================================= */}
      <main className="kds-main">
        {isLoading && orders.length === 0 ? (
          <div className="kds-loading">
            <div className="kds-loading__spinner" />
            <h2>Loading Kitchen Display...</h2>
            <p>Connecting to live order stream</p>
          </div>
        ) : (
          <>
            <nav className="kds-tabs" aria-label="Filter by status">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`kds-tab kds-tab--${tab.key} ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <span className="kds-tab__count">{tab.count}</span>
                  </button>
                );
              })}

              <div className="kds-tabs__status">
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="kds-chip">
                    <Filter className="w-4 h-4" />
                    <span>&quot;{searchQuery}&quot;</span>
                    <X className="w-4 h-4" />
                  </button>
                )}
                <span className="kds-live-pill">
                  <span className="kds-conn__dot" />
                  Live Stream
                </span>
              </div>
            </nav>

            {totalVisibleTickets === 0 && (
              <div className="kds-empty">
                <h3>{searchQuery ? 'No matching tickets' : 'All caught up'}</h3>
                <p>{searchQuery ? `Nothing matches "${searchQuery}".` : 'No tickets need attention right now. New orders appear here instantly.'}</p>
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="kds-empty__btn">
                    Clear Search
                  </button>
                )}
              </div>
            )}

            <div className={`kds-board ${activeTab === 'all' ? 'kds-board--all' : 'kds-board--single'}`}>
              {visibleColumns.map((col) => {
                const Icon = col.icon;
                const sorted = [...col.list].sort((a, b) => (getStartMs(a) ?? 0) - (getStartMs(b) ?? 0));
                return (
                  <section key={col.key} className={`kds-col kds-col--${col.key}`} aria-label={col.title}>
                    <header className="kds-col__head">
                      <Icon className="w-5 h-5" />
                      <h2>{col.title}</h2>
                      <span className="kds-col__count">{col.list.length}</span>
                    </header>
                    <div className="kds-col__list">
                      {sorted.length === 0 ? (
                        <p className="kds-col__empty">{col.empty}</p>
                      ) : (
                        sorted.map((order) => {
                          const id = order.id || order._id || order.order_id;
                          return (
                            <KdsTicket
                              key={id}
                              order={order}
                              tone={col.key}
                              nextStatus={col.nextStatus}
                              actionLabel={col.actionLabel}
                              nowMs={nowMs}
                              onAdvance={handleStatusChange}
                              isUpdating={updatingOrderId === id}
                            />
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * KdsTicket - single order card on the board.
 * Urgency comes from elapsed time: under 10 min normal, 10-19 min warning, 20+ min critical.
 * Served tickets stay neutral. Tapping an item marks it done on the line.
 */
function KdsTicket({ order, tone, nextStatus, actionLabel, nowMs, onAdvance, isUpdating }) {
  const [checkedItems, setCheckedItems] = useState(() => new Set());

  const orderId = order?.id || order?._id || order?.order_id;
  const displayNum = order?.order_number || (typeof orderId === 'string' ? orderId.slice(-4).toUpperCase() : orderId || '-');
  const isTakeaway = (order?.order_type || order?.type) === 'takeaway';
  const tableNo = order?.table_no ?? order?.tableNumber ?? order?.table ?? '-';
  const items = order?.items || order?.dishes || order?.order_items || [];
  const voiceNoteUrl = order?.voice_note_url || order?.voiceNoteUrl || order?.voice_url || order?.audio_url;
  const generalNote = order?.notes || order?.note || order?.special_instructions;

  const startMs = getStartMs(order);
  const elapsedMin = startMs
    ? Math.max(0, Math.floor((nowMs - startMs) / 60000))
    : (typeof order?.timeElapsedMinutes === 'number' ? order.timeElapsedMinutes : 0);
  const urgency = tone === 'completed' ? 'done' : elapsedMin >= 20 ? 'critical' : elapsedMin >= 10 ? 'warning' : 'normal';
  const urgencyLabel = { done: 'Served', critical: 'Overdue', warning: 'Check soon', normal: 'On time' }[urgency];
  const placedAt = startMs
    ? new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (order?.placedTime || '');

  const toggleItem = (index) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <article className={`kds-ticket kds-ticket--${urgency}`} data-order-id={orderId} data-order-status={tone}>
      <div className="kds-ticket__head">
        <div className="min-w-0">
          <div className="kds-ticket__table">{isTakeaway ? 'Takeaway' : `Table ${tableNo}`}</div>
          <div className="kds-ticket__meta">#{displayNum}{placedAt ? ` · ${placedAt}` : ''}</div>
        </div>
        <div className="kds-ticket__timer">
          <span className="kds-ticket__elapsed">{elapsedMin}<small>m</small></span>
          <span className="kds-ticket__urgency">{urgencyLabel}</span>
        </div>
      </div>

      {voiceNoteUrl && (
        <div className="kds-ticket__voice">
          <AudioPlayer src={voiceNoteUrl} />
        </div>
      )}

      {generalNote && (
        <p className="kds-ticket__note">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalNote}</span>
        </p>
      )}

      <ul className="kds-ticket__items">
        {items.map((item, index) => {
          const name = item?.name || item?.dish_name || item?.title || 'Item';
          const qty = item?.quantity ?? item?.qty ?? 1;
          const note = item?.notes || item?.note || item?.special_instructions;
          const done = checkedItems.has(index);
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => toggleItem(index)}
                className={`kds-item ${done ? 'is-done' : ''}`}
                aria-pressed={done}
              >
                <span className="kds-item__qty">{qty}×</span>
                <span className="kds-item__body">
                  <span className="kds-item__name">{name}</span>
                  {item?.category && <span className="kds-item__cat">{item.category}</span>}
                  {note && <span className="kds-item__note">{note}</span>}
                </span>
                {done && <Check className="kds-item__check w-5 h-5" />}
              </button>
            </li>
          );
        })}
      </ul>

      {nextStatus && (
        <button
          type="button"
          className="kds-ticket__action"
          disabled={isUpdating}
          onClick={() => onAdvance(orderId, nextStatus)}
        >
          {isUpdating ? 'Saving...' : actionLabel}
        </button>
      )}
    </article>
  );
}
