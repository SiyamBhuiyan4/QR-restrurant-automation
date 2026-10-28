import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Check,
  X,
  Zap,
  Edit2,
  Trash2,
  Coffee,
  CheckCheck,
  Table,
  ArrowRight,
  ArrowRightLeft,
  Lock,
  ExternalLink,
  Compass,
  ChevronUp,
  ChefHat,
  BellRing,
  RotateCcw,
  AlertTriangle,
  Undo2,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  QrCode,
  RefreshCw,
  Share2
} from 'lucide-react';

import { useRestaurant } from '../../context/RestaurantContext';
import TableSecurityModal, { TableSecurityModal as PasscodeConfirmDialog } from './TableSecurityModal';
import '../../styles/staff.css';
import '../../styles/staff-admin.css';
import '../../styles/staff-light.css';
import { staffKey, hoursTodayFor, formatHours, SHIFT_EVENT } from '../../utils/shiftClock';
import { verifyAdminPin } from '../../utils/adminAuth';
import {
  STAFF_PASSWORD_MASK,
  isValidStaffPassword,
  createStaffCredential,
  stripPlainCredentials,
  hasStaffCredentialHash
} from '../../utils/staffCredentials';
import { sendStaffRosterBackupToTelegram } from '../../services/telegramClient';

// Primary storage key for restaurant employee roster (profiles, PINs, shifts, custody)
const STORAGE_KEY_EMPLOYEES = 'smartdine_restaurant_employees';
// Storage key for table custody lineage tracking across sessions and days
const STORAGE_KEY_CUSTODY = 'smartdine_table_custody_v1';
// Storage key for waiter console accounts & credentials synchronization
const STORAGE_KEY_WAITER_ACCOUNTS = 'smartdine_waiter_accounts';

// Total floor tables in the venue
const TOTAL_TABLES_COUNT = 12;
const ALL_TABLE_NUMBERS = Array.from({ length: TOTAL_TABLES_COUNT }, (_, i) => i + 1);

// Initial default shift assignment mapping
const DEFAULT_ROSTER_MAP_BY_ID = {
  'emp-1': [1, 2, 3],
  'emp-2': [4, 5, 6],
  'emp-3': [7, 8],
  'emp-4': [9, 10],
  'emp-5': [11, 12]
};

// Look up default shift owner for any table number
const getDefaultOwnerForTable = (tableNumber) => {
  const num = Number(tableNumber);
  for (const [empId, tables] of Object.entries(DEFAULT_ROSTER_MAP_BY_ID)) {
    if (tables.includes(num)) return empId;
  }
  return null;
};

// Initial Root Custody Mapping (Table -> Original Shift Owner)
const INITIAL_TABLE_CUSTODY = {
  1: { tableNumber: 1, originalOwnerId: 'emp-1', delegationTrail: ['emp-1'] },
  2: { tableNumber: 2, originalOwnerId: 'emp-1', delegationTrail: ['emp-1'] },
  3: { tableNumber: 3, originalOwnerId: 'emp-1', delegationTrail: ['emp-1'] },
  4: { tableNumber: 4, originalOwnerId: 'emp-2', delegationTrail: ['emp-2'] },
  5: { tableNumber: 5, originalOwnerId: 'emp-2', delegationTrail: ['emp-2'] },
  6: { tableNumber: 6, originalOwnerId: 'emp-2', delegationTrail: ['emp-2'] },
  7: { tableNumber: 7, originalOwnerId: 'emp-3', delegationTrail: ['emp-3'] },
  8: { tableNumber: 8, originalOwnerId: 'emp-3', delegationTrail: ['emp-3'] },
  9: { tableNumber: 9, originalOwnerId: 'emp-4', delegationTrail: ['emp-4'] },
  10: { tableNumber: 10, originalOwnerId: 'emp-4', delegationTrail: ['emp-4'] },
  11: { tableNumber: 11, originalOwnerId: 'emp-5', delegationTrail: ['emp-5'] },
  12: { tableNumber: 12, originalOwnerId: 'emp-5', delegationTrail: ['emp-5'] }
};

// Initial Mock Employees Roster - Aligned strictly with design specs
const INITIAL_EMPLOYEES = [
  {
    id: 'emp-1',
    numericId: 1,
    name: 'Rakib Ahmed',
    initials: 'RA',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'rakib',
    password: '1234',
    assignedTables: [1, 2, 3],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '99%',
    avatarType: 'orange',
    phone: '+880 1712-345001',
    email: 'rakib.ahmed@smartdine.internal',
    nudgesCount: 0,
    accountCode: 'WAIT-101',
    waiterCode: 'WAIT-101',
    passcode: '1234',
    waiterPin: '1234',
    hiredAt: '2026-01-15'
  },
  {
    id: 'emp-2',
    numericId: 2,
    name: 'Hasan Mahmud',
    initials: 'HM',
    role: 'Senior Host',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'hasan',
    password: '1234',
    assignedTables: [4, 5, 6],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '98%',
    avatarType: 'blue',
    phone: '+880 1819-456002',
    email: 'hasan.mahmud@smartdine.internal',
    nudgesCount: 0,
    accountCode: 'WAIT-102',
    waiterCode: 'WAIT-102',
    passcode: '1234',
    waiterPin: '1234',
    hiredAt: '2026-02-01'
  },
  {
    id: 'emp-3',
    numericId: 3,
    name: 'Priya Sen',
    initials: 'PS',
    role: 'Operations Lead',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    username: 'priya',
    password: '1234',
    assignedTables: [7, 8],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 10s (on time)',
    onTimeRate: '100%',
    avatarType: 'purple',
    phone: '+880 1913-789003',
    email: 'priya.sen@smartdine.internal',
    nudgesCount: 0,
    accountCode: 'WAIT-103',
    waiterCode: 'WAIT-103',
    passcode: '1234',
    waiterPin: '1234',
    hiredAt: '2026-02-15'
  },
  {
    id: 'emp-4',
    numericId: 4,
    name: 'Tanvir Rahman',
    initials: 'TR',
    role: 'Floor Specialist',
    shift: 'Mid Shift (12:00 - 20:00)',
    status: 'Active',
    username: 'tanvir',
    password: '1234',
    assignedTables: [9, 10],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '97%',
    avatarType: 'amber',
    phone: '+880 1614-234004',
    email: 'tanvir.rahman@smartdine.internal',
    nudgesCount: 0,
    accountCode: 'WAIT-104',
    waiterCode: 'WAIT-104',
    passcode: '1234',
    waiterPin: '1234',
    hiredAt: '2026-03-01'
  },
  {
    id: 'emp-5',
    numericId: 5,
    name: 'Sadia Islam',
    initials: 'SI',
    role: 'Senior Host',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'Active',
    username: 'sadia',
    password: '1234',
    assignedTables: [11, 12],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '98%',
    avatarType: 'pink',
    phone: '+880 1515-678005',
    email: 'sadia.islam@smartdine.internal',
    nudgesCount: 0,
    accountCode: 'WAIT-105',
    waiterCode: 'WAIT-105',
    passcode: '1234',
    waiterPin: '1234',
    hiredAt: '2026-03-10'
  }
];

// Initial Live Call Routing Alerts Feed (4 alerts)
const INITIAL_ALERTS = [
  {
    id: 'alert-1',
    type: 'customer_call',
    tableNumber: 4,
    description: 'Table 4 called for assistance: Water Refill & Extra Cutlery',
    assignedEmployeeId: 'emp-4',
    assignedEmployeeName: 'Tanvir',
    status: 'Pending',
    responseDetails: 'Responded in 11s / Pending',
    timestamp: Date.now() - 45000,
    urgency: 'medium',
    nudgedCount: 0
  },
  {
    id: 'alert-2',
    type: 'kitchen_ready',
    tableNumber: 7,
    description: 'Table 7 Food Ready in Kitchen: 2x Smoked Wagyu Ribs, 1x Truffle Fries',
    assignedEmployeeId: 'emp-2',
    assignedEmployeeName: 'Hasan',
    status: 'In Transit',
    responseDetails: 'Status: In Transit',
    timestamp: Date.now() - 85000,
    urgency: 'high',
    nudgedCount: 0
  },
  {
    id: 'alert-3',
    type: 'customer_call',
    tableNumber: 1,
    description: 'Table 1 called for assistance: Bill & invoice checkout terminal',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Rakib',
    status: 'Completed',
    responseDetails: 'Responded in 11s (on time)',
    timestamp: Date.now() - 240000,
    urgency: 'low',
    nudgedCount: 0
  },
  {
    id: 'alert-4',
    type: 'kitchen_ready',
    tableNumber: 11,
    description: 'Table 11 Food Ready in Kitchen: Truffle Wild Mushroom Pasta',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Rakib',
    status: 'Pending',
    responseDetails: 'Waiting pickup at Chef pass counter',
    timestamp: Date.now() - 15000,
    urgency: 'high',
    nudgedCount: 0
  }
];

// Simulated events for live test dispatching
const SIMULATED_SCENARIOS = [
  {
    type: 'customer_call',
    tableNumber: 1,
    description: 'Table 1 requested assistance: Special dietary seasoning query',
    urgency: 'medium'
  },
  {
    type: 'kitchen_ready',
    tableNumber: 5,
    description: 'Table 5 Food Ready in Kitchen: Grilled Salmon & Citrus Asparagus',
    urgency: 'high'
  },
  {
    type: 'customer_call',
    tableNumber: 9,
    description: 'Table 9 requested bill review & complimentary dessert menu',
    urgency: 'low'
  },
  {
    type: 'kitchen_ready',
    tableNumber: 12,
    description: 'Table 12 Food Ready in Kitchen: Wood-fired Artisan Pizza',
    urgency: 'high'
  }
];

export default function EmployeesModule({
  className = '',
  employees: propEmployees,
  tables: propTables,
  tableCount: propTableCount,
  onAssignTable,
  onReassignAllTables,
  onSetEmployeeStatus,
  onAutoBalance,
  onSwitchToKds,
  isEmbedded = false
}) {
  // Optional connection to central RestaurantContext
  let restaurantContext = null;
  try {
    restaurantContext = useRestaurant();
  } catch (_) {}

  // Staff-to-staff contact: the sender is the logged-in employee, or admin when no employee session exists
  const [peerTargetId, setPeerTargetId] = useState('');
  const [peerText, setPeerText] = useState('');
  const [peerSent, setPeerSent] = useState('');
  const loggedInStaff = useMemo(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('smartdine_logged_in_employee') : null;
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  }, []);

  // Main State
  const [employees, setEmployees] = useState(() => {
    const list = propEmployees && Array.isArray(propEmployees) && propEmployees.length > 0
      ? propEmployees
      : (restaurantContext?.employees && Array.isArray(restaurantContext.employees) && restaurantContext.employees.length > 0
        ? restaurantContext.employees
        : INITIAL_EMPLOYEES);

    return list.map((emp, idx) => {
      const code = emp.accountCode || emp.waiterCode || `WAIT-${101 + idx}`;
      return {
        ...stripPlainCredentials(emp),
        accountCode: code,
        waiterCode: code,
        hiredAt: emp.hiredAt || '2026-01-15'
      };
    });
  });

  useEffect(() => {
    const incoming = propEmployees || restaurantContext?.employees;
    if (incoming && Array.isArray(incoming) && incoming.length > 0) {
      setEmployees(prev => {
        return incoming.map((propEmp, idx) => {
          const localEmp = prev.find(e => e.id === propEmp.id || String(e.numericId) === String(propEmp.id));
          const code = propEmp.accountCode || propEmp.waiterCode || localEmp?.accountCode || localEmp?.waiterCode || `WAIT-${101 + idx}`;
          if (!localEmp) {
            return {
              ...stripPlainCredentials(propEmp),
              accountCode: code,
              waiterCode: code,
              hiredAt: propEmp.hiredAt || '2026-01-15'
            };
          }
          return {
            ...stripPlainCredentials({ ...localEmp, ...propEmp }),
            accountCode: code,
            waiterCode: code,
            nudgesCount: localEmp.nudgesCount ?? propEmp.nudgesCount ?? 0,
            assignedTables: propEmp.assignedTables || localEmp.assignedTables || []
          };
        });
      });
    }
  }, [propEmployees, restaurantContext?.employees]);

  // Synchronize Waiter Console credentials to localStorage for handheld terminals
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const waiterAccounts = employees.map(emp => ({
          id: emp.id,
          numericId: emp.numericId,
          name: emp.name,
          initials: emp.initials,
          role: emp.role,
          shift: emp.shift,
          status: emp.status,
          assignedTables: emp.assignedTables || [],
          phone: emp.phone,
          email: emp.email,
          accountCode: emp.accountCode || emp.waiterCode || 'WAIT-100',
          waiterCode: emp.waiterCode || emp.accountCode || 'WAIT-100',
          ...(hasStaffCredentialHash(emp)
            ? { passwordHash: emp.passwordHash, passwordSalt: emp.passwordSalt, passwordUpdatedAt: emp.passwordUpdatedAt }
            : { passcode: emp.passcode || emp.waiterPin || '1234', waiterPin: emp.waiterPin || emp.passcode || '1234' }),
          hiredAt: emp.hiredAt || '2026-01-15'
        }));
        localStorage.setItem(STORAGE_KEY_WAITER_ACCOUNTS, JSON.stringify(waiterAccounts));
      } catch (e) {}
    }
  }, [employees]);

  // Table Custody Lineage Tracking State (persisted across sessions and days)
  const [tableCustody, setTableCustody] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CUSTODY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_TABLE_CUSTODY;
  });

  // Save custody lineage to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CUSTODY, JSON.stringify(tableCustody));
      } catch (e) {}
    }
  }, [tableCustody]);

  // Undo Stack: stores snapshots of previous employee and table custody states (max 30 actions)
  const [undoStack, setUndoStack] = useState([]);
  const undoStackRef = useRef(undoStack);
  const employeesRef = useRef(employees);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Busy' | 'On Break' | 'Absent / Off-duty'
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'waiters' | 'tables' | 'dispatch' | 'history'
  const [alertFilter, setAlertFilter] = useState('all'); // 'all' | 'active' | 'resolved'

  // Employee Activity & Live Audit History State
  const activityLogs = (restaurantContext?.activityLogs && Array.isArray(restaurantContext.activityLogs))
    ? restaurantContext.activityLogs
    : [];
  const clearActivityLogs = restaurantContext?.clearActivityLogs;
  const [activityActorFilter, setActivityActorFilter] = useState('all');
  const [activityActionFilter, setActivityActionFilter] = useState('all');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Filtered Activity Logs
  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter(log => {
      if (activityActorFilter !== 'all') {
        const actorName = String(log.actorName || '').toLowerCase();
        const actorId = String(log.actorId || '').toLowerCase();
        const actorType = String(log.actorType || '').toLowerCase();
        const filterVal = activityActorFilter.toLowerCase();
        if (filterVal === 'admin' && actorType !== 'admin') return false;
        if (filterVal === 'employee' && actorType !== 'employee') return false;
        if (filterVal !== 'admin' && filterVal !== 'employee') {
          if (!actorName.includes(filterVal) && !actorId.includes(filterVal)) return false;
        }
      }
      if (activityActionFilter !== 'all' && log.actionType !== activityActionFilter) {
        return false;
      }
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase();
        const desc = (log.description || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const target = (log.target || '').toLowerCase();
        const actorName = (log.actorName || '').toLowerCase();
        if (!desc.includes(q) && !details.includes(q) && !target.includes(q) && !actorName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [activityLogs, activityActorFilter, activityActionFilter, activitySearchQuery]);

  // Revealed PINs map for executive click-to-reveal toggle { [empId]: boolean }
  const [roleFilter, setRoleFilter] = useState('all');
  const [detailEmpId, setDetailEmpId] = useState(null);
  // Re-render when shift clock changes (and once a minute) so "Hours today" stays current
  const [, setShiftTick] = useState(0);
  useEffect(() => {
    const bump = () => setShiftTick(t => t + 1);
    const timer = setInterval(bump, 60000);
    window.addEventListener(SHIFT_EVENT, bump);
    return () => {
      clearInterval(timer);
      window.removeEventListener(SHIFT_EVENT, bump);
    };
  }, []);
  const [resetPwTarget, setResetPwTarget] = useState(null);
  const [resetPwForm, setResetPwForm] = useState({ next: '', confirm: '', masterPin: '', error: '' });
  const [resetPwChecking, setResetPwChecking] = useState(false);
  // Digital Keycard Modal preview
  const [keycardModalEmployee, setKeycardModalEmployee] = useState(null);
  // Password visibility toggle in Add/Edit modal

  // Detect global role switcher from App.jsx to avoid double-stacking floating buttons
  const [hasGlobalSwitcher, setHasGlobalSwitcher] = useState(false);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setHasGlobalSwitcher(!!document.getElementById('smartdine-global-role-switcher'));
    }
  }, []);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [reassignAlertTarget, setReassignAlertTarget] = useState(null);

  // Employee Absence & Quick Transfer Modal State
  const [transferModalData, setTransferModalData] = useState(null);
  const [selectedBackupEmpId, setSelectedBackupEmpId] = useState('');
  const [rerouteActiveAlerts, setRerouteActiveAlerts] = useState(true);

  // Security Confirmation Modal State (Requires admin PIN)
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionTitle: '',
    actionDescription: '',
    actionNotice: '',
    pendingAction: null
  });

  // Dynamic Venue Table Count & Array
  const totalVenueTables = useMemo(() => {
    const list = Array.isArray(propTables) && propTables.length > 0 ? propTables : [];
    const maxFromList = list.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
    return Math.max(maxFromList, list.length, propTableCount || 0, TOTAL_TABLES_COUNT);
  }, [propTableCount, propTables]);
  const allTableNumbers = useMemo(() => Array.from({ length: totalVenueTables }, (_, i) => i + 1), [totalVenueTables]);

  // Active Backup Employee Candidates
  const activeBackupEmployees = useMemo(() => {
    if (!transferModalData?.sourceEmployee) return [];
    return employees.filter(
      e => e.id !== transferModalData.sourceEmployee.id && (e.status === 'Active' || e.status === 'Busy')
    );
  }, [employees, transferModalData]);

  // Employee Form State (for Add/Edit Modal)
  const [formData, setFormData] = useState({
    name: '',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    phone: '',
    email: '',
    assignedTables: [],
    accountCode: '',
    waiterCode: '',
    password: '',
    confirmPassword: ''
  });

  // Notification Toast State with Timer Ref & Interactive Hover Ergonomics
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg, type = 'success', action = null, duration = 6000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ id: Date.now(), text: msg, type, action });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  const handleToastMouseEnter = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const handleToastMouseLeave = useCallback(() => {
    if (toastMessage) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
        toastTimeoutRef.current = null;
      }, 3500);
    }
  }, [toastMessage]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Push snapshot to Undo Stack (maintains up to 30 actions with deep clones)
  const pushUndoSnapshot = useCallback((description) => {
    const snapshot = {
      id: `undo-${Date.now()}-${Math.random()}`,
      description,
      employees: JSON.parse(JSON.stringify(employees)),
      tableCustody: JSON.parse(JSON.stringify(tableCustody)),
      timestamp: Date.now()
    };
    setUndoStack(prev => {
      const nextStack = [snapshot, ...prev.slice(0, 29)];
      undoStackRef.current = nextStack;
      return nextStack;
    });
  }, [employees, tableCustody]);

  // Instant Undo Handler: restores deep clones of employees and tableCustody, shows informative toast
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      showToast('Nothing to undo in roster history', 'info');
      return;
    }

    const [topAction, ...remainingStack] = undoStackRef.current;
    undoStackRef.current = remainingStack;
    setUndoStack(remainingStack);

    const restoredEmployees = JSON.parse(JSON.stringify(topAction.employees));
    const restoredCustody = JSON.parse(JSON.stringify(topAction.tableCustody));

    // Synchronize parent context if onAssignTable prop is provided
    if (onAssignTable) {
      for (let t = 1; t <= totalVenueTables; t++) {
        const currentHolder = employeesRef.current.find(e => (e.assignedTables || []).includes(t));
        const previousHolder = restoredEmployees.find(e => (e.assignedTables || []).includes(t));
        if (currentHolder?.id !== previousHolder?.id) {
          onAssignTable(t, previousHolder ? previousHolder.id : null);
        }
      }
    }
    if (onSetEmployeeStatus) {
      restoredEmployees.forEach(emp => {
        onSetEmployeeStatus(emp.id, emp.status);
      });
    }

    setEmployees(restoredEmployees);
    setTableCustody(restoredCustody);
    showToast(`Undid: ${topAction.description}`, 'info');
  }, [totalVenueTables, onAssignTable, onSetEmployeeStatus, showToast]);

  // Global Keyboard Shortcut: Cmd+Z (macOS) or Ctrl+Z (Windows/Linux) for Instant Undo in Roster
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isZ = e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ';
      const isModifier = e.metaKey || e.ctrlKey;

      if (isModifier && isZ && !e.shiftKey && !e.altKey) {
        // Skip shortcut if user is actively typing in a form input, textarea, or contentEditable element
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
          return;
        }

        if (activeTab === 'roster') {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, handleUndo]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = employees.length;
    const activeStaff = employees.filter(e => e.status === 'Active');
    const busyStaff = employees.filter(e => e.status === 'Busy');
    const onBreakStaff = employees.filter(e => e.status === 'On Break');
    const absentStaff = employees.filter(e => e.status === 'Absent' || e.status === 'Absent / Off-duty');

    // Count unique tables covered
    const coveredTables = new Set();
    employees.forEach(emp => {
      if (emp.status !== 'On Break' && emp.status !== 'Absent / Off-duty' && emp.status !== 'Absent') {
        (emp.assignedTables || []).forEach(t => {
          if (t <= totalVenueTables) coveredTables.add(t);
        });
      }
    });

    return {
      totalEmployees: total,
      activeOnDuty: activeStaff.length,
      currentlyBusy: busyStaff.length,
      onBreak: onBreakStaff.length,
      absent: absentStaff.length,
      tablesCovered: coveredTables.size,
      totalTables: totalVenueTables,
      coveragePercentage: Math.round((coveredTables.size / totalVenueTables) * 100) || 100,
      avgResponseTime: '11s'
    };
  }, [employees, totalVenueTables]);

  // Lookup map: tableNumber -> Assigned Employee
  const tableToEmployeeMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      (emp.assignedTables || []).forEach(tblNum => {
        map[tblNum] = emp;
      });
    });
    return map;
  }, [employees]);

  // Filtered employees for display
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'Absent') {
          if (emp.status !== 'Absent' && emp.status !== 'Absent / Off-duty') return false;
        } else if (emp.status !== statusFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (emp.name || '').toLowerCase().includes(q);
        const matchesRole = (emp.role || '').toLowerCase().includes(q);
        const matchesShift = (emp.shift || '').toLowerCase().includes(q);
        const matchesWaiterCode = (emp.accountCode || emp.waiterCode || '').toLowerCase().includes(q);
        const matchesTable = (emp.assignedTables || []).some(
          t => `t${t}`.includes(q) || `table ${t}`.includes(q) || String(t) === q
        );
        return matchesName || matchesRole || matchesShift || matchesWaiterCode || matchesTable;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery, roleFilter]);

  // Filtered alerts for Tab 3
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (alertFilter === 'active') {
        return a.status !== 'Completed' && a.status !== 'Acknowledged';
      }
      if (alertFilter === 'resolved') {
        return a.status === 'Completed' || a.status === 'Acknowledged';
      }
      return true;
    });
  }, [alerts, alertFilter]);

  // ---------------------------------------------------------------------------
  // TABLE ASSIGNMENT & UNDO LOGIC
  // ---------------------------------------------------------------------------

  const handleToggleTableAssignment = useCallback((employeeId, tableNumber) => {
    const targetEmp = employees.find(e => e.id === employeeId);
    if (!targetEmp) return;

    // Identify who currently holds this table
    const currentHolder = employees.find(e => (e.assignedTables || []).includes(tableNumber));
    const isCurrentlyAssignedToTarget = currentHolder?.id === employeeId;

    let actionDesc = '';
    if (isCurrentlyAssignedToTarget) {
      actionDesc = `Unassigned Table ${tableNumber} from ${targetEmp.name}`;
    } else if (currentHolder) {
      actionDesc = `Transferred Table ${tableNumber} from ${currentHolder.name} to ${targetEmp.name}`;
    } else {
      actionDesc = `Assigned Table ${tableNumber} to ${targetEmp.name}`;
    }

    // Record snapshot in Undo Stack
    pushUndoSnapshot(actionDesc);

    // Update employees
    setEmployees(prev => {
      return prev.map(emp => {
        if (emp.id === employeeId) {
          const nextTables = isCurrentlyAssignedToTarget
            ? (emp.assignedTables || []).filter(t => t !== tableNumber)
            : [...(emp.assignedTables || []), tableNumber].sort((a, b) => a - b);
          return { ...emp, assignedTables: nextTables };
        } else {
          if (!isCurrentlyAssignedToTarget && (emp.assignedTables || []).includes(tableNumber)) {
            return {
              ...emp,
              assignedTables: (emp.assignedTables || []).filter(t => t !== tableNumber)
            };
          }
          return emp;
        }
      });
    });

    // Update table custody trail preserving root original owner
    setTableCustody(prev => {
      const orig = prev[tableNumber]?.originalOwnerId || getDefaultOwnerForTable(tableNumber) || (currentHolder ? currentHolder.id : employeeId);
      const trail = prev[tableNumber]?.delegationTrail || [orig];
      return {
        ...prev,
        [tableNumber]: {
          tableNumber,
          originalOwnerId: orig,
          delegationTrail: isCurrentlyAssignedToTarget ? trail : [...trail, employeeId]
        }
      };
    });

    if (onAssignTable) {
      onAssignTable(tableNumber, isCurrentlyAssignedToTarget ? null : employeeId);
    }

    // Show toast with instant interactive Undo action
    showToast(
      actionDesc,
      currentHolder && currentHolder.id !== employeeId ? 'warning' : 'success',
      {
        label: 'Undo',
        onClick: handleUndo
      }
    );
  }, [employees, pushUndoSnapshot, showToast, handleUndo, onAssignTable]);

  const handleDirectTableReassign = useCallback((tableNumber, newEmployeeId) => {
    const currentHolder = employees.find(e => (e.assignedTables || []).includes(tableNumber));
    const targetEmp = employees.find(e => e.id === newEmployeeId);
    const actionDesc = `Reassigned Table ${tableNumber} from ${currentHolder?.name || 'Unassigned'} to ${targetEmp?.name || 'Staff'}`;

    pushUndoSnapshot(actionDesc);

    setEmployees(prev => {
      return prev.map(emp => {
        if (emp.id === newEmployeeId) {
          const next = (emp.assignedTables || []).includes(tableNumber)
            ? emp.assignedTables
            : [...(emp.assignedTables || []), tableNumber].sort((a, b) => a - b);
          return { ...emp, assignedTables: next };
        } else {
          return {
            ...emp,
            assignedTables: (emp.assignedTables || []).filter(t => t !== tableNumber)
          };
        }
      });
    });

    // Update table custody trail preserving root original owner
    setTableCustody(prev => {
      const orig = prev[tableNumber]?.originalOwnerId || getDefaultOwnerForTable(tableNumber) || (currentHolder ? currentHolder.id : newEmployeeId);
      const trail = prev[tableNumber]?.delegationTrail || [orig];
      return {
        ...prev,
        [tableNumber]: {
          tableNumber,
          originalOwnerId: orig,
          delegationTrail: [...trail, newEmployeeId]
        }
      };
    });

    if (onAssignTable) {
      onAssignTable(tableNumber, newEmployeeId);
    }

    showToast(actionDesc, 'success', {
      label: 'Undo',
      onClick: handleUndo
    });
  }, [employees, pushUndoSnapshot, onAssignTable, showToast, handleUndo]);

  // ---------------------------------------------------------------------------
  // ROLLBACK ENGINE (Delegation Lineage & Batch Rollback)
  // ---------------------------------------------------------------------------

  /**
   * Rollback / Reclaim tables for a specific employee.
   * Handles multi-hop chains (e.g. 3 -> 2 -> 1):
   * Retrieves 3's tables from whoever currently holds them (even 1),
   * without disrupting 2's tables!
   */
  const handleRollbackEmployeeTables = useCallback((employeeId) => {
    const targetEmp = employees.find(e => e.id === employeeId || String(e.numericId) === String(employeeId));
    if (!targetEmp) return;

    // Identify all tables that originally belong to this employee
    const originalTables = Object.keys(tableCustody)
      .map(Number)
      .filter(tblNum => tableCustody[tblNum]?.originalOwnerId === targetEmp.id || tableCustody[tblNum]?.originalOwnerId === employeeId);

    const tablesToReclaim = originalTables.length > 0
      ? originalTables
      : (DEFAULT_ROSTER_MAP_BY_ID[targetEmp.id] || DEFAULT_ROSTER_MAP_BY_ID[employeeId] || []);

    if (tablesToReclaim.length === 0) {
      showToast(`${targetEmp.name} has no original shift tables to reclaim.`, 'info');
      return;
    }

    // Find which tables are currently NOT with targetEmp
    const tablesDelegatedAway = tablesToReclaim.filter(
      tblNum => !(targetEmp.assignedTables || []).includes(tblNum)
    );

    if (tablesDelegatedAway.length === 0) {
      showToast(`${targetEmp.name} already holds all their original shift tables (T${tablesToReclaim.join(', T')}).`, 'info');
      return;
    }

    // Push snapshot to Undo Stack
    pushUndoSnapshot(`Rolled back ${tablesDelegatedAway.length} tables to ${targetEmp.name}`);

    // Map which employees currently hold each of these tables
    const holdersMap = {};
    employees.forEach(emp => {
      if (emp.id !== targetEmp.id) {
        const held = (emp.assignedTables || []).filter(t => tablesDelegatedAway.includes(t));
        if (held.length > 0) {
          holdersMap[emp.id] = held;
        }
      }
    });

    // Reclaim tables: take from current holders and give back to targetEmp
    setEmployees(prev => {
      return prev.map(emp => {
        if (emp.id === targetEmp.id) {
          const combined = Array.from(new Set([...(emp.assignedTables || []), ...tablesDelegatedAway])).sort((a, b) => a - b);
          return {
            ...emp,
            status: emp.status === 'Absent' || emp.status === 'Absent / Off-duty' ? 'Active' : emp.status,
            assignedTables: combined
          };
        }
        if (holdersMap[emp.id]) {
          return {
            ...emp,
            assignedTables: (emp.assignedTables || []).filter(t => !tablesDelegatedAway.includes(t))
          };
        }
        return emp;
      });
    });

    // Update custody records
    setTableCustody(prev => {
      const updated = { ...prev };
      tablesDelegatedAway.forEach(t => {
        const trail = updated[t]?.delegationTrail || [targetEmp.id];
        updated[t] = {
          tableNumber: t,
          originalOwnerId: targetEmp.id,
          delegationTrail: [...trail, targetEmp.id]
        };
      });
      return updated;
    });

    // Synchronize to RestaurantContext / Parent
    if (onAssignTable) {
      tablesDelegatedAway.forEach(t => {
        onAssignTable(t, targetEmp.id);
      });
    }
    if (onSetEmployeeStatus && (targetEmp.status === 'Absent' || targetEmp.status === 'Absent / Off-duty')) {
      onSetEmployeeStatus(targetEmp.id, 'Active');
    }

    const holderNames = Object.keys(holdersMap)
      .map(hid => employees.find(e => e.id === hid)?.name?.split(' ')[0] || 'Staff')
      .filter(Boolean)
      .join(', ');

    showToast(
      `Reclaimed ${tablesDelegatedAway.length} tables (T${tablesDelegatedAway.join(', T')}) to ${targetEmp.name}${holderNames ? ` (retrieved from ${holderNames})` : ''}!`,
      'success',
      {
        label: 'Undo',
        onClick: handleUndo
      }
    );
  }, [employees, tableCustody, pushUndoSnapshot, onAssignTable, onSetEmployeeStatus, showToast, handleUndo]);

  /**
   * Batch Rollback: Restore all tables venue-wide to their original default shift roster owners.
   */
  const handleRollbackAllToShiftRoster = useCallback(() => {
    let delegatedCount = 0;
    employees.forEach(emp => {
      (emp.assignedTables || []).forEach(tblNum => {
        const orig = tableCustody[tblNum]?.originalOwnerId || getDefaultOwnerForTable(tblNum);
        if (orig && orig !== emp.id) {
          delegatedCount++;
        }
      });
    });

    pushUndoSnapshot('Batch rollback of all tables to original shift roster');

    setEmployees(prev => {
      return prev.map(emp => {
        const origTables = Object.keys(tableCustody)
          .map(Number)
          .filter(tblNum => tableCustody[tblNum]?.originalOwnerId === emp.id);

        const assigned = origTables.length > 0
          ? origTables
          : (DEFAULT_ROSTER_MAP_BY_ID[emp.id] || []);

        return {
          ...emp,
          status: emp.status === 'Absent' || emp.status === 'Absent / Off-duty' ? 'Active' : emp.status,
          assignedTables: assigned.sort((a, b) => a - b)
        };
      });
    });

    // Reset custody trails
    setTableCustody(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(tblNum => {
        const orig = updated[tblNum]?.originalOwnerId || getDefaultOwnerForTable(Number(tblNum));
        if (orig) {
          updated[tblNum] = {
            tableNumber: Number(tblNum),
            originalOwnerId: orig,
            delegationTrail: [orig]
          };
        }
      });
      return updated;
    });

    // Synchronize to RestaurantContext / Parent
    if (onAssignTable) {
      allTableNumbers.forEach(tblNum => {
        const origOwner = tableCustody[tblNum]?.originalOwnerId || getDefaultOwnerForTable(tblNum);
        if (origOwner) {
          onAssignTable(tblNum, origOwner);
        }
      });
    }
    if (onSetEmployeeStatus) {
      employees.forEach(emp => {
        if (emp.status === 'Absent' || emp.status === 'Absent / Off-duty') {
          onSetEmployeeStatus(emp.id, 'Active');
        }
      });
    }

    showToast(
      `Full shift rollback complete: All ${delegatedCount || 12} tables restored to default shift owners!`,
      'success',
      {
        label: 'Undo',
        onClick: handleUndo
      }
    );
  }, [employees, tableCustody, allTableNumbers, pushUndoSnapshot, onAssignTable, onSetEmployeeStatus, showToast, handleUndo]);

  const handleAutoBalanceTables = useCallback(() => {
    if (onAutoBalance) {
      onAutoBalance();
      showToast('Auto-balanced tables across on-duty Employees!', 'success');
      return;
    }

    const onDutyEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Busy');
    if (onDutyEmployees.length === 0) {
      showToast('No active or busy employees available for floor coverage', 'error');
      return;
    }

    pushUndoSnapshot('Auto-balanced tables across on-duty employees');

    const assignments = {};
    onDutyEmployees.forEach(e => {
      assignments[e.id] = [];
    });

    allTableNumbers.forEach((tableNum, idx) => {
      const empIndex = idx % onDutyEmployees.length;
      const targetEmp = onDutyEmployees[empIndex];
      assignments[targetEmp.id].push(tableNum);
    });

    setEmployees(prev => {
      return prev.map(emp => {
        if (assignments[emp.id]) {
          return {
            ...emp,
            assignedTables: assignments[emp.id].sort((a, b) => a - b)
          };
        }
        return { ...emp, assignedTables: [] };
      });
    });

    showToast(
      `Auto-balanced all ${allTableNumbers.length} tables across ${onDutyEmployees.length} on-duty Employees!`,
      'success',
      {
        label: 'Undo',
        onClick: handleUndo
      }
    );
  }, [employees, allTableNumbers, onAutoBalance, pushUndoSnapshot, showToast, handleUndo]);

  const requestDirectTableReassign = useCallback((tableNumber, newEmployeeId) => {
    const targetEmp = employees.find(e => String(e.id) === String(newEmployeeId));
    const targetName = targetEmp ? `${targetEmp.name} (${targetEmp.role || 'Staff'})` : 'selected Employee';

    setSecurityModalState({
      isOpen: true,
      actionTitle: `Authorize Staff Assignment • Table #${tableNumber}`,
      actionDescription: `Assign Table #${tableNumber} to ${targetName}. Floor routing will update immediately.`,
      actionNotice: 'Admin PIN verification required to update staff table assignments.',
      pendingAction: () => {
        handleDirectTableReassign(tableNumber, newEmployeeId);
      }
    });
  }, [employees, handleDirectTableReassign]);

  const requestAutoBalanceTables = useCallback(() => {
    setSecurityModalState({
      isOpen: true,
      actionTitle: 'Authorize Floor Staff Auto-Balance',
      actionDescription: `Automatically redistribute all ${allTableNumbers.length} venue tables evenly across on-duty floor staff.`,
      actionNotice: 'Admin PIN verification required to rebalance table assignments.',
      pendingAction: () => {
        handleAutoBalanceTables();
      }
    });
  }, [allTableNumbers.length, handleAutoBalanceTables]);

  const handleOpenTransferModal = useCallback((emp) => {
    if (!emp.assignedTables || emp.assignedTables.length === 0) {
      showToast(`Employee ${emp.name} currently has no assigned tables to transfer.`, 'info');
      return;
    }
    setTransferModalData({ sourceEmployee: emp, isAbsenceTrigger: false });
    const defaultBackup = employees.find(e => e.id !== emp.id && (e.status === 'Active' || e.status === 'Busy'));
    setSelectedBackupEmpId(defaultBackup ? defaultBackup.id : '');
  }, [employees, showToast]);

  const handleChangeEmployeeStatus = useCallback((employeeId, newStatus) => {
    const targetEmp = employees.find(e => e.id === employeeId);
    if (!targetEmp) return;

    if ((newStatus === 'Absent / Off-duty' || newStatus === 'Absent') && targetEmp.assignedTables?.length > 0) {
      setTransferModalData({ sourceEmployee: targetEmp, isAbsenceTrigger: true });
      const defaultBackup = employees.find(e => e.id !== employeeId && (e.status === 'Active' || e.status === 'Busy'));
      setSelectedBackupEmpId(defaultBackup ? defaultBackup.id : '');
      return;
    }

    // If an employee returns to Active and has tables delegated away, prompt quick rollback
    const origTables = Object.keys(tableCustody)
      .map(Number)
      .filter(tblNum => tableCustody[tblNum]?.originalOwnerId === employeeId);
    const delegatedAway = origTables.filter(t => !(targetEmp.assignedTables || []).includes(t));

    pushUndoSnapshot(`Changed ${targetEmp.name} status to ${newStatus}`);

    if (onSetEmployeeStatus) {
      onSetEmployeeStatus(employeeId, newStatus);
    }
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          return { ...emp, status: newStatus };
        }
        return emp;
      })
    );

    if (newStatus === 'Active' && delegatedAway.length > 0) {
      showToast(
        `${targetEmp.name} is now Active! Reclaim their ${delegatedAway.length} shift tables (T${delegatedAway.join(', T')})?`,
        'info',
        {
          label: 'Reclaim',
          onClick: () => handleRollbackEmployeeTables(employeeId)
        }
      );
    } else {
      showToast(`${targetEmp.name} status updated to "${newStatus}"`, 'info', {
        label: 'Undo',
        onClick: handleUndo
      });
    }
  }, [employees, tableCustody, pushUndoSnapshot, onSetEmployeeStatus, showToast, handleRollbackEmployeeTables, handleUndo]);

  const handleConfirmTransfer = useCallback(() => {
    if (!transferModalData?.sourceEmployee || !selectedBackupEmpId) {
      showToast('Please select an active backup employee', 'error');
      return;
    }

    const sourceEmp = transferModalData.sourceEmployee;
    const backupEmp = employees.find(e => e.id === selectedBackupEmpId);
    if (!backupEmp) return;

    const tablesToTransfer = [...(sourceEmp.assignedTables || [])];

    // Snapshot for Undo
    pushUndoSnapshot(`Transferred ${tablesToTransfer.length} tables from ${sourceEmp.name} to ${backupEmp.name}`);

    // Update local state immediately for instant responsive UI
    setEmployees(prev => prev.map(emp => {
      if (emp.id === sourceEmp.id) {
        return {
          ...emp,
          status: transferModalData.isAbsenceTrigger ? 'Absent' : emp.status,
          assignedTables: []
        };
      }
      if (emp.id === selectedBackupEmpId) {
        const combined = Array.from(new Set([...(emp.assignedTables || []), ...tablesToTransfer])).sort((a, b) => a - b);
        return { ...emp, assignedTables: combined };
      }
      return emp;
    }));

    if (onReassignAllTables) {
      onReassignAllTables(sourceEmp.id, selectedBackupEmpId, transferModalData.isAbsenceTrigger);
    }

    // Preserve the root originalOwnerId in tableCustody!
    setTableCustody(prev => {
      const updated = { ...prev };
      tablesToTransfer.forEach(tblNum => {
        const rootOwner = updated[tblNum]?.originalOwnerId || getDefaultOwnerForTable(tblNum) || sourceEmp.id;
        const trail = updated[tblNum]?.delegationTrail || [rootOwner];
        updated[tblNum] = {
          tableNumber: tblNum,
          originalOwnerId: rootOwner,
          delegationTrail: [...trail, backupEmp.id]
        };
      });
      return updated;
    });

    if (rerouteActiveAlerts) {
      setAlerts(prev => prev.map(alert => {
        if (alert.assignedEmployeeId === sourceEmp.id && alert.status !== 'Completed' && alert.status !== 'Acknowledged') {
          return {
            ...alert,
            assignedEmployeeId: backupEmp.id,
            assignedEmployeeName: backupEmp.name.split(' ')[0],
            responseDetails: `Rerouted to backup ${backupEmp.name} (Absence Transfer)`
          };
        }
        return alert;
      }));
    }

    setTransferModalData(null);
    showToast(
      `Transferred ${tablesToTransfer.length} tables (T${tablesToTransfer.join(', T')}) from ${sourceEmp.name} to ${backupEmp.name}!`,
      'success',
      {
        label: 'Undo',
        onClick: handleUndo
      }
    );
  }, [transferModalData, selectedBackupEmpId, rerouteActiveAlerts, onReassignAllTables, employees, pushUndoSnapshot, showToast, handleUndo]);

  const handleNudgeEmployee = useCallback((employeeId, alertId = null) => {
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          return { ...emp, nudgesCount: (emp.nudgesCount || 0) + 1 };
        }
        return emp;
      })
    );

    if (alertId) {
      setAlerts(prev =>
        prev.map(a => {
          if (a.id === alertId) {
            return { ...a, nudgedCount: (a.nudgedCount || 0) + 1 };
          }
          return a;
        })
      );
    }

    const emp = employees.find(e => e.id === employeeId);
    showToast(`Dispatched high-priority nudge to ${emp?.name || 'Employee'}!`, 'warning');
  }, [employees, showToast]);

  const handleReassignAlert = useCallback((alertId, newEmployeeId) => {
    setAlerts(prev =>
      prev.map(a => {
        if (a.id === alertId) {
          const newEmp = employees.find(e => e.id === newEmployeeId);
          return {
            ...a,
            assignedEmployeeId: newEmployeeId,
            status: 'In Progress',
            responseDetails: `Reassigned to ${newEmp?.name || 'Employee'} by Admin`
          };
        }
        return a;
      })
    );
    setReassignAlertTarget(null);
    showToast('Alert reassigned successfully', 'success');
  }, [employees, showToast]);

  const handleAcknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev =>
      prev.map(a => {
        if (a.id === alertId) {
          return { ...a, status: 'Acknowledged', responseDetails: 'Acknowledged by Admin' };
        }
        return a;
      })
    );
    showToast('Alert acknowledged', 'success');
  }, [showToast]);

  const handleSimulateNewAlert = useCallback(() => {
    const randomScenario = SIMULATED_SCENARIOS[Math.floor(Math.random() * SIMULATED_SCENARIOS.length)];
    const assignedEmp = tableToEmployeeMap[randomScenario.tableNumber] || employees[0];

    const newAlert = {
      id: `alert-sim-${Date.now()}`,
      type: randomScenario.type,
      tableNumber: randomScenario.tableNumber,
      description: randomScenario.description,
      assignedEmployeeId: assignedEmp?.id || 'emp-1',
      assignedEmployeeName: assignedEmp?.name?.split(' ')[0] || 'Staff',
      status: 'Pending',
      responseDetails: 'Dispatched real-time / Awaiting pickup',
      timestamp: Date.now(),
      urgency: randomScenario.urgency,
      nudgedCount: 0
    };

    setAlerts(prev => [newAlert, ...prev]);
    showToast(
      `Dispatched simulated alert for Table ${randomScenario.tableNumber} to ${newAlert.assignedEmployeeName}!`,
      'info'
    );
  }, [employees, tableToEmployeeMap, showToast]);

  const generateNextWaiterCode = useCallback(() => {
    const existingNums = employees
      .map(e => {
        const val = e.accountCode || e.waiterCode || '';
        const m = val.match(/WAIT-(\d+)/i);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(n => n !== null);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 100 + employees.length;
    return `WAIT-${maxNum + 1}`;
  }, [employees]);

  // Persist an employee list to the shared stores (same keys the module always used)
  const persistEmployeeList = (list) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('smartdine_restaurant_employees', JSON.stringify(list));
        localStorage.setItem('smartdine_floor_staff_roster', JSON.stringify(list));
        localStorage.setItem('smartdine_floor_employee_roster', JSON.stringify(list));
      }
      if (restaurantContext?.setEmployees) {
        restaurantContext.setEmployees(list);
      }
    } catch (_) {}
  };

  // Opens the reset dialog. The current password is never displayed, only replaced.
  const openResetPassword = useCallback((employeeId) => {
    const target = employees.find(e => e.id === employeeId || String(e.numericId) === String(employeeId));
    if (!target) return;
    setResetPwTarget(target);
    setResetPwForm({ next: '', confirm: '', masterPin: '', error: '' });
  }, [employees]);

  const submitPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetPwTarget || resetPwChecking) return;
    const next = resetPwForm.next.trim();
    const confirm = resetPwForm.confirm.trim();
    if (!isValidStaffPassword(next)) {
      setResetPwForm(f => ({ ...f, error: 'Password must be 4 to 8 digits.' }));
      return;
    }
    if (next !== confirm) {
      setResetPwForm(f => ({ ...f, error: 'The two passwords do not match.' }));
      return;
    }
    setResetPwChecking(true);
    const pinOk = await verifyAdminPin(resetPwForm.masterPin.trim());
    setResetPwChecking(false);
    if (!pinOk) {
      setResetPwForm(f => ({ ...f, error: 'Admin master PIN is incorrect. Password was not changed.' }));
      return;
    }

    const target = resetPwTarget;
    const patch = createStaffCredential(next);
    pushUndoSnapshot(`Reset password for ${target.name}`);

    const nextEmployees = employees.map(emp =>
      emp.id === target.id ? stripPlainCredentials({ ...emp, ...patch }) : emp
    );
    setEmployees(nextEmployees);
    if (restaurantContext?.updateEmployeeCredentials) {
      restaurantContext.updateEmployeeCredentials(target.id, patch);
    }
    persistEmployeeList(nextEmployees);

    setResetPwTarget(null);
    setResetPwForm({ next: '', confirm: '', masterPin: '', error: '' });
    showToast(`Password updated for ${target.name}. It cannot be viewed again.`, 'success', {
      label: 'Undo',
      onClick: handleUndo
    });
  };

  const handleCopyLoginCard = useCallback((emp) => {
    const tablesText = (emp.assignedTables && emp.assignedTables.length > 0)
      ? emp.assignedTables.map(t => `T${t}`).join(', ')
      : 'None assigned';

    const code = emp.accountCode || emp.waiterCode || 'WAIT-100';
    const cardText = `🍽️ SmartDine Waiter Console Access Card
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Staff Name : ${emp.name} (${emp.role})
🆔 Account ID : ${code}
🔑 Password   : Set by admin (ask admin to reset if forgotten)
📍 Assigned   : ${tablesText}
⏰ Shift      : ${emp.shift}
📞 Phone      : ${emp.phone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Login at: ${typeof window !== 'undefined' ? window.location.origin : ''}/waiter`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cardText).then(() => {
        showToast(`Copied Waiter Access Card for ${emp.name} to clipboard!`, 'success');
      }).catch(() => {
        showToast(`ID: ${code}`, 'info');
      });
    } else {
      showToast(`ID: ${code}`, 'info');
    }
  }, [showToast]);

  const handleCopyAllAccessRoster = useCallback(() => {
    const lines = employees.map(emp => {
      const tablesText = (emp.assignedTables && emp.assignedTables.length > 0)
        ? emp.assignedTables.map(t => `T${t}`).join(', ')
        : 'None';
      const code = emp.accountCode || emp.waiterCode || 'WAIT-100';
      return `• ${emp.name.padEnd(18)} | ID: ${code.padEnd(9)} | Tables: ${tablesText}`;
    }).join('\n');

    const fullText = `🍽️ SmartDine Waiter Accounts Roster\nGenerated: ${new Date().toLocaleTimeString()}\n${'═'.repeat(60)}\n${lines}\n${'═'.repeat(60)}\nHandheld Console: /waiter`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        showToast(`Copied all ${employees.length} Waiter Accounts to clipboard!`, 'success');
      });
    } else {
      showToast('Clipboard not available', 'error');
    }
  }, [employees, showToast]);

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    const code = generateNextWaiterCode();
    setFormData({
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'Floor Specialist',
      shift: 'Morning Shift (08:00 - 16:00)',
      status: 'Active',
      phone: '',
      email: '',
      assignedTables: [],
      accountCode: code,
      waiterCode: code
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    const code = emp.username || emp.accountCode || emp.waiterCode || `WAIT-${100 + (emp.numericId || 1)}`;
    setFormData({
      name: emp.name,
      username: emp.username || emp.accountCode || emp.waiterCode || '',
      password: '',
      confirmPassword: '',
      role: emp.role,
      shift: emp.shift,
      status: emp.status,
      phone: emp.phone || '',
      email: emp.email || '',
      assignedTables: [...(emp.assignedTables || [])],
      accountCode: code,
      waiterCode: code
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveEmployeeForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter employee name', 'error');
      return;
    }

    const rawUser = (formData.username || formData.accountCode || formData.waiterCode || '').trim();
    const username = rawUser ? rawUser.toLowerCase() : formData.name.toLowerCase().replace(/\s+/g, '.');
    const code = (formData.accountCode || formData.waiterCode || username).trim().toUpperCase() || generateNextWaiterCode();

    // New accounts need an initial password. It is stored hashed and never shown again.
    // Existing accounts change passwords only through the Set new password flow.
    let credential = null;
    if (!editingEmployee) {
      const pw = String(formData.password || '').trim();
      if (!isValidStaffPassword(pw)) {
        showToast('Password must be 4 to 8 digits', 'error');
        return;
      }
      if (pw !== String(formData.confirmPassword || '').trim()) {
        showToast('The two passwords do not match', 'error');
        return;
      }
      credential = createStaffCredential(pw);
    }

    pushUndoSnapshot(editingEmployee ? `Updated ${formData.name.trim()}` : `Registered ${formData.name.trim()}`);

    let nextEmployees;

    if (editingEmployee) {
      nextEmployees = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            name: formData.name.trim(),
            username,
            role: formData.role,
            shift: formData.shift,
            status: formData.status,
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            assignedTables: formData.assignedTables.sort((a, b) => a - b),
            accountCode: code,
            waiterCode: code
          };
        }
        if (formData.assignedTables.some(t => (emp.assignedTables || []).includes(t))) {
          return {
            ...emp,
            assignedTables: emp.assignedTables.filter(t => !formData.assignedTables.includes(t))
          };
        }
        return emp;
      });

      setEmployees(nextEmployees);

      if (restaurantContext?.updateEmployeeCredentials) {
        restaurantContext.updateEmployeeCredentials(editingEmployee.id, { accountCode: code });
      }

      showToast(`Employee "${formData.name.trim()}" profile updated!`, 'success', {
        label: 'Undo',
        onClick: handleUndo
      });
    } else {
      const initials = formData.name
        .trim()
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'EM';

      const nextNumericId = employees.reduce((max, e) => Math.max(max, Number(e.numericId) || 0), 0) + 1;
      const newId = `emp-${nextNumericId}`;

      const newEmp = {
        id: newId,
        numericId: nextNumericId,
        name: formData.name.trim(),
        username,
        initials,
        role: formData.role,
        shift: formData.shift,
        status: formData.status,
        assignedTables: formData.assignedTables.sort((a, b) => a - b),
        activePickups: 0,
        activeRequests: 0,
        avgResponseTime: '11s',
        lastCallResponse: 'Freshly onboarded',
        onTimeRate: '100%',
        avatarType: 'orange',
        phone: formData.phone.trim() || `+880 1700-${String(100000 + nextNumericId).slice(1)}`,
        email: formData.email.trim() || `${username}@smartdine.internal`,
        nudgesCount: 0,
        accountCode: code,
        waiterCode: code,
        passwordHash: credential.passwordHash,
        passwordSalt: credential.passwordSalt,
        passwordUpdatedAt: credential.passwordUpdatedAt,
        hiredAt: new Date().toISOString().split('T')[0]
      };

      const cleaned = employees.map(emp => ({
        ...emp,
        assignedTables: (emp.assignedTables || []).filter(t => !formData.assignedTables.includes(t))
      }));
      nextEmployees = [...cleaned, newEmp];
      setEmployees(nextEmployees);

      // Register new tables in custody
      setTableCustody(prev => {
        const updated = { ...prev };
        formData.assignedTables.forEach(t => {
          updated[t] = {
            tableNumber: t,
            originalOwnerId: newId,
            delegationTrail: [newId]
          };
        });
        return updated;
      });

      if (restaurantContext?.hireEmployee) {
        restaurantContext.hireEmployee({
          name: formData.name.trim(),
          username,
          role: formData.role,
          shift: formData.shift,
          status: formData.status,
          phone: newEmp.phone,
          email: newEmp.email,
          assignedTables: formData.assignedTables,
          accountCode: code,
          passwordHash: credential.passwordHash,
          passwordSalt: credential.passwordSalt,
          passwordUpdatedAt: credential.passwordUpdatedAt
        });
      }

      showToast(`Employee "${formData.name.trim()}" successfully registered with Username "${username}"!`, 'success', {
        label: 'Undo',
        onClick: handleUndo
      });
    }

    persistEmployeeList(nextEmployees);
    setIsAddEditModalOpen(false);
  };

  const handleDeleteEmployee = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    if (window.confirm(`Are you sure you want to remove Employee ${emp.name}? Their assigned tables will be unassigned.`)) {
      pushUndoSnapshot(`Removed Employee ${emp.name}`);
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      showToast(`Employee ${emp.name} removed from active roster`, 'info', {
        label: 'Undo',
        onClick: handleUndo
      });
    }
  };

  const renderAvatar = (emp) => {
    if (emp.name === 'Rakib Ahmed' || emp.avatarType === 'orange') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 shadow-lg shadow-orange-500/20 font-bold text-base flex items-center justify-center shrink-0">
          {emp.initials || 'RA'}
        </div>
      );
    }
    if (emp.name === 'Hasan Mahmud' || emp.avatarType === 'blue') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-bold text-base flex items-center justify-center shrink-0">
          {emp.initials || 'HM'}
        </div>
      );
    }
    if (emp.name === 'Priya Sen' || emp.avatarType === 'purple') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/20 font-bold text-base flex items-center justify-center shrink-0">
          {emp.initials || 'PS'}
        </div>
      );
    }
    if (emp.name === 'Tanvir Rahman' || emp.avatarType === 'amber') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-bold text-base flex items-center justify-center shrink-0">
          {emp.initials || 'TR'}
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-lg shadow-rose-500/20 font-bold text-base flex items-center justify-center shrink-0">
        {emp.initials || 'SI'}
      </div>
    );
  };

  const getShiftColor = (emp) => {
    if (emp.name === 'Rakib Ahmed' || emp.avatarType === 'orange') return 'text-amber-400/90';
    if (emp.name === 'Hasan Mahmud' || emp.avatarType === 'blue') return 'text-cyan-400/90';
    if (emp.name === 'Priya Sen' || emp.avatarType === 'purple') return 'text-purple-400/90';
    if (emp.name === 'Tanvir Rahman' || emp.avatarType === 'amber') return 'text-amber-400/90';
    return 'text-rose-400/90';
  };

  return (
    <div
      className={`staff-light-root w-full min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 antialiased selection:bg-[#F59E0B] selection:text-slate-950 relative ${className}`}
    >
      {/* Toast Notification Container with Undo Support & Anti-Premature Closing */}
      {toastMessage && (
        <div
          className="fixed bottom-6 left-6 z-50 animate-fadeIn"
          onMouseEnter={handleToastMouseEnter}
          onMouseLeave={handleToastMouseLeave}
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/60 shadow-emerald-950/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/60 shadow-amber-950/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/60 shadow-rose-950/50'
                : 'bg-[#131926]/95 border-[#2A384C] text-slate-100 shadow-slate-950/60'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />}
            <span className="leading-tight">{toastMessage.text}</span>
            {toastMessage.action && (
              <button
                type="button"
                onClick={() => {
                  toastMessage.action.onClick();
                  // Note: Do not call setToastMessage(null) here so handleUndo's feedback toast is preserved!
                }}
                className="ml-2 px-3 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                <span>[ {toastMessage.action.label || 'Undo'} ]</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                setToastMessage(null);
              }}
              className="p-1 hover:bg-white/10 rounded-lg ml-1 text-slate-400 hover:text-white cursor-pointer transition shrink-0"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. HERO CARD SECTION
          ========================================================================= */}
      <section className="bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] rounded-[14px] p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Orange-tinted Icon Box + Title + Muted Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-[#1E293B] to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-[#F59E0B] shrink-0 shadow-sm shadow-orange-500/10">
            <Users className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="admin-section-title text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Employee Hub
            </h2>
            <p className="max-w-md text-slate-400 text-xs sm:text-sm mt-0.5">
              Staff roster, dining room table assignments, and real-time dispatch routing
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 max-w-xl">
          {/* Prominent Instant Undo Button (Shows whenever undoStack has items) */}
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="h-[38px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition active:scale-95 cursor-pointer shadow-sm"
              title={`Undo: ${undoStack[0].description} (Cmd+Z / Ctrl+Z)`}
            >
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Undo ({undoStack.length})</span>
            </button>
          )}

          {/* Batch Rollback to Shift Roster (Emerald outline) */}
          <button
            type="button"
            onClick={handleRollbackAllToShiftRoster}
            className="h-[38px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition active:scale-95 cursor-pointer shadow-sm"
            title="Batch reset: Rollback all table delegations to original shift roster owners venue-wide"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Rollback All to Roster</span>
          </button>

          {/* Outlined Auto-Balance Button (Subtle slate/gold outline) */}
          <button
            type="button"
            onClick={requestAutoBalanceTables}
            className="h-[38px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-200 hover:border-amber-500/40 hover:text-white bg-[#111726]/80 transition active:scale-95 cursor-pointer shadow-sm"
            title="Auto-balance tables across active employees (Requires admin PIN)"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Auto-Balance Tables</span>
          </button>

          {/* Secondary Simulate Alert Button (Subtle slate outline) */}
          <button
            type="button"
            onClick={handleSimulateNewAlert}
            className="h-[38px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white bg-[#111726]/80 transition active:scale-95 cursor-pointer shadow-sm"
            title="Simulate incoming customer call or kitchen alert"
          >
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Simulate Alert</span>
          </button>

          {/* Vibrant Solid Orange + Add Employee Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-[38px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-white shrink-0" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          3. METRICS ROW (4 Cards Side-by-Side)
          ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Employees */}
        <div className="relative overflow-hidden p-5 rounded-[14px] bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] flex items-center justify-between shadow-md">
          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative z-10">
            <span className="text-xs font-medium text-slate-400 block">Total Employees</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summaryMetrics.totalEmployees}
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">Registered</span>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        {/* Card 2: Active On-Duty */}
        <div className="relative overflow-hidden p-5 rounded-[14px] bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] flex items-center justify-between shadow-md">
          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/15 blur-2xl" />
          <div className="relative z-10">
            <span className="text-xs font-medium text-slate-400 block">Active On-Duty</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {summaryMetrics.activeOnDuty}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-0.5">
              <span>Floor Ready</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Card 3: Tables Covered */}
        <div className="relative overflow-hidden p-5 rounded-[14px] bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] flex items-center justify-between shadow-md">
          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/15 blur-2xl" />
          <div className="relative z-10">
            <span className="text-xs font-medium text-slate-400 block">Tables Covered</span>
            <div className="flex items-baseline mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summaryMetrics.tablesCovered}/{summaryMetrics.totalTables}
              </span>
              <span className="text-sm font-bold text-emerald-400 ml-1.5">
                ({summaryMetrics.coveragePercentage}%)
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              {summaryMetrics.tablesCovered} of {summaryMetrics.totalTables} Tables
            </span>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Table className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Card 4: Avg Response */}
        <div className="relative overflow-hidden p-5 rounded-[14px] bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] flex items-center justify-between shadow-md">
          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-500/15 blur-2xl" />
          <div className="relative z-10">
            <span className="text-xs font-medium text-slate-400 block">Avg Response</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#F59E0B]">
                {summaryMetrics.avgResponseTime}
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">Telemetry</span>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SECTION NAVIGATION/TABS
          ========================================================================= */}
      <section className="bg-[#111726]/85 backdrop-blur-md rounded-[14px] border border-white/[0.07] px-4 pt-3 pb-0 shadow-md">
        <div className="flex flex-wrap items-center gap-6 border-b border-slate-800 px-2 overflow-x-auto">
          {/* People */}
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`staff-tab ${activeTab === 'roster' ? 'is-active' : ''}`}
          >
            <Users className="w-4 h-4" />
            <span>People</span>
            <span className="staff-tab-count">{employees.length}</span>
          </button>

          {/* Tables & routing (coverage + live call dispatch) */}
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`staff-tab ${activeTab === 'tables' ? 'is-active' : ''}`}
          >
            <Table className="w-4 h-4" />
            <span>Tables &amp; Routing</span>
            <span className="staff-tab-count">{summaryMetrics.tablesCovered}/{totalVenueTables}</span>
          </button>

          {/* Handover, messages & audit */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`staff-tab ${activeTab === 'history' ? 'is-active' : ''}`}
          >
            <Clock className="w-4 h-4" />
            <span>Handover &amp; Activity</span>
            <span className="staff-tab-count">{activityLogs.length}</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          5. FILTER & SEARCH BAR
          ========================================================================= */}
      {activeTab === 'roster' && (
        <section className="bg-[#111726]/90 backdrop-blur-md rounded-[14px] border border-slate-800/80 p-3 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left Pills */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1 scrollbar-none">
            {/* All */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-[#161F32] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-slate-700/60 font-medium'
              }`}
            >
              All ({employees.length})
            </button>

            {/* Active */}
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                statusFilter === 'Active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-md shadow-emerald-500/20 font-semibold'
                  : 'bg-[#161F32] hover:bg-[#1E293B] text-slate-300 hover:text-emerald-400 border border-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Active ({summaryMetrics.activeOnDuty})</span>
            </button>

            {/* Busy */}
            <button
              type="button"
              onClick={() => setStatusFilter('Busy')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                statusFilter === 'Busy'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-md shadow-amber-500/20 font-semibold'
                  : 'bg-[#161F32] hover:bg-[#1E293B] text-slate-300 hover:text-amber-400 border border-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>Busy ({summaryMetrics.currentlyBusy})</span>
            </button>

            {/* On Break */}
            <button
              type="button"
              onClick={() => setStatusFilter('On Break')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                statusFilter === 'On Break'
                  ? 'bg-slate-700/60 text-slate-200 border border-slate-500/60 shadow-md shadow-slate-500/20 font-semibold'
                  : 'bg-[#161F32] hover:bg-[#1E293B] text-slate-300 hover:text-slate-100 border border-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>On Break ({summaryMetrics.onBreak})</span>
            </button>

            {/* Absent */}
            <button
              type="button"
              onClick={() => setStatusFilter('Absent')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                statusFilter === 'Absent'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-md shadow-rose-500/20 font-semibold'
                  : 'bg-[#161F32] hover:bg-[#1E293B] text-slate-300 hover:text-rose-400 border border-slate-700/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Absent ({summaryMetrics.absent})</span>
            </button>
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="staff-select"
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            {Array.from(new Set(employees.map(e => e.role).filter(Boolean))).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Right: Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, role, table..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          6. TAB A: EMPLOYEE DIRECTORY & ROSTER (2-Column Grid)
          ========================================================================= */}
      {activeTab === 'roster' && (
        <section className="space-y-4 animate-fadeIn">
          {filteredEmployees.length === 0 ? (
            <div className="bg-[#131926] rounded-2xl border border-[#1E293B] p-12 text-center text-slate-400">
              <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No Employees matched your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEmployees.map(emp => {
                const assignedCount = (emp.assignedTables || []).length;

                // Tables originally belonging to emp
                const originalTables = Object.keys(tableCustody)
                  .map(Number)
                  .filter(tblNum => tableCustody[tblNum]?.originalOwnerId === emp.id);

                // Tables delegated away (belong to emp, but currently held by someone else)
                const delegatedAwayTables = originalTables.filter(
                  t => !(emp.assignedTables || []).includes(t)
                );

                // Tables currently held by emp that belong to someone else (borrowed)
                const borrowedTables = (emp.assignedTables || []).filter(
                  t => tableCustody[t]?.originalOwnerId && tableCustody[t]?.originalOwnerId !== emp.id
                );

                const statusClasses = emp.status === 'Active'
                  ? { border: 'border-emerald-500/30 hover:border-emerald-500/50', text: 'text-emerald-400', dot: 'bg-emerald-400' }
                  : emp.status === 'Busy'
                  ? { border: 'border-amber-500/30 hover:border-amber-500/50', text: 'text-amber-400', dot: 'bg-amber-400' }
                  : emp.status === 'On Break'
                  ? { border: 'border-slate-500/30 hover:border-slate-500/50', text: 'text-slate-300', dot: 'bg-slate-400' }
                  : { border: 'border-rose-500/30 hover:border-rose-500/50', text: 'text-rose-400', dot: 'bg-rose-400' };

                return (
                  <div
                    key={emp.id}
                    className="bg-[#111726]/85 backdrop-blur-md border border-white/[0.07] rounded-[14px] p-5 shadow-lg hover:border-white/10 transition-colors flex flex-col justify-between space-y-4 overflow-hidden"
                  >
                    {/* Header: Avatar, Name, Role, Shift + Inline Right Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Avatar + Details (Never squished) */}
                      <div className="flex items-center gap-3 shrink-0 min-w-0">
                        {renderAvatar(emp)}
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-white tracking-tight whitespace-nowrap">
                            <button type="button" onClick={() => setDetailEmpId(emp.id)} className="staff-name-link">
                              {emp.name}
                            </button>
                          </h4>
                          <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {emp.role}
                          </p>
                          <p className={`text-xs font-medium mt-0.5 whitespace-nowrap ${getShiftColor(emp)}`}>
                            {emp.shift}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 whitespace-nowrap" title="Hours clocked in today">
                            Hours today: <span className="font-semibold text-slate-200">{formatHours(hoursTodayFor(staffKey(emp)))}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right Controls: Structured 2-tier right-aligned rows with zero overflow */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Tier 1: Primary Status & Quick Transfer */}
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Compact "Active" dropdown pill */}
                          <div className="relative inline-flex items-center shrink-0">
                            <select
                              value={emp.status}
                              onChange={e => handleChangeEmployeeStatus(emp.id, e.target.value)}
                              className={`appearance-none bg-[#0B0F19] border ${statusClasses.border} ${statusClasses.text} text-xs font-semibold pl-5 pr-5 py-1 rounded-lg cursor-pointer focus:outline-none transition`}
                            >
                              <option value="Active" className="bg-[#111726] text-emerald-400">Active</option>
                              <option value="Busy" className="bg-[#111726] text-amber-400">Busy</option>
                              <option value="On Break" className="bg-[#111726] text-slate-400">On Break</option>
                              <option value="Absent" className="bg-[#111726] text-rose-400">Absent</option>
                            </select>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusClasses.dot} absolute left-2 pointer-events-none`} />
                            <span className="text-[10px] text-slate-400 absolute right-1.5 pointer-events-none">▾</span>
                          </div>

                          {/* Transfer button */}
                          <button
                            type="button"
                            onClick={() => handleOpenTransferModal(emp)}
                            className="border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 shadow-xs"
                            title={`Transfer all ${assignedCount} tables to backup employee`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                            <span>Transfer</span>
                          </button>
                        </div>

                        {/* Tier 2: Rollback Reclaim (if any) + Action Tool Icons */}
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Dedicated Rollback / Reclaim Button if tables are delegated away */}
                          {delegatedAwayTables.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRollbackEmployeeTables(emp.id)}
                              className="border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 shadow-xs"
                              title={`Rollback / Reclaim ${delegatedAwayTables.length} tables (T${delegatedAwayTables.join(', T')}) currently covered by backup staff`}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Rollback ({delegatedAwayTables.length})</span>
                            </button>
                          )}

                          {/* 3 square icon buttons grouped together */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleNudgeEmployee(emp.id)}
                              className="w-7 h-7 rounded-lg bg-[#0B0F19] hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-amber-400 flex items-center justify-center transition cursor-pointer"
                              title="Send instant floor nudge"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(emp)}
                              className="w-7 h-7 rounded-lg bg-[#0B0F19] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                              title="Edit Employee profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="w-7 h-7 rounded-lg bg-[#0B0F19] hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                              title="Remove Employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Login & credentials: password is masked and can only be replaced */}
                    <div className="staff-cred-row">
                      <div className="staff-cred-fields">
                        <span className="staff-cred-item">
                          <span className="staff-cred-label">Login ID</span>
                          <code className="staff-cred-value">{emp.accountCode || emp.waiterCode || `WAIT-${100 + (emp.numericId || 1)}`}</code>
                        </span>
                        <span className="staff-cred-item">
                          <span className="staff-cred-label">Password</span>
                          <code className="staff-cred-value staff-cred-masked" aria-label="Password hidden">{STAFF_PASSWORD_MASK}</code>
                        </span>
                      </div>
                      <div className="staff-cred-actions">
                        <button type="button" onClick={() => openResetPassword(emp.id)} className="staff-btn staff-btn-primary">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Set new password</span>
                        </button>
                        <button type="button" onClick={() => handleCopyLoginCard(emp)} className="staff-btn" title="Copy login card (no password)">
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy card</span>
                        </button>
                        <button type="button" onClick={() => setKeycardModalEmployee(emp)} className="staff-btn" title="View digital keycard">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Keycard</span>
                        </button>
                      </div>
                    </div>

                    {/* Assigned Tables Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Table className="w-3.5 h-3.5 text-amber-400" />
                          <span>Assigned Tables ({assignedCount})</span>
                          {borrowedTables.length > 0 && (
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                              {borrowedTables.length} covering
                            </span>
                          )}
                          {delegatedAwayTables.length > 0 && (
                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                              {delegatedAwayTables.length} delegated
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Click pill to toggle / reclaim
                        </span>
                      </div>

                      {/* Table Pills (T1 to T12) */}
                      <div className="flex flex-wrap items-center gap-2">
                        {allTableNumbers.map(tblNum => {
                          const isHeld = (emp.assignedTables || []).includes(tblNum);
                          const origOwnerId = tableCustody[tblNum]?.originalOwnerId;
                          const isOwnTable = origOwnerId === emp.id;
                          const isBorrowed = isHeld && !isOwnTable;
                          const isDelegatedAway = !isHeld && isOwnTable;
                          const currentHolder = isDelegatedAway
                            ? employees.find(e => (e.assignedTables || []).includes(tblNum))
                            : null;
                          const originalOwnerEmp = isBorrowed
                            ? employees.find(e => e.id === origOwnerId)
                            : null;

                          return (
                            <button
                              key={tblNum}
                              type="button"
                              onClick={() => {
                                handleToggleTableAssignment(emp.id, tblNum);
                              }}
                              className={`font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                                isHeld && isOwnTable
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/20 border border-orange-400/30'
                                  : isBorrowed
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/60'
                                  : isDelegatedAway
                                  ? 'bg-emerald-950/30 text-emerald-300 border border-dashed border-emerald-500/60 hover:bg-emerald-900/40'
                                  : 'bg-[#1A2234] border border-slate-700/70 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                              }`}
                              title={
                                isHeld && isOwnTable
                                  ? `Table ${tblNum} is assigned to ${emp.name}. Click to unassign.`
                                  : isBorrowed
                                  ? `Table ${tblNum} is covering for ${originalOwnerEmp?.name || 'Staff'}. Click to reassign.`
                                  : isDelegatedAway
                                  ? `Table ${tblNum} belongs to ${emp.name}, currently covered by ${currentHolder?.name || 'Staff'}. Click to reclaim!`
                                  : `Click to assign Table ${tblNum} to ${emp.name}.`
                              }
                            >
                              {isHeld && isOwnTable && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              {isBorrowed && <ArrowRightLeft className="w-3 h-3 text-amber-400" />}
                              {isDelegatedAway && <RotateCcw className="w-3 h-3 text-emerald-400" />}
                              <span>T{tblNum}</span>
                              {isBorrowed && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/25 border border-amber-500/40 text-amber-300 whitespace-nowrap">
                                  Covering for {originalOwnerEmp?.name?.split(' ')[0] || 'Staff'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Footer Telemetry Bar (Fix clipped ovals) */}
                    <div className="grid grid-cols-4 divide-x divide-slate-800/80 border-t border-slate-800/80 bg-[#0B0F19]/60 -mx-5 -mb-5 rounded-b-[14px] py-2.5 text-center text-xs text-slate-400 font-medium">
                      <div>Pickups &mdash;</div>
                      <div>Requests &mdash;</div>
                      <div>Avg Resp &mdash;</div>
                      <div>On-Time &mdash;</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 2 (removed): waiter credentials now live on each People card and in the detail drawer
      ========================================================================= */}
      {/* =========================================================================
          TAB B: DINING ROOM TABLE COVERAGE (TABLES 1-12)
          ========================================================================= */}
      {activeTab === 'tables' && (
        <section className="bg-[#111726]/95 backdrop-blur-md admin-card border border-white/[0.07] p-5 sm:p-6 space-y-5 animate-fadeIn">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <Table className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="font-bold text-white text-base">
                  Dining Room Table Coverage (Tables 1–{totalVenueTables})
                </h3>
                <p className="text-xs text-slate-400">
                  Floor allocation matrix with inline staff reassignment and 1-click balance
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRollbackAllToShiftRoster}
                className="h-[38px] px-3.5 rounded-xl border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
                title="Rollback all table delegations to original shift roster owners"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rollback All to Roster</span>
              </button>

              <button
                type="button"
                onClick={requestAutoBalanceTables}
                className="h-[38px] px-3.5 rounded-xl border border-slate-700 text-slate-200 hover:border-amber-500/40 hover:text-white bg-[#0B0F19] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
                title="Auto-balance tables across staff (Requires admin PIN)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Balance Tables</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Assigned
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B0F19] border border-white/[0.07]" /> Unassigned
                </span>
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {allTableNumbers.map(tableNum => {
              const assignedEmp = tableToEmployeeMap[tableNum];
              const isAssigned = !!assignedEmp;
              const origOwnerId = tableCustody[tableNum]?.originalOwnerId;
              const origOwnerEmp = employees.find(e => e.id === origOwnerId);
              const isCovering = isAssigned && origOwnerId && origOwnerId !== assignedEmp.id;

              return (
                <div
                  key={tableNum}
                  className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-3 ${
                    isAssigned
                      ? 'bg-[#0B0F19] border-white/[0.07] hover:border-white/[0.15]'
                      : 'bg-[#0B0F19]/40 border-dashed border-white/[0.07] hover:border-slate-700'
                  }`}
                >
                  {/* Top: Table Number & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Table {tableNum}
                    </span>
                    {isCovering ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-[#F59E0B] border border-amber-500/40">
                        Covering for {origOwnerEmp?.name?.split(' ')[0] || 'Staff'}
                      </span>
                    ) : isAssigned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Assigned
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {/* Middle: Assigned Employee Details */}
                  <div className="py-1">
                    {isAssigned ? (
                      <div className="flex items-center gap-2.5">
                        <div className="shrink-0 scale-90">
                          {renderAvatar(assignedEmp)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {assignedEmp.name}
                          </p>
                          <span
                            className={`text-[10px] font-medium block truncate ${
                              assignedEmp.status === 'Active'
                                ? 'text-emerald-400'
                                : assignedEmp.status === 'Busy'
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {assignedEmp.status} &bull; {assignedEmp.role}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No Employee assigned</p>
                    )}
                  </div>

                  {/* Bottom: Inline Reassignment Dropdown with PIN Lock */}
                  <div className="pt-2 border-t border-white/[0.07]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400 font-medium block">
                        Assigned Employee:
                      </label>
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded"
                        title="Requires admin PIN"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>PIN</span>
                      </span>
                    </div>
                    <select
                      value={assignedEmp ? assignedEmp.id : ''}
                      onChange={e => {
                        const newEmpId = e.target.value;
                        if (newEmpId) {
                          requestDirectTableReassign(tableNum, newEmpId);
                        }
                      }}
                      className="w-full bg-[#131926] border border-white/[0.07] text-xs text-slate-200 rounded-xl py-1.5 px-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#111726] text-slate-500">
                        Assign Employee...
                      </option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-[#111726] text-white">
                          {emp.name} ({emp.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB C: LIVE CALL ROUTING & KITCHEN DISPATCH
          ========================================================================= */}
      {activeTab === 'tables' && (
        <section className="bg-[#111726]/95 backdrop-blur-md admin-card border border-white/[0.07] p-5 sm:p-6 space-y-5 animate-fadeIn">
          {/* Dispatch Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="font-bold text-white text-base">
                  Live Call Routing &amp; Kitchen Dispatch
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time event feed for customer assistance summons and kitchen food ready alerts
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Event Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-xl border border-white/[0.07] text-xs">
                <button
                  type="button"
                  onClick={() => setAlertFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'all' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('active')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'active' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({alerts.filter(a => a.status !== 'Completed' && a.status !== 'Acknowledged').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('resolved')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'resolved' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Resolved ({alerts.filter(a => a.status === 'Completed' || a.status === 'Acknowledged').length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleSimulateNewAlert}
                className="h-[38px] px-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-slate-200 border border-white/[0.07] hover:border-amber-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Call</span>
              </button>
            </div>
          </div>

          {/* Events Stream */}
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No dispatch events in this view</p>
              <p className="text-xs text-slate-400 mt-1">All service alerts are currently addressed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => {
                const assignedEmp = employees.find(e => e.id === alert.assignedEmployeeId);
                const isKitchen = alert.type === 'kitchen_ready';
                const isResolved = alert.status === 'Acknowledged' || alert.status === 'Completed';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all duration-150 bg-[#0B0F19] space-y-3 ${
                      isResolved
                        ? 'border-white/[0.07] opacity-75'
                        : alert.urgency === 'high'
                        ? 'border-rose-500/40'
                        : isKitchen
                        ? 'border-amber-500/40'
                        : 'border-white/[0.07]'
                    }`}
                  >
                    {/* Event Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isKitchen
                              ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isKitchen ? <ChefHat className="w-3 h-3" /> : <BellRing className="w-3 h-3" />}
                          <span>{isKitchen ? 'Kitchen Food Ready' : 'Customer Assistance'}</span>
                        </span>

                        <span className="text-xs font-bold text-amber-300">
                          Table {alert.tableNumber}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        {Math.max(1, Math.round((Date.now() - alert.timestamp) / 1000))}s ago
                      </span>
                    </div>

                    {/* Routing Banner & Event Description */}
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-[#131926] border border-white/[0.07] text-xs font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span className="text-amber-300">
                          Table {alert.tableNumber} {isKitchen ? 'Food Ready in Kitchen' : 'called for assistance'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200">
                          Routed to Employee {assignedEmp ? assignedEmp.name.split(' ')[0] : (alert.assignedEmployeeName || 'Staff')}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-emerald-400">
                          Status: {alert.responseDetails}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        {alert.description}
                      </p>

                      <div className="flex items-center justify-between gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <span>Assigned Staff:</span>
                          <span className="font-bold text-white flex items-center gap-1.5">
                            {assignedEmp ? assignedEmp.name : 'Unassigned'}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isResolved
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleNudgeEmployee(alert.assignedEmployeeId, alert.id)}
                          className="h-[34px] px-3 rounded-lg bg-[#131926] hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer border border-amber-500/40 flex items-center gap-1.5 shadow-sm"
                          title="Send instant priority nudge to Employee"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>
                            Nudge Employee {alert.nudgedCount ? `(${alert.nudgedCount})` : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReassignAlertTarget(alert)}
                          className="h-[34px] px-3 rounded-lg bg-[#131926] hover:bg-[#1E293B] text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer border border-white/[0.07] hover:border-white/[0.15] flex items-center gap-1.5 shadow-sm"
                          title="Reassign to another Employee"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>Reassign to another Employee</span>
                        </button>
                      </div>

                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="h-[34px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm shadow-emerald-600/20"
                          title="Acknowledge as Admin"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB E: EMPLOYEE ACTIVITY & LIVE AUDIT HISTORY
          ========================================================================= */}
      {activeTab === 'history' && (
        <section className="space-y-5 animate-fadeIn">
          {/* Header Card with Telemetry Stats */}
          <div className="bg-[#111726]/95 backdrop-blur-md admin-card border border-white/[0.07] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span>Employee Activity &amp; Live Audit History</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Telemetry
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time operational audit log: waiter text dispatches, urgent alerts, kitchen status advancements, and staff logins
                  </p>
                </div>
              </div>
            </div>

            {/* Staff-to-staff contact form: any employee can message a colleague */}
            {restaurantContext?.sendStaffMessage && employees.filter(e => e.id !== loggedInStaff?.id).length > 0 && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const target = employees.find(emp => emp.id === peerTargetId);
                  if (!target || !peerText.trim()) return;
                  restaurantContext.sendStaffMessage(target.id, peerText.trim(), {
                    from: loggedInStaff ? 'Employee' : 'Admin',
                    fromName: loggedInStaff?.name || 'Head Desk / Admin',
                    fromRole: loggedInStaff?.role || 'Admin',
                    fromEmployeeId: loggedInStaff?.id || 'admin',
                    fromStaffId: loggedInStaff
                      ? String(loggedInStaff.staffId || loggedInStaff.numericId || loggedInStaff.accountCode || '')
                      : 'ADMIN'
                  });
                  setPeerText('');
                  setPeerSent(`Sent to ${target.name}`);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <select
                  value={peerTargetId}
                  onChange={e => setPeerTargetId(e.target.value)}
                  className="px-3 py-3 rounded-xl bg-[#080B10] border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500/60"
                  aria-label="Choose colleague"
                >
                  <option value="">Message a colleague...</option>
                  {employees.filter(e => e.id !== loggedInStaff?.id).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={peerText}
                  onChange={e => { setPeerText(e.target.value); setPeerSent(''); }}
                  placeholder="Type a short message..."
                  className="flex-1 px-3 py-3 rounded-xl bg-[#080B10] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
                  aria-label="Message to colleague"
                />
                <button
                  type="submit"
                  disabled={!peerTargetId || !peerText.trim()}
                  className="staff-action staff-touch px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black cursor-pointer"
                >
                  Send
                </button>
                {peerSent && <p className="text-xs text-emerald-400 self-center">{peerSent}</p>}
              </form>
            )}

            {/* Quick Stats Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#080B10] border border-slate-800">
                <p className="text-[10px] font-black uppercase text-slate-400">Total Logged Actions</p>
                <p className="text-xl font-black text-white mt-1">{activityLogs.length}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#080B10] border border-slate-800">
                <p className="text-[10px] font-black uppercase text-sky-400">Waiter Texts Dispatched</p>
                <p className="text-xl font-black text-sky-300 mt-1">
                  {activityLogs.filter(a => a.actionType === 'TEXT_WAITER').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#080B10] border border-slate-800">
                <p className="text-[10px] font-black uppercase text-rose-400">Urgent Alerts Dispatched</p>
                <p className="text-xl font-black text-rose-300 mt-1">
                  {activityLogs.filter(a => a.actionType === 'ALERT_WAITER').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#080B10] border border-slate-800">
                <p className="text-[10px] font-black uppercase text-amber-400">Kitchen Advances &amp; Logins</p>
                <p className="text-xl font-black text-amber-300 mt-1">
                  {activityLogs.filter(a => a.actionType === 'STAGE_ADVANCE' || a.actionType === 'LOGIN').length}
                </p>
              </div>
            </div>

            {/* Specialized Filters Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-white/[0.07]">
              {/* Left: Filter by Actor / Role */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Actor:</span>
                <button
                  type="button"
                  onClick={() => setActivityActorFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activityActorFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-[#080B10] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All Staff ({activityLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityActorFilter('admin')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activityActorFilter === 'admin'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'bg-[#080B10] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🛡️ Admin Only ({activityLogs.filter(a => a.actorType === 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityActorFilter('employee')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activityActorFilter === 'employee'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-[#080B10] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🍳 Kitchen/Staff Only ({activityLogs.filter(a => a.actorType === 'employee').length})
                </button>
              </div>

              {/* Center / Right: Filter by Action Type + Search */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activityActionFilter}
                  onChange={e => setActivityActionFilter(e.target.value)}
                  className="bg-[#080B10] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Action Types</option>
                  <option value="TEXT_WAITER">💬 Text to Waiter</option>
                  <option value="ALERT_WAITER">🚨 Urgent Alert</option>
                  <option value="STAGE_ADVANCE">🍳 Order Stage Advance</option>
                  <option value="LOGIN">🔑 Employee Hub Login</option>
                  <option value="RESOLVE_CALL">✅ Customer Call Resolved</option>
                </select>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search action, actor, target..."
                    value={activitySearchQuery}
                    onChange={e => setActivitySearchQuery(e.target.value)}
                    className="w-full bg-[#080B10] border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                  {activitySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActivitySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Cards Feed */}
          {filteredActivityLogs.length === 0 ? (
            <div className="bg-[#111726]/90 rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No activity records match your filter</p>
              <p className="text-xs text-slate-500">
                Staff actions will appear here in real time as employees text waiters, advance orders, and log in.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivityLogs.map(log => {
                const isAlert = log.actionType === 'ALERT_WAITER';
                const isText = log.actionType === 'TEXT_WAITER';
                const isStage = log.actionType === 'STAGE_ADVANCE';
                const isLogin = log.actionType === 'LOGIN';
                const isResolve = log.actionType === 'RESOLVE_CALL';

                const timeStr = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Recent';

                return (
                  <div
                    key={log.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition shadow-lg space-y-3 bg-[#111726]/90 ${
                      isAlert
                        ? 'border-rose-500/60 ring-1 ring-rose-500/20'
                        : isText
                          ? 'border-sky-500/40'
                          : isStage
                            ? 'border-amber-500/40'
                            : 'border-slate-800'
                    }`}
                  >
                    {/* Top Row: Actor, Action Badge, and Time */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Badge */}
                        {log.actorType === 'employee' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                            <span className="text-sm">🍳</span>
                            <span>Kitchen Staff:</span>
                            <span className="text-white font-extrabold">{log.actorName}</span>
                            {log.actorStaffId && (
                              <span className="text-amber-400 font-mono text-[10px] bg-amber-950/60 px-1 rounded">
                                #{log.actorStaffId}
                              </span>
                            )}
                            {log.actorRole && (
                              <span className="text-amber-200/80 lowercase text-[10px]">
                                [{log.actorRole}]
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                            <span className="text-sm">🛡️</span>
                            <span>Head Desk / Admin</span>
                          </span>
                        )}

                        {/* Action Badge */}
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isAlert
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isText
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : isStage
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : isLogin
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        }`}>
                          {isAlert && '🚨 Urgent Waiter Alert'}
                          {isText && '💬 Waiter Text Dispatch'}
                          {isStage && '🍳 Kitchen Stage Advance'}
                          {isLogin && '🔑 Staff Hub Login'}
                          {isResolve && '✅ Call Marked Resolved'}
                          {!isAlert && !isText && !isStage && !isLogin && !isResolve && log.actionType}
                        </span>

                        {/* Target badge */}
                        {log.target && (
                          <span className="text-[10px] font-bold text-slate-400 bg-[#080B10] px-2 py-0.5 rounded border border-slate-800">
                            Target: <span className="text-slate-200">{log.target}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                      <p className="text-sm font-bold text-white leading-relaxed">
                        {log.description}
                      </p>
                      {log.details && log.details !== log.description && (
                        <p className="text-xs text-slate-400 mt-1 italic font-medium">
                          Details: "{log.details}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Danger Zone: Clear History */}
          {activityLogs.length > 0 && clearActivityLogs && (
            <div className="mt-8 p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-rose-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Danger Zone</h4>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Irreversible action: This permanently erases all staff operational history and audit records.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSecurityModalState({
                      isOpen: true,
                      actionTitle: 'Authorize Clear Activity History',
                      actionDescription: `Permanently delete all ${activityLogs.length} activity audit log records. This action cannot be reversed.`,
                      actionNotice: 'Admin PIN verification required to clear history.',
                      pendingAction: () => clearActivityLogs()
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 text-white text-xs font-black transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md shadow-rose-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Entire History</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT EMPLOYEE MODAL
          ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726]/95 backdrop-blur-md border border-white/[0.07] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F59E0B]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingEmployee ? 'Edit Employee Profile' : 'Add New Floor Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Floor service credentials and table assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-white/[0.07] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployeeForm} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farhan Tariq"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-white/[0.07] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Role &amp; Title
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.07] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Floor Specialist" className="bg-[#111726]">Floor Specialist</option>
                    <option value="Senior Host" className="bg-[#111726]">Senior Host</option>
                    <option value="Operations Lead" className="bg-[#111726]">Operations Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Assigned Shift
                  </label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.07] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Morning Shift (08:00 - 16:00)" className="bg-[#111726]">Morning Shift (08:00 - 16:00)</option>
                    <option value="Mid Shift (12:00 - 20:00)" className="bg-[#111726]">Mid Shift (12:00 - 20:00)</option>
                    <option value="Evening Shift (16:00 - 00:00)" className="bg-[#111726]">Evening Shift (16:00 - 00:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Active', 'Busy', 'On Break'].map(statusOption => (
                    <button
                      key={statusOption}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: statusOption })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        formData.status === statusOption
                          ? statusOption === 'Active'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : statusOption === 'Busy'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-700 text-white border-slate-600 shadow-sm'
                          : 'bg-[#0B0F19] text-slate-400 border-white/[0.07] hover:text-white'
                      }`}
                    >
                      {statusOption}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+880 1700-000000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.07] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Staff Email
                  </label>
                  <input
                    type="email"
                    placeholder="staff@smartdine.internal"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.07] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Waiter Login Credentials Section */}
              <div className="p-4 rounded-xl bg-[#0B0F19] border border-amber-500/25 space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Waiter Login Credentials
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Username &amp; Password used by this waiter to log into /waiter
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const autoUser = formData.name ? formData.name.toLowerCase().replace(/\s+/g, '') : generateNextWaiterCode().toLowerCase();
                      setFormData({
                        ...formData,
                        username: autoUser,
                        accountCode: autoUser.toUpperCase(),
                        waiterCode: autoUser.toUpperCase()
                      });
                      showToast('Generated a fresh username', 'info');
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                    title="Auto-generate fresh Username & Password"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>Auto username</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Username *</span>
                      <span className="text-[10px] text-amber-400/80 font-mono">e.g. rakib</span>
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. rakib"
                        value={formData.username || formData.accountCode || ''}
                        onChange={e => {
                          const val = e.target.value.toLowerCase().trim();
                          setFormData({
                            ...formData,
                            username: val,
                            accountCode: val.toUpperCase(),
                            waiterCode: val.toUpperCase()
                          });
                        }}
                        className="w-full bg-[#111726] border border-white/[0.07] text-amber-400 font-mono font-bold text-xs rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-amber-500 transition tracking-wide"
                      />
                    </div>
                  </div>

                  {!editingEmployee ? (
                    <div className="staff-pw-fields">
                      <div>
                        <label htmlFor="staff-new-password" className="staff-field-label">Initial password * (4 to 8 digits)</label>
                        <input
                          id="staff-new-password"
                          type="password"
                          inputMode="numeric"
                          autoComplete="new-password"
                          required
                          maxLength={8}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '') })}
                          className="staff-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-confirm-password" className="staff-field-label">Confirm password *</label>
                        <input
                          id="staff-confirm-password"
                          type="password"
                          inputMode="numeric"
                          autoComplete="new-password"
                          required
                          maxLength={8}
                          value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value.replace(/\D/g, '') })}
                          className="staff-input"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="staff-pw-fields">
                      <div>
                        <span className="staff-field-label">Password</span>
                        <div className="staff-cred-value staff-cred-masked">{STAFF_PASSWORD_MASK}</div>
                      </div>
                      <div className="staff-pw-edit">
                        <button type="button" onClick={() => openResetPassword(editingEmployee.id)} className="staff-btn staff-btn-primary">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Set new password</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>The waiter enters this exact username and password on the /waiter login page.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Assigned Tables
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-[#0B0F19] border border-white/[0.07]">
                  {allTableNumbers.map(tblNum => {
                    const isSelected = formData.assignedTables.includes(tblNum);
                    return (
                      <button
                        key={tblNum}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? formData.assignedTables.filter(t => t !== tblNum)
                            : [...formData.assignedTables, tblNum];
                          setFormData({ ...formData, assignedTables: next });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm'
                            : 'bg-[#131926] text-slate-400 border border-white/[0.07] hover:text-white'
                        }`}
                      >
                        <span>T{tblNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.07] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-white/[0.07] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>{editingEmployee ? 'Save Changes' : 'Register Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REASSIGN CALL ALERT MODAL
          ========================================================================= */}
      {reassignAlertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726]/95 backdrop-blur-md border border-white/[0.07] rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-base font-bold text-white">
                  Reassign Table {reassignAlertTarget.tableNumber} Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignAlertTarget(null)}
                className="w-8 h-8 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-white/[0.07] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 mb-4 leading-relaxed">
              {reassignAlertTarget.description}
            </p>

            <label className="block text-xs font-bold text-slate-300 mb-2">
              Select available Employee to handle this alert:
            </label>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleReassignAlert(reassignAlertTarget.id, emp.id)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                    reassignAlertTarget.assignedEmployeeId === emp.id
                      ? 'bg-[#0B0F19] border-amber-500/50 text-white'
                      : 'bg-[#0B0F19] border-white/[0.07] hover:border-amber-500/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="scale-75 shrink-0">
                      {renderAvatar(emp)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{emp.name}</p>
                      <span className="text-[10px] text-slate-400">{emp.role}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      emp.status === 'Active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {emp.status}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setReassignAlertTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-white/[0.07] text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EMPLOYEE ABSENCE & QUICK TRANSFER MODAL
          ========================================================================= */}
      {transferModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726]/95 backdrop-blur-md border border-white/[0.07] rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F59E0B]">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {transferModalData.isAbsenceTrigger ? 'Employee Absence Transfer' : 'Quick Table Transfer'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Floor Coverage Lineage Delegation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalData(null)}
                className="w-8 h-8 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-white/[0.07] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Delegation Lineage Preserved Notice */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 shadow-sm">
                <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-200 block">Shift Delegation Lineage Preserved</span>
                  <span className="text-[11px] text-emerald-300/80 leading-relaxed block">
                    Original shift roster assignments remain permanently recorded in table custody. Any transferred tables can be reclaimed at any time via 1-click single-staff Rollback or batch shift reset.
                  </span>
                </div>
              </div>

              <p className="leading-relaxed">
                Employee <strong className="text-white">{transferModalData.sourceEmployee.name}</strong> is{' '}
                {transferModalData.isAbsenceTrigger ? (
                  <span className="text-rose-400 font-bold">Absent</span>
                ) : (
                  <span className="text-[#F59E0B] font-bold">transferring tables</span>
                )}.
                Transfer all assigned tables to which active backup employee?
              </p>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                  Tables to be transferred ({transferModalData.sourceEmployee.assignedTables?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {(transferModalData.sourceEmployee.assignedTables || []).map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#F59E0B] font-bold">
                      Table {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Select Active Backup Employee:
                </label>
                {activeBackupEmployees.length === 0 ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>No active backup employees available on the floor.</span>
                  </div>
                ) : (
                  <select
                    value={selectedBackupEmpId}
                    onChange={e => setSelectedBackupEmpId(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-white/[0.07] text-xs text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {activeBackupEmployees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#111726] text-white">
                        {emp.name} ({emp.status}) — currently has {emp.assignedTables?.length || 0} tables
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rerouteActiveAlerts}
                  onChange={e => setRerouteActiveAlerts(e.target.checked)}
                  className="rounded border-white/[0.07] text-[#F59E0B] focus:ring-0 cursor-pointer bg-[#0B0F19]"
                />
                <span>Also reroute pending call &amp; kitchen alerts to backup employee</span>
              </label>
            </div>

            <div className="pt-3 border-t border-white/[0.07] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModalData(null)}
                className="px-4 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-white/[0.07] text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBackupEmpId || activeBackupEmployees.length === 0}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: DIGITAL WAITER KEYCARD PREVIEW MODAL
          ========================================================================= */}
      {detailEmpId && (() => {
        const detailEmp = employees.find(e => e.id === detailEmpId);
        if (!detailEmp) return null;
        return (
          <StaffDetailDrawer
            emp={detailEmp}
            employees={employees}
            tableCustody={tableCustody}
            activityLogs={activityLogs}
            onClose={() => setDetailEmpId(null)}
            onResetPassword={() => openResetPassword(detailEmp.id)}
            onCopyCard={() => handleCopyLoginCard(detailEmp)}
            onKeycard={() => setKeycardModalEmployee(detailEmp)}
            onEdit={() => { setDetailEmpId(null); handleOpenEditModal(detailEmp); }}
          />
        );
      })()}

      {resetPwTarget && (
        <ResetPasswordDialog
          target={resetPwTarget}
          form={resetPwForm}
          setForm={setResetPwForm}
          onSubmit={submitPasswordReset}
          checking={resetPwChecking}
          onCancel={() => setResetPwTarget(null)}
        />
      )}

      {keycardModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726]/95 backdrop-blur-md border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-slate-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Digital Waiter Passcard
                  </h3>
                  <p className="text-[10px] text-slate-400">On-Field Console Handheld Credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKeycardModalEmployee(null)}
                className="w-8 h-8 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-white/[0.07] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* VIP Keycard Box with Bistro Styling */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A2234] via-[#0E1524] to-[#161F32] border border-amber-500/40 p-5 shadow-2xl space-y-4">
              {/* Glow corner */}
              <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl" />
              
              {/* Card brand row */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white tracking-wider block">SMARTDINE BISTRO</span>
                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block">Floor Console Keycard</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {keycardModalEmployee.status}
                </span>
              </div>

              {/* Staff Profile Row */}
              <div className="flex items-center gap-3 relative z-10 pt-1">
                {renderAvatar(keycardModalEmployee)}
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-extrabold text-white truncate">
                    {keycardModalEmployee.name}
                  </h4>
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {keycardModalEmployee.role}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {keycardModalEmployee.shift}
                  </p>
                </div>
              </div>

              {/* Credentials Grid */}
              <div className="grid grid-cols-2 gap-3 relative z-10 pt-2">
                <div className="p-3 rounded-xl bg-[#080B11]/90 border border-slate-700/60 shadow-inner">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Staff Account ID
                  </span>
                  <span className="font-mono text-base font-black text-amber-400 mt-1 block">
                    {keycardModalEmployee.accountCode || keycardModalEmployee.waiterCode || 'WAIT-100'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#080B11]/90 border border-slate-700/60 shadow-inner">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Password
                  </span>
                  <span className="font-mono text-base font-black text-emerald-400 tracking-widest mt-1 block" aria-label="Password hidden">
                    {STAFF_PASSWORD_MASK}
                  </span>
                </div>
              </div>

              {/* Assigned Tables */}
              <div className="relative z-10 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Assigned Service Station
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(keycardModalEmployee.assignedTables || []).length > 0 ? (
                    keycardModalEmployee.assignedTables.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                        Table {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No tables currently assigned</span>
                  )}
                </div>
              </div>

              {/* Terminal Quick Instruction */}
              <div className="relative z-10 pt-2 border-t border-white/[0.07] flex items-center justify-between text-[11px] text-slate-400">
                <span>Handheld Console: <strong className="text-slate-200">/waiter</strong></span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">READY TO PAIR</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleCopyLoginCard(keycardModalEmployee)}
                className="px-4 py-2 rounded-xl bg-[#131926] hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-white/[0.07] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Passcard</span>
              </button>

              <button
                type="button"
                onClick={() => openResetPassword(keycardModalEmployee.id)}
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Set new password</span>
              </button>

              <button
                type="button"
                onClick={() => setKeycardModalEmployee(null)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          ADMIN STAFF ASSIGNMENT SECURITY MODAL (PIN)
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

/* ---------------------------------------------------------------------------
 * Staff detail drawer: profile, tables, login (masked) and recent activity.
 * ------------------------------------------------------------------------- */
function StaffDetailDrawer({ emp, employees, tableCustody, activityLogs, onClose, onResetPassword, onCopyCard, onKeycard, onEdit }) {
  const tables = emp.assignedTables || [];
  const ownTables = Object.keys(tableCustody || {})
    .map(Number)
    .filter(t => tableCustody[t]?.originalOwnerId === emp.id);
  const recent = (activityLogs || [])
    .filter(log => {
      const actor = String(log.actorName || '');
      const target = String(log.target || '');
      return actor === emp.name || target.includes(emp.name);
    })
    .slice(0, 8);

  return (
    <div className="staff-drawer-backdrop" onClick={onClose}>
      <aside
        className="staff-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${emp.name} details`}
        onClick={e => e.stopPropagation()}
      >
        <header className="staff-drawer-head">
          <div className="min-w-0">
            <h3 className="staff-drawer-title">{emp.name}</h3>
            <p className="staff-drawer-sub">{emp.role} &middot; {emp.status}</p>
          </div>
          <button type="button" onClick={onClose} className="staff-icon-btn" aria-label="Close details">
            <X className="w-4 h-4" />
          </button>
        </header>

        <section className="staff-drawer-section">
          <div className="staff-drawer-section-head">
            <h4>Profile</h4>
            <button type="button" onClick={onEdit} className="staff-btn staff-btn-ghost">
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
          <dl className="staff-dl">
            <dt>Shift</dt><dd>{emp.shift || 'Not set'}</dd>
            <dt>Hours today</dt><dd>{formatHours(hoursTodayFor(staffKey(emp)))}</dd>
            <dt>Phone</dt><dd>{emp.phone || 'Not set'}</dd>
            <dt>Email</dt><dd className="break-all">{emp.email || 'Not set'}</dd>
            <dt>Hired</dt><dd>{emp.hiredAt || 'Not set'}</dd>
          </dl>
        </section>

        <section className="staff-drawer-section">
          <h4>Assigned tables ({tables.length})</h4>
          {tables.length === 0 ? (
            <p className="staff-muted">No tables assigned. Assign tables from Tables &amp; Routing or Edit.</p>
          ) : (
            <div className="staff-chips">
              {tables.slice().sort((a, b) => a - b).map(t => (
                <span key={t} className="staff-chip">T{t}</span>
              ))}
            </div>
          )}
          {ownTables.length > 0 && (
            <p className="staff-muted">Original custody: {ownTables.map(t => `T${t}`).join(', ')}</p>
          )}
        </section>

        <section className="staff-drawer-section">
          <h4>Login &amp; credentials</h4>
          <dl className="staff-dl">
            <dt>Login ID</dt>
            <dd><code className="staff-cred-value">{emp.accountCode || emp.waiterCode || 'Not set'}</code></dd>
            <dt>Password</dt>
            <dd><code className="staff-cred-value staff-cred-masked">{STAFF_PASSWORD_MASK}</code></dd>
          </dl>
          <p className="staff-muted">
            Passwords are never shown. To give a new one, use Set new password (requires the admin master PIN).
          </p>
          <div className="staff-cred-actions">
            <button type="button" onClick={onResetPassword} className="staff-btn staff-btn-primary">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Set new password</span>
            </button>
            <button type="button" onClick={onCopyCard} className="staff-btn">
              <Copy className="w-3.5 h-3.5" />
              <span>Copy card</span>
            </button>
            <button type="button" onClick={onKeycard} className="staff-btn">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Keycard</span>
            </button>
          </div>
        </section>

        <section className="staff-drawer-section">
          <h4>Recent activity</h4>
          {recent.length === 0 ? (
            <p className="staff-muted">No recent activity recorded for {emp.name}.</p>
          ) : (
            <ul className="staff-activity-list">
              {recent.map((log, i) => (
                <li key={log.id || i}>
                  <span className="staff-activity-desc">{log.description || log.actionType || 'Activity'}</span>
                  {log.time && <span className="staff-muted">{log.time}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Reset password dialog: new password x2 + admin master PIN. Old value is never shown.
 * ------------------------------------------------------------------------- */
function ResetPasswordDialog({ target, form, setForm, onSubmit, onCancel, checking = false }) {
  return (
    <div className="staff-modal-backdrop" onClick={onCancel}>
      <form
        className="staff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-reset-title"
        onClick={e => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h3 id="staff-reset-title" className="staff-drawer-title">Set new password</h3>
        <p className="staff-muted">
          For <strong>{target.name}</strong>. The current password cannot be viewed. Enter a new one below.
        </p>

        <label className="staff-field-label" htmlFor="staff-reset-new">New password (4 to 8 digits)</label>
        <input
          id="staff-reset-new"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={8}
          autoFocus
          required
          value={form.next}
          onChange={e => setForm({ ...form, next: e.target.value.replace(/\D/g, ''), error: '' })}
          className="staff-input"
        />

        <label className="staff-field-label" htmlFor="staff-reset-confirm">Confirm new password</label>
        <input
          id="staff-reset-confirm"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={8}
          required
          value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value.replace(/\D/g, ''), error: '' })}
          className="staff-input"
        />

        <label className="staff-field-label" htmlFor="staff-reset-master">Admin master PIN</label>
        <input
          id="staff-reset-master"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          required
          value={form.masterPin}
          onChange={e => setForm({ ...form, masterPin: e.target.value, error: '' })}
          className="staff-input"
        />

        {form.error && <p className="staff-error" role="alert">{form.error}</p>}

        <div className="staff-modal-actions">
          <button type="button" onClick={onCancel} className="staff-btn">Cancel</button>
          <button type="submit" className="staff-btn staff-btn-primary" disabled={checking}>{checking ? 'Checking PIN...' : 'Save new password'}</button>
        </div>
      </form>
    </div>
  );
}
