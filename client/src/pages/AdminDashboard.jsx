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
  WifiOff
} from 'lucide-react';
import MenuManager from '../components/MenuManager';
import QRBatchGenerator from './QRBatchGenerator';
import { resolveServerUrl, useSocket } from '../context/SocketContext';
import { getPendingOrders, getPendingWaiterCalls } from '../db/indexedDb';

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
    total_menu_items: 0,
    available_menu_items: 0,
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

  const socketContext = useSocket ? useSocket() : null;
  const isSocketConnected = socketContext?.isConnected || false;

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

      // 1. Fetch Stats
      const [statsRes, ordersRes, callsRes] = await Promise.allSettled([
        fetch(`${serverUrl}/api/stats`, { signal: controller.signal }),
        fetch(`${serverUrl}/api/orders?limit=15`, { signal: controller.signal }),
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
      // Calculate local fallback stats
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
        popular_items: []
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
      voice_note_url: o.voice_note_url || null,
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

    // Calculate active tables (unique tables with pending/preparing/ready orders or active calls)
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

  // Initial load and periodic polling every 12 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 12000);
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

  // Resolve a pending waiter call
  const handleResolveWaiterCall = async (callId) => {
    const serverUrl = resolveServerUrl();
    setActiveWaiterCalls(prev => prev.filter(c => c.id !== callId));

    try {
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

  return (
    <div className={`min-h-screen bg-slate-50 text-neutral-900 pb-16 ${className}`}>
      
      {/* =========================================================================
          TOP ADMIN NAVIGATION HEADER
          ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Branding & Role */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neutral-900 to-neutral-700 text-white flex items-center justify-center font-bold shadow-md shadow-neutral-900/15">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight leading-none">
                    SmartDine
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-medium hidden sm:block mt-0.5">
                  Live Operations & Menu Control Center
                </p>
              </div>
            </div>

            {/* Center / Navigation Tabs */}
            <div className="hidden md:flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/60">
              <button
                type="button"
                onClick={() => handleSelectTab('stats')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Stats</span>
                {stats.active_orders > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                    {stats.active_orders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('menu')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'menu'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                <span>Menu Management</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('qr')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-amber-500" />
                <span>QR Codes</span>
              </button>
            </div>

            {/* Right: Quick Links to Customer, KDS, Waiter & Status */}
            <div className="flex items-center gap-2">
              
              {/* Online / Socket Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  !isOfflineMode
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
                title={!isOfflineMode ? 'Server Connected' : 'Operating in offline local cache'}
              >
                {!isOfflineMode ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-medium hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-medium hidden sm:inline">Local Mode</span>
                  </>
                )}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchDashboardData(false)}
                disabled={isRefreshing}
                className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Refresh live data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
              </button>

              {/* Quick Navigation Dropdown / Buttons */}
              <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-neutral-200">
                <a
                  href="/?table=1"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold transition flex items-center gap-1"
                  title="Open Customer Menu (Table 1)"
                >
                  <span>Customer</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>

                <a
                  href="/kds"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold transition flex items-center gap-1"
                  title="Open Kitchen Display System (KDS)"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                  <span>KDS</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>

                <a
                  href="/waiter"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold transition flex items-center gap-1"
                  title="Open Waiter Assistance Panel"
                >
                  <ConciergeBell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Waiter</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>

            </div>
          </div>

          {/* Mobile Tab Navigation Strip */}
          <div className="flex md:hidden items-center justify-around py-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => handleSelectTab('stats')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                activeTab === 'stats' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
              }`}
            >
              Live Stats
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('menu')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                activeTab === 'menu' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
              }`}
            >
              Menu Manager
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('qr')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                activeTab === 'qr' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
              }`}
            >
              QR Codes
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN CONTENT AREA BASED ON TAB
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* TAB 1: LIVE STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Quick Navigation Bar (Banner style) */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Quick Navigation:
                </span>
                <span className="text-xs text-neutral-400 hidden sm:inline">&bull;</span>
                <span className="text-xs text-neutral-600 font-medium">
                  Switch instantly to restaurant operating roles
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <a
                  href="/?table=1"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                  <span>Customer View (Table 1)</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
                <a
                  href="/kds"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shadow-xs shadow-amber-500/20"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen KDS</span>
                  <ExternalLink className="w-3 h-3 text-white/80" />
                </a>
                <a
                  href="/waiter"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                >
                  <ConciergeBell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Waiter Panel</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
            </div>

            {/* 4 PRIMARY STATS METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              
              {/* Card 1: Active Orders */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Active Orders
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight">
                    {stats.active_orders}
                  </span>
                  <span className="text-xs font-semibold text-amber-600">
                    {stats.active_orders === 1 ? 'order live' : 'orders live'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending &amp; kitchen prep</span>
                </p>
              </div>

              {/* Card 2: Daily Sales */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Daily Sales
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-700 tracking-tight">
                    {formatCurrency(stats.today_revenue)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>{stats.today_orders} orders completed today</span>
                </p>
              </div>

              {/* Card 3: Active Tables */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Active Tables
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight">
                    {activeTablesCount}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    seated
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                  <span>Tables actively dining or calling</span>
                </p>
              </div>

              {/* Card 4: Pending Waiter Calls */}
              <div className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition ${
                stats.active_waiter_calls > 0 ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-neutral-200/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Pending Waiter Calls
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    stats.active_waiter_calls > 0 ? 'bg-amber-500 text-white animate-bounce' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    <BellRing className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black tracking-tight ${
                    stats.active_waiter_calls > 0 ? 'text-amber-600' : 'text-neutral-900'
                  }`}>
                    {stats.active_waiter_calls}
                  </span>
                  {stats.active_waiter_calls > 0 && (
                    <span className="text-xs font-bold text-amber-700 animate-pulse">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                  <span>Assistance alerts from tables</span>
                </p>
              </div>

            </div>

            {/* ORDERS STATUS BREAKDOWN CARDS */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">
                Orders Status Pipeline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Pending', count: stats.orders_by_status?.pending || 0, color: 'border-amber-400 text-amber-700 bg-amber-50/50' },
                  { label: 'Preparing', count: stats.orders_by_status?.preparing || 0, color: 'border-blue-400 text-blue-700 bg-blue-50/50' },
                  { label: 'Ready', count: stats.orders_by_status?.ready || 0, color: 'border-emerald-400 text-emerald-700 bg-emerald-50/50' },
                  { label: 'Served', count: stats.orders_by_status?.served || 0, color: 'border-purple-400 text-purple-700 bg-purple-50/50' },
                  { label: 'Completed', count: stats.orders_by_status?.completed || 0, color: 'border-slate-300 text-slate-700 bg-slate-50' },
                  { label: 'Cancelled', count: stats.orders_by_status?.cancelled || 0, color: 'border-rose-300 text-rose-700 bg-rose-50/50' },
                ].map((s) => (
                  <div key={s.label} className={`p-3 rounded-xl border ${s.color}`}>
                    <span className="text-xs font-semibold block">{s.label}</span>
                    <span className="text-2xl font-bold mt-1 block">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DUAL PANELS: RECENT ORDERS & WAITER CALLS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Live Recent Orders Feed */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-neutral-900 text-base">
                      Recent Orders Feed
                    </h3>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    Showing latest {recentOrders.length}
                  </span>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No orders recorded yet today.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 overflow-hidden">
                    {recentOrders.slice(0, 8).map((order) => {
                      const itemCount = Array.isArray(order.items) 
                        ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) 
                        : 0;

                      return (
                        <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-sm">
                                {order.order_number}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-800">
                                Table {order.table_number}
                              </span>
                              {order.voice_note_url && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title="Includes voice note">
                                  <Mic className="w-2.5 h-2.5" />
                                  Voice
                                </span>
                              )}
                              {order.is_offline && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Offline Queue
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 truncate mt-0.5">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'} &bull; {formatTimeAgo(order.created_at)}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-neutral-900 block">
                              {formatCurrency(order.total_amount)}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'preparing'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'served' || order.status === 'completed'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Col: Active Waiter Calls & Popular Items */}
              <div className="space-y-6">
                
                {/* Waiter Calls Box */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-neutral-900 text-sm">
                        Waiter Alerts ({activeWaiterCalls.length})
                      </h3>
                    </div>
                  </div>

                  {activeWaiterCalls.length === 0 ? (
                    <div className="py-8 text-center text-neutral-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                      <p className="text-xs">No pending waiter alerts!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeWaiterCalls.map((call) => (
                        <div
                          key={call.id}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-xs font-bold text-neutral-900 block">
                              Table {call.table_number}
                            </span>
                            <p className="text-xs text-amber-900 font-medium leading-tight">
                              {call.reason}
                            </p>
                            <span className="text-[10px] text-neutral-400 mt-0.5 block">
                              {formatTimeAgo(call.created_at)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleResolveWaiterCall(call.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold border border-neutral-200 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Dishes Box */}
                {stats.popular_items && stats.popular_items.length > 0 && (
                  <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-neutral-900 text-sm">
                        Top Selling Items
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {stats.popular_items.map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-neutral-800 truncate max-w-[170px]">
                            {idx + 1}. {item.name}
                          </span>
                          <span className="font-bold text-neutral-900">
                            {item.total_quantity} sold ({formatCurrency(item.total_sales)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="animate-fadeIn">
            <MenuManager />
          </div>
        )}

        {/* TAB 3: QR CODES */}
        {activeTab === 'qr' && (
          <div className="animate-fadeIn">
            <QRBatchGenerator />
          </div>
        )}

      </main>

    </div>
  );
}
