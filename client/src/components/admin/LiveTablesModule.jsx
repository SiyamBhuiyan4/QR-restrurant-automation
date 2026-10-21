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
import '../../styles/admin-tables.css';

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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'compact'

  // Modals & Active Selections
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
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
  // PROTECTED TABLE MANAGEMENT (Requires PIN: 808080 via TableSecurityModal)
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
      if (typeof onUpdateTables === 'function') {
        onUpdateTables(nextTables);
      }
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    setCustomTableCount(nextCount.toString());
    triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
  }, [onUpdateTables, onTableCountChange, triggerToast]);

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
      if (typeof onUpdateTables === 'function') {
        onUpdateTables(nextTables);
      }
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    setCustomTableCount(nextCount.toString());
    triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
  }, [onUpdateTables, onTableCountChange, triggerToast]);

  const handleRemoveSpecificTable = useCallback((tableNumber) => {
    let nextCount = 0;
    setTables(prev => {
      if (prev.length <= 1) {
        triggerToast('Venue must maintain at least 1 table on the floor', 'error');
        return prev;
      }
      const nextTables = prev.filter(t => t.tableNumber !== tableNumber);
      nextCount = nextTables.length;
      if (typeof onUpdateTables === 'function') {
        onUpdateTables(nextTables);
      }
      if (typeof onTableCountChange === 'function') {
        onTableCountChange(nextCount);
      }
      return nextTables;
    });

    if (nextCount > 0) {
      setCustomTableCount(nextCount.toString());
      triggerToast(`Admin password authorized. Floor tables updated to ${nextCount}`, 'success');
    }
  }, [onUpdateTables, onTableCountChange, triggerToast]);

  // Request handlers that open TableSecurityModal with password 808080 confirmation
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

  // Reassign Employee to a Table (Rule 2)
  const handleReassignEmployee = useCallback((tableNumber, newEmployeeId) => {
    playChimeSound();
    const empId = newEmployeeId ? String(newEmployeeId) : null;
    const newEmp = employees.find(e => String(e.id) === empId || (e.numericId && String(e.numericId) === empId));
    const empName = newEmp ? newEmp.name : (empId ? 'Employee' : 'Unassigned');

    setTables(prev => prev.map(t => (t.tableNumber === tableNumber ? { ...t, assignedEmployeeId: empId } : t)));
    setOrders(prev => prev.map(o => (o.tableNumber === tableNumber ? { ...o, assignedEmployeeId: empId } : o)));

    // Bubble to parent shared context handler
    if (onAssignEmployee) {
      onAssignEmployee(tableNumber, empId);
    }

    setActiveEmployeeDropdownTableId(null);
    triggerToast(`Table ${tableNumber} assigned to ${empName}`, 'success');
  }, [employees, onAssignEmployee, triggerToast]);

  // Request Employee Reassignment with Admin PIN (808080) verification
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
      actionNotice: 'Admin PIN verification (808080) required to update floor staff table routing.',
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
          HERO BANNER: DYNAMIC FLOOR CAPACITY & TABLE MANAGER (VERY TOP OF PAGE)
          ======================================================================= */}
      <div className="bg-gradient-to-r from-orange-600 via-[#FF5A26] to-amber-500 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-orange-950/40 border border-orange-400/40 flex flex-col xl:flex-row xl:items-center justify-between gap-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0 border border-white/30">
            <Grid3X3 className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                Floor Capacity &amp; Table Scaling
              </h2>
              <span className="bg-black/30 backdrop-blur-sm text-white px-3.5 py-1 rounded-full text-xs font-black border border-white/30 tracking-wide">
                {tables.length} Total Tables
              </span>
            </div>
            <p className="text-xs sm:text-sm text-orange-100 font-medium mt-1">
              Add or remove tables dynamically &bull; Real-time sync across Diner QR stickers &amp; Employee handsets
            </p>
          </div>
        </div>

        {/* Action Controls: Direct Write & Protected by PIN 808080 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Direct Write Input (NO + / - Stepper, NO presets, NO loose buttons) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestTableCountChange(customTableCount);
            }}
            className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/30 px-3.5 py-2 rounded-2xl shadow-inner"
          >
            <label htmlFor="hero-table-count-input" className="text-xs font-black text-orange-200 uppercase tracking-wider whitespace-nowrap">
              Tables:
            </label>
            <input
              id="hero-table-count-input"
              type="number"
              min="1"
              max="60"
              value={customTableCount}
              onChange={(e) => setCustomTableCount(e.target.value)}
              placeholder={String(tables.length)}
              className="w-16 text-center bg-black/40 text-white font-black text-sm py-1.5 px-2 rounded-xl border border-white/30 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
              title="Type desired total table count (1-60)"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white hover:bg-orange-50 text-orange-600 font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Apply desired table count (Requires PIN 808080)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </form>
        </div>
      </div>

      {/* =======================================================================
          TOP TELEMETRY & STATUS FILTER CONTROLS BAR
          ======================================================================= */}
      <div className="bg-[#111827]/95 backdrop-blur-2xl admin-card border border-slate-700/80 p-5 sm:p-6 space-y-6">
        
        {/* Row 1: Header, Search & View Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] text-white flex items-center justify-center shadow-lg shadow-[#FF5A26]/30 ring-1 ring-white/20 shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="admin-section-title text-lg sm:text-xl font-black text-[#f8fafc] tracking-tight leading-none">
                  Live Orders &amp; Table Tracking
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Floor Matrix
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Real-time {tables.length}-table floor matrix &bull; 4-stage kitchen pipeline &bull; Instant staff dispatch
              </p>
            </div>
          </div>

          {/* Quick Search & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#FF5A26] text-white shadow-md'
                    : 'text-slate-400 hover:text-[#f8fafc]'
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
                    : 'text-slate-400 hover:text-[#f8fafc]'
                }`}
                title="Compact List View"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-Balance Tables Button */}
            {onAutoBalanceTables && (
              <button
                type="button"
                onClick={() => {
                  setSecurityModalState({
                    isOpen: true,
                    actionTitle: 'Authorize Floor Staff Auto-Balance',
                    actionDescription: `Automatically redistribute all ${tables.length} floor tables evenly across all active floor staff. Existing table assignments will be reallocated.`,
                    actionNotice: 'Admin PIN verification (808080) required to rebalance table assignments.',
                    pendingAction: () => {
                      onAutoBalanceTables();
                      triggerToast('Tables balanced evenly across all active floor employees!', 'success');
                    }
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm cursor-pointer active:scale-95 shrink-0"
                title="Distribute tables evenly across active employees (Requires PIN 808080)"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Balance Staff</span>
              </button>
            )}

            {/* Add Table Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsAddTableModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer active:scale-95 shrink-0"
              title="Add a custom table (Requires Admin PIN 808080)"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF7A45]" />
              <span>Add Table</span>
            </button>

          </div>
        </div>

        {/* Row 2: Executive Summary Metrics Telemetry Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Available Metric Card */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.AVAILABLE ? 'all' : TABLE_STATUS.AVAILABLE)}
            className={`group p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeFilter === TABLE_STATUS.AVAILABLE
                ? 'bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                : 'bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/90 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Available
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                {counts.available}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                / {counts.all} tables
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              Vacant &amp; ready to seat
            </p>
            {activeFilter === TABLE_STATUS.AVAILABLE && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
            )}
          </button>

          {/* 2. Order Running Metric Card */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.ORDER_RUNNING ? 'all' : TABLE_STATUS.ORDER_RUNNING)}
            className={`group p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeFilter === TABLE_STATUS.ORDER_RUNNING
                ? 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/40'
                : 'bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/90 border-slate-800 hover:border-amber-500/30 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Orders Running
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {counts.orderRunning}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              Placed &amp; prep underway
            </p>
            {activeFilter === TABLE_STATUS.ORDER_RUNNING && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400" />
            )}
          </button>

          {/* 3. Ready in Kitchen Metric Card */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.READY_IN_KITCHEN ? 'all' : TABLE_STATUS.READY_IN_KITCHEN)}
            className={`group p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeFilter === TABLE_STATUS.READY_IN_KITCHEN
                ? 'bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                : 'bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-900/90 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ready in Kitchen
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <ConciergeBell className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">
                {counts.readyInKitchen}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                for pickup
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              Plated hot • Alerted staff
            </p>
            {activeFilter === TABLE_STATUS.READY_IN_KITCHEN && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-400" />
            )}
          </button>

          {/* 4. Need Assistance Metric Card */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === TABLE_STATUS.NEED_ASSISTANCE ? 'all' : TABLE_STATUS.NEED_ASSISTANCE)}
            className={`group p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeFilter === TABLE_STATUS.NEED_ASSISTANCE
                ? 'bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-900 border-rose-500/50 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
                : 'bg-gradient-to-br from-rose-950/20 via-slate-900/60 to-slate-900/90 border-slate-800 hover:border-rose-500/30 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Need Assistance
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
                {counts.needAssistance}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                call alert
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
              Guest assistance calls
            </p>
            {activeFilter === TABLE_STATUS.NEED_ASSISTANCE && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-red-500" />
            )}
          </button>

        </div>

        {/* Row 3: Modern Glassmorphic Status Tab Bar */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          
          {/* Tab: ALL */}
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-lg shadow-black/40 ring-1 ring-slate-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
            <span>All Tables</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === 'all' ? 'bg-[#FF5A26] text-white' : 'bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}>
              {counts.all}
            </span>
          </button>

          {/* Tab: Available - Emerald theme */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.AVAILABLE)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.AVAILABLE
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Available</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.AVAILABLE
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-emerald-400/80 border border-slate-700/60'
            }`}>
              {counts.available}
            </span>
          </button>

          {/* Tab: Order Running - Amber theme with Flame icon */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.ORDER_RUNNING)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.ORDER_RUNNING
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Order Running</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.ORDER_RUNNING
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-amber-400/80 border border-slate-700/60'
            }`}>
              {counts.orderRunning}
            </span>
          </button>

          {/* Tab: Ready in Kitchen - Cyan theme with ConciergeBell icon */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.READY_IN_KITCHEN)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.READY_IN_KITCHEN
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <ConciergeBell className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ready in Kitchen</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.READY_IN_KITCHEN
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800 text-cyan-400/80 border border-slate-700/60'
            }`}>
              {counts.readyInKitchen}
            </span>
          </button>

          {/* Tab: Need Assistance - Rose theme with pulsing red dot and AlertTriangle */}
          <button
            type="button"
            onClick={() => setActiveFilter(TABLE_STATUS.NEED_ASSISTANCE)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeFilter === TABLE_STATUS.NEED_ASSISTANCE
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Need Assistance</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeFilter === TABLE_STATUS.NEED_ASSISTANCE
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 text-rose-400/80 border border-slate-700/60'
            }`}>
              {counts.needAssistance}
            </span>
          </button>

          {/* Reset Filters Shortcut */}
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="ml-auto text-xs text-slate-400 hover:text-[#FF7A45] font-semibold flex items-center gap-1.5 transition cursor-pointer px-3 py-1.5 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
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

      {/* Status legend: what each table colour means */}
      <div className="admin-legend mb-3 px-1" aria-label="Table status legend">
        <span className="admin-legend-item"><span className="admin-legend-dot bg-emerald-400" />Available</span>
        <span className="admin-legend-item"><span className="admin-legend-dot bg-amber-400" />Order running</span>
        <span className="admin-legend-item"><span className="admin-legend-dot bg-cyan-400" />Ready in kitchen</span>
        <span className="admin-legend-item"><span className="admin-legend-dot bg-rose-500" />Needs assistance</span>
      </div>

      {/* =======================================================================
          TABLES GRID VIEW (DISPLAY ALL 12 TABLES)
          ======================================================================= */}
      {filteredTables.length === 0 ? (
        <div className="admin-empty">
          <UtensilsCrossed className="w-10 h-10 text-slate-500" />
          <h3 className="text-base font-bold text-slate-200">No tables match this filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose another status above, or show every table again.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer admin-focusable"
          >
            Show All {tables.length} Tables
          </button>
        </div>
      ) : (
        <div
          className={viewMode === 'grid' 
            ? "grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5 w-full" 
            : "space-y-3 w-full"
          }
          style={viewMode === 'grid' ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '20px',
            width: '100%'
          } : { width: '100%' }}
        >
          {filteredTables.map(table => {
            const activeOrder = getOrderForTable(table);
            const assignedEmp = getAssignedEmployee(table.assignedEmployeeId);
            const issueNote = getIssueForTable(table.tableNumber);
            const isDispatched = dispatchedTables[table.tableNumber];
            const isAdvancing = activeOrder && advancingOrderIds[activeOrder.id];

            // -----------------------------------------------------------------
            // STATUS BADGE CONFIGURATION
            // Available: Soft emerald/slate glow
            // Order Running: Amber flame theme
            // Ready in Kitchen: Cyan concierge theme
            // Customer Call / Issue: Crimson / rose alert glow
            // -----------------------------------------------------------------
            let statusBadge = null;
            let cardAccentClass = 'border-slate-800 hover:border-slate-700 bg-slate-900/80';

            if (table.status === TABLE_STATUS.AVAILABLE) {
              cardAccentClass = 'border-slate-800/80 hover:border-emerald-500/40 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-emerald-950/10';
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full text-[11px] shadow-xs shadow-emerald-500/10 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
                  <span>Available</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.ORDER_RUNNING) {
              cardAccentClass = 'border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-950/20 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-amber-950/15';
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] shadow-xs shadow-amber-500/10 shrink-0">
                  <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Order Running</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.READY_IN_KITCHEN) {
              cardAccentClass = 'border-cyan-500/40 hover:border-cyan-400 shadow-xl shadow-cyan-950/30 ring-1 ring-cyan-500/20 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-cyan-950/15';
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-full text-[11px] shadow-xs shadow-cyan-500/10 shrink-0">
                  <ConciergeBell className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
                  <span>Ready in Kitchen</span>
                </span>
              );
            } else if (table.status === TABLE_STATUS.NEED_ASSISTANCE) {
              cardAccentClass = 'border-rose-500/50 hover:border-rose-400 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/30 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-rose-950/20';
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-[11px] shadow-xs shadow-rose-500/20 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 animate-bounce" />
                  <span>Need Assistance</span>
                </span>
              );
            }

            return (
              <div
                key={table.id}
                className={`admin-card admin-table-card border p-5 backdrop-blur-2xl flex flex-col justify-between relative group overflow-hidden ${cardAccentClass}`}
              >
                {/* -----------------------------------------------------------
                    CARD TOP HEADER: Table #, Capacity, Status Badge & Remove
                    ----------------------------------------------------------- */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center font-black text-sm text-slate-100 shadow-inner shrink-0 group-hover:border-[#FF5A26]/40 transition-colors">
                        {table.tableNumber}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-100 text-base tracking-tight leading-none whitespace-normal break-words">
                          {table.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-1">
                          <span>{table.capacity || table.seats || 4} Seats</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-300">{table.location || table.zone || 'Main Hall'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Status Badge */}
                    <div className="shrink-0 max-w-full flex items-center gap-1.5">
                      {statusBadge}
                    </div>
                  </div>

                  {/* -----------------------------------------------------------
                      ASSIGNED EMPLOYEE SELECTOR (Direct Interactive Dropdown - Rule 2)
                      ----------------------------------------------------------- */}
                  <div className="relative pt-2.5 pb-1 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Assigned Staff
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded" title="Assignment protected by Admin PIN (808080)">
                          <Lock className="w-2.5 h-2.5" />
                          <span>PIN</span>
                        </span>
                      </div>
                      {assignedEmp && (
                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[130px]">
                          {assignedEmp.role}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div
                        className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: assignedEmp?.avatarColor || assignedEmp?.color || '#FF5A26' }}
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
                        className="flex-1 bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer py-1 truncate"
                      >
                        <option value="" className="bg-[#0f172a] text-zinc-400">
                          -- Unassigned (Floor Pool) --
                        </option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id} className="bg-[#0f172a] text-[#f8fafc]">
                            {emp.name} ({emp.role?.split(' ')[0] || 'Staff'}) {emp.status === 'Active' || emp.status === 'active' ? '• Active' : `• ${emp.status}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* -----------------------------------------------------------
                      CASE 1: TABLE HAS ACTIVE ASSISTANCE / ISSUE
                      ----------------------------------------------------------- */}
                  {table.status === TABLE_STATUS.NEED_ASSISTANCE && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-rose-300 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Customer Assistance Alert</span>
                        </span>
                        {issueNote?.severity && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            issueNote.severity === ISSUE_SEVERITY.CRITICAL 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {issueNote.severity}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-snug line-clamp-2">
                        "{issueNote ? issueNote.complaintText : 'Guest requested prompt employee assistance at table.'}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-rose-300/80 pt-1.5 border-t border-rose-500/20">
                        <span>Guest: <strong className="text-slate-200">{issueNote?.customerName || 'Dining Guest'}</strong></span>
                        <span>{issueNote ? formatElapsed(15) : 'Active'}</span>
                      </div>
                    </div>
                  )}

                  {/* -----------------------------------------------------------
                      CASE 2: TABLE HAS ACTIVE ORDER RUNNING / READY
                      ----------------------------------------------------------- */}
                  {activeOrder && table.status !== TABLE_STATUS.AVAILABLE && (
                    <div className="space-y-3 pt-2">
                      
                      {/* Live Order Summary Box */}
                      <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-100">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#FF5A26]/15 text-[#FF7A45] font-black text-[11px] border border-[#FF5A26]/30">
                              {activeOrder.orderNumber}
                            </span>
                            <span className="text-slate-500">&bull;</span>
                            <span className="text-slate-200 font-semibold truncate max-w-[120px]">{activeOrder.customerName}</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatElapsed(activeOrder.timeElapsedMinutes)}</span>
                          </span>
                        </div>

                        {/* Items Preview with Quantities & Prices */}
                        <div className="space-y-1.5 text-xs">
                          {activeOrder.items.slice(0, 2).map((item, idx) => (
                            <div key={item.id || idx} className="flex items-start justify-between gap-2 text-slate-200">
                              <span className="pr-1 text-slate-200 leading-snug whitespace-normal break-words">
                                <span className="font-bold text-[#FF7A45] mr-1">{item.quantity}×</span>
                                <span>{item.name}</span>
                              </span>
                              <span className="font-semibold text-slate-300 shrink-0 text-right">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {activeOrder.items.length > 2 && (
                            <p className="text-[10px] text-slate-400 font-bold">
                              +{activeOrder.items.length - 2} more item(s) ordered
                            </p>
                          )}
                        </div>

                        {/* Total Bill */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400">
                            Total Bill ({activeOrder.items.reduce((s, i) => s + i.quantity, 0)} items)
                          </span>
                          <span className="text-sm font-black text-emerald-400">
                            {formatCurrency(activeOrder.total)}
                          </span>
                        </div>
                      </div>

                      {/* Kitchen-to-Employee Stepper / Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <span>Kitchen &rarr; Waiter Pipeline</span>
                          <span className="text-[#FF7A45] font-extrabold">
                            {activeOrder.kitchenFlowStage === KITCHEN_STAGE.PLACED ? '1/4 Placed' :
                             activeOrder.kitchenFlowStage === KITCHEN_STAGE.PREPARING ? '2/4 Prep' :
                             activeOrder.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP ? '3/4 Ready' : '4/4 Served'}
                          </span>
                        </div>

                        {/* Stepper Grid */}
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
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                                }`}
                                title={stage.description}
                              >
                                <div className="flex items-center justify-center mb-0.5">
                                  {isCompleted ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : isCurrent ? (
                                    <stage.icon className="w-3 h-3 text-[#FF7A45] animate-pulse" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500">{sIdx + 1}</span>
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
                    <div className="py-7 px-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">Table Clean &amp; Vacant</p>
                      <p className="text-[11px] text-slate-400">
                        Ready for guest seating &bull; Capacity {table.capacity || 4} diners
                      </p>
                    </div>
                  )}

                </div>

                {/* -----------------------------------------------------------
                    ACTION TOOLBAR ON EACH CARD
                    ----------------------------------------------------------- */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2">
                  
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
                          <span>Advance: Mark Ready &amp; Alert Staff</span>
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

                  {/* Reset Table Button (when served) */}
                  {activeOrder && activeOrder.kitchenFlowStage === KITCHEN_STAGE.SERVED && (
                    <button
                      type="button"
                      onClick={() => handleResetTable(table.tableNumber)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
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
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-950/50 ring-1 ring-rose-400/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer animate-pulse"
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
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700/80'
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
                        className="py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-700/80 cursor-pointer"
                        title="View Full Order Receipt Modal"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {/* Table Reset shortcut if already clean */}
                    {table.status === TABLE_STATUS.AVAILABLE && (
                      <button
                        type="button"
                        onClick={() => triggerToast(`Table ${table.tableNumber} is ready. Guest QR code active.`, 'info')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 text-xs font-bold transition border border-slate-700/80 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Seat Table</span>
                      </button>
                    )}

                  </div>

                  {/* Destructive Card Footer Action: separated, PIN-confirmed (docs/admin-actions.md) */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => requestRemoveSpecificTable(table.tableNumber)}
                      className="admin-danger-action"
                      title={`Remove Table #${table.tableNumber} (requires Admin PIN)`}
                      aria-label={`Remove Table #${table.tableNumber} from floor, requires admin PIN`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove table</span>
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* =======================================================================
          MODAL: ADD NEW TABLE (Dynamic Table Scaling - Rule 1)
          ======================================================================= */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-black space-y-5 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-amber-500 text-white flex items-center justify-center shadow-lg shadow-[#FF5A26]/30">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#f8fafc] tracking-tight">
                    Add New Table to Floor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Will be created as <span className="text-[#FF7A45] font-bold">Table #{tables.length + 1}</span> with printable QR code
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-zinc-400 hover:text-[#f8fafc] border border-[#334155] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Seating Capacity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Seating Capacity</span>
                  <span className="text-[#FF7A45] font-black">{newTableSeats} Seats</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((seats) => (
                    <button
                      key={seats}
                      type="button"
                      onClick={() => setNewTableSeats(seats)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                        newTableSeats === seats
                          ? 'bg-[#FF5A26] border-[#FF5A26] text-white shadow-md shadow-[#FF5A26]/30'
                          : 'bg-[#1e293b] border-[#334155] text-zinc-300 hover:text-white hover:bg-[#334155]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{seats} Seats</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dining Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Dining Zone / Location</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Main Hall', label: 'Main Hall' },
                    { id: 'Window', label: 'Window Side' },
                    { id: 'Patio', label: 'Patio Terrace' }
                  ].map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setNewTableZone(zone.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                        newTableZone === zone.id
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-[#1e293b] border-[#334155] text-zinc-300 hover:text-white hover:bg-[#334155]'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{zone.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Floor Employee */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Assign Dedicated Floor Employee</label>
                <select
                  value={newTableAssignedEmpId}
                  onChange={(e) => setNewTableAssignedEmpId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] font-semibold focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                >
                  <option value="" className="bg-[#111827] text-zinc-400">-- None (Unassigned / Auto-balance later) --</option>
                  {employees
                    .filter(emp => emp.status === EMPLOYEE_STATUS.ACTIVE)
                    .map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#111827] text-[#f8fafc]">
                        {emp.name} &bull; {emp.role}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-zinc-400">
                  Guest calls from this table will route directly to this employee's handset.
                </p>
              </div>
            </div>

            {/* Modal Actions (Protected by PIN 808080) */}
            <div className="pt-2 border-t border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => requestAddNewTable({ seats: 4, zone: 'Main Hall', assignedEmployeeId: null })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-amber-300 border border-[#334155] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Quickly add default 4-seat table (Requires PIN 808080)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Add (4-Seat)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-transparent hover:bg-[#1e293b] text-zinc-400 hover:text-zinc-200 border border-[#334155] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => requestAddNewTable()}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A26] via-orange-500 to-amber-500 hover:from-[#e04f20] hover:to-amber-400 text-white text-xs font-black shadow-lg shadow-[#FF5A26]/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Confirm &amp; Add Table</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: FULL ORDER BREAKDOWN & RECEIPT (Exact Requirement)
          ======================================================================= */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] w-full max-w-2xl rounded-3xl p-6 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto space-y-6 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#334155]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#f8fafc] tracking-tight">
                    Order Invoice {selectedOrderModal.order.orderNumber}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#FF5A26]/15 text-[#FF7A45] border border-[#FF5A26]/30">
                    Table {selectedOrderModal.table.tableNumber}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Guest: <span className="text-[#f8fafc] font-bold">{selectedOrderModal.order.customerName}</span> &bull; Placed {formatElapsed(selectedOrderModal.order.timeElapsedMinutes)} ({selectedOrderModal.table.location})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-zinc-400 hover:text-[#f8fafc] border border-[#334155] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pipeline Stage Progress in Modal */}
            <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] space-y-2">
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
                          ? 'bg-[#FF5A26]/20 border-[#FF5A26] text-[#f8fafc] ring-1 ring-[#FF7A45]'
                          : isDone
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#111827] border-[#334155] text-zinc-400'
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
            <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selectedOrderModal.employee?.avatarColor || '#FF5A26' }}
                >
                  {selectedOrderModal.employee?.initials || 'EM'}
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block font-medium">Assigned Employee</span>
                  <span className="text-sm font-bold text-[#f8fafc]">
                    {selectedOrderModal.employee?.name || 'Unassigned'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    {selectedOrderModal.employee?.role || 'Floor Specialist'} &bull; {selectedOrderModal.employee?.shift || 'Morning'}
                  </span>
                </div>
              </div>

              {/* Quick Reassign dropdown inside modal (Protected by PIN 808080) */}
              <select
                aria-label="Reassign Table Staff"
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
                className="bg-[#111827] border border-[#334155] text-xs text-[#f8fafc] px-3 py-1.5 rounded-xl font-bold cursor-pointer focus:outline-none"
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
              <div className="border border-[#334155] rounded-2xl overflow-hidden bg-[#1e293b]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111827] text-zinc-300 border-b border-[#334155]">
                    <tr>
                      <th className="py-2.5 px-3 font-black">Item Description</th>
                      <th className="py-2.5 px-3 font-black text-center">Qty</th>
                      <th className="py-2.5 px-3 font-black text-right">Unit Price</th>
                      <th className="py-2.5 px-3 font-black text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {selectedOrderModal.order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#334155]/40">
                        <td className="py-2.5 px-3 text-[#f8fafc]">
                          <span className="font-bold text-[#f8fafc] block">{item.name}</span>
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
                        <td className="py-2.5 px-3 text-right font-bold text-[#f8fafc]">
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
              <div className="p-3 rounded-2xl bg-[#1e293b] border border-[#334155] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A45]">
                  <Mic className="w-3.5 h-3.5 text-[#FF5A26] animate-pulse" />
                  <span>Customer Voice Recording Note</span>
                </div>
                <AudioPlayer src={selectedOrderModal.order.voiceNoteUrl} title="Customer Note" />
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(selectedOrderModal.order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Sales Tax (10%)</span>
                <span className="font-semibold text-zinc-200">{formatCurrency(selectedOrderModal.order.tax)}</span>
              </div>
              <div className="pt-2 border-t border-[#334155] flex items-center justify-between text-sm">
                <span className="font-black text-[#f8fafc]">Total Amount</span>
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
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] border border-[#334155] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#FF7A45] border border-[#334155] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Alert Employee</span>
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
          <div className="bg-[#111827] border border-red-500/50 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-red-950/50 space-y-5 animate-scaleUp">
            
            <div className="flex items-start justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#f8fafc]">
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
                className="text-zinc-400 hover:text-[#f8fafc]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Complaint details */}
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-red-300 font-bold">
                <span>Guest: {activeIssueModal.note?.customerName || 'Dining Customer'}</span>
                <span className="uppercase text-[10px] bg-red-500 text-white px-2 py-0.5 rounded">
                  {activeIssueModal.note?.severity || 'Critical'}
                </span>
              </div>
              <p className="text-sm text-[#f8fafc] font-medium leading-relaxed">
                "{activeIssueModal.note ? activeIssueModal.note.complaintText : 'Table has pressed the assistance call button requesting prompt floor service.'}"
              </p>
            </div>

            {/* Resolution Form / Actions */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-[#f8fafc] block">
                Floor Manager Action
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDispatchEmployee(activeIssueModal.table.tableNumber, activeIssueModal.table.assignedEmployeeId);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] text-xs font-bold border border-[#334155] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#FF7A45]" />
                  <span>Dispatch Employee to Table</span>
                </button>

                {onSelectReportsTab ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIssueModal(null);
                      onSelectReportsTab();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-zinc-300 hover:text-[#f8fafc] text-xs font-bold border border-[#334155] flex items-center justify-center gap-1.5 transition cursor-pointer"
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

      {/* =======================================================================
          ADMIN TABLE SECURITY CONFIRMATION MODAL (PIN: 808080)
          ======================================================================= */}
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
