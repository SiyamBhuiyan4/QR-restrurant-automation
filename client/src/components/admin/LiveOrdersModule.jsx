import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Flame,
  ConciergeBell,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  User,
  UtensilsCrossed,
  Printer,
  ChevronRight,
  ArrowRight,
  Volume2
} from 'lucide-react';
import AudioPlayer from '../AudioPlayer';
import { KITCHEN_STAGE, formatCurrency } from '../../data/adminMockData';

/**
 * LiveOrdersModule Component
 * 
 * Master Kitchen-to-Table Orders Pipeline giving the Admin total visibility
 * and 1-click control over every ticket in the restaurant.
 */
export default function LiveOrdersModule({
  orders = [],
  onAdvanceStage = () => {},
  className = ''
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.kitchenFlowStage !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = String(order.orderNumber || order.id || '').toLowerCase().includes(q);
        const matchesTable = String(order.tableNumber || '').includes(q);
        const matchesCustomer = String(order.customerName || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(order.items) && order.items.some(i => (i.name || '').toLowerCase().includes(q));
        if (!matchesNum && !matchesTable && !matchesCustomer && !matchesItems) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PLACED).length,
      preparing: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PREPARING).length,
      ready: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).length,
      served: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.SERVED).length
    };
  }, [orders]);

  const getStageBadge = (stage) => {
    switch (stage) {
      case KITCHEN_STAGE.PLACED:
        return {
          label: 'Just Placed',
          className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
          nextStage: KITCHEN_STAGE.PREPARING,
          nextLabel: 'Send to Kitchen'
        };
      case KITCHEN_STAGE.PREPARING:
        return {
          label: 'Cooking in Kitchen',
          className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          nextStage: KITCHEN_STAGE.READY_PICKUP,
          nextLabel: 'Mark Food Ready'
        };
      case KITCHEN_STAGE.READY_PICKUP:
        return {
          label: 'Ready for Pickup',
          className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          nextStage: KITCHEN_STAGE.SERVED,
          nextLabel: 'Confirm Served'
        };
      case KITCHEN_STAGE.SERVED:
      default:
        return {
          label: 'Served to Guests',
          className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
          nextStage: null,
          nextLabel: null
        };
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. SUMMARY KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Active Tickets</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-slate-900 dark:text-white">
            {orders.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Cooking Now</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-orange-500">
            {counts.preparing}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ready for Pickup</span>
            <ConciergeBell className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-500">
            {counts.ready}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Delivered Today</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-blue-500">
            {counts.served + 18}
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: KITCHEN_STAGE.PLACED, label: `Placed (${counts.placed})` },
            { id: KITCHEN_STAGE.PREPARING, label: `Cooking (${counts.preparing})` },
            { id: KITCHEN_STAGE.READY_PICKUP, label: `Ready (${counts.ready})` },
            { id: KITCHEN_STAGE.SERVED, label: `Served (${counts.served})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by table or dish..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 3. ORDERS GRID */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No orders match filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try switching to "All" or clearing the search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const badge = getStageBadge(order.kitchenFlowStage);

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Header: Table, Order Number, Time */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        T{order.tableNumber}
                      </span>
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          Table #{order.tableNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {order.orderNumber || order.id} • {order.customerName || 'Guest'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{order.timeElapsedMinutes || 4}m ago</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="my-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border ${badge.className}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Itemized Dishes List */}
                  <div className="space-y-1.5 my-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{item.quantity}x</span>
                          <span className="font-medium truncate max-w-[170px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Voice Note (if attached) */}
                  {order.voiceNoteUrl && (
                    <div className="my-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Customer Voice Note:</span>
                      </div>
                      <AudioPlayer url={order.voiceNoteUrl} />
                    </div>
                  )}
                </div>

                {/* Footer: Total & Advance Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total Bill</div>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {formatCurrency(order.total || order.total_amount || 0)}
                    </div>
                  </div>

                  {badge.nextStage && (
                    <button
                      type="button"
                      onClick={() => onAdvanceStage(order.id, badge.nextStage)}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <span>{badge.nextLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
