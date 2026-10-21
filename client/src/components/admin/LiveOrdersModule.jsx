import React, { useState, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Clock,
  Flame,
  ConciergeBell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  DollarSign,
  User,
  UtensilsCrossed,
  Printer,
  ChevronRight,
  ArrowRight,
  Volume2,
  Sparkles,
  X,
  Layers,
  Check,
  RotateCcw,
  Receipt,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import AudioPlayer from '../AudioPlayer';
import '../../styles/admin-tables.css';
import { KITCHEN_STAGE, formatCurrency } from '../../data/adminMockData';

/**
 * Robust Currency Formatter for Bangladesh Taka (৳) and international fallback.
 * Renders prominent values like ৳1,250, ৳57.20 cleanly.
 */
export function formatOrderCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '৳0';
  if (typeof amount === 'string') {
    if (amount.startsWith('৳')) return amount;
    if (amount.startsWith('$')) return `৳${amount.slice(1)}`;
    const parsed = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(parsed)) {
      return `৳${parsed.toLocaleString('en-US', {
        minimumFractionDigits: parsed % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
      })}`;
    }
    return amount;
  }
  if (typeof amount === 'number') {
    return `৳${amount.toLocaleString('en-US', {
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    })}`;
  }
  return '৳0';
}

/** Ordered kitchen pipeline shown as a step track on every ticket. */
const PIPELINE_STEPS = [
  { num: 1, short: 'Placed', label: 'Step 1: Just placed' },
  { num: 2, short: 'Cooking', label: 'Step 2: Cooking in kitchen' },
  { num: 3, short: 'Ready', label: 'Step 3: Ready for pickup' },
  { num: 4, short: 'Served', label: 'Step 4: Served to guests' }
];

/**
 * Stage configuration mapping each kitchen stage to visual cues,
 * progression sequence, next actions, and tactile button styles.
 */
const STAGE_CONFIG = {
  [KITCHEN_STAGE.PLACED]: {
    step: 1,
    label: 'Just Placed',
    accentColor: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse',
    topHighlight: 'from-amber-500/25 via-amber-500/5 to-transparent',
    cardBorder: 'hover:border-amber-500/40',
    nextStage: KITCHEN_STAGE.PREPARING,
    nextLabel: 'Send to Kitchen',
    btnGradient: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
    nextIcon: ArrowRight
  },
  [KITCHEN_STAGE.PREPARING]: {
    step: 2,
    label: 'Cooking in Kitchen',
    accentColor: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    dotClass: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse',
    topHighlight: 'from-orange-500/25 via-orange-500/5 to-transparent',
    cardBorder: 'hover:border-orange-500/40',
    nextStage: KITCHEN_STAGE.READY_PICKUP,
    nextLabel: 'Mark Food Ready',
    btnGradient: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
    nextIcon: ConciergeBell
  },
  [KITCHEN_STAGE.READY_PICKUP]: {
    step: 3,
    label: 'Ready for Pickup',
    accentColor: 'emerald',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse',
    topHighlight: 'from-emerald-500/25 via-emerald-500/5 to-transparent',
    cardBorder: 'hover:border-emerald-500/40',
    nextStage: KITCHEN_STAGE.SERVED,
    nextLabel: 'Confirm Served',
    btnGradient: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
    nextIcon: Check
  },
  [KITCHEN_STAGE.SERVED]: {
    step: 4,
    label: 'Served to Guests',
    accentColor: 'blue',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dotClass: 'bg-slate-400 shadow-none',
    topHighlight: 'from-blue-500/15 via-slate-500/5 to-transparent',
    cardBorder: 'hover:border-slate-500/40',
    nextStage: null,
    nextLabel: null,
    btnGradient: null,
    nextIcon: null
  }
};

/**
 * Calculates elapsed minutes from timestamp or order property.
 */
function getElapsedMinutes(order) {
  if (typeof order.timeElapsedMinutes === 'number') {
    return order.timeElapsedMinutes;
  }
  const dateStr = order.created_at || order.createdAt || order.timestamp;
  if (dateStr) {
    const orderTime = new Date(dateStr).getTime();
    if (!isNaN(orderTime)) {
      return Math.max(0, Math.floor((Date.now() - orderTime) / 60000));
    }
  }
  return 4;
}

/**
 * Formats elapsed minutes into human friendly time string.
 */
function formatElapsed(mins) {
  if (mins <= 0) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m ago`;
}

/**
 * LiveOrdersModule Component
 * 
 * Commercial-grade Kitchen-to-Table Orders Pipeline giving restaurant administrators,
 * head chefs, and floor managers high-visibility control over active orders.
 */
export default function LiveOrdersModule({
  orders = [],
  onAdvanceStage = () => {},
  className = ''
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency' | 'newest' | 'table' | 'bill'
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);

  // Synchronize counts across pipeline stages
  const counts = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PLACED).length,
      preparing: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PREPARING).length,
      ready: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).length,
      served: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.SERVED).length
    };
  }, [orders]);

  // Total active non-served tickets
  const totalActiveNonServed = useMemo(() => {
    return counts.placed + counts.preparing + counts.ready;
  }, [counts]);

  // Filter and sort tickets
  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
      if (statusFilter !== 'all' && order.kitchenFlowStage !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = String(order.orderNumber || order.id || '').toLowerCase().includes(q);
        const matchesTable = String(order.tableNumber || '').includes(q);
        const matchesCustomer = String(order.customerName || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(order.items) && order.items.some(i => (i.name || '').toLowerCase().includes(q));
        if (!matchesNum && !matchesTable && !matchesCustomer && !matchesItems) return false;
      }
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      const elapsedA = getElapsedMinutes(a);
      const elapsedB = getElapsedMinutes(b);

      if (sortBy === 'urgency') {
        // Longest waiting first (higher elapsed time first)
        return elapsedB - elapsedA;
      }
      if (sortBy === 'newest') {
        // Freshest tickets first
        return elapsedA - elapsedB;
      }
      if (sortBy === 'table') {
        return Number(a.tableNumber || 0) - Number(b.tableNumber || 0);
      }
      if (sortBy === 'bill') {
        const billA = Number(a.total || a.total_amount || 0);
        const billB = Number(b.total || b.total_amount || 0);
        return billB - billA;
      }
      return 0;
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Helper to extract voice note url
  const getVoiceUrl = (order) => {
    return order.voiceNoteUrl || order.voice_note_url || order.voice_url || order.audio_url || (typeof order.voiceNote === 'string' ? order.voiceNote : null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =======================================================================
          1. TOP KPI METRICS CARDS (4 Glassmorphic Glow Cards)
          ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Active Tickets */}
        <div className="relative group overflow-hidden admin-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Total Active
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {totalActiveNonServed}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40 shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Live Orders Feed
            </span>
            <span className="text-slate-400 font-medium">
              {orders.length} total tickets
            </span>
          </div>
        </div>

        {/* Card 2: Cooking Now */}
        <div className="relative group overflow-hidden admin-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/40 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Cooking Now
              </span>
              <div className="text-3xl font-black text-orange-500 dark:text-orange-400 mt-1 tracking-tight">
                {counts.preparing}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-orange-400/40 shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Kitchen Fire Line
            </span>
            <span className="text-slate-400 font-medium">
              Active prep
            </span>
          </div>
        </div>

        {/* Card 3: Ready for Pickup */}
        <div className="relative group overflow-hidden admin-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Ready for Pickup
              </span>
              <div className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-1 tracking-tight">
                {counts.ready}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/40 shrink-0 group-hover:scale-105 transition-transform">
              <ConciergeBell className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Plated at Pass
            </span>
            <span className="text-slate-400 font-medium">
              Awaiting server
            </span>
          </div>
        </div>

        {/* Card 4: Delivered Today */}
        <div className="relative group overflow-hidden admin-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/40 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Delivered Today
              </span>
              <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 tracking-tight">
                {counts.served + 18}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/40 shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Completed &amp; Billed
            </span>
            <span className="text-slate-400 font-medium">
              100% fulfill rate
            </span>
          </div>
        </div>

      </div>

      {/* =======================================================================
          2. FILTER & SEARCH TOOLBAR (Sleek tab bar + Search + Sort)
          ======================================================================= */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Sleek Tab Bar for Status Filtering */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              {
                id: 'all',
                label: 'All Orders',
                count: counts.all,
                activeClass: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md',
                dotClass: 'bg-slate-400'
              },
              {
                id: KITCHEN_STAGE.PLACED,
                label: 'Placed',
                count: counts.placed,
                activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400',
                dotClass: 'bg-amber-400'
              },
              {
                id: KITCHEN_STAGE.PREPARING,
                label: 'Cooking',
                count: counts.preparing,
                activeClass: 'bg-orange-500 text-white shadow-md shadow-orange-500/20 ring-1 ring-orange-400',
                dotClass: 'bg-orange-400'
              },
              {
                id: KITCHEN_STAGE.READY_PICKUP,
                label: 'Ready',
                count: counts.ready,
                activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-400',
                dotClass: 'bg-emerald-400'
              },
              {
                id: KITCHEN_STAGE.SERVED,
                label: 'Served',
                count: counts.served,
                activeClass: 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-400',
                dotClass: 'bg-blue-400'
              }
            ].map(tab => {
              const isActive = statusFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? tab.activeClass
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : tab.dotClass}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                      isActive
                        ? 'bg-black/20 dark:bg-white/20 text-current'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 lg:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table #, customer, order #..."
                className="w-full pl-10 pr-9 py-2 rounded-2xl text-xs font-semibold border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3.5 py-2 pr-8 text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer transition"
                title="Sort order tickets"
              >
                <option value="urgency">Wait: Longest First</option>
                <option value="newest">Fresh: Newest First</option>
                <option value="table">Table Number</option>
                <option value="bill">Bill: Highest First</option>
              </select>
              <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Search / Filter Subtitle Bar */}
        {(searchQuery.trim() || statusFilter !== 'all') && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">
              Found <strong className="text-slate-900 dark:text-white font-bold">{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'ticket' : 'tickets'} matching criteria
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* =======================================================================
          3. ORDERS CARD GRID (Commercial-Grade Restaurant Pass Cards)
          ======================================================================= */}
      {filteredOrders.length === 0 ? (
        <div className="admin-empty py-14 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No orders found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no tickets matching your current filter &quot;{statusFilter}&quot; or search query &quot;{searchQuery}&quot;.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            Show All Active Orders
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const stageConfig = STAGE_CONFIG[order.kitchenFlowStage] || STAGE_CONFIG[KITCHEN_STAGE.PLACED];
            const elapsed = getElapsedMinutes(order);
            const voiceUrl = getVoiceUrl(order);
            const NextIcon = stageConfig.nextIcon;

            // Urgency styling based on elapsed wait time
            const isUrgentCritical = elapsed >= 20 && order.kitchenFlowStage !== KITCHEN_STAGE.SERVED;
            const isUrgentModerate = elapsed >= 10 && elapsed < 20 && order.kitchenFlowStage !== KITCHEN_STAGE.SERVED;

            return (
              <div
                key={order.id}
                className={`group relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-slate-950/20 transition-all duration-300 flex flex-col justify-between overflow-hidden ${stageConfig.cardBorder}`}
              >
                {/* Top Subtle Ambient Gradient Glow based on stage */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stageConfig.topHighlight}`}
                />

                <div>
                  {/* ---------------- CARD HEADER ---------------- */}
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      {/* Large Vibrant Table Pill (e.g. T4) */}
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-sm shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                        T{order.tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                            Table #{order.tableNumber}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {order.orderNumber || order.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px] font-bold text-slate-700 dark:text-slate-300">
                            {order.customerName || 'Zahirul Haque'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Elapsed Time Chip */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border transition-colors shrink-0 ${
                        isUrgentCritical
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                          : isUrgentModerate
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title={`Placed ${elapsed} minutes ago`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatElapsed(elapsed)}</span>
                    </div>
                  </div>

                  {/* ---------------- STAGE PIPELINE & STATUS BADGE ---------------- */}
                  <div className="py-3 flex items-center justify-between gap-2">
                    {/* Radiant Pill with Glowing Pulse Dot */}
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-black border tracking-wide ${stageConfig.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${stageConfig.dotClass}`} />
                      <span>{stageConfig.label}</span>
                    </span>

                    {/* 4-Step Pipeline Dots Progress Bar */}
                    <ol className="flex items-center gap-1" aria-label={`Stage ${stageConfig.step} of 4`}>
                      {PIPELINE_STEPS.map(step => {
                        const isCompleted = step.num < stageConfig.step;
                        const isCurrent = step.num === stageConfig.step;

                        return (
                          <li
                            key={step.num}
                            title={step.label}
                            className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                              isCurrent
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15'
                                : isCompleted
                                ? 'text-emerald-600/70 dark:text-emerald-400/70'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrent || isCompleted ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />
                            <span className="hidden sm:inline">{step.short}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* ---------------- ITEM LIST: MODERN RECEIPT BREAKDOWN ---------------- */}
                  <div className="space-y-2 bg-slate-50/90 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span>Item Breakdown</span>
                      <span>Price</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              {/* Quantity Pill (1x, 2x) */}
                              <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                                {item.quantity}x
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-black text-slate-900 dark:text-white shrink-0">
                              {formatOrderCurrency(item.price * item.quantity)}
                            </span>
                          </div>

                          {/* Item Custom Instructions Note (if present) */}
                          {item.notes && (
                            <div className="ml-8 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 italic flex items-center gap-1.5">
                              <UtensilsCrossed className="w-3 h-3 shrink-0 text-amber-500" />
                              <span className="truncate">&quot;{item.notes}&quot;</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ---------------- CUSTOMER VOICE NOTE (IF ATTACHED) ---------------- */}
                  {voiceUrl && (
                    <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/25 shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                          <Volume2 className="w-4 h-4 animate-pulse text-amber-500" />
                          <span>Customer Voice Note:</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Voice Memo
                        </span>
                      </div>
                      <AudioPlayer url={voiceUrl} title={`Table #${order.tableNumber} Memo`} />
                    </div>
                  )}
                </div>

                {/* ---------------- CARD FOOTER: PROMINENT TOTAL & ADVANCE BUTTON ---------------- */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 mt-4">
                  {/* Left: Total Bill Display */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Total Bill
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatOrderCurrency(order.total || order.total_amount || 0)}
                    </div>
                  </div>

                  {/* Right Actions: Print Receipt Preview & Advance Button */}
                  <div className="flex items-center gap-2">
                    {/* Quick Print/Receipt Preview Button */}
                    <button
                      type="button"
                      onClick={() => setActiveReceiptModal(order)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition active:scale-95 cursor-pointer"
                      title="Inspect Kitchen Ticket & Print"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>

                    {/* Radiant Tactile Advance Stage Button */}
                    {stageConfig.nextStage ? (
                      <button
                        type="button"
                        onClick={() => onAdvanceStage(order.id, stageConfig.nextStage)}
                        className={`admin-focusable group/btn px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer ${stageConfig.btnGradient}`}
                      >
                        <span>{stageConfig.nextLabel}</span>
                        {NextIcon && (
                          <NextIcon className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:scale-110 transition-transform" />
                        )}
                      </button>
                    ) : (
                      <span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Completed ✓</span>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* =======================================================================
          4. MODAL: THERMAL RECEIPT & KITCHEN PASS PREVIEW
          ======================================================================= */}
      {activeReceiptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveReceiptModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setActiveReceiptModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Kitchen Pass Ticket
              </h3>
              <p className="text-xs text-slate-500">
                Table #{activeReceiptModal.tableNumber} &bull; {activeReceiptModal.orderNumber || activeReceiptModal.id}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Customer: <strong className="text-slate-700 dark:text-slate-300">{activeReceiptModal.customerName || 'Zahirul Haque'}</strong>
              </p>
            </div>

            {/* Receipt Items Breakdown */}
            <div className="py-4 space-y-2.5 max-h-60 overflow-y-auto">
              {activeReceiptModal.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {item.quantity}x
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatOrderCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatOrderCurrency(activeReceiptModal.subtotal || (activeReceiptModal.total ? activeReceiptModal.total * 0.9 : 0))}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>VAT / Tax (10%)</span>
                <span>{formatOrderCurrency(activeReceiptModal.tax || (activeReceiptModal.total ? activeReceiptModal.total * 0.1 : 0))}</span>
              </div>
              <div className="flex items-center justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatOrderCurrency(activeReceiptModal.total || activeReceiptModal.total_amount || 0)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Kitchen Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
