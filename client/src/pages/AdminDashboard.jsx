import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, 
  UtensilsCrossed, 
  QrCode, 
  TrendingUp, 
  DollarSign, 
  Users, 
  BellRing, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  ChefHat, 
  ConciergeBell, 
  ShoppingBag,
  Sparkles, 
  Layers, 
  Mic, 
  ArrowUpRight, 
  ShieldCheck, 
  Wifi, 
  WifiOff,
  Check,
  X,
  ChevronRight,
  Play,
  Volume2,
  ArrowRight,
  Search,
  Filter
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import MenuManager from '../components/MenuManager';
import QRBatchGenerator from './QRBatchGenerator';
import AudioPlayer from '../components/AudioPlayer';
import { resolveServerUrl, useSocket } from '../context/SocketContext';
import { getPendingOrders, getPendingWaiterCalls } from '../db/indexedDb';
import '../styles/admin.css';

export default function AdminDashboard({ className = '' }) {
  // Navigation tabs: 'stats', 'menu', 'qr'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (['stats', 'menu', 'qr'].includes(tabParam)) {
        return tabParam;
      }
    }
    return 'stats';
  });

  // Sync tab with URL search parameter
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Live Stats State
  const [stats, setStats] = useState({
    active_orders: 0,
    today_orders: 0,
    today_revenue: 0,
    active_waiter_calls: 0,
    total_orders: 0,
    total_revenue: 0,
    total_menu_items: 7,
    available_menu_items: 6,
    orders_by_status: {
      pending: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      completed: 0,
      cancelled: 0
    },
    popular_items: []
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [activeWaiterCalls, setActiveWaiterCalls] = useState([]);
  const [activeTablesCount, setActiveTablesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Status filter for live orders feed: 'all' | 'pending' | 'preparing' | 'ready' | 'served' | 'offline'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const socketContext = useSocket ? useSocket() : null;
  const isSocketConnected = socketContext?.isConnected || false;

  // Convex real-time mutations
  let updateConvexStatus = null;
  let resolveConvexCall = null;
  try {
    updateConvexStatus = useMutation(api.orders.updateOrderStatus);
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Fetch live stats, orders, and waiter calls
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    const serverUrl = resolveServerUrl();

    let serverStats = null;
    let serverOrders = [];
    let serverCalls = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const [statsRes, ordersRes, callsRes] = await Promise.allSettled([
        fetch(`${serverUrl}/api/stats`, { signal: controller.signal }),
        fetch(`${serverUrl}/api/orders?limit=30`, { signal: controller.signal }),
        fetch(`${serverUrl}/api/waiter-calls?status=pending`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        serverStats = await statsRes.value.json();
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const orderData = await ordersRes.value.json();
        serverOrders = Array.isArray(orderData) ? orderData : (orderData.orders || orderData.data || []);
      }

      if (callsRes.status === 'fulfilled' && callsRes.value.ok) {
        const callsData = await callsRes.value.json();
        serverCalls = Array.isArray(callsData) ? callsData : (callsData.calls || callsData.data || []);
      }

      setIsOfflineMode(false);
    } catch (err) {
      console.warn('[AdminDashboard] Fetch error or offline mode:', err.message);
      setIsOfflineMode(true);
    }

    // Check IndexedDB for pending offline items
    let offlineOrders = [];
    let offlineCalls = [];
    try {
      offlineOrders = await getPendingOrders();
      offlineCalls = await getPendingWaiterCalls();
    } catch (_) {}

    // Merge or calculate fallback stats
    if (serverStats) {
      setStats({
        ...serverStats,
        active_orders: (serverStats.active_orders || 0) + offlineOrders.length,
        active_waiter_calls: (serverStats.active_waiter_calls || 0) + offlineCalls.length
      });
    } else {
      const totalRev = offlineOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);
      setStats({
        active_orders: offlineOrders.length,
        today_orders: offlineOrders.length,
        today_revenue: totalRev,
        active_waiter_calls: offlineCalls.length,
        total_orders: offlineOrders.length,
        total_revenue: totalRev,
        total_menu_items: 7,
        available_menu_items: 6,
        orders_by_status: {
          pending: offlineOrders.length,
          preparing: 0,
          ready: 0,
          served: 0,
          completed: 0,
          cancelled: 0
        },
        popular_items: [
          { name: 'Truffle Mushroom Burger', total_quantity: 18, total_sales: 287.82 },
          { name: 'Char-Grilled Ribeye Steak', total_quantity: 12, total_sales: 354.00 },
          { name: 'Artisan Margherita Pizza', total_quantity: 15, total_sales: 270.00 }
        ]
      });
    }

    // Merge recent orders (offline queue at top)
    const normalizedOfflineOrders = offlineOrders.map((o) => ({
      id: `local-${o.localId}`,
      order_number: o.order_number || `QUEUE-${o.localId}`,
      table_number: o.tableNumber || o.table_number || 1,
      status: 'pending_sync',
      total_amount: o.total_amount || o.total || 0,
      created_at: new Date(o.queuedAt || Date.now()).toISOString(),
      items: o.items || [],
      voice_note_url: o.voice_note_url || o.voiceNoteUrl || null,
      is_offline: true
    }));

    const combinedOrders = [...normalizedOfflineOrders, ...serverOrders];
    setRecentOrders(combinedOrders);

    // Merge waiter calls
    const normalizedOfflineCalls = offlineCalls.map((c) => ({
      id: `local-${c.localId}`,
      table_number: c.tableNumber || c.table_number || 1,
      reason: c.reason || 'Assistance requested',
      status: 'pending_sync',
      created_at: new Date(c.queuedAt || Date.now()).toISOString(),
      is_offline: true
    }));

    const combinedCalls = [...normalizedOfflineCalls, ...serverCalls];
    setActiveWaiterCalls(combinedCalls);

    // Calculate active tables
    const tableSet = new Set();
    combinedOrders.forEach(o => {
      if (['pending', 'preparing', 'ready', 'pending_sync'].includes(o.status)) {
        tableSet.add(o.table_number);
      }
    });
    combinedCalls.forEach(c => {
      if (['pending', 'pending_sync'].includes(c.status)) {
        tableSet.add(c.table_number);
      }
    });
    setActiveTablesCount(tableSet.size);

    setLastRefreshedAt(Date.now());
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  // Initial load and periodic polling every 10 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Real-time socket events for live sync
  useEffect(() => {
    if (!socketContext?.on) return;

    const unsubOrderNew = socketContext.on('order:new', () => fetchDashboardData(true));
    const unsubOrderUpdate = socketContext.on('order:update', () => fetchDashboardData(true));
    const unsubWaiterCall = socketContext.on('waiter:call', () => fetchDashboardData(true));
    const unsubWaiterResolve = socketContext.on('waiter:resolve', () => fetchDashboardData(true));

    return () => {
      if (unsubOrderNew) unsubOrderNew();
      if (unsubOrderUpdate) unsubOrderUpdate();
      if (unsubWaiterCall) unsubWaiterCall();
      if (unsubWaiterResolve) unsubWaiterResolve();
    };
  }, [socketContext, fetchDashboardData]);

  // 1-Click Advance Order Status (Pending -> Preparing -> Ready -> Served -> Completed)
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId);

    // Optimistically update recentOrders in UI
    setRecentOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId ? { ...o, status: nextStatus } : o)));
    
    // Optimistically adjust status counts
    setStats(prev => {
      const updated = { ...(prev.orders_by_status || {}) };
      return {
        ...prev,
        orders_by_status: {
          ...updated,
          [nextStatus]: (updated[nextStatus] || 0) + 1
        }
      };
    });

    // 1. Sync with Convex Cloud
    if (updateConvexStatus) {
      try {
        await updateConvexStatus({ orderId: String(orderId), status: nextStatus });
      } catch (cErr) {
        console.warn('[AdminDashboard] Convex status update fallback:', cErr.message);
      }
    }

    // 2. Sync with REST API
    try {
      const serverUrl = resolveServerUrl();
      const res = await fetch(`${serverUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        await fetch(`${serverUrl}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
      }
    } catch (err) {
      console.warn('[AdminDashboard] REST sync error:', err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Resolve a pending waiter call
  const handleResolveWaiterCall = async (callId) => {
    setActiveWaiterCalls(prev => prev.filter(c => c.id !== callId));
    setStats(prev => ({
      ...prev,
      active_waiter_calls: Math.max(0, (prev.active_waiter_calls || 1) - 1)
    }));

    if (resolveConvexCall) {
      try {
        await resolveConvexCall({ callId: String(callId) });
      } catch (_) {}
    }

    try {
      const serverUrl = resolveServerUrl();
      await fetch(`${serverUrl}/api/waiter-calls/${callId}/resolve`, {
        method: 'POST'
      });
    } catch (err) {
      console.warn('[AdminDashboard] Waiter call resolve failed or offline:', err.message);
    }
  };

  // Format currency helper
  const formatCurrency = (val) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    return `$${num.toFixed(2)}`;
  };

  // Format relative timestamp helper
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Filtered orders list based on status tab and search
  const filteredOrders = useMemo(() => {
    return recentOrders.filter(order => {
      // Status filter
      if (statusFilter === 'offline' && !order.is_offline) return false;
      if (statusFilter !== 'all' && statusFilter !== 'offline' && order.status !== statusFilter) return false;

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = String(order.order_number || '').toLowerCase().includes(q);
        const matchesTable = String(order.table_number || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(order.items) && order.items.some(i => (i.name || i.title || '').toLowerCase().includes(q));
        if (!matchesNum && !matchesTable && !matchesItems) return false;
      }

      return true;
    });
  }, [recentOrders, statusFilter, searchQuery]);

  return (
    <div className={`admin-root min-h-screen bg-[#0a0a0c] text-stone-100 relative overflow-x-hidden ${className}`}>
      
      {/* =========================================================================
          LIVE AMBIENT DRIFT ORBS & WARM CULINARY EMBER ATMOSPHERE
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="ambient-orb orb-1 animate-ambient-drift-1" />
        <div className="ambient-orb orb-2 animate-ambient-drift-2" />
        <div className="ambient-orb orb-3 animate-ambient-drift-3" />
        
        {/* Floating Culinary Ember Sparkles */}
        <div className="ember-sparkle sparkle-1" />
        <div className="ember-sparkle sparkle-2" />
        <div className="ember-sparkle sparkle-3" />
        <div className="ember-sparkle sparkle-4" />
        <div className="ember-sparkle sparkle-5" />
        <div className="ember-sparkle sparkle-6" />
        <div className="ember-sparkle sparkle-7" />
        <div className="ember-sparkle sparkle-8" />
      </div>

      {/* =========================================================================
          TOP EXECUTIVE COMMAND HEADER
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0e0e12]/85 backdrop-blur-2xl border-b border-zinc-800 shadow-2xl shadow-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            
            {/* Left: Branding & Role */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] text-white flex items-center justify-center font-bold shadow-lg shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/40">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-none">
                    Smart<span className="text-[#FF5A26]">Dine</span>
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] shadow-xs">
                    Admin Center
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
                  <p className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                    Live Operations &amp; Intelligence Matrix
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Segmented Glowing Navigation Tabs */}
            <div className="hidden md:flex items-center bg-[#161619] p-1 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectTab('stats')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-lg shadow-[#FF5A26]/40 ring-1 ring-[#FF7A45]/60'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Live Telemetry</span>
                {stats.active_orders > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-neutral-950 font-black animate-pulse">
                    {stats.active_orders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('menu')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  activeTab === 'menu'
                    ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-lg shadow-[#FF5A26]/40 ring-1 ring-[#FF7A45]/60'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Menu Management</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('qr')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-lg shadow-[#FF5A26]/40 ring-1 ring-[#FF7A45]/60'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR Codes</span>
              </button>
            </div>

            {/* Right: Quick Links & Live Status */}
            <div className="flex items-center gap-2">
              
              {/* Online / Socket Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition ${
                  !isOfflineMode
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-900/40'
                    : 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-900/40'
                }`}
                title={!isOfflineMode ? 'Server Connected' : 'Operating in offline local cache'}
              >
                {!isOfflineMode ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[11px] font-bold hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold hidden sm:inline">Local Cache</span>
                  </>
                )}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchDashboardData(false)}
                disabled={isRefreshing}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all active:scale-95 cursor-pointer shadow-md"
                title="Refresh live data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF7A45]' : ''}`} />
              </button>

              {/* Quick Navigation Direct Links */}
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <a
                  href="/?table=1"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-800 hover:border-[#FF5A26]/40 transition-all flex items-center gap-1.5 shadow-sm"
                  title="Open Customer Menu (Table 1)"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF7A45]" />
                  <span>Customer</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                <a
                  href="/kds"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                  title="Open Kitchen Display System (KDS)"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>KDS</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <a
                  href="/waiter"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700/80 to-indigo-700/80 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                  title="Open Waiter Assistance Panel"
                >
                  <ConciergeBell className="w-3.5 h-3.5 text-amber-300" />
                  <span>Waiter</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>

            </div>
          </div>

          {/* Mobile Tab Navigation Strip */}
          <div className="flex md:hidden items-center justify-around py-2 border-t border-zinc-800/80 gap-1 bg-[#0e0e12]/60">
            <button
              type="button"
              onClick={() => handleSelectTab('stats')}
              className={`flex-1 py-1.5 text-center text-xs font-black rounded-xl transition ${
                activeTab === 'stats' 
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Telemetry
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('menu')}
              className={`flex-1 py-1.5 text-center text-xs font-black rounded-xl transition ${
                activeTab === 'menu' 
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('qr')}
              className={`flex-1 py-1.5 text-center text-xs font-black rounded-xl transition ${
                activeTab === 'qr' 
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              QR Codes
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN EXECUTIVE DASHBOARD BODY
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 relative z-10">
        
        {/* ==================== TAB 1: LIVE STATS & TELEMETRY ==================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            
            {/* Quick Navigation Roles Bar */}
            <div className="bg-[#120f26]/85 backdrop-blur-2xl rounded-3xl border border-purple-500/25 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
                    Live System Synchronizer
                  </span>
                  <p className="text-xs text-stone-300/80 font-normal">
                    Real-time reactive pipeline with instant sound alerts &amp; voice note playback
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <a
                  href="/?table=1"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#1b1638] hover:bg-purple-900/50 text-purple-200 hover:text-white text-xs font-bold border border-purple-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
                  <span>Customer View</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href="/kds"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-amber-950/40"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen KDS</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
                <a
                  href="/waiter"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-purple-950/40"
                >
                  <ConciergeBell className="w-3.5 h-3.5 text-amber-300" />
                  <span>Waiter Panel</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </div>

            {/* 4 PRIMARY STATS METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              
              {/* Card 1: Active Orders */}
              <div style={{ '--i': 0 }} className="admin-enter admin-lift bg-[#161619]/90 hover:bg-[#1e1e24] backdrop-blur-2xl rounded-3xl border border-zinc-800 hover:border-[#FF5A26]/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:shadow-black/60 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    Active Orders
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF5A26] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5 text-[#FF5A26]" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight flame-text-glow">
                    {stats.active_orders}
                  </span>
                  <span className="text-xs font-bold text-[#FF7A45]">
                    {stats.active_orders === 1 ? 'order live' : 'orders live'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span>P: {stats.orders_by_status?.pending || 0}</span>
                  <span>&bull;</span>
                  <span>Prep: {stats.orders_by_status?.preparing || 0}</span>
                  <span>&bull;</span>
                  <span>Ready: {stats.orders_by_status?.ready || 0}</span>
                </div>
              </div>

              {/* Card 2: Today's Revenue */}
              <div style={{ '--i': 1 }} className="admin-enter admin-lift bg-[#161619]/90 hover:bg-[#1e1e24] backdrop-blur-2xl rounded-3xl border border-zinc-800 hover:border-emerald-500/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:shadow-black/60 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Today's Revenue
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight">
                    {formatCurrency(stats.today_revenue)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-emerald-200/70 font-medium">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{stats.today_orders} completed today</span>
                  </span>
                </div>
              </div>

              {/* Card 3: Active Seated Tables */}
              <div style={{ '--i': 2 }} className="admin-enter admin-lift bg-[#161619]/90 hover:bg-[#1e1e24] backdrop-blur-2xl rounded-3xl border border-zinc-800 hover:border-[#FF5A26]/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:shadow-black/60 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    Table Occupancy
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-[#FF7A45]" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {activeTablesCount}
                  </span>
                  <span className="text-xs font-bold text-[#FF7A45]">
                    / 24 tables seated
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span>Guest dining experience active</span>
                </div>
              </div>

              {/* Card 4: Waiter Summons */}
              <div style={{ '--i': 3 }} className={`admin-enter admin-lift backdrop-blur-2xl rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 group ${
                stats.active_waiter_calls > 0 
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-400/50' 
                  : 'bg-[#161619]/90 hover:bg-[#1e1e24] border-zinc-800 hover:border-zinc-700'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Waiter Summons
                  </span>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform ${
                    stats.active_waiter_calls > 0 
                      ? 'bg-amber-500 text-neutral-950 animate-bounce' 
                      : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 group-hover:scale-110'
                  }`}>
                    <BellRing className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    stats.active_waiter_calls > 0 ? 'text-amber-400' : 'text-white'
                  }`}>
                    {stats.active_waiter_calls}
                  </span>
                  {stats.active_waiter_calls > 0 ? (
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider animate-pulse">
                      Action Needed
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-stone-400">
                      All clear
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span>Table service alerts</span>
                </div>
              </div>

            </div>

            {/* ORDERS STATUS PIPELINE STRIP */}
            <div style={{ '--i': 4 }} className="admin-enter bg-[#161619]/90 backdrop-blur-2xl rounded-3xl border border-zinc-800 p-5 shadow-xl shadow-black/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF5A26]" />
                  <span>Orders Lifecycle Pipeline</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-medium">
                  Click any stage to filter below
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'pending', label: 'Pending', count: stats.orders_by_status?.pending || 0, color: 'border-amber-500/40 bg-amber-950/20 text-amber-300' },
                  { key: 'preparing', label: 'Preparing', count: stats.orders_by_status?.preparing || 0, color: 'border-[#FF5A26]/40 bg-[#FF5A26]/10 text-[#FF7A45]' },
                  { key: 'ready', label: 'Ready', count: stats.orders_by_status?.ready || 0, color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300' },
                  { key: 'served', label: 'Served', count: stats.orders_by_status?.served || 0, color: 'border-blue-500/40 bg-blue-950/20 text-blue-300' },
                  { key: 'completed', label: 'Completed', count: stats.orders_by_status?.completed || 0, color: 'border-zinc-700/60 bg-zinc-900/40 text-zinc-300' },
                  { key: 'cancelled', label: 'Cancelled', count: stats.orders_by_status?.cancelled || 0, color: 'border-rose-500/40 bg-rose-950/20 text-rose-300' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${s.color} ${
                      statusFilter === s.key ? 'ring-2 ring-[#FF7A45] scale-[1.03] shadow-lg shadow-[#FF5A26]/20' : 'hover:scale-[1.01]'
                    }`}
                  >
                    <span className="text-xs font-extrabold block tracking-tight">{s.label}</span>
                    <span className="text-2xl font-black mt-1 block">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* DUAL PANELS: RECENT ORDERS FEED & WAITER CALLS / TOP DISHES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left 8 Cols: Interactive Live Orders Feed */}
              <div style={{ '--i': 5 }} className="admin-enter lg:col-span-8 bg-[#161619]/90 backdrop-blur-2xl rounded-3xl border border-zinc-800 p-5 sm:p-6 shadow-xl shadow-black/40 space-y-5">
                
                {/* Header with Search and Filter Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-5 h-5 text-[#FF5A26]" />
                    <div>
                      <h3 className="font-black text-white text-base sm:text-lg tracking-tight">
                        Live Order Operations Feed
                      </h3>
                      <p className="text-xs text-zinc-400 font-medium">
                        Advance orders, inspect guest voice notes &amp; table requests
                      </p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search order # or table..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#101013] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A26]"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="admin-scroll-x flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'pending', 'preparing', 'ready', 'served', 'offline'].map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setStatusFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                        statusFilter === filterKey
                          ? 'flame-gradient-btn text-white shadow-md shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/60'
                          : 'bg-[#101013] text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-zinc-800'
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                  <div className="admin-empty py-16 px-4 text-center text-zinc-500">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40 text-zinc-400" />
                    <p className="text-sm font-bold text-stone-200">No orders match this filter.</p>
                    <p className="text-xs text-zinc-500 mt-1">New incoming orders from guests will appear here in real-time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.slice(0, 10).map((order) => {
                      const itemCount = Array.isArray(order.items) 
                        ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) 
                        : 0;
                      
                      const voiceUrl = order.voice_note_url || order.voiceNoteUrl || null;
                      const isUpdating = updatingOrderId === order.id;

                      return (
                        <div 
                          key={order.id} 
                          className="bg-[#121215]/90 hover:bg-[#18181d] backdrop-blur-xl border border-zinc-800 hover:border-[#FF5A26]/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3"
                        >
                          {/* Order Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm sm:text-base tracking-tight">
                                {order.order_number}
                              </span>
                              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#FF5A26]/15 text-[#FF7A45] border border-[#FF5A26]/30">
                                Table {order.table_number}
                              </span>
                              {order.is_offline && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                  Offline Sync
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-stone-400 font-medium">
                                {formatTimeAgo(order.created_at)}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                order.status === 'ready'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : order.status === 'preparing'
                                  ? 'bg-[#FF5A26]/20 text-[#FF7A45] border border-[#FF5A26]/40'
                                  : order.status === 'served' || order.status === 'completed'
                                  ? 'bg-stone-900/80 text-stone-300 border border-stone-600/40'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>

                          {/* Order Items Breakdown */}
                          <div className="space-y-1.5">
                            {Array.isArray(order.items) && order.items.map((item, idx) => (
                              <div key={idx} className="flex items-baseline justify-between text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-[#FF5A26]/15 text-[#FF7A45] font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {item.quantity || 1}×
                                  </span>
                                  <span className="font-semibold text-stone-200">
                                    {item.name || item.title}
                                  </span>
                                  {item.note && (
                                    <span className="text-[11px] text-[#FF7A45] bg-[#FF5A26]/10 border border-[#FF5A26]/25 px-2 py-0.5 rounded-md italic">
                                      "{item.note}"
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-stone-300">
                                  {formatCurrency((parseFloat(item.price) || 0) * (item.quantity || 1))}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Voice Note Player if Customer Left Voice Instructions */}
                          {voiceUrl && (
                            <div className="mt-3 pt-3 border-t border-zinc-800/80">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A45] mb-2">
                                <Mic className="w-3.5 h-3.5 text-[#FF5A26] animate-pulse" />
                                <span>Guest Voice Special Instruction</span>
                              </div>
                              <AudioPlayer src={voiceUrl} title="Voice Note" />
                            </div>
                          )}

                          {/* Actions & Total */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                            <div>
                              <span className="text-xs text-stone-400 block font-medium">Total Bill</span>
                              <span className="text-base sm:text-lg font-black text-emerald-400">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>

                            {/* 1-Click Status Progression Buttons */}
                            <div className="flex items-center gap-2">
                              {order.status === 'pending' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                  className="px-3 py-1.5 rounded-xl flame-gradient-btn text-white text-xs font-black shadow-md shadow-[#FF5A26]/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span>Start Cooking</span>
                                </button>
                              )}

                              {order.status === 'preparing' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-900/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Order Ready</span>
                                </button>
                              )}

                              {order.status === 'ready' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-900/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                  <ConciergeBell className="w-3.5 h-3.5" />
                                  <span>Mark Served</span>
                                </button>
                              )}

                              {order.status === 'served' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                  className="px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Complete Order</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right 4 Cols: Waiter Station & Gourmet Best Sellers */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Active Waiter Summons Box */}
                <div style={{ '--i': 6 }} className="admin-enter bg-[#120f26]/85 backdrop-blur-2xl rounded-3xl border border-purple-500/25 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-purple-500/15">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-400" />
                      <h3 className="font-black text-white text-sm">
                        Waiter Summons ({activeWaiterCalls.length})
                      </h3>
                    </div>
                  </div>

                  {activeWaiterCalls.length === 0 ? (
                    <div className="admin-empty py-8 px-4 text-center text-purple-300/60">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-stone-200">No pending table alerts!</p>
                      <p className="text-[11px] text-purple-300/60 mt-0.5">All dining guests are attended to.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeWaiterCalls.map((call) => (
                        <div
                          key={call.id}
                          className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-2 shadow-xs"
                        >
                          <div>
                            <span className="text-xs font-black text-amber-300 block">
                              Table {call.table_number}
                            </span>
                            <p className="text-xs text-stone-200 font-medium leading-tight mt-0.5">
                              {call.reason}
                            </p>
                            <span className="text-[10px] text-stone-400 mt-1 block">
                              {formatTimeAgo(call.created_at)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleResolveWaiterCall(call.id)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs transition active:scale-95 cursor-pointer shadow-sm shrink-0"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Selling Gourmet Dishes */}
                {stats.popular_items && stats.popular_items.length > 0 && (
                  <div style={{ '--i': 7 }} className="admin-enter bg-[#120f26]/85 backdrop-blur-2xl rounded-3xl border border-purple-500/25 p-5 shadow-xl space-y-3">
                    <div className="flex items-center gap-2 pb-3 border-b border-purple-500/15">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className="font-black text-white text-sm">
                        Top Selling Gourmet Dishes
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {stats.popular_items.map((item, idx) => (
                        <div key={item.name || idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#191438]/60 border border-purple-500/15">
                          <span className="font-bold text-stone-200 truncate max-w-[160px]">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="font-black text-purple-300">
                            {item.total_quantity} sold &bull; {formatCurrency(item.total_sales)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Server Network & Cloud Matrix */}
                <div style={{ '--i': 8 }} className="admin-enter bg-[#120f26]/85 backdrop-blur-2xl rounded-3xl border border-purple-500/25 p-5 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-purple-500/15">
                    <Wifi className="w-4 h-4 text-purple-400" />
                    <h3 className="font-black text-white text-sm">
                      Sync Architecture
                    </h3>
                  </div>
                  <div className="space-y-2 text-stone-300/80">
                    <div className="flex items-center justify-between">
                      <span>Cloud Convex Sync:</span>
                      <span className="font-bold text-emerald-400">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Local SQLite Store:</span>
                      <span className="font-bold text-emerald-400">Synced</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Socket Stream:</span>
                      <span className="font-bold text-emerald-400">{isSocketConnected ? 'Connected' : 'Standby'}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 2: MENU MANAGEMENT ==================== */}
        {activeTab === 'menu' && (
          <div className="animate-fadeIn">
            <MenuManager />
          </div>
        )}

        {/* ==================== TAB 3: QR CODE STUDIO ==================== */}
        {activeTab === 'qr' && (
          <div className="animate-fadeIn">
            <QRBatchGenerator />
          </div>
        )}

      </main>

    </div>
  );
}
