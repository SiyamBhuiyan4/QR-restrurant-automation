import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertTriangle
} from 'lucide-react';

import TableSecurityModal from './TableSecurityModal';

// Total floor tables in the venue
const TOTAL_TABLES_COUNT = 12;
const ALL_TABLE_NUMBERS = Array.from({ length: TOTAL_TABLES_COUNT }, (_, i) => i + 1);

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
    assignedTables: [1, 6, 11],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '99%',
    avatarType: 'orange', // Orange circle with RA
    phone: '+880 1712-345001',
    email: 'rakib.ahmed@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-2',
    numericId: 2,
    name: 'Hasan Mahmud',
    initials: 'HM',
    role: 'Senior Host',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    assignedTables: [2, 7, 12],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '98%',
    avatarType: 'blue', // Blue circle with HM
    phone: '+880 1819-456002',
    email: 'hasan.mahmud@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-3',
    numericId: 3,
    name: 'Priya Sen',
    initials: 'PS',
    role: 'Operations Lead',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    assignedTables: [3, 8],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 10s (on time)',
    onTimeRate: '100%',
    avatarType: 'purple',
    phone: '+880 1913-789003',
    email: 'priya.sen@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-4',
    numericId: 4,
    name: 'Tanvir Rahman',
    initials: 'TR',
    role: 'Floor Specialist',
    shift: 'Mid Shift (12:00 - 20:00)',
    status: 'Active',
    assignedTables: [4, 9],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '97%',
    avatarType: 'amber',
    phone: '+880 1614-234004',
    email: 'tanvir.rahman@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-5',
    numericId: 5,
    name: 'Saima Islam',
    initials: 'SI',
    role: 'Senior Host',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'Active',
    assignedTables: [5, 10],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '11s',
    lastCallResponse: 'Responded in 11s (on time)',
    onTimeRate: '98%',
    avatarType: 'pink',
    phone: '+880 1515-678005',
    email: 'saima.islam@smartdine.internal',
    nudgesCount: 0
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
  // Main State
  const [employees, setEmployees] = useState(() => {
    return propEmployees && Array.isArray(propEmployees) && propEmployees.length > 0
      ? propEmployees
      : INITIAL_EMPLOYEES;
  });

  useEffect(() => {
    if (propEmployees && Array.isArray(propEmployees)) {
      setEmployees(propEmployees);
    }
  }, [propEmployees]);

  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Busy' | 'On Break' | 'Absent / Off-duty'
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'tables' | 'dispatch'
  const [alertFilter, setAlertFilter] = useState('all'); // 'all' | 'active' | 'resolved'

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

  // Security Confirmation Modal State (Requires Admin PIN 808080)
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionTitle: '',
    actionDescription: '',
    actionNotice: '',
    pendingAction: null
  });

  // Dynamic Venue Table Count & Array
  const totalVenueTables = propTableCount || (propTables ? propTables.length : TOTAL_TABLES_COUNT);
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
    assignedTables: []
  });

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ id: Date.now(), text: msg, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === msg ? null : prev));
    }, 4000);
  }, []);

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
        const matchesTable = (emp.assignedTables || []).some(
          t => `t${t}`.includes(q) || `table ${t}`.includes(q) || String(t) === q
        );
        return matchesName || matchesRole || matchesShift || matchesTable;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

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
  // TABLE ASSIGNMENT LOGIC
  // ---------------------------------------------------------------------------

  const handleToggleTableAssignment = useCallback((employeeId, tableNumber) => {
    setEmployees(prev => {
      const targetEmp = prev.find(e => e.id === employeeId);
      if (!targetEmp) return prev;

      const isAlreadyAssignedToTarget = (targetEmp.assignedTables || []).includes(tableNumber);

      return prev.map(emp => {
        if (emp.id === employeeId) {
          const nextTables = isAlreadyAssignedToTarget
            ? emp.assignedTables.filter(t => t !== tableNumber)
            : [...(emp.assignedTables || []), tableNumber].sort((a, b) => a - b);
          return { ...emp, assignedTables: nextTables };
        } else {
          if (!isAlreadyAssignedToTarget && (emp.assignedTables || []).includes(tableNumber)) {
            return {
              ...emp,
              assignedTables: emp.assignedTables.filter(t => t !== tableNumber)
            };
          }
          return emp;
        }
      });
    });

    const target = employees.find(e => e.id === employeeId);
    const targetName = target ? target.name : 'Employee';
    const isCurrentlyAssigned = target?.assignedTables?.includes(tableNumber);

    if (isCurrentlyAssigned) {
      showToast(`Table ${tableNumber} unassigned from ${targetName}`, 'info');
    } else {
      showToast(`Table ${tableNumber} assigned to ${targetName}!`, 'success');
    }
  }, [employees, showToast]);

  const handleDirectTableReassign = useCallback((tableNumber, newEmployeeId) => {
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

    if (onAssignTable) {
      onAssignTable(tableNumber, newEmployeeId);
    }

    const targetEmp = employees.find(e => e.id === newEmployeeId);
    showToast(`Table ${tableNumber} reassigned to ${targetEmp?.name || 'selected Employee'}`, 'success');
  }, [employees, onAssignTable, showToast]);

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

    showToast(`Auto-balanced all ${allTableNumbers.length} tables across ${onDutyEmployees.length} on-duty Employees!`, 'success');
  }, [employees, allTableNumbers, onAutoBalance, showToast]);

  const requestDirectTableReassign = useCallback((tableNumber, newEmployeeId) => {
    const targetEmp = employees.find(e => String(e.id) === String(newEmployeeId));
    const targetName = targetEmp ? `${targetEmp.name} (${targetEmp.role || 'Staff'})` : 'selected Employee';

    setSecurityModalState({
      isOpen: true,
      actionTitle: `Authorize Staff Assignment • Table #${tableNumber}`,
      actionDescription: `Assign Table #${tableNumber} to ${targetName}. Floor routing will update immediately.`,
      actionNotice: 'Admin PIN verification (808080) required to update staff table assignments.',
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
      actionNotice: 'Admin PIN verification (808080) required to rebalance table assignments.',
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
    showToast(`${targetEmp.name} status updated to "${newStatus}"`, 'info');
  }, [employees, onSetEmployeeStatus, showToast]);

  const handleConfirmTransfer = useCallback(() => {
    if (!transferModalData?.sourceEmployee || !selectedBackupEmpId) {
      showToast('Please select an active backup employee', 'error');
      return;
    }

    const sourceEmp = transferModalData.sourceEmployee;
    const backupEmp = employees.find(e => e.id === selectedBackupEmpId);
    if (!backupEmp) return;

    const tablesToTransfer = [...(sourceEmp.assignedTables || [])];

    if (onReassignAllTables) {
      onReassignAllTables(sourceEmp.id, selectedBackupEmpId, transferModalData.isAbsenceTrigger);
    } else {
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
    }

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
      `Re-linked ${tablesToTransfer.length} tables (T${tablesToTransfer.join(', T')}) from ${sourceEmp.name} to ${backupEmp.name}!`,
      'success'
    );
  }, [transferModalData, selectedBackupEmpId, rerouteActiveAlerts, onReassignAllTables, employees, showToast]);

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

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      role: 'Floor Specialist',
      shift: 'Morning Shift (08:00 - 16:00)',
      status: 'Active',
      phone: '',
      email: '',
      assignedTables: []
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      shift: emp.shift,
      status: emp.status,
      phone: emp.phone || '',
      email: emp.email || '',
      assignedTables: [...(emp.assignedTables || [])]
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveEmployeeForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter employee name', 'error');
      return;
    }

    if (editingEmployee) {
      setEmployees(prev =>
        prev.map(emp => {
          if (emp.id === editingEmployee.id) {
            return {
              ...emp,
              name: formData.name.trim(),
              role: formData.role,
              shift: formData.shift,
              status: formData.status,
              phone: formData.phone.trim(),
              email: formData.email.trim(),
              assignedTables: formData.assignedTables.sort((a, b) => a - b)
            };
          }
          if (formData.assignedTables.some(t => (emp.assignedTables || []).includes(t))) {
            return {
              ...emp,
              assignedTables: emp.assignedTables.filter(t => !formData.assignedTables.includes(t))
            };
          }
          return emp;
        })
      );
      showToast(`Employee "${formData.name.trim()}" profile updated!`, 'success');
    } else {
      const initials = formData.name
        .trim()
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'EM';

      const newId = `emp-${Date.now()}`;
      const newEmp = {
        id: newId,
        numericId: Date.now(),
        name: formData.name.trim(),
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
        phone: formData.phone.trim() || '+880 1700-000000',
        email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@smartdine.internal`,
        nudgesCount: 0
      };

      setEmployees(prev => {
        const cleaned = prev.map(emp => ({
          ...emp,
          assignedTables: (emp.assignedTables || []).filter(t => !formData.assignedTables.includes(t))
        }));
        return [...cleaned, newEmp];
      });

      showToast(`Employee "${formData.name.trim()}" successfully registered!`, 'success');
    }

    setIsAddEditModalOpen(false);
  };

  const handleDeleteEmployee = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    if (window.confirm(`Are you sure you want to remove Employee ${emp.name}? Their assigned tables will be unassigned.`)) {
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      showToast(`Employee ${emp.name} removed from active roster`, 'info');
    }
  };

  const handleToggleRoleDock = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartdine:toggle-role-dock'));
    }
  };

  // Helper to render avatar based on type or initials
  const renderAvatar = (emp) => {
    if (emp.name === 'Rakib Ahmed' || emp.avatarType === 'orange') {
      return (
        <div className="w-11 h-11 rounded-full bg-[#F59E0B] text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
          {emp.initials || 'RA'}
        </div>
      );
    }
    if (emp.name === 'Hasan Mahmud' || emp.avatarType === 'blue') {
      return (
        <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
          {emp.initials || 'HM'}
        </div>
      );
    }
    if (emp.name === 'Priya Sen' || emp.avatarType === 'purple') {
      return (
        <div className="w-11 h-11 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
          {emp.initials || 'PS'}
        </div>
      );
    }
    if (emp.name === 'Tanvir Rahman' || emp.avatarType === 'amber') {
      return (
        <div className="w-11 h-11 rounded-full bg-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
          {emp.initials || 'TR'}
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-full bg-rose-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
        {emp.initials || 'SI'}
      </div>
    );
  };

  return (
    <div
      className={`w-full min-h-screen bg-[#0B0F19] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 antialiased selection:bg-[#F59E0B] selection:text-slate-950 relative ${className}`}
      style={{ backgroundColor: '#0B0F19' }}
    >
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50'
                : 'bg-[#131926] border-[#1E293B] text-slate-200'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />}
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg ml-2 cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. TOP NAVBAR
          ========================================================================= */}
      <nav className="w-full bg-[#131926] border border-[#1E293B] rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        {/* Left: Green Status Dot + Title + Muted Subtitle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Employee Roster &amp; Shifts
          </h1>
          <span className="text-xs text-slate-400 hidden sm:inline">
            • Duty Allocation &amp; Shift Management (Employee Hub)
          </span>
        </div>

        {/* Right: Switch to Kitchen KDS + Launch /employee */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (onSwitchToKds) {
                onSwitchToKds();
              } else if (typeof window !== 'undefined') {
                window.location.assign('/employee?tab=kitchen');
              }
            }}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-[#1E293B]/70 hover:bg-[#1E293B] border border-[#2A384C] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>Switch to Kitchen KDS</span>
            <span className="text-slate-400">➔</span>
          </button>

          <a
            href="/employee?tab=roster"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>Launch /employee</span>
            <ExternalLink className="w-3 h-3 text-emerald-400" />
          </a>
        </div>
      </nav>

      {/* =========================================================================
          2. HERO CARD SECTION
          ========================================================================= */}
      <section className="bg-[#131926] rounded-2xl border border-[#1E293B] p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: User Icon + Title + Muted Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 via-[#1E293B] to-blue-500/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shrink-0 shadow-sm">
            <Users className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Employee Hub
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Staff roster, dining room table assignments, and real-time dispatch routing
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Outlined Auto-Balance Button */}
          <button
            type="button"
            onClick={requestAutoBalanceTables}
            className="px-3.5 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-200 border border-[#2A384C] hover:border-[#F59E0B]/60 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
            title="Auto-balance tables across active employees (Requires PIN 808080)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>✨ Auto-Balance Tables</span>
          </button>

          {/* Secondary Simulate Alert Button */}
          <button
            type="button"
            onClick={handleSimulateNewAlert}
            className="px-3.5 py-2 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-200 border border-[#2A384C] hover:border-amber-400 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
            title="Simulate incoming customer call or kitchen alert"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Simulate Alert</span>
          </button>

          {/* Vibrant Solid Orange + Add Employee Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-md shadow-[#F59E0B]/20"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          3. METRICS ROW (4 Cards Side-by-Side)
          ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Employees */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131926] border border-[#1E293B] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Total Employees</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summaryMetrics.totalEmployees}
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">Registered</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#2A384C] text-slate-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        {/* Card 2: Active On-Duty */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131926] border border-[#1E293B] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Active On-Duty</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {summaryMetrics.activeOnDuty}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Floor Ready</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Card 3: Tables Covered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131926] border border-[#1E293B] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Tables Covered</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summaryMetrics.tablesCovered}/{summaryMetrics.totalTables}
              </span>
              <span className="text-sm font-bold text-emerald-400">
                ({summaryMetrics.coveragePercentage}%)
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">
              {summaryMetrics.tablesCovered} of {summaryMetrics.totalTables} Tables
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Table className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Card 4: Avg Response */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131926] border border-[#1E293B] flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Avg Response</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#F59E0B]">
                {summaryMetrics.avgResponseTime}
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-0.5">Telemetry</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#F59E0B]" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SECTION NAVIGATION/TABS
          ========================================================================= */}
      <section className="bg-[#131926] rounded-2xl border border-[#1E293B] px-4 pt-3 pb-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-6 border-b border-[#1E293B] overflow-x-auto">
          {/* Tab 1: Employee Directory & Roster 5 */}
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer relative shrink-0 ${
              activeTab === 'roster'
                ? 'text-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee Directory &amp; Roster</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'roster'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'bg-[#1E293B] text-slate-400'
            }`}>
              {employees.length}
            </span>
            {activeTab === 'roster' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-t-full shadow-sm" />
            )}
          </button>

          {/* Tab 2: Dining Room Table Coverage (Tables 1-12) 12/12 */}
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer relative shrink-0 ${
              activeTab === 'tables'
                ? 'text-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Dining Room Table Coverage (Tables 1-12)</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'tables'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'bg-[#1E293B] text-slate-400'
            }`}>
              {summaryMetrics.tablesCovered}/12
            </span>
            {activeTab === 'tables' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-t-full shadow-sm" />
            )}
          </button>

          {/* Tab 3: Live Call Routing & Kitchen Dispatch 4 */}
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer relative shrink-0 ${
              activeTab === 'dispatch'
                ? 'text-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Live Call Routing &amp; Kitchen Dispatch</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'dispatch'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                : 'bg-[#1E293B] text-slate-400'
            }`}>
              {alerts.length}
            </span>
            {activeTab === 'dispatch' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F59E0B] rounded-t-full shadow-sm" />
            )}
          </button>
        </div>
      </section>

      {/* =========================================================================
          5. FILTER & SEARCH BAR
          ========================================================================= */}
      <section className="bg-[#131926] rounded-2xl border border-[#1E293B] p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Pill-shaped status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          {/* All (5) */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-[#F59E0B] text-slate-950 shadow-sm'
                : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-[#2A384C]'
            }`}
          >
            All ({employees.length})
          </button>

          {/* Active (5) */}
          <button
            type="button"
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 hover:text-emerald-400 border border-[#2A384C]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>• Active ({summaryMetrics.activeOnDuty})</span>
          </button>

          {/* Busy (0) */}
          <button
            type="button"
            onClick={() => setStatusFilter('Busy')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'Busy'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 hover:text-amber-400 border border-[#2A384C]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span>• Busy ({summaryMetrics.currentlyBusy})</span>
          </button>

          {/* On Break (0) */}
          <button
            type="button"
            onClick={() => setStatusFilter('On Break')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'On Break'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 hover:text-slate-100 border border-[#2A384C]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span>• On Break ({summaryMetrics.onBreak})</span>
          </button>

          {/* Absent (0) */}
          <button
            type="button"
            onClick={() => setStatusFilter('Absent')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'Absent'
                ? 'bg-rose-900/80 text-rose-200 border border-rose-500/50 shadow-sm'
                : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 hover:text-rose-400 border border-[#2A384C]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>• Absent ({summaryMetrics.absent})</span>
          </button>
        </div>

        {/* Right: Search Input */}
        <div className="relative md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="🔍 Search employee, role, table..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0F19] border border-[#2A384C] text-xs text-white pl-9 pr-8 py-2 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </section>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEmployees.map(emp => {
                const assignedCount = (emp.assignedTables || []).length;

                return (
                  <div
                    key={emp.id}
                    className="bg-[#131926] rounded-2xl border border-[#1E293B] p-5 shadow-sm hover:border-[#2A384C] transition duration-150 flex flex-col justify-between space-y-4"
                  >
                    {/* Header: Avatar, Name, Role, Shift + Inline Right Actions */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E293B]">
                      <div className="flex items-center gap-3">
                        {renderAvatar(emp)}
                        <div>
                          <h4 className="font-bold text-white text-base">
                            {emp.name}
                          </h4>
                          <p className="text-xs text-slate-300 font-medium">
                            {emp.role}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {emp.shift}
                          </p>
                        </div>
                      </div>

                      {/* Dropdown & Actions (inline right) */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Status Dropdown with green dot */}
                        <div className="relative inline-flex items-center">
                          <select
                            value={emp.status}
                            onChange={e => handleChangeEmployeeStatus(emp.id, e.target.value)}
                            className="appearance-none text-xs font-bold rounded-xl pl-6 pr-6 py-1.5 bg-[#0B0F19] text-emerald-400 border border-emerald-500/30 focus:outline-none cursor-pointer hover:border-emerald-500/50 transition"
                          >
                            <option value="Active" className="bg-[#131926] text-emerald-400">Active</option>
                            <option value="Busy" className="bg-[#131926] text-amber-400">Busy</option>
                            <option value="On Break" className="bg-[#131926] text-slate-400">On Break</option>
                            <option value="Absent" className="bg-[#131926] text-rose-400">Absent</option>
                          </select>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute left-2 pointer-events-none" />
                          <span className="text-[10px] text-slate-400 absolute right-2 pointer-events-none">▾</span>
                        </div>

                        {/* ⇄ Transfer orange outlined button */}
                        <button
                          type="button"
                          onClick={() => handleOpenTransferModal(emp)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                          title={`Transfer all ${assignedCount} tables to backup employee`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>Transfer</span>
                        </button>

                        {/* Tiny Action Icons: ⚡, ✏️, 🗑️ */}
                        <button
                          type="button"
                          onClick={() => handleNudgeEmployee(emp.id)}
                          className="p-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#F59E0B]/20 text-slate-300 hover:text-[#F59E0B] border border-[#1E293B] hover:border-[#F59E0B]/40 transition cursor-pointer"
                          title="Send instant floor nudge"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-lg bg-[#0B0F19] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1E293B] hover:border-slate-600 transition cursor-pointer"
                          title="Edit Employee profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 rounded-lg bg-[#0B0F19] hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-[#1E293B] hover:border-rose-500/40 transition cursor-pointer"
                          title="Remove Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned Tables Row & 12 Pill Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Table className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Assigned Tables ({assignedCount})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Click pill to toggle assignment
                        </span>
                      </div>

                      {/* 12 Pill-shaped Table Grid: Numbers T1 to T12 */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allTableNumbers.map(tblNum => {
                          const isAssigned = (emp.assignedTables || []).includes(tblNum);

                          return (
                            <button
                              key={tblNum}
                              type="button"
                              onClick={() => handleToggleTableAssignment(emp.id, tblNum)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                isAssigned
                                  ? 'bg-[#F59E0B] text-slate-950 shadow-sm border border-[#F59E0B]'
                                  : 'bg-[#0B0F19] text-slate-400 border border-[#1E293B] hover:border-slate-600 hover:text-slate-200'
                              }`}
                              title={
                                isAssigned
                                  ? `Table ${tblNum} is currently assigned to ${emp.name}. Click to unassign.`
                                  : `Click to assign Table ${tblNum} to ${emp.name}.`
                              }
                            >
                              <span>T{tblNum}</span>
                              {isAssigned && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Row: Flat grey chips labeled "Pickups -", "Requests -", "Avg Resp -", "On-Time -" */}
                    <div className="pt-3 border-t border-[#1E293B] grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="py-2 px-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-400 text-[11px] font-medium truncate">
                        Pickups -
                      </div>
                      <div className="py-2 px-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-400 text-[11px] font-medium truncate">
                        Requests -
                      </div>
                      <div className="py-2 px-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-400 text-[11px] font-medium truncate">
                        Avg Resp -
                      </div>
                      <div className="py-2 px-1 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-slate-400 text-[11px] font-medium truncate">
                        On-Time -
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB B: DINING ROOM TABLE COVERAGE (TABLES 1-12)
          ========================================================================= */}
      {activeTab === 'tables' && (
        <section className="bg-[#131926] rounded-2xl border border-[#1E293B] p-5 shadow-sm space-y-4 animate-fadeIn">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]">
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={requestAutoBalanceTables}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-slate-200 border border-[#2A384C] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
                title="Auto-balance tables across staff (Requires PIN 808080)"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Auto-Balance Tables</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Assigned
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B0F19] border border-[#1E293B]" /> Unassigned
                </span>
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {allTableNumbers.map(tableNum => {
              const assignedEmp = tableToEmployeeMap[tableNum];
              const isAssigned = !!assignedEmp;

              return (
                <div
                  key={tableNum}
                  className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-3 ${
                    isAssigned
                      ? 'bg-[#0B0F19] border-[#1E293B] hover:border-[#2A384C]'
                      : 'bg-[#0B0F19]/50 border-dashed border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  {/* Top: Table Number & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      Table {tableNum}
                    </span>
                    {isAssigned ? (
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
                  <div className="pt-2 border-t border-[#1E293B]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400 font-medium block">
                        Assigned Employee:
                      </label>
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded"
                        title="Requires PIN 808080"
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
                      className="w-full bg-[#131926] border border-[#2A384C] text-xs text-slate-200 rounded-xl py-1.5 px-2.5 focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#131926] text-slate-500">
                        Assign Employee...
                      </option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-[#131926] text-white">
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
      {activeTab === 'dispatch' && (
        <section className="bg-[#131926] rounded-2xl border border-[#1E293B] p-5 shadow-sm space-y-4 animate-fadeIn">
          {/* Dispatch Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]">
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

            <div className="flex items-center gap-2">
              {/* Event Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-xl border border-[#1E293B] text-xs">
                <button
                  type="button"
                  onClick={() => setAlertFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'all' ? 'bg-[#F59E0B] text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('active')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'active' ? 'bg-[#F59E0B] text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({alerts.filter(a => a.status !== 'Completed' && a.status !== 'Acknowledged').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('resolved')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'resolved' ? 'bg-[#F59E0B] text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Resolved ({alerts.filter(a => a.status === 'Completed' || a.status === 'Acknowledged').length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleSimulateNewAlert}
                className="px-3 py-1.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-slate-200 border border-[#2A384C] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
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
                        ? 'border-[#1E293B] opacity-75'
                        : alert.urgency === 'high'
                        ? 'border-rose-500/40'
                        : isKitchen
                        ? 'border-amber-500/40'
                        : 'border-[#1E293B]'
                    }`}
                  >
                    {/* Event Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
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
                      <div className="p-2.5 rounded-lg bg-[#131926] border border-[#1E293B] text-xs font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
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
                    <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleNudgeEmployee(alert.assignedEmployeeId, alert.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#131926] hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer border border-amber-500/40 flex items-center gap-1"
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
                          className="px-2.5 py-1.5 rounded-lg bg-[#131926] hover:bg-slate-800 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer border border-[#2A384C] flex items-center gap-1"
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
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
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
          7. FLOATING ACTION: Outline "🧭 Switch Role ⌃" Button
          ========================================================================= */}
      {!hasGlobalSwitcher && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={handleToggleRoleDock}
            className="px-3.5 py-2 rounded-full bg-[#131926]/95 hover:bg-[#1E293B] text-slate-200 border border-[#2A384C] hover:border-[#F59E0B]/60 shadow-2xl backdrop-blur-md text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            title="Quick switch between Customer, Employee, Waiter, and Admin views"
          >
            <Compass className="w-4 h-4 text-[#F59E0B]" />
            <span>Switch Role</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT EMPLOYEE MODAL
          ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131926] border border-[#1E293B] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-[#F59E0B]">
                  <UserPlus className="w-4 h-4" />
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
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-5 h-5" />
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
                  className="w-full bg-[#0B0F19] border border-[#2A384C] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#F59E0B] transition"
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
                    className="w-full bg-[#0B0F19] border border-[#2A384C] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  >
                    <option value="Floor Specialist" className="bg-[#131926]">Floor Specialist</option>
                    <option value="Senior Host" className="bg-[#131926]">Senior Host</option>
                    <option value="Operations Lead" className="bg-[#131926]">Operations Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Assigned Shift
                  </label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-[#2A384C] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  >
                    <option value="Morning Shift (08:00 - 16:00)" className="bg-[#131926]">Morning Shift (08:00 - 16:00)</option>
                    <option value="Mid Shift (12:00 - 20:00)" className="bg-[#131926]">Mid Shift (12:00 - 20:00)</option>
                    <option value="Evening Shift (16:00 - 00:00)" className="bg-[#131926]">Evening Shift (16:00 - 00:00)</option>
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
                          : 'bg-[#0B0F19] text-slate-400 border-[#1E293B] hover:text-white'
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
                    className="w-full bg-[#0B0F19] border border-[#2A384C] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#F59E0B] transition"
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
                    className="w-full bg-[#0B0F19] border border-[#2A384C] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#F59E0B] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Assigned Tables
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
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
                            ? 'bg-[#F59E0B] text-slate-950 shadow-sm'
                            : 'bg-[#131926] text-slate-400 border border-[#2A384C] hover:text-white'
                        }`}
                      >
                        <span>T{tblNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E293B] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-[#2A384C] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 text-xs font-black shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
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
          <div className="bg-[#131926] border border-[#1E293B] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-base font-bold text-white">
                  Reassign Table {reassignAlertTarget.tableNumber} Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignAlertTarget(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
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
                      ? 'bg-[#0B0F19] border-[#F59E0B]/50 text-white'
                      : 'bg-[#0B0F19] border-[#1E293B] hover:border-[#F59E0B]/50 text-slate-200'
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
                className="px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-[#2A384C] text-xs font-bold cursor-pointer"
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
          <div className="bg-[#131926] border border-[#1E293B] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {transferModalData.isAbsenceTrigger ? 'Employee Absence Transfer' : 'Quick Table Transfer'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Floor Coverage Backup Handler</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalData(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
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
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-bold">
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
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                    ⚠️ No active backup employees available on the floor.
                  </div>
                ) : (
                  <select
                    value={selectedBackupEmpId}
                    onChange={e => setSelectedBackupEmpId(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#2A384C] text-xs text-white rounded-xl py-2 px-3 focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  >
                    {activeBackupEmployees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#131926] text-white">
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
                  className="rounded border-[#2A384C] text-[#F59E0B] focus:ring-0 cursor-pointer"
                />
                <span>Also reroute pending call &amp; kitchen alerts to backup employee</span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModalData(null)}
                className="px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-slate-300 border border-[#2A384C] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBackupEmpId || activeBackupEmployees.length === 0}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          ADMIN STAFF ASSIGNMENT SECURITY MODAL (PIN: 808080)
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
