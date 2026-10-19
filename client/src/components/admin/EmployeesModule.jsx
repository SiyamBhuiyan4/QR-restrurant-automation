import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  Flame,
  ChefHat,
  BellRing,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  X,
  Phone,
  Mail,
  Zap,
  Edit2,
  Trash2,
  Coffee,
  CheckCheck,
  Table,
  ArrowRight,
  ArrowRightLeft
} from 'lucide-react';

// Total floor tables in the venue
const TOTAL_TABLES_COUNT = 12;
const ALL_TABLE_NUMBERS = Array.from({ length: TOTAL_TABLES_COUNT }, (_, i) => i + 1);

// Initial Mock Employees Roster
const INITIAL_EMPLOYEES = [
  {
    id: 'emp-1',
    name: 'Hasan Ahmed',
    initials: 'HA',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active', // 'Active' | 'Busy' | 'On Break'
    assignedTables: [1, 2, 3],
    activePickups: 1,
    activeRequests: 0,
    avgResponseTime: '38s',
    lastCallResponse: 'Responded in 32s (on time)',
    onTimeRate: '98%',
    avatarBg: 'from-orange-500 to-amber-600',
    phone: '+1 (555) 234-5678',
    email: 'hasan.ahmed@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-2',
    name: 'Rakib Chowdhury',
    initials: 'RC',
    role: 'Senior Host & Expediter',
    shift: 'Morning Shift (09:00 - 17:00)',
    status: 'Busy',
    assignedTables: [4, 5, 6],
    activePickups: 2,
    activeRequests: 1,
    avgResponseTime: '42s',
    lastCallResponse: 'Responded in 38s (on time)',
    onTimeRate: '95%',
    avatarBg: 'from-blue-500 to-indigo-600',
    phone: '+1 (555) 345-6789',
    email: 'rakib.chowdhury@smartdine.internal',
    nudgesCount: 1
  },
  {
    id: 'emp-3',
    name: 'Nusrat Jahan',
    initials: 'NJ',
    role: 'Senior Service Specialist',
    shift: 'Full Day (10:00 - 18:00)',
    status: 'Busy',
    assignedTables: [7, 8, 9],
    activePickups: 1,
    activeRequests: 1,
    avgResponseTime: '45s',
    lastCallResponse: 'Responded in 41s (on time)',
    onTimeRate: '96%',
    avatarBg: 'from-emerald-500 to-teal-600',
    phone: '+1 (555) 456-7890',
    email: 'nusrat.jahan@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-4',
    name: 'Tanvir Hossain',
    initials: 'TH',
    role: 'Floor Specialist',
    shift: 'Mid Shift (12:00 - 20:00)',
    status: 'Active',
    assignedTables: [10, 11, 12],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '39s',
    lastCallResponse: 'Responded in 35s (on time)',
    onTimeRate: '97%',
    avatarBg: 'from-purple-500 to-violet-600',
    phone: '+1 (555) 567-8901',
    email: 'tanvir.hossain@smartdine.internal',
    nudgesCount: 0
  },
  {
    id: 'emp-5',
    name: 'Mehedi Miraj',
    initials: 'MM',
    role: 'Customer Experience Lead',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'On Break',
    assignedTables: [],
    activePickups: 0,
    activeRequests: 0,
    avgResponseTime: '48s',
    lastCallResponse: 'Break ends in 12m',
    onTimeRate: '94%',
    avatarBg: 'from-pink-500 to-rose-600',
    phone: '+1 (555) 678-9012',
    email: 'mehedi.miraj@smartdine.internal',
    nudgesCount: 0
  }
];

// Initial Live Call Routing Alerts Feed
const INITIAL_ALERTS = [
  {
    id: 'alert-1',
    type: 'customer_call', // 'customer_call' | 'kitchen_ready'
    tableNumber: 4,
    description: 'Table 4 called for assistance: Water Refill & Extra Cutlery',
    assignedEmployeeId: 'emp-1',
    assignedEmployeeName: 'Hasan',
    status: 'Pending', // 'Pending' | 'In Progress' | 'In Transit' | 'Completed' | 'Acknowledged'
    responseDetails: 'Responded in 45s / Pending',
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
    assignedEmployeeName: 'Rakib',
    status: 'In Transit',
    responseDetails: 'Status: In Transit',
    timestamp: Date.now() - 85000,
    urgency: 'high',
    nudgedCount: 0
  },
  {
    id: 'alert-3',
    type: 'customer_call',
    tableNumber: 2,
    description: 'Table 2 called for assistance: Bill & invoice checkout terminal',
    assignedEmployeeId: 'emp-3',
    assignedEmployeeName: 'Nusrat',
    status: 'Completed',
    responseDetails: 'Responded in 38s (on time)',
    timestamp: Date.now() - 240000,
    urgency: 'low',
    nudgedCount: 0
  },
  {
    id: 'alert-4',
    type: 'kitchen_ready',
    tableNumber: 11,
    description: 'Table 11 Food Ready in Kitchen: Truffle Wild Mushroom Pasta',
    assignedEmployeeId: 'emp-4',
    assignedEmployeeName: 'Tanvir',
    status: 'Pending',
    responseDetails: 'Waiting pickup at Chef pass counter',
    timestamp: Date.now() - 15000,
    urgency: 'high',
    nudgedCount: 0
  }
];

// Sample simulated events for live test dispatching
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

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null for new employee
  const [reassignAlertTarget, setReassignAlertTarget] = useState(null); // alert being reassigned

  // Employee Absence & Quick Transfer Modal State (Rule 4)
  const [transferModalData, setTransferModalData] = useState(null); // { sourceEmployee, isAbsenceTrigger: boolean }
  const [selectedBackupEmpId, setSelectedBackupEmpId] = useState('');
  const [rerouteActiveAlerts, setRerouteActiveAlerts] = useState(true);

  // Dynamic Venue Table Count & Array (Rule 1)
  const totalVenueTables = propTableCount || (propTables ? propTables.length : TOTAL_TABLES_COUNT);
  const allTableNumbers = useMemo(() => Array.from({ length: totalVenueTables }, (_, i) => i + 1), [totalVenueTables]);

  // Active Backup Employee Candidates (Strictly on-duty, excluding absent employee)
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
    const onDutyStaff = employees.filter(e => e.status !== 'On Break' && e.status !== 'Absent / Off-duty');
    const activeOnDuty = onDutyStaff.length;
    const currentlyBusy = employees.filter(e => e.status === 'Busy').length;

    // Count unique tables covered
    const coveredTables = new Set();
    employees.forEach(emp => {
      if (emp.status !== 'On Break' && emp.status !== 'Absent / Off-duty') {
        (emp.assignedTables || []).forEach(t => {
          if (t <= totalVenueTables) coveredTables.add(t);
        });
      }
    });

    // Dynamic average response time calculation
    const avgResponseSecs = Math.round(
      employees.reduce((acc, emp) => {
        const val = parseInt(emp.avgResponseTime, 10);
        return acc + (isNaN(val) ? 41 : val);
      }, 0) / (employees.length || 1)
    );

    return {
      totalEmployees: total,
      activeOnDuty,
      currentlyBusy,
      tablesCovered: coveredTables.size,
      totalTables: totalVenueTables,
      coveragePercentage: Math.round((coveredTables.size / totalVenueTables) * 100),
      avgResponseTime: `${avgResponseSecs}s`
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
      // Status filter
      if (statusFilter !== 'all' && emp.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesRole = emp.role.toLowerCase().includes(q);
        const matchesShift = emp.shift.toLowerCase().includes(q);
        const matchesTable = emp.assignedTables.some(
          t => `t${t}`.includes(q) || `table ${t}`.includes(q) || String(t) === q
        );
        return matchesName || matchesRole || matchesShift || matchesTable;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

  // Filtered alerts for Tab C
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

  // Toggle table assignment for a specific employee
  const handleToggleTableAssignment = useCallback((employeeId, tableNumber) => {
    setEmployees(prev => {
      const targetEmp = prev.find(e => e.id === employeeId);
      if (!targetEmp) return prev;

      const isAlreadyAssignedToTarget = targetEmp.assignedTables.includes(tableNumber);

      return prev.map(emp => {
        if (emp.id === employeeId) {
          const nextTables = isAlreadyAssignedToTarget
            ? emp.assignedTables.filter(t => t !== tableNumber)
            : [...emp.assignedTables, tableNumber].sort((a, b) => a - b);
          return { ...emp, assignedTables: nextTables };
        } else {
          // If assigned to another employee, unassign it so each table has a dedicated primary employee
          if (!isAlreadyAssignedToTarget && emp.assignedTables.includes(tableNumber)) {
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
    const isCurrentlyAssigned = target?.assignedTables.includes(tableNumber);

    if (isCurrentlyAssigned) {
      showToast(`Table ${tableNumber} unassigned from ${targetName}`, 'info');
    } else {
      showToast(`Table ${tableNumber} assigned to ${targetName}!`, 'success');
    }
  }, [employees, showToast]);

  // Reassign specific table from Table Matrix directly
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

  // 1-Click Auto-Balance Tables evenly across on-duty (Active + Busy) employees
  const handleAutoBalanceTables = useCallback(() => {
    if (onAutoBalance) {
      onAutoBalance();
      showToast(`Auto-balanced tables across on-duty Employees!`, 'success');
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

  // ---------------------------------------------------------------------------
  // EMPLOYEE ABSENCE & BACKUP HANDLER HUB (Rule 4)
  // ---------------------------------------------------------------------------

  // Open the Backup Handler Modal
  const handleOpenTransferModal = useCallback((emp) => {
    if (!emp.assignedTables || emp.assignedTables.length === 0) {
      showToast(`Employee ${emp.name} currently has no assigned tables to transfer.`, 'info');
      return;
    }
    setTransferModalData({ sourceEmployee: emp, isAbsenceTrigger: false });
    const defaultBackup = employees.find(e => e.id !== emp.id && (e.status === 'Active' || e.status === 'Busy'));
    setSelectedBackupEmpId(defaultBackup ? defaultBackup.id : '');
  }, [employees, showToast]);

  // Intercept Absence status to trigger Quick Transfer Modal (Rule 4)
  const handleChangeEmployeeStatus = useCallback((employeeId, newStatus) => {
    const targetEmp = employees.find(e => e.id === employeeId);
    if (!targetEmp) return;

    if (newStatus === 'Absent / Off-duty' && targetEmp.assignedTables?.length > 0) {
      // Intercept: prompt backup transfer modal
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

  // 1-Click "Confirm Transfer" handler
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
            status: transferModalData.isAbsenceTrigger ? 'Absent / Off-duty' : emp.status,
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

    // Optionally reroute active alerts
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

  // ---------------------------------------------------------------------------
  // CALL ROUTING CONTROLS
  // ---------------------------------------------------------------------------

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
    const targetEmp = employees.find(e => e.id === newEmployeeId);
    showToast(`Alert reassigned to Employee ${targetEmp?.name || 'selected'}!`, 'success');
  }, [employees, showToast]);

  const handleAcknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev =>
      prev.map(a => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'Acknowledged',
            responseDetails: 'Acknowledged & resolved by Dining Room Admin'
          };
        }
        return a;
      })
    );
    showToast('Alert acknowledged & resolved by Admin!', 'success');
  }, [showToast]);

  const handleSimulateNewAlert = useCallback(() => {
    const randomScenario = SIMULATED_SCENARIOS[Math.floor(Math.random() * SIMULATED_SCENARIOS.length)];
    const assignedEmp = tableToEmployeeMap[randomScenario.tableNumber] || employees[0];

    const newAlert = {
      id: `alert-${Date.now()}`,
      type: randomScenario.type,
      tableNumber: randomScenario.tableNumber,
      description: randomScenario.description,
      assignedEmployeeId: assignedEmp.id,
      status: randomScenario.type === 'kitchen_ready' ? 'Pending' : 'In Progress',
      responseDetails: randomScenario.type === 'kitchen_ready' ? 'Hot food at expediter pass' : 'Guest summoning',
      timestamp: Date.now(),
      urgency: randomScenario.urgency,
      nudgedCount: 0
    };

    setAlerts(prev => [newAlert, ...prev]);
    showToast(`New incoming alert: Table ${randomScenario.tableNumber} routed to Employee ${assignedEmp.name}`, 'warning');
  }, [tableToEmployeeMap, employees, showToast]);

  // ---------------------------------------------------------------------------
  // ADD & EDIT EMPLOYEE MODAL HANDLERS
  // ---------------------------------------------------------------------------

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
      phone: emp.phone,
      email: emp.email,
      assignedTables: [...emp.assignedTables]
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
          if (formData.assignedTables.some(t => emp.assignedTables.includes(t))) {
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
        name: formData.name.trim(),
        initials,
        role: formData.role,
        shift: formData.shift,
        status: formData.status,
        assignedTables: formData.assignedTables.sort((a, b) => a - b),
        activePickups: 0,
        activeRequests: 0,
        avgResponseTime: '40s',
        lastCallResponse: 'Freshly onboarded',
        onTimeRate: '100%',
        avatarBg: 'from-cyan-500 to-blue-600',
        phone: formData.phone.trim() || '+1 (555) 000-0000',
        email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@smartdine.internal`,
        nudgesCount: 0
      };

      setEmployees(prev => {
        const cleaned = prev.map(emp => ({
          ...emp,
          assignedTables: emp.assignedTables.filter(t => !formData.assignedTables.includes(t))
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

  return (
    <div
      className={`w-full bg-[#0f172a] text-[#f8fafc] rounded-3xl border border-[#334155] p-5 sm:p-6 space-y-5 shadow-xl relative ${className}`}
      style={{ width: '100%', backgroundColor: '#0f172a' }}
    >
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-semibold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50'
                : 'bg-[#1e293b] border-[#334155] text-[#f8fafc]'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Zap className="w-4 h-4 text-cyan-400 shrink-0" />}
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
          1. HEADER & EXECUTIVE SUMMARY STATS
          ========================================================================= */}
      <section className="bg-[#111827] rounded-2xl border border-[#334155] p-4 sm:p-5 shadow-sm space-y-4">
        {/* Title and Top Level Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#FF5A26] shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#f8fafc] tracking-tight">
                Employee Hub
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff roster, dining room table assignments, and real-time dispatch routing
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoBalanceTables}
              className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              title="Evenly distribute tables 1-12 among active employees"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Balance Tables</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateNewAlert}
              className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              title="Simulate incoming guest assistance or kitchen pickup"
            >
              <Zap className="w-3.5 h-3.5 text-[#FF7A45]" />
              <span>Simulate Alert</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#FF5A26] hover:bg-[#e04f20] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* 4 Sleek, Elegant Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Chip 1: Total Employees */}
          <div className="p-3.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Total Employees</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-[#f8fafc]">
                  {summaryMetrics.totalEmployees}
                </span>
                <span className="text-[10px] text-slate-400">Registered</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Chip 2: Active On-Duty */}
          <div className="p-3.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Active On-Duty</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                  {summaryMetrics.activeOnDuty}
                </span>
                <span className="text-[10px] text-emerald-300/80">Floor Ready</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Chip 3: Tables Covered */}
          <div className="p-3.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Tables Covered</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-[#f8fafc]">
                  {summaryMetrics.tablesCovered}/{summaryMetrics.totalTables}
                </span>
                <span className="text-[10px] text-blue-400 font-semibold">
                  ({summaryMetrics.coveragePercentage}%)
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Table className="w-4 h-4" />
            </div>
          </div>

          {/* Chip 4: Avg Response */}
          <div className="p-3.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Avg Response</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-amber-400">
                  {summaryMetrics.avgResponseTime}
                </span>
                <span className="text-[10px] text-slate-400">Telemetry</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Clean Sub-Tabs / Segmented View Switcher */}
        <div className="pt-3 border-t border-[#334155]">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0f172a] border border-[#334155] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'roster'
                  ? 'bg-[#1e293b] text-[#f8fafc] border border-slate-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/40'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#FF7A45]" />
              <span>Employee Directory &amp; Roster</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#111827] text-slate-300 font-medium border border-[#334155]">
                {employees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'tables'
                  ? 'bg-[#1e293b] text-[#f8fafc] border border-slate-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/40'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-blue-400" />
              <span>Dining Room Table Coverage (Tables 1–12)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#111827] text-slate-300 font-medium border border-[#334155]">
                {summaryMetrics.tablesCovered}/12
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'dispatch'
                  ? 'bg-[#1e293b] text-[#f8fafc] border border-slate-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/40'
              }`}
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Call Routing &amp; Kitchen Dispatch</span>
              {alerts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TAB A: EMPLOYEE DIRECTORY & ROSTER (DEFAULT)
          ========================================================================= */}
      {activeTab === 'roster' && (
        <section className="space-y-4 animate-fadeIn">
          {/* Search & Status Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111827] border border-[#334155] p-3 rounded-2xl">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-[#FF5A26] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                All Employees ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Active')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === 'Active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-[#1e293b]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Active ({summaryMetrics.activeOnDuty})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Busy')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === 'Busy'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-[#1e293b]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Busy ({summaryMetrics.currentlyBusy})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('On Break')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === 'On Break'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                <Coffee className="w-3 h-3 text-slate-400" />
                <span>On Break ({employees.filter(e => e.status === 'On Break').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Absent / Off-duty')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  statusFilter === 'Absent / Off-duty'
                    ? 'bg-rose-900/80 text-rose-200 shadow-xs border border-rose-500/40'
                    : 'text-slate-400 hover:text-rose-300 hover:bg-[#1e293b]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Absent ({employees.filter(e => e.status === 'Absent / Off-duty').length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Employee, role, table..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] pl-9 pr-8 py-2 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-[#FF5A26] transition"
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
          </div>

          {/* Employee Cards Grid */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[#334155] p-12 text-center text-slate-400">
              <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#f8fafc]">No Employees matched your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEmployees.map(emp => {
                const isActive = emp.status === 'Active';
                const isBusy = emp.status === 'Busy';

                return (
                  <div
                    key={emp.id}
                    className="bg-[#111827] rounded-2xl border border-[#334155] p-5 shadow-sm hover:border-slate-500 transition duration-150 flex flex-col justify-between space-y-4"
                  >
                    {/* Header: Avatar, Name, Role, Shift, Live Status Pill & Actions */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#334155]">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${emp.avatarBg} text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0`}
                        >
                          {emp.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#f8fafc] text-sm sm:text-base">
                              {emp.name}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-300 font-medium">
                            {emp.role}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {emp.shift}
                          </p>
                        </div>
                      </div>

                      {/* Status Selector & Action Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1-Click Status Selector */}
                        <select
                          value={emp.status}
                          onChange={e => handleChangeEmployeeStatus(emp.id, e.target.value)}
                          className={`text-xs font-bold rounded-xl px-2 py-1.5 border focus:outline-none cursor-pointer transition ${
                            isActive
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                              : isBusy
                              ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                              : emp.status === 'Absent / Off-duty'
                              ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="Active" className="bg-[#111827] text-emerald-300">Active</option>
                          <option value="Busy" className="bg-[#111827] text-amber-300">Busy</option>
                          <option value="On Break" className="bg-[#111827] text-slate-300">On Break</option>
                          <option value="Absent / Off-duty" className="bg-[#111827] text-rose-300">Absent / Off-duty</option>
                        </select>

                        {/* 1-Click Bulk Transfer Tables Button (Rule 4) */}
                        <button
                          type="button"
                          onClick={() => handleOpenTransferModal(emp)}
                          className="px-2 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          title={`Transfer all ${emp.assignedTables?.length || 0} tables to backup employee`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Transfer</span>
                        </button>

                        {/* Nudge Button */}
                        <button
                          type="button"
                          onClick={() => handleNudgeEmployee(emp.id)}
                          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-[#334155] transition cursor-pointer"
                          title="Send instant floor nudge"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#334155] transition cursor-pointer"
                          title="Edit Employee profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-[#334155] transition cursor-pointer"
                          title="Remove Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned Tables: Neat Clickable Badges */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Table className="w-3.5 h-3.5 text-[#FF7A45]" />
                          Assigned Tables ({emp.assignedTables.length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Click pill to toggle assignment
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {allTableNumbers.map(tblNum => {
                          const isAssignedToThis = emp.assignedTables.includes(tblNum);
                          const assignedOther = !isAssignedToThis && tableToEmployeeMap[tblNum];

                          return (
                            <button
                              key={tblNum}
                              type="button"
                              onClick={() => handleToggleTableAssignment(emp.id, tblNum)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                isAssignedToThis
                                  ? 'bg-[#FF5A26] text-white shadow-xs border border-[#FF7A45]'
                                  : assignedOther
                                  ? 'bg-[#1e293b] text-slate-400 border border-[#334155] hover:border-slate-500 hover:text-slate-200'
                                  : 'bg-[#0f172a] text-slate-500 border border-[#334155] hover:border-slate-500 hover:text-slate-300'
                              }`}
                              title={
                                isAssignedToThis
                                  ? `Table ${tblNum} is currently assigned to ${emp.name}. Click to unassign.`
                                  : assignedOther
                                  ? `Table ${tblNum} is assigned to ${assignedOther.name}. Click to reassign here.`
                                  : `Table ${tblNum} is unassigned. Click to assign to ${emp.name}.`
                              }
                            >
                              <span>T{tblNum}</span>
                              {isAssignedToThis && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Telemetry Footer */}
                    <div className="pt-3 border-t border-[#334155] grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-[#1e293b] border border-[#334155]">
                        <span className="text-[10px] text-slate-400 block">Pickups</span>
                        <span className="font-bold text-[#f8fafc]">{emp.activePickups} Active</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#1e293b] border border-[#334155]">
                        <span className="text-[10px] text-slate-400 block">Requests</span>
                        <span className="font-bold text-[#f8fafc]">{emp.activeRequests} Live</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#1e293b] border border-[#334155]">
                        <span className="text-[10px] text-slate-400 block">Avg Resp</span>
                        <span className="font-bold text-emerald-400">{emp.avgResponseTime}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#1e293b] border border-[#334155]">
                        <span className="text-[10px] text-slate-400 block">On-Time</span>
                        <span className="font-bold text-cyan-300">{emp.onTimeRate}</span>
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
          TAB B: DINING ROOM TABLE COVERAGE (TABLES 1–12)
          ========================================================================= */}
      {activeTab === 'tables' && (
        <section className="bg-[#111827] rounded-2xl border border-[#334155] p-5 shadow-sm space-y-4 animate-fadeIn">
          {/* Subheader with Auto-Balance Button & Coverage Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]">
            <div className="flex items-center gap-2.5">
              <Table className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="font-bold text-[#f8fafc] text-base">
                  Dining Room Table Coverage (Tables 1–{totalVenueTables})
                </h3>
                <p className="text-xs text-slate-400">
                  Floor allocation matrix with inline Employee reassignment and 1-click balance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAutoBalanceTables}
                className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Balance Tables</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Assigned
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-[#334155]" /> Unassigned
                </span>
              </div>
            </div>
          </div>

          {/* Tables Grid: Dedicated, Spacious Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {allTableNumbers.map(tableNum => {
              const assignedEmp = tableToEmployeeMap[tableNum];
              const isAssigned = !!assignedEmp;

              return (
                <div
                  key={tableNum}
                  className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-3 ${
                    isAssigned
                      ? 'bg-[#1e293b] border-[#334155] hover:border-slate-500'
                      : 'bg-[#1e293b]/50 border-dashed border-[#334155] hover:border-slate-500'
                  }`}
                >
                  {/* Top: Table Number & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#f8fafc]">
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
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${assignedEmp.avatarBg} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          {assignedEmp.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#f8fafc] truncate">
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
                      <p className="text-xs text-slate-400 italic">No Employee assigned</p>
                    )}
                  </div>

                  {/* Bottom: Inline Reassignment Dropdown */}
                  <div className="pt-2 border-t border-[#334155]">
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">
                      Assigned Employee:
                    </label>
                    <select
                      value={assignedEmp ? assignedEmp.id : ''}
                      onChange={e => {
                        const newEmpId = e.target.value;
                        if (newEmpId) {
                          handleDirectTableReassign(tableNum, newEmpId);
                        }
                      }}
                      className="w-full bg-[#0f172a] border border-[#334155] text-xs text-[#f8fafc] rounded-xl py-1.5 px-2.5 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#111827] text-slate-400">
                        Assign Employee...
                      </option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-[#111827] text-[#f8fafc]">
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
        <section className="bg-[#111827] rounded-2xl border border-[#334155] p-5 shadow-sm space-y-4 animate-fadeIn">
          {/* Dispatch Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="font-bold text-[#f8fafc] text-base">
                  Live Call Routing &amp; Kitchen Dispatch
                </h3>
                <p className="text-xs text-slate-400">
                  Focused real-time event log for customer assistance summons and kitchen food ready alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Event Filter Pills */}
              <div className="flex items-center gap-1 bg-[#1e293b] p-1 rounded-xl border border-[#334155] text-xs">
                <button
                  type="button"
                  onClick={() => setAlertFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'all' ? 'bg-[#FF5A26] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('active')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'active' ? 'bg-[#FF5A26] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({alerts.filter(a => a.status !== 'Completed' && a.status !== 'Acknowledged').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilter('resolved')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    alertFilter === 'resolved' ? 'bg-[#FF5A26] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Resolved ({alerts.filter(a => a.status === 'Completed' || a.status === 'Acknowledged').length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleSimulateNewAlert}
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-[#FF7A45]" />
                <span>Simulate Call</span>
              </button>
            </div>
          </div>

          {/* Events Stream */}
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#f8fafc]">No dispatch events in this view</p>
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
                    className={`p-4 rounded-xl border transition-all duration-150 bg-[#1e293b] space-y-3 ${
                      isResolved
                        ? 'border-[#334155] opacity-75'
                        : alert.urgency === 'high'
                        ? 'border-rose-500/40'
                        : isKitchen
                        ? 'border-amber-500/40'
                        : 'border-[#334155]'
                    }`}
                  >
                    {/* Event Header: Type Badge, Table Number, Timestamp */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#334155]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isKitchen
                              ? 'bg-orange-500/20 text-[#FF7A45] border border-orange-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
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
                      <div className="p-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-xs font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
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
                          <span className="font-bold text-[#f8fafc] flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-md bg-gradient-to-tr ${
                                assignedEmp?.avatarBg || 'from-zinc-500 to-zinc-700'
                              } text-[9px] text-white flex items-center justify-center font-bold`}
                            >
                              {assignedEmp?.initials || 'EM'}
                            </span>
                            {assignedEmp ? assignedEmp.name : 'Unassigned'}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isResolved
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                              : alert.status === 'In Transit'
                              ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40'
                              : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: 1-Click Nudge, Reassign, Acknowledge */}
                    <div className="pt-2 border-t border-[#334155] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleNudgeEmployee(alert.assignedEmployeeId, alert.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer border border-amber-500/40 flex items-center gap-1"
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
                          className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer border border-[#334155] flex items-center gap-1"
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
          MODAL 1: ADD / EDIT EMPLOYEE MODAL
          ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-[#f8fafc]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#FF5A26]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#f8fafc]">
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
              {/* Name */}
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
                  className="w-full bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF5A26] transition"
                />
              </div>

              {/* Role & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Role &amp; Title
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                  >
                    <option value="Floor Specialist" className="bg-[#111827]">Floor Specialist</option>
                    <option value="Senior Host & Expediter" className="bg-[#111827]">Senior Host &amp; Expediter</option>
                    <option value="Senior Service Specialist" className="bg-[#111827]">Senior Service Specialist</option>
                    <option value="Customer Experience Lead" className="bg-[#111827]">Customer Experience Lead</option>
                    <option value="Dining Supervisor" className="bg-[#111827]">Dining Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Assigned Shift
                  </label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                  >
                    <option value="Morning Shift (08:00 - 16:00)" className="bg-[#111827]">Morning Shift (08:00 - 16:00)</option>
                    <option value="Mid Shift (12:00 - 20:00)" className="bg-[#111827]">Mid Shift (12:00 - 20:00)</option>
                    <option value="Evening Shift (16:00 - 00:00)" className="bg-[#111827]">Evening Shift (16:00 - 00:00)</option>
                    <option value="Full Day (10:00 - 18:00)" className="bg-[#111827]">Full Day (10:00 - 18:00)</option>
                  </select>
                </div>
              </div>

              {/* Live Status */}
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
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : statusOption === 'Busy'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-700 text-white border-slate-600 shadow-xs'
                          : 'bg-[#1e293b] text-slate-400 border-[#334155] hover:text-white'
                      }`}
                    >
                      {statusOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Info: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF5A26] transition"
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
                    className="w-full bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF5A26] transition"
                  />
                </div>
              </div>

              {/* Initial Assigned Tables Multi-Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Assigned Tables
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-[#1e293b] border border-[#334155]">
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
                            ? 'bg-[#FF5A26] text-white shadow-xs'
                            : 'bg-[#0f172a] text-slate-400 border border-[#334155] hover:text-white'
                        }`}
                      >
                        <span>T{tblNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selected tables will be automatically assigned to this Employee.
                </p>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-[#334155] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5A26] hover:bg-[#e04f20] text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
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
          <div className="bg-[#111827] border border-[#334155] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-[#f8fafc]">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#FF7A45]" />
                <h3 className="text-base font-bold text-[#f8fafc]">
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
                      ? 'bg-slate-800 border-[#FF5A26]/50 text-[#f8fafc]'
                      : 'bg-[#1e293b] border-[#334155] hover:border-[#FF5A26]/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${emp.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                    >
                      {emp.initials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f8fafc]">{emp.name}</p>
                      <span className="text-[10px] text-slate-400">{emp.role}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      emp.status === 'Active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : emp.status === 'Busy'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
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
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-[#334155] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          EMPLOYEE ABSENCE & QUICK TRANSFER MODAL (THE BACKUP HANDLER - Rule 4)
          ========================================================================= */}
      {transferModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-[#f8fafc] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f8fafc]">
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
                  <span className="text-rose-400 font-bold">Absent / Off-duty</span>
                ) : (
                  <span className="text-amber-400 font-bold">transferring tables</span>
                )}.
                Transfer all assigned tables to which active backup employee?
              </p>

              {/* Assigned Tables Badges */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                  Tables to be transferred ({transferModalData.sourceEmployee.assignedTables?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {(transferModalData.sourceEmployee.assignedTables || []).map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#FF5A26]/20 border border-[#FF5A26]/40 text-[#FF7A45] font-bold">
                      Table {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Backup Employee Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Select Active Backup Employee:
                </label>
                {activeBackupEmployees.length === 0 ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                    ⚠️ No active or busy backup employees available on the floor.
                  </div>
                ) : (
                  <select
                    value={selectedBackupEmpId}
                    onChange={e => setSelectedBackupEmpId(e.target.value)}
                    className="w-full bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] rounded-xl py-2 px-3 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                  >
                    {activeBackupEmployees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#111827] text-[#f8fafc]">
                        {emp.name} ({emp.status}) — currently has {emp.assignedTables?.length || 0} tables
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Checkbox: Reroute Active Alerts */}
              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rerouteActiveAlerts}
                  onChange={e => setRerouteActiveAlerts(e.target.checked)}
                  className="rounded border-[#334155] text-[#FF5A26] focus:ring-0 cursor-pointer"
                />
                <span>Also reroute pending call &amp; kitchen alerts to backup employee</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#334155] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModalData(null)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-[#334155] text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBackupEmpId || activeBackupEmployees.length === 0}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-xl bg-[#FF5A26] hover:bg-[#e04f20] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
