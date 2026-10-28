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
  Grid3X3,
  PlusCircle,
  Plus,
  Minus,
  Trash2,
  Lock,
  ShieldAlert,
  Scale
} from 'lucide-react';

import TableSecurityModal, { TableSecurityModal as PasscodeConfirmDialog } from './TableSecurityModal';

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
import BillPreviewModal, { settleTableOrders, formatMoney } from './BillReceipt';
import { useRestaurant } from '../../context/RestaurantContext';
import { sendFloorSnapshotToTelegram } from '../../services/telegramClient.js';
import OrderCorrectionModal, { computeOrderBill } from './OrderCorrectionModal';
import '../../styles/admin-tables.css';
import '../../styles/admin-floor.css';

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
    shortLabel: 'Preparing',
    description: 'Executive culinary team preparing dish',
    icon: Flame,
    color: 'orange'
  },
  {
    key: KITCHEN_STAGE.READY_PICKUP,
    label: 'Ready for Pickup (Employee Notified)',
    shortLabel: 'Ready Pickup',
    description: 'Plated hot at kitchen pass • Employee alerted',
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
  onSettleTable = null,
  customerNotes: propCustomerNotes,
  tableCount: propTableCount,
  onTableCountChange,
  onAddTable,
  onRemoveTable,
  onAutoBalanceTables,
  onAssignEmployee,
  onUpdateTableStatus,
  onAdvanceOrderStage,
  onNotifyEmployee,
  onResetTable,
  onResolveIssue,
  onSelectReportsTab,
  onUpdateTables
}) {
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT (Self-contained with sync back to parent handlers)
  // ---------------------------------------------------------------------------

  const restaurantContext = useRestaurant();
  const {
    tables: contextTables,
    setTables: contextSetTables,
    employees: contextEmployees,
    assistanceCalls,
    getOrderCorrection
  } = restaurantContext || {};

  // Initialize tables ensuring offline-first persistence from localStorage ('smartdine_restaurant_tables'),
  // propTables, RestaurantContext, or realistic default distribution:
  // Available: 4 (T3, T6, T8, T11)
  // Order Running: 5 (T1, T4, T5, T10, T12)
  // Ready in Kitchen: 2 (T2, T7)
  // Assistance / Issue: 1 (T9)
  const [tables, setTables] = useState(() => {
    // 1. Check offline localStorage first
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('smartdine_restaurant_tables');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[LiveTablesModule] Error reading smartdine_restaurant_tables:', err);
      }
    }
    // 2. Check props
    if (propTables && Array.isArray(propTables) && propTables.length > 0) {
      return propTables;
    }
    // 3. Check context tables
    if (contextTables && Array.isArray(contextTables) && contextTables.length > 0) {
      return contextTables;
    }
    // 4. Default mock data
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
    if (propEmployees && Array.isArray(propEmployees) && propEmployees.length > 0) return propEmployees;
    if (contextEmployees && Array.isArray(contextEmployees) && contextEmployees.length > 0) return contextEmployees;
    return defaultMockEmployees || [];
  });

  const [orders, setOrders] = useState(() => {
    if (propOrders && Array.isArray(propOrders) && propOrders.length > 0) {
      return propOrders;
    }
    if (typeof window !== 'undefined') {
      try {
        const liveOrdersRaw = localStorage.getItem('smartdine_live_orders');
        if (liveOrdersRaw) {
          const parsed = JSON.parse(liveOrdersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        const kdsOrdersRaw = localStorage.getItem('smartdine_kds_orders');
        if (kdsOrdersRaw) {
          const parsed = JSON.parse(kdsOrdersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'compact'

  // Modals & Active Selections
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [billCorrectionOrder, setBillCorrectionOrder] = useState(null);
  const [activeIssueModal, setActiveIssueModal] = useState(null);
  const [activeEmployeeDropdownTableId, setActiveEmployeeDropdownTableId] = useState(null);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableSeats, setNewTableSeats] = useState(4);
  const [newTableZone, setNewTableZone] = useState('Main Hall');
  const [newTableAssignedEmpId, setNewTableAssignedEmpId] = useState('');

  // Temporary Toast Feedback
  const [notificationToast, setNotificationToast] = useState(null);

  // 1-Click Action Animation States
  const [dispatchedTables, setDispatchedTables] = useState({});
  const [advancingOrderIds, setAdvancingOrderIds] = useState({});
  const [billTarget, setBillTarget] = useState(null); // { tableNumber } while the bill preview is open
  const [expandedTableIds, setExpandedTableIds] = useState({}); // compact table cards: which ones show Details

  // Sync tables to offline storage ('smartdine_restaurant_tables'), RestaurantContext, and parent
  const syncTablesOffline = useCallback((nextTables) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smartdine_restaurant_tables', JSON.stringify(nextTables));
        window.dispatchEvent(new CustomEvent('smartdine:table-update', { detail: nextTables }));
      } catch (err) {
        console.warn('[LiveTablesModule] Error persisting smartdine_restaurant_tables:', err);
      }
    }
    if (typeof contextSetTables === 'function') {
      contextSetTables(nextTables);
    }
    if (typeof onUpdateTables === 'function') {
      onUpdateTables(nextTables);
    }
  }, [contextSetTables, onUpdateTables]);

  // Sync props if parent updates
  useEffect(() => {
    if (propTables && Array.isArray(propTables) && propTables.length > 0) {
      setTables(propTables);
      try {
        localStorage.setItem('smartdine_restaurant_tables', JSON.stringify(propTables));
      } catch (_) {}
    }
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

  // Persist live orders offline
  useEffect(() => {
    if (Array.isArray(orders) && orders.length > 0 && typeof window !== 'undefined') {
      try {
        localStorage.setItem('smartdine_live_orders', JSON.stringify(orders));
      } catch (_) {}
    }
  }, [orders]);

  // Listen for storage events and cross-tab/module custom events for smartdine_restaurant_tables
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === 'smartdine_restaurant_tables' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTables(parsed);
          }
        } catch (_) {}
      }
    };

    const handleCustomTableUpdate = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setTables(e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('smartdine:table-update', handleCustomTableUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('smartdine:table-update', handleCustomTableUpdate);
    };
  }, []);

  // Listen for offline customer orders placed via smartdine:new-order
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNewOrder = (e) => {
      const newOrder = e.detail;
      if (!newOrder) return;
      const tNum = Number(newOrder.tableNumber || newOrder.table_number || newOrder.table);

      setOrders(prev => {
        const exists = prev.some(o => (o.id && o.id === newOrder.id) || (o.orderNumber && o.orderNumber === newOrder.orderNumber));
        if (exists) return prev;
        const normalized = {
          id: newOrder.id || `ord-${Date.now()}`,
          orderNumber: newOrder.orderNumber || newOrder.orderId || `#${Math.floor(1000 + Math.random() * 9000)}`,
          tableNumber: tNum,
          customerName: newOrder.customerName || newOrder.dinerName || 'Guest',
          timeElapsedMinutes: 0,
          timestamp: new Date().toISOString(),
          items: newOrder.items || [],
          subtotal: Number(newOrder.subtotal || newOrder.total || 0),
          tax: Number(newOrder.tax || 0),
          total: Number(newOrder.total || newOrder.totalAmount || 0),
          kitchenFlowStage: newOrder.kitchenFlowStage || KITCHEN_STAGE.PLACED,
          assignedEmployeeId: newOrder.assignedEmployeeId || null
        };
        return [normalized, ...prev];
      });

      if (tNum) {
        setTables(prev => {
          const updated = prev.map(t => {
            if (t.tableNumber === tNum && t.status === TABLE_STATUS.AVAILABLE) {
              return {
                ...t,
                status: TABLE_STATUS.ORDER_RUNNING,
                currentOrderId: newOrder.id || newOrder.orderId
              };
            }
            return t;
          });
          syncTablesOffline(updated);
          return updated;
        });
      }
    };

    window.addEventListener('smartdine:new-order', handleNewOrder);
    return () => {
      window.removeEventListener('smartdine:new-order', handleNewOrder);
    };
  }, [syncTablesOffline]);

  // Show Toast Alert helper
  const triggerToast = useCallback((message, type = 'success') => {
    setNotificationToast({ message, type, id: Date.now() });
    const timer = setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // PROTECTED TABLE MANAGEMENT (Requires admin PIN via TableSecurityModal)
  // ---------------------------------------------------------------------------
  const [customTableCount, setCustomTableCount] = useState(() => (propTables ? propTables.length.toString() : '12'));
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionTitle: '',
    actionDescription: '',
    actionNotice: '',
    pendingAction: null
  });

  // Keep input in sync with tables.length
  useEffect(() => {
    setCustomTableCount(tables.length.toString());
  }, [tables.length]);

  const handleTableCountChange = useCallback((targetCount) => {
    const num = Math.max(1, Math.min(50, Number(targetCount)));
    let nextCount = num;
    setTables(prev => {
      let nextTables;
      if (num === prev.length) {
        nextTables = prev;
      } else if (num > prev.length) {
        const toAdd = num - prev.length;
        const currentMaxNumber = prev.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
        const newEntries = Array.from({ length: toAdd }, (_, i) => {
          const tNum = currentMaxNumber + i + 1;
          const loc = tNum % 3 === 0 ? TABLE_LOCATION.WINDOW : (tNum % 2 === 0 ? TABLE_LOCATION.PATIO : TABLE_LOCATION.MAIN_HALL);
          return {
            id: Date.now() + i,
            tableNumber: tNum,
            name: `Table ${tNum}`,
            status: TABLE_STATUS.AVAILABLE,
            assignedEmployeeId: null,
            currentOrderId: null,
            capacity: 4,
            location: loc
          };
        });
        nextTables = [...prev, ...newEntries];
      } else {
        nextTables = prev.slice(0, num);
      }
      nextCount = nextTables.length;
      syncTablesOffline(nextTables);
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    setCustomTableCount(nextCount.toString());
    triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
  }, [syncTablesOffline, onTableCountChange, triggerToast]);

  const handleAddNewTable = useCallback(() => {
    let nextCount = 0;
    setTables(prev => {
      const currentMaxNumber = prev.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
      const nextNum = currentMaxNumber + 1;
      const loc = nextNum % 3 === 0 ? TABLE_LOCATION.WINDOW : (nextNum % 2 === 0 ? TABLE_LOCATION.PATIO : TABLE_LOCATION.MAIN_HALL);
      const newTable = {
        id: Date.now(),
        tableNumber: nextNum,
        name: `Table ${nextNum}`,
        status: TABLE_STATUS.AVAILABLE,
        assignedEmployeeId: null,
        currentOrderId: null,
        capacity: 4,
        location: loc
      };
      const nextTables = [...prev, newTable];
      nextCount = nextTables.length;
      syncTablesOffline(nextTables);
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    setCustomTableCount(nextCount.toString());
    triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
  }, [syncTablesOffline, onTableCountChange, triggerToast]);

  const handleRemoveSpecificTable = useCallback((tableNumber) => {
    let nextCount = 0;
    setTables(prev => {
      if (prev.length <= 1) {
        triggerToast('Venue must maintain at least 1 table on the floor', 'error');
        return prev;
      }
      const nextTables = prev.filter(t => t.tableNumber !== tableNumber);
      nextCount = nextTables.length;
      syncTablesOffline(nextTables);
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    if (nextCount > 0) {
      setCustomTableCount(nextCount.toString());
      triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
    }
  }, [syncTablesOffline, onTableCountChange, triggerToast]);

  // Request handlers that open TableSecurityModal for admin PIN confirmation
  const requestTableCountChange = useCallback((newCount) => {
    const target = parseInt(newCount, 10);
    if (isNaN(target) || target < 1) {
      triggerToast('Please enter a valid table count (minimum 1)', 'error');
      return;
    }
    if (target > 50) {
      triggerToast('Maximum floor capacity is 50 tables', 'error');
      return;
    }
    if (target === tables.length) {
      triggerToast(`Floor tables already set to ${target}`, 'info');
      return;
    }

    setSecurityModalState({
      isOpen: true,
      actionTitle: 'Authorize Floor Capacity Change',
      actionDescription: `Change total restaurant floor capacity from ${tables.length} to ${target} tables. ${
        target > tables.length 
          ? `Will initialize ${target - tables.length} new available tables.` 
          : `Will decommission the last ${tables.length - target} tables.`
      }`,
      pendingAction: () => handleTableCountChange(target)
    });
  }, [tables.length, triggerToast, handleTableCountChange]);

  const requestAddNewTable = useCallback(() => {
    const currentMax = tables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
    const nextNum = currentMax + 1;
    setSecurityModalState({
      isOpen: true,
      actionTitle: 'Authorize Add Table',
      actionDescription: `Add Table #${nextNum} (4 seats, Main Hall) to the live floor matrix. Capacity will increase from ${tables.length} to ${tables.length + 1}.`,
      pendingAction: () => handleAddNewTable()
    });
  }, [tables, handleAddNewTable]);

  const requestRemoveLastTable = useCallback(() => {
    if (tables.length <= 1) {
      triggerToast('Venue must maintain at least 1 table on the floor', 'error');
      return;
    }
    const lastTable = tables[tables.length - 1];
    setSecurityModalState({
      isOpen: true,
      actionTitle: 'Authorize Remove Last Table',
      actionDescription: `Permanently decommission Table #${lastTable.tableNumber} (${lastTable.name}). Total floor capacity will decrease from ${tables.length} to ${tables.length - 1}.`,
      pendingAction: () => handleRemoveSpecificTable(lastTable.tableNumber)
    });
  }, [tables, triggerToast, handleRemoveSpecificTable]);

  const requestRemoveSpecificTable = useCallback((tableNumber) => {
    if (tables.length <= 1) {
      triggerToast('Venue must maintain at least 1 table on the floor', 'error');
      return;
    }
    const targetTable = tables.find(t => t.tableNumber === tableNumber);
    const isOccupied = targetTable && targetTable.status !== TABLE_STATUS.AVAILABLE;
    setSecurityModalState({
      isOpen: true,
      actionTitle: `Authorize Remove Table #${tableNumber}`,
      actionDescription: `Permanently remove Table #${tableNumber} (${targetTable?.name || `Table ${tableNumber}`}, ${targetTable?.capacity || 4} seats)${
        isOccupied ? ' ⚠️ Table currently has an active order or assistance call!' : ''
      }. Total floor tables will decrease from ${tables.length} to ${tables.length - 1}.`,
      pendingAction: () => handleRemoveSpecificTable(tableNumber)
    });
  }, [tables, triggerToast, handleRemoveSpecificTable]);

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

  // Active Orders Count (uncompleted and not yet served to guests)
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => !o.completed && o.kitchenFlowStage !== KITCHEN_STAGE.SERVED).length;
  }, [orders]);

  // Table Occupancy: number of occupied tables and occupancy percentage (offline-first)
  const occupiedCount = useMemo(() => {
    return tables.filter(t => t.status !== TABLE_STATUS.AVAILABLE).length;
  }, [tables]);

  const occupancyRate = useMemo(() => {
    if (!tables.length) return 0;
    return Math.round((occupiedCount / tables.length) * 100);
  }, [occupiedCount, tables.length]);

  // ---------------------------------------------------------------------------
  // FILTERED TABLES
  // ---------------------------------------------------------------------------
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      // Status pill filter
      if (activeFilter !== 'all' && table.status !== activeFilter) {
        return false;
      }

      return true;
    });
  }, [tables, activeFilter]);

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
      toastMsg = `Table ${tableNumber}: Order #${order.orderNumber} is Ready for Pickup! Employee alerted 🔔`;
    } else if (order.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP) {
      nextStage = KITCHEN_STAGE.SERVED;
      nextTableStatus = TABLE_STATUS.ORDER_RUNNING;
      toastMsg = `Table ${tableNumber}: Order #${order.orderNumber} marked as Served to Guests 🍽️`;
    }

    // Update orders state
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, kitchenFlowStage: nextStage } : o)));

    // Update table status
    setTables(prev => {
      const next = prev.map(t => (t.tableNumber === tableNumber ? { ...t, status: nextTableStatus } : t));
      syncTablesOffline(next);
      return next;
    });

    triggerToast(toastMsg, 'info');

    if (onAdvanceOrderStage) {
      onAdvanceOrderStage(orderId, nextStage, tableNumber);
    }

    setTimeout(() => {
      setAdvancingOrderIds(prev => ({ ...prev, [orderId]: false }));
    }, 500);
  }, [orders, triggerToast, onAdvanceOrderStage, syncTablesOffline]);

  // Clear / Reset Table (when served or settling bill)
  const handleResetTable = useCallback((tableNumber) => {
    playChimeSound();
    setTables(prev => {
      const next = prev.map(t => {
        if (t.tableNumber === tableNumber) {
          return {
            ...t,
            status: TABLE_STATUS.AVAILABLE,
            currentOrderId: null
          };
        }
        return t;
      });
      syncTablesOffline(next);
      return next;
    });

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
  }, [triggerToast, onResetTable, syncTablesOffline]);

  // Bill printing / settlement: a table's bill is built from its orders that are not yet completed
  // With a parent handler the shared order/table state is updated there; otherwise settle locally
  const handleSettleTable = useCallback(async (bill, paymentMethod) => {
    if (typeof onSettleTable === 'function') {
      await onSettleTable(bill, paymentMethod);
    } else {
      const billOrders = orders.filter(o => bill.orderIds.includes(String(o.id)));
      await settleTableOrders({ bill, paymentMethod, orders: billOrders });
      handleResetTable(bill.tableNumber);
    }
    triggerToast(`Table ${bill.tableNumber} settled by ${paymentMethod} (${formatMoney(bill.total)})`, 'success');
    setBillTarget(null);
  }, [onSettleTable, orders, handleResetTable, triggerToast]);

  // Reassign Employee to a Table (Rule 2)
  const handleReassignEmployee = useCallback((tableNumber, newEmployeeId) => {
    playChimeSound();
    const empId = newEmployeeId ? String(newEmployeeId) : null;
    const newEmp = employees.find(e => String(e.id) === empId || (e.numericId && String(e.numericId) === empId));
    const empName = newEmp ? newEmp.name : (empId ? 'Employee' : 'Unassigned');

    setTables(prev => {
      const next = prev.map(t => (t.tableNumber === tableNumber ? { ...t, assignedEmployeeId: empId } : t));
      syncTablesOffline(next);
      return next;
    });
    setOrders(prev => prev.map(o => (o.tableNumber === tableNumber ? { ...o, assignedEmployeeId: empId } : o)));

    // Bubble to parent shared context handler
    if (onAssignEmployee) {
      onAssignEmployee(tableNumber, empId);
    }

    setActiveEmployeeDropdownTableId(null);
    triggerToast(`Table ${tableNumber} assigned to ${empName}`, 'success');
  }, [employees, onAssignEmployee, triggerToast, syncTablesOffline]);

  // Request Employee Reassignment with Admin PIN verification
  const requestReassignEmployee = useCallback((tableNumber, newEmployeeId, onModalConfirmedCallback) => {
    const targetTable = tables.find(t => t.tableNumber === tableNumber);
    const currentEmpId = targetTable?.assignedEmployeeId ? String(targetTable.assignedEmployeeId) : '';
    const targetEmpId = newEmployeeId ? String(newEmployeeId) : '';

    // If no change, return immediately without requiring PIN
    if (currentEmpId === targetEmpId) {
      return;
    }

    const currentEmp = employees.find(e => String(e.id) === currentEmpId || (e.numericId && String(e.numericId) === currentEmpId));
    const currentEmpName = currentEmp ? currentEmp.name : 'Unassigned (Floor Pool)';

    const targetEmp = employees.find(e => String(e.id) === targetEmpId || (e.numericId && String(e.numericId) === targetEmpId));
    const targetEmpName = targetEmp ? `${targetEmp.name} (${targetEmp.role?.split(' ')[0] || 'Staff'})` : 'Unassigned (Floor Pool)';

    setSecurityModalState({
      isOpen: true,
      actionTitle: `Authorize Staff Assignment • Table #${tableNumber}`,
      actionDescription: targetEmpId
        ? `Assign Table #${tableNumber} to ${targetEmpName}. Real-time waiter dispatch, kitchen pickup alerts, and table management for Table #${tableNumber} will route to ${targetEmp?.name || 'this staff member'}.`
        : `Unassign Table #${tableNumber} (currently assigned to ${currentEmpName}) and return to the unassigned floor pool.`,
      actionNotice: 'Admin PIN verification required to update floor staff table routing.',
      pendingAction: () => {
        handleReassignEmployee(tableNumber, newEmployeeId);
        if (typeof onModalConfirmedCallback === 'function') {
          onModalConfirmedCallback();
        }
      }
    });
  }, [tables, employees, handleReassignEmployee]);

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
    setTables(prev => {
      const next = prev.map(t => {
        if (t.tableNumber === tableNumber) {
          const hasOrder = orders.some(o => o.tableNumber === tableNumber && o.kitchenFlowStage !== KITCHEN_STAGE.SERVED);
          return {
            ...t,
            status: hasOrder ? TABLE_STATUS.ORDER_RUNNING : TABLE_STATUS.AVAILABLE
          };
        }
        return t;
      });
      syncTablesOffline(next);
      return next;
    });

    setActiveIssueModal(null);
    triggerToast(`Assistance request for Table ${tableNumber} resolved successfully!`, 'success');

    if (onResolveIssue) {
      onResolveIssue(noteId, tableNumber, resolutionMemo);
    }
  }, [orders, triggerToast, onResolveIssue, syncTablesOffline]);

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
    <div className="flr-root">

      {/* HERO: floor capacity. Table count change stays behind the admin PIN via requestTableCountChange */}
      <div className="flr-hero">
        <div className="flr-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
          <div className="flr-avatar" style={{ width: '2.5rem', height: '2.5rem', background: 'var(--adm-primary)', color: 'var(--adm-primary-fg)' }}>
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 className="flr-hero__title">Floor &amp; tables</h2>
            <p className="flr-hero__sub">
              {tables.length} tables &middot; changes sync to guest QR codes and staff handsets
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestTableCountChange(customTableCount);
          }}
          className="flr-count-form"
        >
          <label htmlFor="hero-table-count-input" className="flr-label">Total tables</label>
          <input
            id="hero-table-count-input"
            type="number"
            min="1"
            max="60"
            value={customTableCount}
            onChange={(e) => setCustomTableCount(e.target.value)}
            placeholder={String(tables.length)}
            className="flr-input"
            title="Type desired total table count (1-60)"
          />
          <button
            type="submit"
            className="flr-btn flr-btn--primary"
            title="Apply desired table count (requires admin PIN)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </form>
      </div>

      {/* KPI row: each tile filters the grid. Colours: green free, amber ordering, blue ready, red assistance */}
      <div className="flr-kpis">
        <button
          type="button"
          className="flr-kpi-btn"
          data-tone="success"
          aria-pressed={activeFilter === TABLE_STATUS.AVAILABLE}
          onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.AVAILABLE ? 'all' : TABLE_STATUS.AVAILABLE)}
        >
          <div className="flr-kpi__label">Available</div>
          <div className="flr-kpi__value">{counts.available}</div>
          <div className="flr-kpi__hint">of {counts.all} tables, ready to seat</div>
        </button>

        <button
          type="button"
          className="flr-kpi-btn"
          data-tone="warning"
          aria-pressed={activeFilter === TABLE_STATUS.ORDER_RUNNING}
          onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.ORDER_RUNNING ? 'all' : TABLE_STATUS.ORDER_RUNNING)}
        >
          <div className="flr-kpi__label">Ordering</div>
          <div className="flr-kpi__value">{counts.orderRunning}</div>
          <div className="flr-kpi__hint">Placed or cooking</div>
        </button>

        <button
          type="button"
          className="flr-kpi-btn"
          data-tone="info"
          aria-pressed={activeFilter === TABLE_STATUS.READY_IN_KITCHEN}
          onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.READY_IN_KITCHEN ? 'all' : TABLE_STATUS.READY_IN_KITCHEN)}
        >
          <div className="flr-kpi__label">Ready</div>
          <div className="flr-kpi__value">{counts.readyInKitchen}</div>
          <div className="flr-kpi__hint">Ready in kitchen for pickup</div>
        </button>

        <button
          type="button"
          className="flr-kpi-btn"
          data-tone="danger"
          aria-pressed={activeFilter === TABLE_STATUS.NEED_ASSISTANCE}
          onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.NEED_ASSISTANCE ? 'all' : TABLE_STATUS.NEED_ASSISTANCE)}
        >
          <div className="flr-kpi__label">Needs assistance</div>
          <div className="flr-kpi__value">{counts.needAssistance}</div>
          <div className="flr-kpi__hint">Guest calls waiting</div>
        </button>
      </div>

      {/* TOOLBAR: filter chips, view mode, staff balance, add table */}
      <div className="flr-panel flr-stack">
        <div className="flr-toolbar">
          <div className="flr-tabs" role="group" aria-label="Filter tables by status">
            {[
              { id: 'all', label: 'All tables', count: counts.all, tone: 'neutral' },
              { id: TABLE_STATUS.AVAILABLE, label: 'Available', count: counts.available, tone: 'success' },
              { id: TABLE_STATUS.ORDER_RUNNING, label: 'Ordering', count: counts.orderRunning, tone: 'warning' },
              { id: TABLE_STATUS.READY_IN_KITCHEN, label: 'Ready', count: counts.readyInKitchen, tone: 'info' },
              { id: TABLE_STATUS.NEED_ASSISTANCE, label: 'Needs assistance', count: counts.needAssistance, tone: 'danger' }
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                data-tone={chip.tone}
                aria-pressed={activeFilter === chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className="flr-tab"
              >
                {chip.id !== 'all' && <span className="flr-dot" />}
                <span>{chip.label}</span>
                <span className="flr-tab__count">{chip.count}</span>
              </button>
            ))}
          </div>

          <div className="flr-toolbar__right">
            <div className="flr-tabs" role="group" aria-label="View mode" style={{ overflow: 'visible' }}>
              <button
                type="button"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className="flr-tab"
                title="Grid view"
              >
                <Layers className="w-4 h-4" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'compact'}
                onClick={() => setViewMode('compact')}
                className="flr-tab"
                title="Compact list view"
              >
                <Filter className="w-4 h-4" />
                <span>List</span>
              </button>
            </div>

            {onAutoBalanceTables && (
              <button
                type="button"
                onClick={() => {
                  setSecurityModalState({
                    isOpen: true,
                    actionTitle: 'Authorize Floor Staff Auto-Balance',
                    actionDescription: `Automatically redistribute all ${tables.length} floor tables evenly across all active floor staff. Existing table assignments will be reallocated.`,
                    actionNotice: 'Admin PIN verification required to rebalance table assignments.',
                    pendingAction: () => {
                      onAutoBalanceTables();
                      triggerToast('Tables balanced evenly across all active floor employees!', 'success');
                    }
                  });
                }}
                className="flr-btn"
                title="Distribute tables evenly across active employees (requires admin PIN)"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Balance staff</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddTableModalOpen(true)}
              className="flr-btn flr-btn--primary"
              title="Add a custom table (requires admin PIN)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add table</span>
            </button>
          </div>
        </div>

        {activeFilter !== 'all' && (
          <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.6rem' }}>
            <span className="flr-muted">Showing {filteredTables.length} of {tables.length} tables</span>
            <button type="button" className="flr-btn flr-btn--ghost" style={{ minHeight: '2rem', color: 'var(--adm-primary)' }} onClick={() => setActiveFilter('all')}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast (dispatch and update notices) */}
      {notificationToast && (
        <div className="flr-toast" role="status">
          <span className="flr-dot" style={{ background: 'var(--adm-primary)' }} />
          <span>{notificationToast.message}</span>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="flr-btn flr-btn--ghost flr-btn--icon"
            aria-label="Dismiss notice"
            style={{ minHeight: '2rem', width: '2rem' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Legend: one meaning per colour */}
      <div className="flr-row flr-muted" aria-label="Table status legend">
        <span className="flr-tone-chip" data-tone="success"><span className="flr-dot" />Available</span>
        <span className="flr-tone-chip" data-tone="warning"><span className="flr-dot" />Ordering</span>
        <span className="flr-tone-chip" data-tone="info"><span className="flr-dot" />Ready for pickup</span>
        <span className="flr-tone-chip" data-tone="danger"><span className="flr-dot" />Needs assistance</span>
      </div>

      {/* TABLE GRID */}
      {filteredTables.length === 0 ? (
        <div className="flr-empty">
          <UtensilsCrossed className="w-8 h-8" style={{ opacity: 0.6 }} />
          <h3 className="flr-empty__title">No tables match this filter</h3>
          <p className="flr-muted" style={{ margin: 0 }}>Choose another status, or show every table again.</p>
          <button type="button" className="flr-btn flr-btn--primary" onClick={() => setActiveFilter('all')}>
            Show all {tables.length} tables
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'flr-tgrid' : 'flr-stack'}>
          {filteredTables.map(table => {
            const activeOrder = getOrderForTable(table);
            const assignedEmp = getAssignedEmployee(table.assignedEmployeeId);
            const issueNote = getIssueForTable(table.tableNumber);
            const isDispatched = dispatchedTables[table.tableNumber];
            const isAdvancing = activeOrder && advancingOrderIds[activeOrder.id];
            const isExpanded = !!expandedTableIds[table.id];
            const hasOrderBlock = !!activeOrder && table.status !== TABLE_STATUS.AVAILABLE;
            const orderTotal = activeOrder
              ? (computeOrderBill(activeOrder, getOrderCorrection(activeOrder.id)).total || activeOrder.total)
              : 0;
            const zoneLabel = table.location || table.zone || 'Main Hall';
            const seatCount = table.capacity || table.seats || 4;
            const staffFirstName = assignedEmp?.name ? assignedEmp.name.split(' ')[0] : 'Unassigned';

            // One tone per status: success = available, warning = ordering,
            // info = ready for pickup, danger = needs assistance.
            let statusLabel = 'Available';
            let statusTone = 'success';
            if (table.status === TABLE_STATUS.ORDER_RUNNING) {
              statusLabel = 'Ordering';
              statusTone = 'warning';
            } else if (table.status === TABLE_STATUS.READY_IN_KITCHEN) {
              statusLabel = 'Ready';
              statusTone = 'info';
            } else if (table.status === TABLE_STATUS.NEED_ASSISTANCE) {
              statusLabel = 'Needs assistance';
              statusTone = 'danger';
            }

            const stageIdx = activeOrder ? ORDER_PIPELINE_STAGES.map(s => s.key).indexOf(activeOrder.kitchenFlowStage) : -1;
            const bodyId = `flr-tcard-body-${table.id}`;

            return (
              <article
                key={table.id}
                className={`flr-tcard${isExpanded ? ' is-expanded' : ''}`}
                data-tone={statusTone}
              >
                {/* Compact header: table number and one status pill */}
                <div className="flr-tcard__head">
                  <div className="flr-tcard__num">#{table.tableNumber}</div>
                  <span className="flr-tone-chip flr-tcard__pill" data-tone={statusTone}>
                    {statusTone === 'danger' ? <AlertTriangle className="w-3 h-3" /> : <span className="flr-dot" />}
                    <span>{statusLabel}</span>
                  </span>
                </div>

                <div className="flr-tcard__name flr-ellipsis" title={table.name}>{table.name}</div>
                <div
                  className="flr-tcard__meta flr-ellipsis"
                  title={`${seatCount} seats · ${zoneLabel}`}
                >
                  {seatCount} seats &middot; {zoneLabel}
                </div>

                {/* Single summary line: order total or vacant */}
                {hasOrderBlock ? (
                  <div className="flr-tcard__total flr-ellipsis" title={`Current order total ${formatCurrency(orderTotal)}`}>
                    <span className="flr-muted">Total</span>{' '}
                    <span className="flr-amount">{formatCurrency(orderTotal)}</span>
                  </div>
                ) : (
                  <div className="flr-tcard__total flr-tcard__total--vacant flr-ellipsis" title="Clean and vacant">
                    Clean and vacant
                  </div>
                )}

                {/* Footer: staff avatar (first name only) and details toggle */}
                <div className="flr-tcard__foot">
                  <div className="flr-tcard__staff" title={assignedEmp?.name ? `Assigned to ${assignedEmp.name}` : 'Unassigned (floor pool)'}>
                    <span
                      className="flr-avatar flr-tcard__avatar"
                      style={{ backgroundColor: assignedEmp?.avatarColor || assignedEmp?.color || 'var(--adm-primary)' }}
                    >
                      {assignedEmp?.initials || assignedEmp?.avatar?.initials || 'FE'}
                    </span>
                    <span className="flr-ellipsis">{staffFirstName}</span>
                  </div>
                  <button
                    type="button"
                    className="flr-tcard__toggle"
                    aria-expanded={isExpanded}
                    aria-controls={bodyId}
                    onClick={() => setExpandedTableIds(prev => ({ ...prev, [table.id]: !prev[table.id] }))}
                  >
                    <span>Details</span>
                    <ChevronDown className={`w-3.5 h-3.5 flr-tcard__chev${isExpanded ? ' is-open' : ''}`} />
                  </button>
                </div>

                {isExpanded && (
                  <div id={bodyId} className="flr-tcard__body">
                    {/* Assigned staff (reassignment is PIN-free in the original logic; unchanged) */}
                    <div className="flr-box flr-stack" style={{ gap: '0.4rem' }}>
                      <div className="flr-row flr-row--between">
                        <span className="flr-label">Assigned staff</span>
                        <span className="flr-muted flr-ellipsis" style={{ maxWidth: '50%' }} title={assignedEmp?.role || ''}>{assignedEmp?.role || ''}</span>
                      </div>
                      <div className="flr-row" style={{ flexWrap: 'nowrap' }}>
                        <div
                          className="flr-avatar"
                          style={{ backgroundColor: assignedEmp?.avatarColor || assignedEmp?.color || 'var(--adm-primary)' }}
                        >
                          {assignedEmp?.initials || assignedEmp?.avatar?.initials || 'FE'}
                        </div>
                        <select
                          aria-label={`Assigned Employee for Table ${table.tableNumber}`}
                          value={table.assignedEmployeeId ? String(table.assignedEmployeeId) : ''}
                          onChange={(e) => {
                            const val = e.target.value ? e.target.value : null;
                            requestReassignEmployee(table.tableNumber, val);
                          }}
                          className="flr-select flr-grow"
                        >
                          <option value="">Unassigned (floor pool)</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.role?.split(' ')[0] || 'Staff'}) {emp.status === 'Active' || emp.status === 'active' ? '· Active' : `· ${emp.status}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Assistance alert */}
                    {table.status === TABLE_STATUS.NEED_ASSISTANCE && (
                      <div className="flr-alert flr-stack" data-tone="danger" style={{ gap: '0.4rem' }}>
                        <div className="flr-row flr-row--between">
                          <span className="flr-strong flr-row" style={{ gap: 6, color: 'var(--adm-danger)' }}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Guest asked for help</span>
                          </span>
                          {issueNote?.severity && (
                            <span className="flr-tone-chip" data-tone={issueNote.severity === ISSUE_SEVERITY.CRITICAL ? 'danger' : 'warning'}>
                              {issueNote.severity}
                            </span>
                          )}
                        </div>
                        <p className="flr-clamp" style={{ margin: 0, fontSize: '0.82rem', color: 'var(--adm-text)' }}>
                          &quot;{issueNote ? issueNote.complaintText : 'Guest requested prompt employee assistance at table.'}&quot;
                        </p>
                        <div className="flr-muted">
                          Guest: <span className="flr-strong">{issueNote?.customerName || 'Dining guest'}</span>
                        </div>
                      </div>
                    )}

                    {/* Order items and stage progression */}
                    {hasOrderBlock && (
                      <div className="flr-stack" style={{ gap: '0.5rem' }}>
                        <div className="flr-box flr-stack" style={{ gap: '0.35rem' }}>
                          <div className="flr-row flr-row--between">
                            <span className="flr-strong flr-ellipsis" title={`${activeOrder.orderNumber} · ${activeOrder.customerName}`}>
                              {activeOrder.orderNumber} &middot; {activeOrder.customerName}
                            </span>
                            <span className="flr-muted flr-row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                              <Clock className="w-3 h-3" />
                              <span>{formatElapsed(activeOrder.timeElapsedMinutes)}</span>
                            </span>
                          </div>
                          <div className="flr-tcard__items">
                            {activeOrder.items.map((item, idx) => (
                              <div key={item.id || idx} className="flr-tcard__item">
                                <span className="flr-ellipsis" title={`${item.quantity} x ${item.name}`}>
                                  <span className="flr-tcard__qty">{item.quantity}x</span>
                                  {item.name}
                                </span>
                                <span className="flr-amount" style={{ flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.4rem' }}>
                            <span className="flr-muted">Total</span>
                            <span className="flr-amount">{formatCurrency(orderTotal)}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flr-row flr-row--between" style={{ marginBottom: 4 }}>
                            <span className="flr-label">Kitchen to table</span>
                            <span className="flr-muted">{stageIdx + 1} of 4</span>
                          </div>
                          <div className="flr-stepper">
                            {ORDER_PIPELINE_STAGES.map((stage, sIdx) => {
                              const isDone = sIdx < stageIdx;
                              const isCurr = sIdx === stageIdx;
                              return (
                                <div
                                  key={stage.key}
                                  className={`flr-step${isDone ? ' is-done' : ''}${isCurr ? ' is-current' : ''}`}
                                  title={stage.description}
                                >
                                  {isDone ? <Check className="w-3 h-3" /> : <span>{sIdx + 1}</span>}
                                  <span>{stage.shortLabel}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty table */}
                    {table.status === TABLE_STATUS.AVAILABLE && (
                      <div className="flr-box" style={{ textAlign: 'center', padding: '0.8rem 0.7rem' }}>
                        <div className="flr-strong">Clean and vacant</div>
                        <div className="flr-muted">Seats {table.capacity || 4} guests</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flr-stack" style={{ gap: '0.45rem' }}>
                      {activeOrder && activeOrder.kitchenFlowStage !== KITCHEN_STAGE.SERVED && (
                        <button
                          type="button"
                          disabled={isAdvancing}
                          onClick={() => handleAdvanceStage(activeOrder.id, table.tableNumber)}
                          className="flr-btn flr-btn--primary flr-full"
                        >
                          {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PLACED && (
                            <>
                              <Flame className="w-3.5 h-3.5" />
                              <span>Send to kitchen</span>
                            </>
                          )}
                          {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PREPARING && (
                            <>
                              <ConciergeBell className="w-3.5 h-3.5" />
                              <span>Mark ready &amp; alert staff</span>
                            </>
                          )}
                          {activeOrder.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP && (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm served to table</span>
                            </>
                          )}
                        </button>
                      )}

                      {activeOrder && activeOrder.kitchenFlowStage === KITCHEN_STAGE.SERVED && (
                        <button
                          type="button"
                          onClick={() => handleResetTable(table.tableNumber)}
                          className="flr-btn flr-btn--primary flr-full"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear and reset table</span>
                        </button>
                      )}

                      {activeOrder && (
                        <>
                          <button
                            type="button"
                            onClick={() => setBillTarget({ tableNumber: table.tableNumber })}
                            className="flr-btn flr-full"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print bill</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillTarget({ tableNumber: table.tableNumber })}
                            className="flr-btn flr-full"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Settle &amp; close table</span>
                          </button>
                        </>
                      )}

                      {table.status === TABLE_STATUS.NEED_ASSISTANCE && (
                        <button
                          type="button"
                          onClick={() => setActiveIssueModal({ table, note: issueNote })}
                          className="flr-btn flr-full"
                          style={{ background: 'var(--adm-danger)', borderColor: 'transparent', color: '#fff' }}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Handle request</span>
                        </button>
                      )}

                      <div className="flr-table-actions">
                        <button
                          type="button"
                          onClick={() => handleDispatchEmployee(table.tableNumber, table.assignedEmployeeId)}
                          className="flr-btn"
                          title="Dispatch alert to assigned employee handset"
                          style={isDispatched ? { background: 'var(--adm-success)', color: '#fff', borderColor: 'transparent' } : undefined}
                        >
                          {isDispatched ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Dispatched</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Notify staff</span>
                            </>
                          )}
                        </button>

                        {activeOrder ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOrderModal({ order: activeOrder, table, employee: assignedEmp })}
                            className="flr-btn"
                            title="View full order receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        ) : table.status === TABLE_STATUS.AVAILABLE ? (
                          <button
                            type="button"
                            onClick={() => triggerToast(`Table ${table.tableNumber} is ready. Guest QR code active.`, 'info')}
                            className="flr-btn"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Seat table</span>
                          </button>
                        ) : <span />}
                      </div>

                      <div style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => requestRemoveSpecificTable(table.tableNumber)}
                          className="flr-danger-link"
                          title={`Remove Table #${table.tableNumber} (requires Admin PIN)`}
                          aria-label={`Remove Table #${table.tableNumber} from floor, requires admin PIN`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove table (PIN)</span>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flr-tcard__toggle"
                      onClick={() => setExpandedTableIds(prev => ({ ...prev, [table.id]: false }))}
                      aria-controls={bodyId}
                      aria-expanded={true}
                    >
                      <ChevronDown className="w-3.5 h-3.5 flr-tcard__chev is-open" />
                      <span>Hide details</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD TABLE */}
      {isAddTableModalOpen && (
        <div className="flr-backdrop" onClick={() => setIsAddTableModalOpen(false)}>
          <div className="flr-modal" role="dialog" aria-modal="true" aria-label="Add table" style={{ maxWidth: '34rem' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close" onClick={() => setIsAddTableModalOpen(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            <div style={{ paddingBottom: '0.9rem', borderBottom: '1px solid var(--adm-border)' }}>
              <h3 className="flr-title" style={{ fontSize: '1.05rem' }}>Add table to floor</h3>
              <p className="flr-muted" style={{ margin: '0.25rem 0 0' }}>
                Will be created as table #{tables.length + 1} with a printable QR code.
              </p>
            </div>

            <div className="flr-stack" style={{ padding: '1rem 0', gap: '1rem' }}>
              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <div className="flr-row flr-row--between">
                  <span className="flr-label">Seats</span>
                  <span className="flr-strong">{newTableSeats} seats</span>
                </div>
                <div className="flr-choice-grid">
                  {[2, 4, 6, 8].map((seats) => (
                    <button key={seats} type="button" className="flr-choice" aria-pressed={newTableSeats === seats} onClick={() => setNewTableSeats(seats)}>
                      <Users className="w-3.5 h-3.5" />
                      <span>{seats}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <span className="flr-label">Dining zone</span>
                <div className="flr-choice-grid flr-choice-grid--3">
                  {[
                    { id: 'Main Hall', label: 'Main hall' },
                    { id: 'Window', label: 'Window side' },
                    { id: 'Patio', label: 'Patio' }
                  ].map((zone) => (
                    <button key={zone.id} type="button" className="flr-choice" aria-pressed={newTableZone === zone.id} onClick={() => setNewTableZone(zone.id)}>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{zone.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <label className="flr-label" htmlFor="new-table-staff">Assigned staff</label>
                <select
                  id="new-table-staff"
                  value={newTableAssignedEmpId}
                  onChange={(e) => setNewTableAssignedEmpId(e.target.value)}
                  className="flr-select"
                >
                  <option value="">Unassigned (auto-balance later)</option>
                  {employees
                    .filter(emp => emp.status === EMPLOYEE_STATUS.ACTIVE)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} · {emp.role}
                      </option>
                    ))}
                </select>
                <span className="flr-muted">Guest calls from this table route to this employee.</span>
              </div>
            </div>

            <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => requestAddNewTable({ seats: 4, zone: 'Main Hall', assignedEmployeeId: null })}
                className="flr-btn"
                title="Quickly add default 4-seat table (requires admin PIN)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick add (4 seats)</span>
              </button>
              <div className="flr-row">
                <button type="button" onClick={() => setIsAddTableModalOpen(false)} className="flr-btn flr-btn--ghost">
                  Cancel
                </button>
                <button type="button" onClick={() => requestAddNewTable()} className="flr-btn flr-btn--primary">
                  <Plus className="w-4 h-4" />
                  <span>Add table</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER RECEIPT */}
      {billTarget && (
        <BillPreviewModal
          open
          tableNumber={billTarget.tableNumber}
          orders={orders.filter(o => o.tableNumber === billTarget.tableNumber && !o.completed)}
          onClose={() => setBillTarget(null)}
          onSettle={handleSettleTable}
        />
      )}

      <OrderCorrectionModal
        isOpen={Boolean(billCorrectionOrder)}
        order={billCorrectionOrder}
        mode="admin"
        onClose={() => setBillCorrectionOrder(null)}
      />

      {selectedOrderModal && (
        <div className="flr-backdrop" onClick={() => setSelectedOrderModal(null)}>
          <div className="flr-modal" role="dialog" aria-modal="true" aria-label="Order receipt" style={{ maxWidth: '44rem' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close" onClick={() => setSelectedOrderModal(null)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            <div style={{ paddingBottom: '0.9rem', borderBottom: '1px solid var(--adm-border)', paddingRight: '2.5rem' }}>
              <div className="flr-row">
                <h3 className="flr-title" style={{ fontSize: '1.05rem' }}>Order {selectedOrderModal.order.orderNumber}</h3>
                <span className="flr-tone-chip" data-tone="neutral">Table {selectedOrderModal.table.tableNumber}</span>
              </div>
              <p className="flr-muted" style={{ margin: '0.3rem 0 0' }}>
                Guest: <span className="flr-strong">{selectedOrderModal.order.customerName}</span> &middot; placed {formatElapsed(selectedOrderModal.order.timeElapsedMinutes)} &middot; {selectedOrderModal.table.location}
              </p>
            </div>

            <div className="flr-stack" style={{ padding: '1rem 0', gap: '1rem' }}>
              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <span className="flr-label">Kitchen stage</span>
                <div className="flr-stepper">
                  {ORDER_PIPELINE_STAGES.map((s, idx) => {
                    const currIdx = ORDER_PIPELINE_STAGES.map(st => st.key).indexOf(selectedOrderModal.order.kitchenFlowStage);
                    const isDone = idx < currIdx;
                    const isCurr = idx === currIdx;
                    return (
                      <div key={s.key} className={`flr-step${isDone ? ' is-done' : ''}${isCurr ? ' is-current' : ''}`} style={{ padding: '0.6rem 0.3rem' }}>
                        <span style={{ fontWeight: 700 }}>{s.shortLabel}</span>
                        <span style={{ fontWeight: 400 }}>{s.description.split('•')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flr-box flr-row flr-row--between">
                <div className="flr-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                  <div
                    className="flr-avatar"
                    style={{ backgroundColor: selectedOrderModal.employee?.avatarColor || 'var(--adm-primary)', width: '2.2rem', height: '2.2rem' }}
                  >
                    {selectedOrderModal.employee?.initials || 'EM'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="flr-label">Assigned employee</div>
                    <div className="flr-strong">{selectedOrderModal.employee?.name || 'Unassigned'}</div>
                    <div className="flr-muted">
                      {selectedOrderModal.employee?.role || 'Floor specialist'} &middot; {selectedOrderModal.employee?.shift || 'Morning'}
                    </div>
                  </div>
                </div>
                <select
                  aria-label="Reassign table staff"
                  value={selectedOrderModal.table.assignedEmployeeId ? String(selectedOrderModal.table.assignedEmployeeId) : ''}
                  onChange={(e) => {
                    const val = e.target.value ? e.target.value : null;
                    requestReassignEmployee(selectedOrderModal.table.tableNumber, val, () => {
                      const newEmp = employees.find(emp => String(emp.id) === String(val) || (emp.numericId && String(emp.numericId) === String(val)));
                      setSelectedOrderModal(prev => prev ? ({
                        ...prev,
                        employee: newEmp,
                        table: { ...prev.table, assignedEmployeeId: val }
                      }) : null);
                    });
                  }}
                  className="flr-select"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      Assign to: {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <span className="flr-label">Ordered items ({selectedOrderModal.order.items.length})</span>
                <div className="flr-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="ctr">Qty</th>
                        <th className="num">Unit</th>
                        <th className="num">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderModal.order.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td>
                            <span className="flr-strong" style={{ display: 'block' }}>{item.name}</span>
                            {item.notes && <span className="flr-muted" style={{ fontStyle: 'italic' }}>&quot;{item.notes}&quot;</span>}
                          </td>
                          <td className="ctr">{item.quantity}</td>
                          <td className="num">{formatCurrency(item.price)}</td>
                          <td className="num flr-strong">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedOrderModal.order.voiceNoteUrl && (
                <div className="flr-voice">
                  <div className="flr-voice__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Customer voice note</span>
                  </div>
                  <AudioPlayer src={selectedOrderModal.order.voiceNoteUrl} title="Customer Note" />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setBillCorrectionOrder(selectedOrderModal.order)}
                  className="flr-btn flr-btn--ghost"
                  style={{ fontSize: '0.8rem' }}
                >
                  Void items / discount
                </button>
              </div>

              <div className="flr-receipt-sum">
                {(() => {
                  const bill = computeOrderBill(selectedOrderModal.order, getOrderCorrection(selectedOrderModal.order.id));
                  const discount = getOrderCorrection(selectedOrderModal.order.id).discount;
                  return (
                    <>
                      <div className="flr-receipt-line">
                        <span>Subtotal</span>
                        <span>{formatCurrency(bill.hasCorrections ? bill.subtotal : selectedOrderModal.order.subtotal)}</span>
                      </div>
                      {bill.voidedAmount > 0 && (
                        <div className="flr-receipt-line">
                          <span>Voided items</span>
                          <span>-{formatCurrency(bill.voidedAmount)}</span>
                        </div>
                      )}
                      {bill.discountAmount > 0 && (
                        <div className="flr-receipt-line">
                          <span>Discount {discount.type === 'percent' ? `(${discount.value}%)` : ''} &middot; {discount.reason}</span>
                          <span>-{formatCurrency(bill.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flr-receipt-line">
                        <span>Sales tax (10%)</span>
                        <span>{formatCurrency(bill.hasCorrections ? bill.tax : selectedOrderModal.order.tax)}</span>
                      </div>
                      <div className="flr-receipt-line flr-receipt-line--total">
                        <span>Total</span>
                        <span>{formatCurrency(bill.hasCorrections ? bill.total : selectedOrderModal.order.total)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.9rem' }}>
              <button type="button" onClick={() => { window.print(); }} className="flr-btn">
                <Printer className="w-3.5 h-3.5" />
                <span>Print bill</span>
              </button>

              <div className="flr-row">
                <button
                  type="button"
                  onClick={() => {
                    handleDispatchEmployee(selectedOrderModal.table.tableNumber, selectedOrderModal.table.assignedEmployeeId);
                  }}
                  className="flr-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Alert employee</span>
                </button>

                {selectedOrderModal.order.kitchenFlowStage !== KITCHEN_STAGE.SERVED ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleAdvanceStage(selectedOrderModal.order.id, selectedOrderModal.table.tableNumber);
                      setSelectedOrderModal(null);
                    }}
                    className="flr-btn flr-btn--primary"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Advance stage</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleResetTable(selectedOrderModal.table.tableNumber);
                      setSelectedOrderModal(null);
                    }}
                    className="flr-btn flr-btn--primary"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Clear and reset table</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSISTANCE REQUEST */}
      {activeIssueModal && (
        <div className="flr-backdrop" onClick={() => setActiveIssueModal(null)}>
          <div className="flr-modal" role="dialog" aria-modal="true" aria-label="Assistance request" style={{ borderColor: 'var(--adm-danger)' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close" onClick={() => setActiveIssueModal(null)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            <div style={{ paddingBottom: '0.9rem', borderBottom: '1px solid var(--adm-border)', paddingRight: '2.5rem' }}>
              <h3 className="flr-title" style={{ fontSize: '1.05rem' }}>Table {activeIssueModal.table.tableNumber}: assistance request</h3>
              <p className="flr-muted" style={{ margin: '0.25rem 0 0' }}>Zone: {activeIssueModal.table.location}</p>
            </div>

            <div className="flr-alert flr-stack" data-tone="danger" style={{ margin: '1rem 0', gap: '0.4rem' }}>
              <div className="flr-row flr-row--between">
                <span className="flr-muted">Guest: <span className="flr-strong">{activeIssueModal.note?.customerName || 'Dining customer'}</span></span>
                <span className="flr-tone-chip" data-tone="danger">{activeIssueModal.note?.severity || 'Critical'}</span>
              </div>
              <p style={{ margin: 0, color: 'var(--adm-text)' }}>
                &quot;{activeIssueModal.note ? activeIssueModal.note.complaintText : 'Table has pressed the assistance call button requesting prompt floor service.'}&quot;
              </p>
            </div>

            <div className="flr-stack" style={{ gap: '0.6rem' }}>
              <span className="flr-label">Floor action</span>
              <div className="flr-choice-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleDispatchEmployee(activeIssueModal.table.tableNumber, activeIssueModal.table.assignedEmployeeId);
                  }}
                  className="flr-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send staff</span>
                </button>

                {onSelectReportsTab ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIssueModal(null);
                      onSelectReportsTab();
                    }}
                    className="flr-btn"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in reports</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleResolveIssue(activeIssueModal.note?.id, activeIssueModal.table.tableNumber, 'Staff attended to table call immediately');
                    }}
                    className="flr-btn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quick resolve</span>
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
                className="flr-btn flr-btn--primary flr-full"
              >
                <Check className="w-4 h-4" />
                <span>Mark resolved and clear alert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TABLE SECURITY CONFIRMATION MODAL (PIN), unchanged */}
      <TableSecurityModal
        isOpen={securityModalState.isOpen}
        onClose={() => setSecurityModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={(action) => {
          if (typeof action === 'function') {
            action();
          }
        }}
        actionTitle={securityModalState.actionTitle}
        actionDescription={securityModalState.actionDescription}
        actionNotice={securityModalState.actionNotice}
        pendingData={securityModalState.pendingAction}
      />

    </div>
  );
}
