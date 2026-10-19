import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  ConciergeBell,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Phone,
  ArrowRight,
  Eye,
  Printer,
  Send,
  BellRing,
  Volume2,
  Mic,
  DollarSign,
  Users,
  Layers,
  ChevronDown,
  RefreshCw,
  Info,
  Maximize2,
  Flame,
  ShieldCheck,
  MapPin,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

import {
  TABLE_STATUS,
  TABLE_LOCATION,
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS,
  KITCHEN_STAGE,
  ISSUE_SEVERITY,
  ISSUE_STATUS,
  mockTables as defaultMockTables,
  mockEmployees as defaultMockEmployees,
  mockLiveOrders as defaultMockLiveOrders,
  mockCustomerNotes as defaultMockCustomerNotes
} from '../../data/adminMockData';

import AudioPlayer from '../AudioPlayer';

/**
 * High-fidelity restaurant desk calling chime synthesizer using Web Audio API.
 * Synthesizes a crisp, elegant brass notification ping. Works 100% offline.
 */
function playChimeSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    
    // Primary chime 880 Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(860, now + 0.6);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Harmonic bell shimmer 1760 Hz (A6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now);
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.4);
  } catch (_) {}
}

/**
 * 4-Stage Kitchen-to-Employee Pipeline Definition
 */
export const ORDER_PIPELINE_STAGES = [
  {
    key: KITCHEN_STAGE.PLACED,
    label: 'Order Placed',
    shortLabel: 'Placed',
    description: 'Ticket received from guest app / terminal',
    icon: Clock,
    color: 'amber'
  },
  {
    key: KITCHEN_STAGE.PREPARING,
    label: 'Kitchen Preparing',
    shortLabel: 'Cooking',
    description: 'Executive culinary team preparing dish',
    icon: Flame,
    color: 'orange'
  },
  {
    key: KITCHEN_STAGE.READY_PICKUP,
    label: 'Ready for Pickup (Employee Notified)',
    shortLabel: 'Food Ready',
    description: 'Plated hot at kitchen pass • Server alerted',
    icon: ConciergeBell,
    color: 'emerald'
  },
  {
    key: KITCHEN_STAGE.SERVED,
    label: 'Served',
    shortLabel: 'Served',
    description: 'Delivered to dining guests at table',
    icon: CheckCircle2,
    color: 'blue'
  }
];

// Fallback seed order for Table 4 so that the initial counts are exactly:
// Available (4), Order Running (5), Ready in Kitchen (2), Assistance / Issue (1)
const INITIAL_TABLE_4_ORDER = {
  id: 'ord-107',
  orderNumber: '#1048',
  tableNumber: 4,
  customerName: 'Zahirul Haque',
  timeElapsedMinutes: 8,
  timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  items: [
    { id: 'itm-18', name: 'Smoked Wagyu Sliders', quantity: 2, price: 16.50, notes: 'Medium well, no pickles' },
    { id: 'itm-19', name: 'Truffle Mac & Cheese', quantity: 1, price: 11.50 },
    { id: 'itm-20', name: 'Virgin Berry Mojito', quantity: 2, price: 6.50 }
  ],
  subtotal: 57.50,
  tax: 5.75,
  total: 63.25,
  kitchenFlowStage: KITCHEN_STAGE.PLACED,
  assignedEmployeeId: 3
};

/**
 * LiveTablesModule Component
 * 
 * Module B: Live Orders & Table Tracking Section
 * 
 * Features:
 * 1. Visual Table Grid: All 12 tables with live filter pills (All: 12, Available: 4, Running: 5, Ready: 2, Assistance: 1).
 * 2. Detailed Table Cards:
 *    - Available: Soft slate / neutral emerald
 *    - Order Running: Amber #f59e0b (bg #fef3c7)
 *    - Food Ready in Kitchen: Emerald Green #10b981 (bg #d1fae5)
 *    - Customer Call / Issue: Crimson Red #ef4444 (bg #fee2e2) with subtle pulsing glow.
 *    - Assigned Employee badge (avatar, name, role) with interactive reassign selector.
 *    - Live Order Summary (items count, preview with quantities & prices, total bill, elapsed time).
 * 3. Kitchen-to-Employee Stepper / Progress Bar (exact 4-stage pipeline with 1-click stage advancement).
 * 4. Action Toolbar on each card:
 *    - 1-Click "Dispatch / Notify Employee"
 *    - "View Order Receipt / Modal"
 *    - "Clear / Reset Table" when served
 *    - Prominent "Handle Issue" Crimson button for assistance requests
 * 5. Modal to view full order breakdown (items, notes, voice player, timestamps, employee assignment, printable invoice).
 */
export default function LiveTablesModule({
  tables: propTables,
  employees: propEmployees,
  orders: propOrders,
  customerNotes: propCustomerNotes,
  onUpdateTableStatus,
  onAdvanceOrderStage,
  onNotifyEmployee,
  onResetTable,
  onResolveIssue,
  onSelectReportsTab
}) {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT (Self-contained with sync back to parent handlers)
  // ---------------------------------------------------------------------------

  // Initialize 12 tables ensuring exact initial distribution:
  // Available: 4 (T3, T6, T8, T11)
  // Order Running: 5 (T1, T4, T5, T10, T12)
  // Ready in Kitchen: 2 (T2, T7)
  // Assistance / Issue: 1 (T9)
  const [tables, setTables] = useState(() => {
    if (propTables && Array.isArray(propTables) && propTables.length > 0) {
      return propTables;
    }
    const base = defaultMockTables ? JSON.parse(JSON.stringify(defaultMockTables)) : [];
    // Ensure Table 4 is set to ORDER_RUNNING and Table 9 is set to NEED_ASSISTANCE
    return base.map(t => {
      if (t.tableNumber === 4) {
        return {
          ...t,
          status: TABLE_STATUS.ORDER_RUNNING,
          assignedEmployeeId: 3,
          currentOrderId: 'ord-107'
        };
      }
      if (t.tableNumber === 9) {
        return {
          ...t,
          status: TABLE_STATUS.NEED_ASSISTANCE,
          assignedEmployeeId: 3,
          currentOrderId: null
        };
      }
      return t;
    });
  });

  const [employees, setEmployees] = useState(() => {
    return propEmployees && Array.isArray(propEmployees) ? propEmployees : defaultMockEmployees || [];
  });

  const [orders, setOrders] = useState(() => {
    if (propOrders && Array.isArray(propOrders) && propOrders.length > 0) {
      return propOrders;
    }
    const base = defaultMockLiveOrders ? JSON.parse(JSON.stringify(defaultMockLiveOrders)) : [];
    // Include Table 4 order if not already present
    if (!base.some(o => o.tableNumber === 4)) {
      base.push(INITIAL_TABLE_4_ORDER);
    }
    return base;
  });

  const [customerNotes, setCustomerNotes] = useState(() => {
    return propCustomerNotes && Array.isArray(propCustomerNotes)
      ? propCustomerNotes
      : defaultMockCustomerNotes || [];
  });

  // UI Filters & View Controls
  // Active Filter: 'all' | 'available' | 'order_running' | 'ready_in_kitchen' | 'need_assistance'
  const [activeFilter, setActiveFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all'); // 'all' | 'Main Hall' | 'Patio' | 'Window'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'compact'

  // Modals & Active Selections
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [activeIssueModal, setActiveIssueModal] = useState(null);
  const [activeEmployeeDropdownTableId, setActiveEmployeeDropdownTableId] = useState(null);

  // Temporary Toast Feedback
  const [notificationToast, setNotificationToast] = useState(null);

  // 1-Click Action Animation States
  const [dispatchedTables, setDispatchedTables] = useState({});
  const [advancingOrderIds, setAdvancingOrderIds] = useState({});

  // Sync props if parent updates
  useEffect(() => {
    if (propTables && Array.isArray(propTables)) setTables(propTables);
  }, [propTables]);

  useEffect(() => {
    if (propEmployees && Array.isArray(propEmployees)) setEmployees(propEmployees);
  }, [propEmployees]);

  useEffect(() => {
    if (propOrders && Array.isArray(propOrders)) setOrders(propOrders);
  }, [propOrders]);

  useEffect(() => {
    if (propCustomerNotes && Array.isArray(propCustomerNotes)) setCustomerNotes(propCustomerNotes);
  }, [propCustomerNotes]);

  // Show Toast Alert helper
  const triggerToast = useCallback((message, type = 'success') => {
    setNotificationToast({ message, type, id: Date.now() });
    const timer = setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // FILTER PILL COUNTS (Always computed dynamically across the 12 tables)
  // ---------------------------------------------------------------------------
  const counts = useMemo(() => {
    let available = 0;
    let orderRunning = 0;
    let readyInKitchen = 0;
    let needAssistance = 0;

    tables.forEach(t => {
      if (t.status === TABLE_STATUS.AVAILABLE) available++;
      else if (t.status === TABLE_STATUS.ORDER_RUNNING) orderRunning++;
      else if (t.status === TABLE_STATUS.READY_IN_KITCHEN) readyInKitchen++;
      else if (t.status === TABLE_STATUS.NEED_ASSISTANCE) needAssistance++;
    });

    return {
      all: tables.length,
      available,
      orderRunning,
      readyInKitchen,
      needAssistance
    };
  }, [tables]);

  // ---------------------------------------------------------------------------
  // FILTERED TABLES
  // ---------------------------------------------------------------------------
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      // Status pill filter
      if (activeFilter !== 'all' && table.status !== activeFilter) {
        return false;
      }

      // Zone filter
      if (zoneFilter !== 'all' && table.location !== zoneFilter) {
        return false;
      }

      // Search query (table #, customer name, employee name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTableNum = `table ${table.tableNumber}`.includes(q) || String(table.tableNumber) === q;
        
        const assignedEmp = employees.find(e => e.id === table.assignedEmployeeId);
        const matchesEmp = assignedEmp && assignedEmp.name.toLowerCase().includes(q);

        const activeOrder = orders.find(o => o.tableNumber === table.tableNumber && o.id === table.currentOrderId);
        const matchesOrderNum = activeOrder && activeOrder.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = activeOrder && activeOrder.customerName.toLowerCase().includes(q);
        const matchesDish = activeOrder && activeOrder.items.some(i => i.name.toLowerCase().includes(q));

        if (!matchesTableNum && !matchesEmp && !matchesOrderNum && !matchesCustomer && !matchesDish) {
          return false;
        }
      }

      return true;
    });
  }, [tables, activeFilter, zoneFilter, searchQuery, employees, orders]);

  // ---------------------------------------------------------------------------
  // HELPER ACCESSORS
  // ---------------------------------------------------------------------------
  const getOrderForTable = useCallback((table) => {
    if (!table.currentOrderId) {
      // Fallback search by tableNumber if currentOrderId not set
      return orders.find(o => o.tableNumber === table.tableNumber && o.kitchenFlowStage !== KITCHEN_STAGE.SERVED && o.kitchenFlowStage !== 'completed') || null;
    }
    return orders.find(o => o.id === table.currentOrderId) || null;
  }, [orders]);

  const getAssignedEmployee = useCallback((employeeId) => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId) || null;
  }, [employees]);

  const getIssueForTable = useCallback((tableNumber) => {
    return customerNotes.find(n => n.tableNumber === tableNumber && n.status !== ISSUE_STATUS.RESOLVED) || null;
  }, [customerNotes]);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ACTIONS & STEPPER CONTROLS
  // ---------------------------------------------------------------------------

  // 1-Click Dispatch / Notify Employee
  const handleDispatchEmployee = useCallback((tableNumber, employeeId) => {
    playChimeSound();
    const employee = getAssignedEmployee(employeeId);
    const empName = employee ? employee.name : 'Assigned Floor Employee';

    // Highlight button state
    setDispatchedTables(prev => ({ ...prev, [tableNumber]: true }));
    setTimeout(() => {
      setDispatchedTables(prev => ({ ...prev, [tableNumber]: false }));
    }, 2800);

    triggerToast(`Alert dispatched to ${empName} for Table ${tableNumber}. Handset notified!`, 'success');

    if (onNotifyEmployee) {
      onNotifyEmployee(tableNumber, employeeId);
    }
  }, [getAssignedEmployee, triggerToast, onNotifyEmployee]);

  // Advance Order 4-Stage Stepper
  const handleAdvanceStage = useCallback((orderId, tableNumber) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setAdvancingOrderIds(prev => ({ ...prev, [orderId]: true }));
    playChimeSound();

    let nextStage = KITCHEN_STAGE.PREPARING;
    let nextTableStatus = TABLE_STATUS.ORDER_RUNNING;
    let toastMsg = '';

    if (order.kitchenFlowStage === KITCHEN_STAGE.PLACED) {
      nextStage = KITCHEN_STAGE.PREPARING;
      nextTableStatus = TABLE_STATUS.ORDER_RUNNING;
      toastMsg = `Table ${tableNumber}: Order #${order.orderNumber} advanced to Kitchen Preparing 🔥`;
    } else if (order.kitchenFlowStage === KITCHEN_STAGE.PREPARING) {
      nextStage = KITCHEN_STAGE.READY_PICKUP;
      nextTableStatus = TABLE_STATUS.READY_IN_KITCHEN;
      toastMsg = `Table ${tableNumber}: Order #${order.orderNumber} is Ready for Pickup! Server alerted 🔔`;
    } else if (order.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP) {
      nextStage = KITCHEN_STAGE.SERVED;
      nextTableStatus = TABLE_STATUS.ORDER_RUNNING;
      toastMsg = `Table ${tableNumber}: Order #${order.orderNumber} marked as Served to Guests 🍽️`;
    }

    // Update orders state
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, kitchenFlowStage: nextStage } : o)));

    // Update table status
    setTables(prev => prev.map(t => (t.tableNumber === tableNumber ? { ...t, status: nextTableStatus } : t)));

    triggerToast(toastMsg, 'info');

    if (onAdvanceOrderStage) {
      onAdvanceOrderStage(orderId, nextStage, tableNumber);
    }

    setTimeout(() => {
      setAdvancingOrderIds(prev => ({ ...prev, [orderId]: false }));
    }, 500);
  }, [orders, triggerToast, onAdvanceOrderStage]);

  // Clear / Reset Table (when served or settling bill)
  const handleResetTable = useCallback((tableNumber) => {
    playChimeSound();
    setTables(prev => prev.map(t => {
      if (t.tableNumber === tableNumber) {
        return {
          ...t,
          status: TABLE_STATUS.AVAILABLE,
          currentOrderId: null
        };
      }
      return t;
    }));

    // If an order was active, mark it completed
    setOrders(prev => prev.map(o => {
      if (o.tableNumber === tableNumber) {
        return { ...o, kitchenFlowStage: KITCHEN_STAGE.SERVED, completed: true };
      }
      return o;
    }));

    triggerToast(`Table ${tableNumber} is now cleared, sanitized & ready for new guests!`, 'success');

    if (onResetTable) {
      onResetTable(tableNumber);
    }
  }, [triggerToast, onResetTable]);

  // Reassign Employee to a Table
  const handleReassignEmployee = useCallback((tableNumber, newEmployeeId) => {
    playChimeSound();
    const newEmp = employees.find(e => e.id === Number(newEmployeeId));
    const empName = newEmp ? newEmp.name : 'Employee';

    setTables(prev => prev.map(t => (t.tableNumber === tableNumber ? { ...t, assignedEmployeeId: Number(newEmployeeId) } : t)));

    // Also update active order if any
    setOrders(prev => prev.map(o => (o.tableNumber === tableNumber ? { ...o, assignedEmployeeId: Number(newEmployeeId) } : o)));

    // Update employees assignedTableIds
    setEmployees(prev => prev.map(e => {
      const assigned = new Set(e.assignedTableIds || []);
      if (e.id === Number(newEmployeeId)) {
        assigned.add(tableNumber);
      } else {
        assigned.delete(tableNumber);
      }
      return { ...e, assignedTableIds: Array.from(assigned) };
    }));

    setActiveEmployeeDropdownTableId(null);
    triggerToast(`Table ${tableNumber} assigned to ${empName}`, 'success');
  }, [employees, triggerToast]);

  // Resolve Customer Assistance / Issue
  const handleResolveIssue = useCallback((noteId, tableNumber, resolutionMemo) => {
    playChimeSound();

    // Mark note as resolved
    setCustomerNotes(prev => prev.map(n => {
      if (n.id === noteId || n.tableNumber === tableNumber) {
        return {
          ...n,
          status: ISSUE_STATUS.RESOLVED,
          resolutionNote: resolutionMemo || 'Resolved by floor manager'
        };
      }
      return n;
    }));

    // Check if table has an active order running; if so, restore to ORDER_RUNNING, else AVAILABLE
    setTables(prev => prev.map(t => {
      if (t.tableNumber === tableNumber) {
        const hasOrder = orders.some(o => o.tableNumber === tableNumber && o.kitchenFlowStage !== KITCHEN_STAGE.SERVED);
        return {
          ...t,
          status: hasOrder ? TABLE_STATUS.ORDER_RUNNING : TABLE_STATUS.AVAILABLE
        };
      }
      return t;
    }));

    setActiveIssueModal(null);
    triggerToast(`Assistance request for Table ${tableNumber} resolved successfully!`, 'success');

    if (onResolveIssue) {
      onResolveIssue(noteId, tableNumber, resolutionMemo);
    }
  }, [orders, triggerToast, onResolveIssue]);

  // ---------------------------------------------------------------------------
  // FORMATTING HELPERS
  // ---------------------------------------------------------------------------
  const formatCurrency = (val) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    return `$${num.toFixed(2)}`;
  };

  const formatElapsed = (minutes) => {
    if (!minutes && minutes !== 0) return 'Just now';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m ago`;
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      
      {/* =======================================================================
          TOP TELEMETRY & FILTER CONTROLS BAR
          ======================================================================= */}
      <div className="bg-[#161619]/90 backdrop-blur-2xl rounded-3xl border border-zinc-800 p-5 shadow-2xl shadow-black/40 space-y-5">
        
        {/* Row 1: Header, Search & View Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] text-white flex items-center justify-center shadow-lg shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/40 shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                  Live Orders &amp; Table Tracking
                </h2>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Floor Matrix
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Real-time 12-table dining grid &bull; 4-stage kitchen pipeline &bull; Instant Employee dispatch
              </p>
            </div>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table, guest, dish..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#101013] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A26] transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Zone Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#101013] border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A26]" />
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#161619] text-white">All Zones (12)</option>
                <option value="Main Hall" className="bg-[#161619] text-white">Main Hall</option>
                <option value="Patio" className="bg-[#161619] text-white">Patio</option>
                <option value="Window" className="bg-[#161619] text-white">Window</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#101013] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#FF5A26] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-[#FF5A26] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Filter Pills (Exact Requirement: All, Available, Order Running, Ready in Kitchen, Assistance/Issue) */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
          
          {/* Pill: ALL (12) */}
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-600 shadow-lg shadow-black/50 ring-2 ring-[#FF7A45]/40'
                : 'bg-[#101013] text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-zinc-800/80'
            }`}
          >
            <span>All Tables</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === 'all' ? 'bg-[#FF5A26] text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {counts.all}
            </span>
          </button>

          {/* Pill: Available (4) - Soft slate / neutral emerald */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.AVAILABLE)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.AVAILABLE
                ? 'bg-slate-800/90 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-500/40'
                : 'bg-[#101013] text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50 border border-zinc-800/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Available</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-700/80 text-emerald-400 border border-emerald-500/30">
              {counts.available}
            </span>
          </button>

          {/* Pill: Order Running (5) - Amber #f59e0b (bg #fef3c7) */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.ORDER_RUNNING)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.ORDER_RUNNING
                ? 'bg-[#fef3c7] text-[#92400e] border border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                : 'bg-[#101013] text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/30 border border-zinc-800/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Order Running</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.ORDER_RUNNING
                ? 'bg-amber-200 text-[#92400e]'
                : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
            }`}>
              {counts.orderRunning}
            </span>
          </button>

          {/* Pill: Ready in Kitchen (2) - Emerald Green #10b981 (bg #d1fae5) */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.READY_IN_KITCHEN)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.READY_IN_KITCHEN
                ? 'bg-[#d1fae5] text-[#065f46] border border-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400 animate-pulse'
                : 'bg-[#101013] text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-950/30 border border-zinc-800/80'
            }`}
          >
            <ConciergeBell className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready in Kitchen</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.READY_IN_KITCHEN
                ? 'bg-emerald-200 text-[#065f46]'
                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
            }`}>
              {counts.readyInKitchen}
            </span>
          </button>

          {/* Pill: Assistance / Issue (1) - Crimson Red #ef4444 (bg #fee2e2) */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.NEED_ASSISTANCE)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.NEED_ASSISTANCE
                ? 'bg-[#fee2e2] text-[#991b1b] border border-red-400 shadow-lg shadow-red-500/25 ring-2 ring-red-400 animate-pulse'
                : 'bg-[#101013] text-red-400/90 hover:text-red-200 hover:bg-red-950/30 border border-zinc-800/80'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
            <span>Assistance / Issue</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.NEED_ASSISTANCE
                ? 'bg-red-200 text-[#991b1b]'
                : 'bg-red-950/60 text-red-300 border border-red-500/40'
            }`}>
              {counts.needAssistance}
            </span>
          </button>

          {/* Reset Filters Shortcut */}
          {(activeFilter !== 'all' || zoneFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setZoneFilter('all');
                setSearchQuery('');
              }}
              className="ml-auto text-xs text-zinc-400 hover:text-[#FF7A45] font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}

        </div>

      </div>

      {/* =======================================================================
          NOTIFICATION TOAST ALERT (Dispatches & Updates)
          ======================================================================= */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/95 border border-[#FF5A26]/50 text-white shadow-2xl shadow-black/80 backdrop-blur-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A26] animate-ping" />
            <span className="text-xs font-bold">{notificationToast.message}</span>
            <button
              type="button"
              onClick={() => setNotificationToast(null)}
              className="text-zinc-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          TABLES GRID VIEW (DISPLAY ALL 12 TABLES)
          ======================================================================= */}
      {filteredTables.length === 0 ? (
        <div className="bg-[#161619]/60 border border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-3">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-zinc-300">No tables match your current filter</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your status pill, clearing the zone selection, or resetting the search query.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
              setZoneFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition"
          >
            Show All 12 Tables
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" 
          : "space-y-3"
        }>
          {filteredTables.map(table => {
            const activeOrder = getOrderForTable(table);
            const assignedEmp = getAssignedEmployee(table.assignedEmployeeId);
            const issueNote = getIssueForTable(table.tableNumber);
            const isDispatched = dispatchedTables[table.tableNumber];
            const isAdvancing = activeOrder && advancingOrderIds[activeOrder.id];

            // -----------------------------------------------------------------
            // STATUS BADGE CONFIGURATION (Exact Requirements)
            // Available: Soft slate / neutral emerald
            // Order Running: Amber #f59e0b (bg #fef3c7)
            // Ready in Kitchen: Emerald Green #10b981 (bg #d1fae5)
            // Customer Call / Issue: Crimson Red #ef4444 (bg #fee2e2) with subtle pulsing glow.
            // -----------------------------------------------------------------
            let statusBadge = null;
            let cardBorderClass = 'border-zinc-800 hover:border-zinc-700 bg-[#161619]/90';

            if (table.status === TABLE_STATUS.AVAILABLE) {
              cardBorderClass = 'border-slate-800/80 hover:border-emerald-500/40 bg-[#14161c]/90';
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-800/90 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Available</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.ORDER_RUNNING) {
              cardBorderClass = 'border-amber-500/40 hover:border-amber-400 bg-[#16141a]/95 shadow-md shadow-amber-950/20';
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#fef3c7] text-[#92400e] border border-amber-300 flex items-center gap-1.5 shadow-sm">
                  <Flame className="w-3 h-3 text-[#f59e0b]" />
                  <span>Order Running</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.READY_IN_KITCHEN) {
              cardBorderClass = 'border-emerald-500/60 hover:border-emerald-400 bg-[#111915]/95 shadow-lg shadow-emerald-950/40';
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#d1fae5] text-[#065f46] border border-emerald-300 flex items-center gap-1.5 shadow-sm animate-pulse">
                  <ConciergeBell className="w-3 h-3 text-[#10b981]" />
                  <span>Ready in Kitchen</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.NEED_ASSISTANCE) {
              cardBorderClass = 'border-red-500/70 bg-gradient-to-b from-red-950/30 via-[#181216] to-[#161619] shadow-[0_0_25px_rgba(239,68,68,0.22)] ring-1 ring-red-500/40 animate-pulse';
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#fee2e2] text-[#991b1b] border border-red-300 flex items-center gap-1.5 shadow-md shadow-red-500/20">
                  <AlertTriangle className="w-3 h-3 text-[#ef4444] animate-bounce" />
                  <span>Need Assistance</span>
                </span>
              );
            }

            return (
              <div
                key={table.id}
                className={`rounded-3xl border p-5 transition-all duration-300 backdrop-blur-2xl flex flex-col justify-between relative group ${cardBorderClass}`}
              >
                {/* -----------------------------------------------------------
                    CARD TOP HEADER: Table #, Capacity, Status Badge
                    ----------------------------------------------------------- */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center font-black text-sm text-white shadow-inner">
                        {table.tableNumber}
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base tracking-tight leading-none">
                          {table.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium mt-1">
                          <span>{table.capacity} Seats</span>
                          <span>&bull;</span>
                          <span className="text-zinc-300">{table.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Status Badge */}
                    <div>{statusBadge}</div>
                  </div>

                  {/* -----------------------------------------------------------
                      ASSIGNED EMPLOYEE BADGE (Strictly Employee, NOT Waiter)
                      ----------------------------------------------------------- */}
                  <div className="relative pt-2 pb-1 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        Assigned Employee
                      </span>
                      
                      {/* Dropdown toggle to reassign */}
                      <button
                        type="button"
                        onClick={() => setActiveEmployeeDropdownTableId(
                          activeEmployeeDropdownTableId === table.tableNumber ? null : table.tableNumber
                        )}
                        className="text-[10px] text-[#FF7A45] hover:text-[#FF5A26] font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>Change</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 mt-1.5 p-2 rounded-xl bg-[#101013]/80 border border-zinc-800/80">
                      {assignedEmp ? (
                        <>
                          <div
                            className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: assignedEmp.avatarColor || '#FF5A26' }}
                          >
                            {assignedEmp.initials || assignedEmp.avatar?.initials || 'EM'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {assignedEmp.name}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                assignedEmp.status === EMPLOYEE_STATUS.ACTIVE ? 'bg-emerald-400' :
                                assignedEmp.status === EMPLOYEE_STATUS.BUSY ? 'bg-amber-400' : 'bg-zinc-500'
                              }`} />
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {assignedEmp.role}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full text-xs text-zinc-500 italic py-0.5">
                          <span>Unassigned</span>
                          <button
                            type="button"
                            onClick={() => setActiveEmployeeDropdownTableId(table.tableNumber)}
                            className="text-[10px] text-[#FF7A45] font-bold not-italic hover:underline"
                          >
                            + Assign Staff
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interactive Employee Reassign Selector Dropdown */}
                    {activeEmployeeDropdownTableId === table.tableNumber && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#18181d] border border-zinc-700 rounded-2xl p-2 shadow-2xl shadow-black space-y-1 animate-scaleUp">
                        <div className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                          <span>Assign Staff Member</span>
                          <button
                            type="button"
                            onClick={() => setActiveEmployeeDropdownTableId(null)}
                            className="text-zinc-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                          {employees.map(emp => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleReassignEmployee(table.tableNumber, emp.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                                table.assignedEmployeeId === emp.id
                                  ? 'bg-[#FF5A26]/20 text-white border border-[#FF5A26]/40'
                                  : 'hover:bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-5 h-5 rounded-md text-[10px] font-black text-white flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: emp.avatarColor || '#FF5A26' }}
                                >
                                  {emp.initials}
                                </span>
                                <span className="font-bold truncate">{emp.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400">{emp.role.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* -----------------------------------------------------------
                      CASE 1: TABLE HAS ACTIVE ASSISTANCE / ISSUE
                      ----------------------------------------------------------- */}
                  {table.status === TABLE_STATUS.NEED_ASSISTANCE && (
                    <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-red-300 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Customer Issue Report</span>
                        </span>
                        {issueNote?.severity && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            issueNote.severity === ISSUE_SEVERITY.CRITICAL ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                          }`}>
                            {issueNote.severity}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-red-100 font-medium leading-snug line-clamp-2">
                        {issueNote ? issueNote.complaintText : 'Guest requested prompt staff assistance at table.'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-red-300/80 pt-1 border-t border-red-500/20">
                        <span>Guest: {issueNote?.customerName || 'Dining Guest'}</span>
                        <span>{issueNote ? formatElapsed(15) : 'Active'}</span>
                      </div>
                    </div>
                  )}

                  {/* -----------------------------------------------------------
                      CASE 2: TABLE HAS ACTIVE ORDER RUNNING / READY
                      ----------------------------------------------------------- */}
                  {activeOrder && table.status !== TABLE_STATUS.AVAILABLE && (
                    <div className="space-y-3 pt-2">
                      
                      {/* Live Order Summary */}
                      <div className="p-3 rounded-2xl bg-[#101013]/90 border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span className="text-[#FF7A45]">{activeOrder.orderNumber}</span>
                            <span className="text-zinc-500">&bull;</span>
                            <span className="text-zinc-300">{activeOrder.customerName}</span>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{formatElapsed(activeOrder.timeElapsedMinutes)}</span>
                          </span>
                        </div>

                        {/* Items Preview with Quantities & Prices */}
                        <div className="space-y-1 text-xs">
                          {activeOrder.items.slice(0, 2).map((item, idx) => (
                            <div key={item.id || idx} className="flex items-baseline justify-between text-stone-200">
                              <span className="truncate pr-2">
                                <span className="font-bold text-[#FF7A45]">{item.quantity}×</span>{' '}
                                <span>{item.name}</span>
                              </span>
                              <span className="font-semibold text-zinc-300 shrink-0">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {activeOrder.items.length > 2 && (
                            <p className="text-[10px] text-zinc-400 font-bold">
                              +{activeOrder.items.length - 2} more item(s) ordered
                            </p>
                          )}
                        </div>

                        {/* Total Bill */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400">
                            Total Bill ({activeOrder.items.reduce((s, i) => s + i.quantity, 0)} items)
                          </span>
                          <span className="text-sm font-black text-emerald-400">
                            {formatCurrency(activeOrder.total)}
                          </span>
                        </div>
                      </div>

                      {/* -------------------------------------------------------
                          KITCHEN-TO-EMPLOYEE STEPPER / PROGRESS BAR
                          Exact 4-Stage Pipeline:
                          1. Order Placed
                          2. Kitchen Preparing
                          3. Ready for Pickup (Employee Notified)
                          4. Served
                          ------------------------------------------------------- */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          <span>Kitchen &rarr; Server Pipeline</span>
                          <span className="text-[#FF7A45] font-extrabold">
                            {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PLACED ? '1/4 Placed' :
                             activeOrder.kitchenFlowStage === KITCHEN_STAGE.PREPARING ? '2/4 Preparing' :
                             activeOrder.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP ? '3/4 Ready Pickup' : '4/4 Served'}
                          </span>
                        </div>

                        {/* Horizontal Stepper Strip */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {ORDER_PIPELINE_STAGES.map((stage, sIdx) => {
                            const stageKeys = ORDER_PIPELINE_STAGES.map(s => s.key);
                            const currentIdx = stageKeys.indexOf(activeOrder.kitchenFlowStage);
                            const isCompleted = sIdx < currentIdx;
                            const isCurrent = sIdx === currentIdx;

                            return (
                              <div
                                key={stage.key}
                                className={`p-1.5 rounded-xl border text-center transition-all ${
                                  isCurrent
                                    ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-white shadow-md shadow-[#FF5A26]/20 ring-1 ring-[#FF7A45]'
                                    : isCompleted
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                    : 'bg-[#101013] border-zinc-800/80 text-zinc-400'
                                }`}
                                title={stage.description}
                              >
                                <div className="flex items-center justify-center mb-0.5">
                                  {isCompleted ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : isCurrent ? (
                                    <stage.icon className="w-3 h-3 text-[#FF7A45] animate-pulse" />
                                  ) : (
                                    <span className="text-[10px] font-bold">{sIdx + 1}</span>
                                  )}
                                </div>
                                <span className="text-[9px] font-black block truncate leading-tight">
                                  {stage.shortLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* -----------------------------------------------------------
                      CASE 3: TABLE IS AVAILABLE
                      ----------------------------------------------------------- */}
                  {table.status === TABLE_STATUS.AVAILABLE && (
                    <div className="py-6 px-3 rounded-2xl bg-[#101013]/60 border border-zinc-800/60 text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">Table Clean &amp; Vacant</p>
                      <p className="text-[11px] text-zinc-400">
                        Ready for hostess seating &bull; Capacity {table.capacity} guests
                      </p>
                    </div>
                  )}

                </div>

                {/* -----------------------------------------------------------
                    ACTION TOOLBAR ON EACH CARD (Exact Requirements)
                    - 1-Click "Dispatch / Notify Employee"
                    - "View Order Receipt / Modal"
                    - "Clear / Reset Table" when served
                    - Prominent "Handle Issue" Crimson button for assistance
                    ----------------------------------------------------------- */}
                <div className="pt-4 mt-4 border-t border-zinc-800/80 space-y-2">
                  
                  {/* Advance Kitchen Stage 1-Click Action */}
                  {activeOrder && activeOrder.kitchenFlowStage !== KITCHEN_STAGE.SERVED && (
                    <button
                      type="button"
                      disabled={isAdvancing}
                      onClick={() => handleAdvanceStage(activeOrder.id, table.tableNumber)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] hover:from-[#ff6b3d] hover:to-[#ff8d5c] text-white text-xs font-black shadow-md shadow-[#FF5A26]/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PLACED && (
                        <>
                          <Flame className="w-3.5 h-3.5" />
                          <span>Advance: Send to Kitchen</span>
                        </>
                      )}
                      {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PREPARING && (
                        <>
                          <ConciergeBell className="w-3.5 h-3.5" />
                          <span>Advance: Mark Ready &amp; Alert Server</span>
                        </>
                      )}
                      {activeOrder.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Advance: Confirm Served to Table</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Reset Table Button (when served or available) */}
                  {activeOrder && activeOrder.kitchenFlowStage === KITCHEN_STAGE.SERVED && (
                    <button
                      type="button"
                      onClick={() => handleResetTable(table.tableNumber)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear &amp; Reset Table (Served)</span>
                    </button>
                  )}

                  {/* Handle Issue Button (Crimson Glow) */}
                  {table.status === TABLE_STATUS.NEED_ASSISTANCE && (
                    <button
                      type="button"
                      onClick={() => setActiveIssueModal({ table, note: issueNote })}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-red-600/40 ring-1 ring-red-400 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer animate-pulse"
                    >
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>Handle Issue &bull; Resolve Alert</span>
                    </button>
                  )}

                  {/* Secondary Toolbar Actions */}
                  <div className="flex items-center gap-2">
                    {/* 1-Click Dispatch / Notify Employee */}
                    <button
                      type="button"
                      onClick={() => handleDispatchEmployee(table.tableNumber, table.assignedEmployeeId)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isDispatched
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#101013] hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                      }`}
                      title="Dispatch alert to assigned employee handset"
                    >
                      {isDispatched ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Dispatched!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#FF7A45]" />
                          <span>Notify Staff</span>
                        </>
                      )}
                    </button>

                    {/* View Order Receipt / Breakdown Modal */}
                    {activeOrder && (
                      <button
                        type="button"
                        onClick={() => setSelectedOrderModal({ order: activeOrder, table, employee: assignedEmp })}
                        className="py-1.5 px-3 rounded-xl bg-[#101013] hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1 border border-zinc-800 cursor-pointer"
                        title="View Full Order Receipt Modal"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {/* Table Reset shortcut if already clean */}
                    {table.status === TABLE_STATUS.AVAILABLE && (
                      <button
                        type="button"
                        onClick={() => triggerToast(`Table ${table.tableNumber} is ready. Guest QR code active.`, 'info')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition border border-emerald-500/30 flex items-center justify-center gap-1"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Seat Table</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* =======================================================================
          MODAL: FULL ORDER BREAKDOWN & RECEIPT (Exact Requirement)
          ======================================================================= */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141418] border border-zinc-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto space-y-6 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Order Invoice {selectedOrderModal.order.orderNumber}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#FF5A26]/15 text-[#FF7A45] border border-[#FF5A26]/30">
                    Table {selectedOrderModal.table.tableNumber}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Guest: <span className="text-white font-bold">{selectedOrderModal.order.customerName}</span> &bull; Placed {formatElapsed(selectedOrderModal.order.timeElapsedMinutes)} ({selectedOrderModal.table.location})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pipeline Stage Progress in Modal */}
            <div className="p-4 rounded-2xl bg-[#101013] border border-zinc-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Current Kitchen Pipeline Stage
              </span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {ORDER_PIPELINE_STAGES.map((s, idx) => {
                  const stageKeys = ORDER_PIPELINE_STAGES.map(st => st.key);
                  const currIdx = stageKeys.indexOf(selectedOrderModal.order.kitchenFlowStage);
                  const isDone = idx < currIdx;
                  const isCurr = idx === currIdx;

                  return (
                    <div
                      key={s.key}
                      className={`p-2.5 rounded-xl border text-center ${
                        isCurr
                          ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-white ring-1 ring-[#FF7A45]'
                          : isDone
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#161619] border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <span className="text-xs font-black block">{s.shortLabel}</span>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">{s.description.split('•')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assigned Staff Card with Reassignment Option */}
            <div className="p-3.5 rounded-2xl bg-[#101013] border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selectedOrderModal.employee?.avatarColor || '#FF5A26' }}
                >
                  {selectedOrderModal.employee?.initials || 'EM'}
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block font-medium">Assigned Server</span>
                  <span className="text-sm font-bold text-white">
                    {selectedOrderModal.employee?.name || 'Unassigned'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    {selectedOrderModal.employee?.role || 'Floor Specialist'} &bull; {selectedOrderModal.employee?.shift || 'Morning'}
                  </span>
                </div>
              </div>

              {/* Quick Reassign dropdown inside modal */}
              <select
                value={selectedOrderModal.table.assignedEmployeeId || ''}
                onChange={(e) => {
                  handleReassignEmployee(selectedOrderModal.table.tableNumber, e.target.value);
                  const newEmp = employees.find(emp => emp.id === Number(e.target.value));
                  setSelectedOrderModal(prev => ({
                    ...prev,
                    employee: newEmp,
                    table: { ...prev.table, assignedEmployeeId: Number(e.target.value) }
                  }));
                }}
                className="bg-[#18181d] border border-zinc-700 text-xs text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer focus:outline-none"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    Assign to: {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Itemized Order Breakdown Table */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 block">
                Ordered Items ({selectedOrderModal.order.items.length})
              </span>
              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-[#101013]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 font-black">Item Description</th>
                      <th className="py-2.5 px-3 font-black text-center">Qty</th>
                      <th className="py-2.5 px-3 font-black text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-black text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {selectedOrderModal.order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 text-stone-200">
                          <span className="font-bold text-white block">{item.name}</span>
                          {item.notes && (
                            <span className="text-[10px] text-[#FF7A45] italic block mt-0.5">
                              "{item.notes}"
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#FF7A45]">
                          {item.quantity}×
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-400">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Voice Note Simulation / Player if applicable */}
            {selectedOrderModal.order.voiceNoteUrl && (
              <div className="p-3 rounded-2xl bg-[#101013] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A45]">
                  <Mic className="w-3.5 h-3.5 text-[#FF5A26] animate-pulse" />
                  <span>Customer Voice Recording Note</span>
                </div>
                <AudioPlayer src={selectedOrderModal.order.voiceNoteUrl} title="Customer Note" />
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-[#101013] border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(selectedOrderModal.order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Sales Tax (10%)</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(selectedOrderModal.order.tax)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm">
                <span className="font-black text-white">Total Amount</span>
                <span className="font-black text-emerald-400 text-base">{formatCurrency(selectedOrderModal.order.total)}</span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill Receipt</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDispatchEmployee(selectedOrderModal.table.tableNumber, selectedOrderModal.table.assignedEmployeeId);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#FF7A45] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Alert Server</span>
                </button>

                {selectedOrderModal.order.kitchenFlowStage !== KITCHEN_STAGE.SERVED ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleAdvanceStage(selectedOrderModal.order.id, selectedOrderModal.table.tableNumber);
                      setSelectedOrderModal(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] hover:from-[#ff6b3d] hover:to-[#ff8d5c] text-white text-xs font-black shadow-md shadow-[#FF5A26]/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Advance Pipeline Stage</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetTable(selectedOrderModal.table.tableNumber);
                      setSelectedOrderModal(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear &amp; Reset Table</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: ISSUE RESOLUTION & HANDLING DIALOG
          ======================================================================= */}
      {activeIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#181216] border border-red-500/50 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-red-950/50 space-y-5 animate-scaleUp">
            
            <div className="flex items-start justify-between pb-3 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Table {activeIssueModal.table.tableNumber} Assistance Call
                  </h3>
                  <p className="text-xs text-red-300">
                    Priority Alert &bull; Zone: {activeIssueModal.table.location}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveIssueModal(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Complaint details */}
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-red-300 font-bold">
                <span>Guest: {activeIssueModal.note?.customerName || 'Dining Customer'}</span>
                <span className="uppercase text-[10px] bg-red-500 text-white px-2 py-0.5 rounded">
                  {activeIssueModal.note?.severity || 'Critical'}
                </span>
              </div>
              <p className="text-sm text-red-100 font-medium leading-relaxed">
                "{activeIssueModal.note ? activeIssueModal.note.complaintText : 'Table has pressed the assistance call button requesting prompt floor service.'}"
              </p>
            </div>

            {/* Resolution Form / Actions */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                Floor Manager Action
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDispatchEmployee(activeIssueModal.table.tableNumber, activeIssueModal.table.assignedEmployeeId);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#FF7A45]" />
                  <span>Dispatch Staff to Table</span>
                </button>

                {onSelectReportsTab ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIssueModal(null);
                      onSelectReportsTab();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Reports</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleResolveIssue(activeIssueModal.note?.id, activeIssueModal.table.tableNumber, 'Staff attended to table call immediately');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-md shadow-red-700/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quick Resolve</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  handleResolveIssue(
                    activeIssueModal.note?.id,
                    activeIssueModal.table.tableNumber,
                    'Issue handled and resolved on floor by Admin'
                  );
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Mark Issue Resolved &amp; Clear Table Alert</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
