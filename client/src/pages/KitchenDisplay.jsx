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
  CheckCheck,
  Play,
  RotateCcw,
  Timer,
  X
} from 'lucide-react';
import AudioPlayer from '../components/AudioPlayer.jsx';
import SocketContext, { resolveServerUrl } from '../context/SocketContext.jsx';
import { io } from 'socket.io-client';
import { useQuery, useMutation } from '../db/telegramDb';
import { api } from '../convexApi';
import { convex } from '../convexClient.js';
import { mapConvexOrders } from '../utils/convexOrders.js';
import { useRestaurant } from '../context/RestaurantContext';
import { sendMessage, sendOrderStatusToTelegram } from '../services/telegramClient.js';
import { getPendingOrders } from '../db/indexedDb.js';
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

/** Storage key for active KDS orders */
export const KDS_STORAGE_KEY = 'smartdine_kds_orders';

/** Safely load active tickets from localStorage */
export function loadStoredKdsOrders() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(KDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[KDS] Failed to parse smartdine_kds_orders from localStorage:', err);
    return [];
  }
}

/** Safely persist active tickets to localStorage (stripping non-serializable blobs) */
export function saveKdsOrdersToStorage(ordersList) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const sanitized = (ordersList || []).map((o) => ({
      ...o,
      voiceBlob: undefined
    }));
    localStorage.setItem(KDS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[KDS] Failed to save smartdine_kds_orders to localStorage:', err);
  }
}

/** Standardize ticket objects across Convex, localStorage, IndexedDB and live events */
export function normalizeTicket(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(
    raw.id ||
    raw._id ||
    raw.order_id ||
    raw.orderId ||
    raw.orderNumber ||
    raw.localId ||
    `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  );

  const orderNumber = String(
    raw.order_number ||
    raw.orderNumber ||
    raw.orderId ||
    (id.length > 4 ? id.slice(-4).toUpperCase() : id)
  );

  const tableNo = String(
    raw.table_no ??
    raw.tableNumber ??
    raw.table_number ??
    raw.table ??
    '1'
  );

  const rawStatus = String(raw.status || raw.kitchenFlowStage || 'pending').toLowerCase().trim();
  let status = 'pending';
  let kitchenFlowStage = 'placed';

  if (['pending', 'received', 'new', 'placed', 'order_placed', 'pending_sync'].includes(rawStatus)) {
    status = 'pending';
    kitchenFlowStage = 'placed';
  } else if (['preparing', 'cooking', 'in_kitchen', 'in-progress', 'in_prep', 'in-kitchen'].includes(rawStatus)) {
    status = 'preparing';
    kitchenFlowStage = 'preparing';
  } else if (['ready', 'ready_pickup', 'ready-pickup', 'ready_for_pickup'].includes(rawStatus)) {
    status = 'ready';
    kitchenFlowStage = 'ready_pickup';
  } else if (['served', 'completed', 'delivered', 'done', 'closed'].includes(rawStatus)) {
    status = 'completed';
    kitchenFlowStage = 'served';
  } else {
    status = rawStatus;
    kitchenFlowStage = raw.kitchenFlowStage || rawStatus;
  }

  const rawItems = raw.items || raw.dishes || raw.order_items || [];
  const items = Array.isArray(rawItems)
    ? rawItems.map((it) => ({
        id: it?.id || it?._id,
        name: it?.name || it?.dish_name || it?.title || 'Dish',
        category: it?.category || it?.categoryName || 'Kitchen',
        quantity: Number(it?.quantity ?? it?.qty ?? 1),
        price: typeof it?.price === 'number' ? it.price : (Number(it?.price || it?.unit_price) || null),
        notes: it?.notes || it?.note || it?.special_instructions || '',
        voiceNoteUrl: it?.voiceNoteUrl || it?.voice_note_url || null
      }))
    : [];

  const createdAt =
    raw.created_at ||
    raw.createdAt ||
    (raw.timestamp ? new Date(raw.timestamp).toISOString() : (raw.queuedAt ? new Date(raw.queuedAt).toISOString() : new Date().toISOString()));

  const placedTime =
    raw.placedTime ||
    new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const voiceNoteUrl =
    raw.voice_note_url ||
    raw.voiceNoteUrl ||
    raw.voice_url ||
    raw.audio_url ||
    null;

  const notes =
    raw.notes ||
    raw.note ||
    raw.generalNote ||
    raw.special_instructions ||
    '';

  return {
    ...raw,
    id,
    _id: raw._id || id,
    order_number: orderNumber,
    table_no: tableNo,
    order_type: raw.order_type || raw.type || 'dine_in',
    status,
    kitchenFlowStage,
    items,
    created_at: createdAt,
    placedTime,
    voice_note_url: voiceNoteUrl,
    notes,
    total: raw.total || raw.totalAmount || 0
  };
}

/** Demo fallback tickets if no cloud, local, or offline tickets exist */
const DEMO_ORDERS = [
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
  currentEmployee = null,
  // Admin monitor: watch the kitchen without action buttons
  readOnly = false,
  // Signed-in staff session: status changes are recorded against this account
  staffToken = '',
  // Admin session: status changes go through the admin mutation (shown as "Admin" on the activity feed)
  adminToken = '',
  stationLabel = 'Main Line • Station 01'
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
  let staffSetStatus = null;
  let adminSetStatus = null;
  let convexError = null;
  try {
    convexOrders = useQuery(api.orders.getOrders, {});
    updateConvexStatus = useMutation(api.orders.updateOrderStatus);
    staffSetStatus = useMutation(api.team.staffSetOrderStatus);
    adminSetStatus = useMutation(api.team.adminSetOrderStatus);
  } catch (err) {
    convexError = err;
  }
  // Connection badge is driven by the Convex orders query, not the legacy socket:
  // 'live' once the query has resolved, 'connecting' while loading, 'offline' on error.
  const connectionState = convexError
    ? 'offline'
    : convexOrders === undefined
      ? 'connecting'
      : 'live';

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
      const normalizedConvex = kdsOrders.map(normalizeTicket).filter(Boolean);

      if (prevOrderIdsRef.current.size > 0) {
        // Detect newly added tickets from Convex
        normalizedConvex.forEach((o) => {
          if (o.id && !prevOrderIdsRef.current.has(o.id)) {
            const rawStatus = (o.status || o.kitchenFlowStage || 'pending').toLowerCase();
            if (['pending', 'received', 'new', 'placed'].includes(rawStatus)) {
              triggerNewOrderAlert(o);
            }
          }
        });
      }

      setOrders((prev) => {
        // Preserve offline/local orders created in diner PWA or CartDrawer
        const convexIds = new Set(normalizedConvex.map((o) => o.id));
        const localActive = prev.filter(
          (o) => !convexIds.has(o.id) && (String(o.id).startsWith('ord_') || String(o.id).startsWith('SD-') || String(o.id).startsWith('local_'))
        );
        const merged = [...normalizedConvex, ...localActive];
        saveKdsOrdersToStorage(merged);
        return merged;
      });

      prevOrderIdsRef.current = new Set(normalizedConvex.map((o) => o.id));
      setIsLoading(false);
    }
  }, [kdsOrders, triggerNewOrderAlert]);

  // 7. Real-Time Order Stream Listeners: Socket.IO, BroadcastChannel, Window Events & LocalStorage
  useEffect(() => {
    // Helper to accept and display an incoming order ticket instantly
    const handleIncomingTicket = (rawTicket) => {
      if (!rawTicket) return;
      const ticket = normalizeTicket(rawTicket);
      if (!ticket) return;

      setOrders((prev) => {
        const exists = prev.some((o) => (o.id || o._id || o.order_id || o.orderId) === ticket.id);
        if (exists) return prev;
        const next = [ticket, ...prev];
        saveKdsOrdersToStorage(next);
        return next;
      });

      if (!prevOrderIdsRef.current.has(ticket.id)) {
        prevOrderIdsRef.current.add(ticket.id);
        triggerNewOrderAlert(ticket);
        setRecentAlertMessage(`🔔 New Order #${ticket.order_number} received from Table ${ticket.table_no}!`);
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = setTimeout(() => setRecentAlertMessage(null), 5000);
      }
    };

    // A. Window Event: smartdine:new-order (fired directly by CartDrawer / Diner PWA in same tab)
    const handleWindowNewOrder = (event) => {
      const payload = event.detail?.order || event.detail?.orderPayload || event.detail;
      handleIncomingTicket(payload);
    };
    window.addEventListener('smartdine:new-order', handleWindowNewOrder);

    // B. Cross-Tab BroadcastChannels ('smartdine_restaurant_state' and 'smartdine_kds')
    let bcState = null;
    let bcKds = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bcState = new BroadcastChannel('smartdine_restaurant_state');
        bcState.onmessage = (event) => {
          const data = event.data;
          if (!data) return;

          if (
            data.type === 'smartdine:new-order' ||
            data.type === 'ORDER_PLACED' ||
            data.type === 'NEW_ORDER' ||
            data.type === 'ORDER_CREATED'
          ) {
            handleIncomingTicket(data.order || data.orderPayload || data.payload || data.data);
          } else if (data.type === 'ORDER_STATUS_UPDATE') {
            const targetId = data.orderId || data.id || data._id;
            if (targetId && data.status) {
              setOrders((prev) => {
                const next = prev.map((order) => {
                  if ((order.id || order._id || order.order_id || order.orderId) === targetId) {
                    return {
                      ...order,
                      status: data.status,
                      kitchenFlowStage: data.kitchenFlowStage || (data.status === 'ready' ? 'ready_pickup' : data.status === 'served' ? 'served' : data.status),
                      updated_at: new Date().toISOString()
                    };
                  }
                  return order;
                });
                saveKdsOrdersToStorage(next);
                return next;
              });
            }
          }
        };

        bcKds = new BroadcastChannel('smartdine_kds');
        bcKds.onmessage = (event) => {
          const data = event.data;
          if (!data) return;
          if (data.type === 'smartdine:new-order' || data.order || data.detail) {
            handleIncomingTicket(data.order || data.detail || data.orderPayload || data);
          }
        };
      }
    } catch (bcErr) {
      console.warn('[KDS] BroadcastChannel listener setup warning:', bcErr);
    }

    // C. Window storage event for multi-tab localStorage synchronization
    const handleStorageChange = (e) => {
      if (e.key === KDS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map(normalizeTicket).filter(Boolean);
            setOrders((prev) => {
              const map = new Map();
              normalized.forEach((o) => map.set(o.id, o));
              // Preserve any existing tickets that might not be in storage
              prev.forEach((o) => {
                if (!map.has(o.id)) map.set(o.id, o);
              });
              return Array.from(map.values());
            });
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // D. Socket.IO Listeners
    if (activeSocket) {
      const handleSocketNewOrder = (newOrder) => {
        handleIncomingTicket(newOrder);
      };

      const handleSocketStatusUpdate = (update) => {
        if (!update) return;
        const targetId = update.id || update._id || update.orderId || update.order_id;
        setOrders((prev) => {
          const next = prev.map((order) => {
            const match = (order.id || order._id || order.order_id || order.orderId) === targetId;
            if (!match) return order;
            return {
              ...order,
              status: update.status || order.status,
              kitchenFlowStage: update.kitchenFlowStage || order.kitchenFlowStage,
              ...update
            };
          });
          saveKdsOrdersToStorage(next);
          return next;
        });
      };

      const handleSocketOrderCancel = ({ id }) => {
        if (!id) return;
        setOrders((prev) => {
          const next = prev.filter((o) => (o.id || o._id || o.order_id || o.orderId) !== id);
          saveKdsOrdersToStorage(next);
          return next;
        });
      };

      activeSocket.on('order:new', handleSocketNewOrder);
      activeSocket.on('order:status_update', handleSocketStatusUpdate);
      activeSocket.on('order:cancel', handleSocketOrderCancel);

      return () => {
        window.removeEventListener('smartdine:new-order', handleWindowNewOrder);
        window.removeEventListener('storage', handleStorageChange);
        if (bcState) {
          try { bcState.close(); } catch (_) {}
        }
        if (bcKds) {
          try { bcKds.close(); } catch (_) {}
        }
        activeSocket.off('order:new', handleSocketNewOrder);
        activeSocket.off('order:status_update', handleSocketStatusUpdate);
        activeSocket.off('order:cancel', handleSocketOrderCancel);
      };
    }

    return () => {
      window.removeEventListener('smartdine:new-order', handleWindowNewOrder);
      window.removeEventListener('storage', handleStorageChange);
      if (bcState) {
        try { bcState.close(); } catch (_) {}
      }
      if (bcKds) {
        try { bcKds.close(); } catch (_) {}
      }
    };
  }, [activeSocket, triggerNewOrderAlert]);

  // 8. Initial Fetch of Orders (localStorage + IndexedDB + Convex + Demo)
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);

    // 1. Read active tickets from localStorage
    const localKdsList = loadStoredKdsOrders()
      .map(normalizeTicket)
      .filter(Boolean);

    // 2. Read pending offline tickets from IndexedDB
    let idbList = [];
    try {
      const idbRaw = await getPendingOrders();
      if (Array.isArray(idbRaw)) {
        idbList = idbRaw.map(normalizeTicket).filter(Boolean);
      }
    } catch (err) {
      console.warn('[KDS] IndexedDB read warning:', err);
    }

    // 3. Query Convex Cloud for orders
    let convexList = [];
    try {
      const cloudOrders = await convex.query(api.orders.getOrders, {});
      if (Array.isArray(cloudOrders)) {
        convexList = mapConvexOrders(cloudOrders).map(normalizeTicket).filter(Boolean);
      }
    } catch (err) {
      console.warn('[KDS] Convex query warning:', err);
    }

    // Merge in priority order:
    // Convex (cloud truth) -> LocalStorage KDS -> IndexedDB offline queue
    const orderMap = new Map();
    convexList.forEach((o) => orderMap.set(o.id, o));
    localKdsList.forEach((o) => {
      if (!orderMap.has(o.id)) orderMap.set(o.id, o);
    });
    idbList.forEach((o) => {
      if (!orderMap.has(o.id)) orderMap.set(o.id, o);
    });

    let combined = Array.from(orderMap.values());

    // Fallback to demo orders only if no real or offline tickets exist anywhere
    if (combined.length === 0) {
      combined = DEMO_ORDERS.map(normalizeTicket).filter(Boolean);
    }

    setOrders(combined);
    saveKdsOrdersToStorage(combined);
    prevOrderIdsRef.current = new Set(combined.map((o) => o.id));
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
    else if (nextStatus === 'served' || nextStatus === 'completed') stageEquivalent = 'served';
    else if (nextStatus === 'preparing') stageEquivalent = 'preparing';
    else if (nextStatus === 'pending') stageEquivalent = 'placed';

    let targetOrder = null;

    // Optimistic state update for instant snappy 0ms latency UI
    setOrders((prev) => {
      const next = prev.map((o) => {
        if ((o.id || o._id || o.order_id || o.orderId) === orderId) {
          targetOrder = {
            ...o,
            status: nextStatus,
            kitchenFlowStage: stageEquivalent,
            updated_at: new Date().toISOString()
          };
          return targetOrder;
        }
        return o;
      });
      // 1. Update smartdine_kds_orders in localStorage
      saveKdsOrdersToStorage(next);
      return next;
    });

    if (!targetOrder) {
      targetOrder = orders.find((o) => (o.id || o._id || o.order_id || o.orderId) === orderId);
    }

    const tableNo = targetOrder?.table_no ?? targetOrder?.tableNumber ?? targetOrder?.table ?? '1';
    const displayNum = targetOrder?.order_number || (typeof orderId === 'string' && orderId.length > 4 ? orderId.slice(-4).toUpperCase() : orderId || '-');

    // 2. Broadcast status change via BroadcastChannel ('smartdine_restaurant_state')
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({
          type: 'ORDER_STATUS_UPDATE',
          orderId,
          status: nextStatus,
          kitchenFlowStage: stageEquivalent,
          tableNumber: tableNo,
          orderNumber: displayNum,
          timestamp: Date.now()
        });
        bc.close();
      }
    } catch (err) {
      console.warn('[KDS] BroadcastChannel postMessage error:', err);
    }

    // 3. Broadcast status change via window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smartdine:order-status-update', {
          detail: {
            orderId,
            status: nextStatus,
            kitchenFlowStage: stageEquivalent,
            tableNumber: tableNo,
            orderNumber: displayNum,
            order: targetOrder
          }
        })
      );
    }

    // 4. Send order status update to Telegram Channel via sendMessage
    try {
      const statusUpper = nextStatus.toUpperCase();
      let emoji = '🍳';
      if (statusUpper === 'READY') emoji = '✨';
      else if (statusUpper === 'SERVED' || statusUpper === 'COMPLETED') emoji = '🍽️';
      else if (statusUpper === 'PREPARING') emoji = '🍳';

      const tgText = `${emoji} <b>Order #${displayNum}</b> (Table ${tableNo}) is now <b>${statusUpper}</b>\n⏱️ ${new Date().toLocaleTimeString()}`;
      sendMessage(tgText).catch((err) => {
        console.warn('[KDS] Telegram status notification failed:', err);
      });
    } catch (tgErr) {
      console.warn('[KDS] Failed to send Telegram status:', tgErr);
    }

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
    if (orderId && typeof orderId === 'string' && !orderId.startsWith('ord_') && !orderId.startsWith('local_') && !orderId.startsWith('SD-')) {
      try {
        if (adminToken && adminSetStatus) {
          await adminSetStatus({ adminToken, orderId, status: nextStatus });
        } else if (staffToken && staffSetStatus) {
          // Recorded against the signed-in staff account (shows on the admin monitor)
          await staffSetStatus({ staffToken, orderId, status: nextStatus });
        } else if (updateConvexStatus) {
          await updateConvexStatus({ orderId, status: nextStatus });
        }
      } catch (err) {
        console.warn('[KDS] status update failed:', err);
        fetchOrders();
      }
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

  // Board sections: one per kitchen status, each with its one-tap next step and colour tokens
  const columns = [
    {
      key: 'pending', title: 'Pending Orders', list: pendingOrders, nextStatus: 'preparing', actionLabel: 'Start Cooking',
      icon: BellRing, actionIcon: Play,
      bar: 'border-t-amber-500/70', iconColor: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      cardAccent: 'border-l-amber-500/80', timer: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      btn: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
    },
    {
      key: 'preparing', title: 'Preparing in Kitchen', list: preparingOrders, nextStatus: 'ready', actionLabel: 'Mark as Ready',
      icon: Flame, actionIcon: Check,
      bar: 'border-t-indigo-500/70', iconColor: 'text-indigo-400', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      cardAccent: 'border-l-indigo-500/80', timer: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
      btn: 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-500/35'
    },
    {
      key: 'ready', title: 'Ready for Pickup', list: readyOrders, nextStatus: 'served', actionLabel: 'Complete & Serve',
      icon: Sparkles, actionIcon: CheckCheck,
      bar: 'border-t-emerald-500/70', iconColor: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      cardAccent: 'border-l-emerald-500/80', timer: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
      btn: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/35'
    },
    {
      key: 'completed', title: 'Recently Served', list: completedOrders, nextStatus: 'pending', actionLabel: 'Reopen Order',
      icon: CheckCircle2, actionIcon: RotateCcw,
      bar: 'border-t-slate-600', iconColor: 'text-slate-400', badge: 'bg-slate-800 text-slate-400 border-slate-700',
      cardAccent: 'border-l-slate-600', timer: 'bg-slate-800/80 text-slate-400 border-slate-700',
      btn: 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
    }
  ];

  // "All Active" shows the non-empty active sections; a status tab shows just that section
  const visibleColumns = activeTab === 'all'
    ? columns.filter((c) => c.key !== 'completed' && c.list.length > 0)
    : columns.filter((c) => c.key === activeTab);

  return (
    <div className={`kds-v2 min-w-0 ${isEmbedded ? '' : 'min-h-screen p-3 sm:p-5 lg:p-6 bg-[#0B0F17]'} ${className}`} style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#F3F4F6' }}>
      <div className="max-w-7xl mx-auto bg-[#111827]/90 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">

        {/* HEADER: brand + live status, clock, search and controls */}
        {showHeader && (
          <header className="px-5 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold tracking-tight text-slate-100">Kitchen Display</h1>
                  {connectionState === 'live' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  )}
                  {connectionState === 'connecting' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Connecting…
                    </span>
                  )}
                  {connectionState === 'offline' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{readOnly ? 'Admin monitor • view only' : adminToken ? 'Admin • you can step in on any order' : stationLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-sm font-semibold text-slate-100 tracking-wide">{currentTimeStr || '--:--:--'}</span>
              <span className="text-slate-700">|</span>
              <span className="text-xs font-medium text-slate-400">{currentDateStr}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search table, order, dish..."
                  aria-label="Search tickets"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500/60 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" aria-label="Clear search">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button type="button" onClick={fetchOrders} title="Refresh orders" aria-label="Refresh orders" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {!isEmbedded && (
                <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition">
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Turn on audio alerts' : 'Turn off audio alerts'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  isMuted
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isMuted ? 'Muted' : 'Alerts On'}</span>
              </button>
            </div>
          </header>
        )}

        {showHeader && (recentAlertMessage || unackedOrderIds.size > 0) && (
          <div
            role={unackedOrderIds.size > 0 ? 'alert' : 'status'}
            className={`px-5 py-2 border-b text-xs font-medium flex items-center gap-2 ${
              unackedOrderIds.size > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>
              {unackedOrderIds.size > 0
                ? `${unackedOrderIds.size} new ${unackedOrderIds.size === 1 ? 'order' : 'orders'} waiting. Tap Start Cooking to acknowledge.`
                : recentAlertMessage}
            </span>
          </div>
        )}

        {/* TABS: status filter */}
        <div className="px-5 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5" role="tablist" aria-label="Filter by status">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm'
                      : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 rounded-md text-[11px] font-mono font-semibold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            <span>Live Stream</span>
          </div>
        </div>

        {/* BOARD: sections stacked top to bottom, cards in a responsive grid */}
        <main className="p-5 space-y-6">
          {isLoading && orders.length === 0 ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin mx-auto" />
              <p className="mt-3 text-sm text-slate-400">Connecting to live order stream…</p>
            </div>
          ) : visibleColumns.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">
                {searchQuery ? `No orders match "${searchQuery}".` : 'No active orders. New orders appear here instantly.'}
              </p>
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            visibleColumns.map((col) => {
              const Icon = col.icon;
              const sorted = [...col.list].sort((a, b) => (getStartMs(a) ?? 0) - (getStartMs(b) ?? 0));
              return (
                <section key={col.key} aria-label={col.title} className={`bg-slate-900/40 border border-slate-800/80 border-t-2 ${col.bar} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${col.iconColor}`} />
                      <h2 className="text-sm font-semibold text-slate-200 tracking-tight">{col.title}</h2>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${col.badge}`}>
                      {col.list.length}
                    </span>
                  </div>

                  {sorted.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No orders in {col.title.toLowerCase()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {sorted.map((order) => {
                        const id = order.id || order._id || order.order_id;
                        return (
                          <KdsTicket
                            key={id}
                            order={order}
                            section={col}
                            nowMs={nowMs}
                            onAdvance={readOnly ? null : handleStatusChange}
                            isUpdating={updatingOrderId === id}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

/** "45m" under an hour, otherwise "49h 20m" */
function formatElapsed(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

/**
 * KdsTicket - single order card. Orders waiting 20+ minutes get a "Delayed" tag.
 * Tapping an item marks it done on the line.
 */
function KdsTicket({ order, section, nowMs, onAdvance, isUpdating }) {
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
  const isDelayed = elapsedMin >= 20 && section.key !== 'completed';
  const placedAt = startMs
    ? new Date(startMs).toLocaleString([], {
        // Older orders still open from a previous day show their date too
        ...(new Date(startMs).toDateString() === new Date(nowMs).toDateString() ? {} : { month: 'short', day: 'numeric' }),
        hour: '2-digit',
        minute: '2-digit'
      })
    : (order?.placedTime || '');

  const toggleItem = (index) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const ActionIcon = section.actionIcon;

  return (
    <article
      className={`bg-[#161F30] border border-slate-800/90 border-l-2 ${section.cardAccent} rounded-xl p-3.5 flex flex-col justify-between shadow-md transition hover:-translate-y-0.5`}
      data-order-id={orderId}
      data-order-status={section.key}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{isTakeaway ? 'Takeaway' : `Table ${tableNo}`}</h3>
              {isDelayed && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Delayed
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">#{displayNum}{placedAt ? ` • ${placedAt}` : ''}</p>
            {order?.handledByName && section.key !== 'pending' && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {section.key === 'preparing' ? 'Cooking' : section.key === 'ready' ? 'Prepared' : 'Handled'} by <span className="text-slate-200 font-medium">{order.handledByName}</span>
              </p>
            )}
          </div>

          <div className={`px-2 py-1 rounded-lg font-mono text-xs font-medium flex items-center gap-1 shrink-0 border ${section.timer}`} title={`${elapsedMin} minutes elapsed`}>
            <Timer className="w-3 h-3 opacity-75" />
            <span>{formatElapsed(elapsedMin)}</span>
          </div>
        </div>

        {voiceNoteUrl && (
          <div className="mb-2">
            <AudioPlayer src={voiceNoteUrl} />
          </div>
        )}

        {generalNote && (
          <p className="mb-2 flex items-start gap-1.5 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{generalNote}</span>
          </p>
        )}

        <ul className="space-y-1.5 my-3">
          {items.map((item, index) => {
            const name = item?.name || item?.dish_name || item?.title || 'Item';
            const qty = item?.quantity ?? item?.qty ?? 1;
            const note = item?.notes || item?.note || item?.special_instructions;
            const done = checkedItems.has(index);
            const rawPrice = item?.price ?? item?.unit_price ?? item?.amount;
            const price = typeof rawPrice === 'number' ? rawPrice : null;
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  aria-pressed={done}
                  className={`w-full text-left bg-slate-900/75 border border-slate-800/80 rounded-lg px-2.5 py-2 transition hover:border-slate-700 ${done ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold text-amber-400 shrink-0">{qty}×</span>
                      <span className={`font-medium text-slate-200 truncate ${done ? 'line-through' : ''}`} title={name}>{name}</span>
                    </div>
                    {done ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      price !== null && <span className="font-mono text-[11px] text-slate-400 shrink-0">${price.toFixed(2)}</span>
                    )}
                  </div>
                  {note && <p className="text-[11px] text-slate-400 mt-1 pl-5 italic truncate">Note: {note}</p>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {onAdvance && (
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => onAdvance(orderId, section.nextStatus)}
        className={`w-full mt-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all disabled:opacity-60 ${section.btn}`}
      >
        <ActionIcon className="w-3.5 h-3.5" />
        <span>{isUpdating ? 'Saving...' : section.actionLabel}</span>
      </button>
      )}
    </article>
  );
}
