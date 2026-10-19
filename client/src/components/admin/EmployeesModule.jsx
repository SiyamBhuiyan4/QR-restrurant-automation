import React, { useState, useMemo, useCallback } from 'react';
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
  Filter,
  Check,
  X,
  Phone,
  Mail,
  Zap,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  MoreVertical,
  Activity,
  Edit2,
  Trash2,
  Send,
  Coffee,
  CheckCheck,
  RefreshCw,
  SlidersHorizontal,
  Table
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
    assignedEmployeeId: 'emp-1', // Routed to Employee Hasan
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
    assignedEmployeeId: 'emp-2', // Routed to Employee Rakib
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

export default function EmployeesModule({ className = '' }) {
  // Main State
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Busy' | 'On Break'
  const [activeViewMode, setActiveViewMode] = useState('split'); // 'split' | 'matrix' | 'telemetry'

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null for new employee
  const [tableAssignModalEmployeeId, setTableAssignModalEmployeeId] = useState(null);
  const [reassignAlertTarget, setReassignAlertTarget] = useState(null); // alert being reassigned

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
    // Active On-Duty: staff currently clocked in on floor shift (Active + Busy = 4)
    const onDutyStaff = employees.filter(e => e.status !== 'On Break');
    const activeOnDuty = onDutyStaff.length;
    const currentlyBusy = employees.filter(e => e.status === 'Busy').length;
    
    // Count unique tables covered
    const coveredTables = new Set();
    employees.forEach(emp => {
      if (emp.status !== 'On Break') {
        emp.assignedTables.forEach(t => coveredTables.add(t));
      }
    });

    return {
      totalEmployees: total,
      activeOnDuty,
      currentlyBusy,
      totalOnShift: activeOnDuty,
      tablesCovered: coveredTables.size,
      totalTables: TOTAL_TABLES_COUNT,
      coveragePercentage: Math.round((coveredTables.size / TOTAL_TABLES_COUNT) * 100)
    };
  }, [employees]);

  // Lookup map: tableNumber -> Assigned Employee
  const tableToEmployeeMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      emp.assignedTables.forEach(tblNum => {
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
        const matchesTable = emp.assignedTables.some(t => `t${t}`.includes(q) || `table ${t}`.includes(q) || String(t) === q);
        return matchesName || matchesRole || matchesShift || matchesTable;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

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
          // If already assigned, remove it; otherwise add it
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
          const next = emp.assignedTables.includes(tableNumber)
            ? emp.assignedTables
            : [...emp.assignedTables, tableNumber].sort((a, b) => a - b);
          return { ...emp, assignedTables: next };
        } else {
          return {
            ...emp,
            assignedTables: emp.assignedTables.filter(t => t !== tableNumber)
          };
        }
      });
    });

    const targetEmp = employees.find(e => e.id === newEmployeeId);
    showToast(`Table ${tableNumber} reassigned to ${targetEmp?.name || 'selected Employee'}`, 'success');
  }, [employees, showToast]);

  // 1-Click Auto-Balance Tables evenly across on-duty (Active + Busy) employees
  const handleAutoBalanceTables = useCallback(() => {
    const onDutyEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Busy');
    if (onDutyEmployees.length === 0) {
      showToast('No active or busy employees available for floor coverage', 'error');
      return;
    }

    const assignments = {};
    onDutyEmployees.forEach(e => {
      assignments[e.id] = [];
    });

    ALL_TABLE_NUMBERS.forEach((tableNum, idx) => {
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

    showToast(`Auto-balanced all 12 tables across ${onDutyEmployees.length} on-duty Employees!`, 'success');
  }, [employees, showToast]);

  // ---------------------------------------------------------------------------
  // STATUS & NUDGE CONTROLS
  // ---------------------------------------------------------------------------

  // Change employee status on the fly
  const handleChangeEmployeeStatus = useCallback((employeeId, newStatus) => {
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          return { ...emp, status: newStatus };
        }
        return emp;
      })
    );
    const emp = employees.find(e => e.id === employeeId);
    showToast(`${emp?.name || 'Employee'} status updated to "${newStatus}"`, 'info');
  }, [employees, showToast]);

  // Nudge an employee from card or call routing
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

  // Reassign alert to another employee
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

  // Acknowledge alert as Admin
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

  // Simulate a new live alert
  const handleSimulateNewAlert = useCallback(() => {
    const randomScenario = SIMULATED_SCENARIOS[Math.floor(Math.random() * SIMULATED_SCENARIOS.length)];
    // Find assigned employee for this table
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
      // Update existing
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
          // Remove tables assigned to edited employee from other employees
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
      // Add new
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
        // Strip tables assigned to this new employee from others
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
      className={`w-full bg-[#0f172a] text-[#f8fafc] rounded-3xl border border-[#334155] p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden ${className}`}
      style={{ width: '100%', backgroundColor: '#0f172a' }}
    >
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold text-white ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 shadow-emerald-950/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 shadow-amber-950/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 shadow-rose-950/50'
                : 'bg-[#1e293b] border-[#334155] shadow-black/50 text-[#f8fafc]'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Zap className="w-4 h-4 text-cyan-400" />}
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
      <section className="bg-[#111827] rounded-3xl border border-[#334155] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#FF5A26]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-slate-700/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#334155]">
          {/* Title & Hub Identity */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] flex items-center justify-center text-white shadow-lg shadow-[#FF5A26]/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#f8fafc] tracking-tight">
                  Employee Directory &amp; Table Assignment Hub
                </h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Floor allocation matrix, responsive kitchen dispatching, and service telemetry
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleAutoBalanceTables}
              className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-200 border border-[#334155] text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-md shadow-slate-950/50"
              title="Evenly distribute tables 1-12 among active employees"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Balance Tables</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateNewAlert}
              className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-200 border border-[#334155] text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              title="Simulate incoming guest assistance or kitchen pickup"
            >
              <Zap className="w-3.5 h-3.5 text-[#FF7A45]" />
              <span>Simulate Alert</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl flame-gradient-btn text-white text-xs font-black shadow-lg shadow-[#FF5A26]/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* 4 Core Summary Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-5">
          {/* Metric 1: Total Employees */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1e293b] border border-[#334155] relative overflow-hidden group hover:border-[#FF5A26]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Total Employees
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#0f172a] text-slate-300 border border-[#334155] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#f8fafc] tracking-tight">
                {summaryMetrics.totalEmployees}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Registered
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">+1</span> scheduled upcoming
            </div>
          </div>

          {/* Metric 2: Active On-Duty */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1e293b] border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Active On-Duty
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                {summaryMetrics.activeOnDuty}
              </span>
              <span className="text-[11px] font-semibold text-emerald-300/80">
                Floor Ready
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-300/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Available for table calls</span>
            </div>
          </div>

          {/* Metric 3: Currently Busy */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1e293b] border border-amber-500/30 relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Currently Busy
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {summaryMetrics.currentlyBusy}
              </span>
              <span className="text-[11px] font-semibold text-amber-300/80">
                In Service
              </span>
            </div>
            <div className="mt-1 text-[10px] text-amber-300/80 flex items-center gap-1">
              <span>Handling orders &amp; pickups</span>
            </div>
          </div>

          {/* Metric 4: Tables Covered */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1e293b] border border-[#334155] relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Tables Covered
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                <Table className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#f8fafc] tracking-tight">
                {summaryMetrics.tablesCovered}/{summaryMetrics.totalTables}
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                ({summaryMetrics.coveragePercentage}%)
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
              {summaryMetrics.tablesCovered === summaryMetrics.totalTables ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Full dining room covered
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">
                  {summaryMetrics.totalTables - summaryMetrics.tablesCovered} tables need assignment
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search, Filter Tabs & View Switcher */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-5 border-t border-[#334155]">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1e293b] border border-[#334155] overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-black transition cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              All Employees ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 rounded-xl font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-300 hover:text-emerald-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Active ({summaryMetrics.activeOnDuty})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Busy')}
              className={`px-3 py-1.5 rounded-xl font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'Busy'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Busy ({summaryMetrics.currentlyBusy})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('On Break')}
              className={`px-3 py-1.5 rounded-xl font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'On Break'
                  ? 'bg-slate-700 text-white shadow-md shadow-black/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Coffee className="w-3 h-3 text-slate-400" />
              <span>On Break ({employees.filter(e => e.status === 'On Break').length})</span>
            </button>
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Employee, role, table..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] pl-9 pr-3 py-2 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-[#FF5A26] transition"
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

            {/* View Mode Buttons */}
            <div className="flex items-center bg-[#1e293b] p-1 rounded-xl border border-[#334155] text-xs">
              <button
                type="button"
                onClick={() => setActiveViewMode('split')}
                title="Split View (Employees + Live Routing)"
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeViewMode === 'split' ? 'bg-[#FF5A26] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('matrix')}
                title="12-Table Visual Matrix Layout"
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeViewMode === 'matrix' ? 'bg-[#FF5A26] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Table Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('telemetry')}
                title="Response Time Telemetry Insights"
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeViewMode === 'telemetry' ? 'bg-[#FF5A26] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Telemetry
              </button>
            </div>
          </div>
        </div>
      </section>



      {/* =========================================================================
          2. MAIN WORKSPACE (SPLIT OR FULL VIEW)
          ========================================================================= */}
      {activeViewMode !== 'matrix' && (
        <div className={`grid gap-6 ${activeViewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Column (or Full): Employee Directory & Interactive Cards */}
          <div className={activeViewMode === 'split' ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF7A45]" />
                <h3 className="font-black text-[#f8fafc] text-base">
                  Floor Service Employees ({filteredEmployees.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Click table pills to toggle assignment
              </span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="bg-[#111827] rounded-3xl border border-[#334155] p-12 text-center text-slate-400">
                <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-[#f8fafc]">No Employees matched criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing search or changing status filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map(emp => {
                  const isActive = emp.status === 'Active';
                  const isBusy = emp.status === 'Busy';
                  const isOnBreak = emp.status === 'On Break';

                  return (
                    <div
                      key={emp.id}
                      className="bg-[#111827] rounded-3xl border border-[#334155] p-5 shadow-xl hover:border-slate-600 transition duration-200 relative overflow-hidden group"
                    >
                      {/* Header: Employee Info + Status Pill + Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar */}
                          <div
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${emp.avatarBg} text-white font-black text-sm flex items-center justify-center shadow-lg ring-2 ring-white/10 shrink-0`}
                          >
                            {emp.initials}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-[#f8fafc] text-base">
                                {emp.name}
                              </h4>
                              {/* Live Status Pill */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                                  isActive
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-emerald-900/40'
                                    : isBusy
                                    ? 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-amber-900/40'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 shadow-black/40'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isActive
                                      ? 'bg-emerald-400 animate-pulse'
                                      : isBusy
                                      ? 'bg-amber-400 animate-pulse'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                <span>{emp.status}</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                              <span className="font-semibold text-slate-300">
                                {emp.role}
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-300">
                                {emp.shift}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Status Toggle & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Status Switcher Select */}
                          <select
                            value={emp.status}
                            onChange={e => handleChangeEmployeeStatus(emp.id, e.target.value)}
                            className="bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                          >
                            <option value="Active">Active</option>
                            <option value="Busy">Busy</option>
                            <option value="On Break">On Break</option>
                          </select>

                          {/* Nudge button */}
                          <button
                            type="button"
                            onClick={() => handleNudgeEmployee(emp.id)}
                            className="p-2 rounded-xl bg-[#1e293b] hover:bg-amber-950/50 text-amber-300 border border-[#334155] hover:border-amber-500/40 transition active:scale-95 cursor-pointer shadow-xs"
                            title="Send instant floor nudge to this Employee"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#334155] transition active:scale-95 cursor-pointer shadow-xs"
                            title="Edit Employee Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 rounded-xl bg-[#1e293b] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#334155] transition active:scale-95 cursor-pointer shadow-xs"
                            title="Remove Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Table Assignment System (Pill Selector) */}
                      <div className="py-4 border-b border-[#334155]">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                            <Table className="w-3.5 h-3.5 text-[#FF7A45]" />
                            Assigned Tables ({emp.assignedTables.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Click pill to toggle assignment
                          </span>
                        </div>

                        {/* Interactive 12-Table Multi-Select Pill Selector */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ALL_TABLE_NUMBERS.map(tblNum => {
                            const isAssignedToThis = emp.assignedTables.includes(tblNum);
                            const assignedOther = !isAssignedToThis && tableToEmployeeMap[tblNum];

                            return (
                              <button
                                key={tblNum}
                                type="button"
                                onClick={() => handleToggleTableAssignment(emp.id, tblNum)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                                  isAssignedToThis
                                    ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/40 ring-1 ring-[#FF7A45]/80 scale-102'
                                    : assignedOther
                                    ? 'bg-[#1e293b] text-slate-400 border border-[#334155] hover:border-slate-500 hover:text-slate-200'
                                    : 'bg-[#0f172a] text-slate-400 border border-[#334155] hover:border-slate-500 hover:text-slate-200'
                                }`}
                                title={
                                  isAssignedToThis
                                    ? `Table ${tblNum} is currently assigned to ${emp.name}. Click to remove.`
                                    : assignedOther
                                    ? `Table ${tblNum} is currently assigned to ${assignedOther.name}. Click to transfer here.`
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

                      {/* Bottom: Live Responsiveness Telemetry & Activity Metrics */}
                      <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {/* Active Kitchen Pickups */}
                        <div className="p-2.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-[#FF7A45] flex items-center justify-center shrink-0">
                            <ChefHat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Kitchen Pickups</span>
                            <span className="font-black text-[#f8fafc]">{emp.activePickups} Active</span>
                          </div>
                        </div>

                        {/* Live Customer Requests */}
                        <div className="p-2.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                            <BellRing className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Guest Requests</span>
                            <span className="font-black text-[#f8fafc]">{emp.activeRequests} Live</span>
                          </div>
                        </div>

                        {/* Average Response Time */}
                        <div className="p-2.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Avg Response</span>
                            <span className="font-black text-emerald-400">{emp.avgResponseTime}</span>
                          </div>
                        </div>

                        {/* Last Call Telemetry Benchmark */}
                        <div className="p-2.5 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Last Call Telemetry</span>
                            <span className="font-bold text-slate-200 text-[11px] truncate block max-w-[120px]" title={emp.lastCallResponse}>
                              {emp.lastCallResponse}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              DIRECT KITCHEN & CUSTOMER CALL ROUTING MONITOR (Right Column)
              ========================================================================= */}
          <div className={activeViewMode === 'split' ? 'lg:col-span-5 space-y-4' : 'space-y-4 mt-6'}>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-[#f8fafc] text-base">
                  Direct Kitchen &amp; Customer Call Routing Monitor
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold border border-amber-500/30">
                {alerts.length} Active Events
              </span>
            </div>

            <div className="bg-[#111827] rounded-3xl border border-[#334155] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">
                    Live Dispatch Stream (Convex Synced)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateNewAlert}
                  className="text-[11px] text-[#FF7A45] hover:text-[#FF5A26] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  Simulate Call
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#f8fafc]">All call routes are resolved</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No outstanding kitchen or guest summons</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {alerts.map(alert => {
                    const assignedEmp = employees.find(e => e.id === alert.assignedEmployeeId);
                    const isKitchen = alert.type === 'kitchen_ready';

                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 relative bg-[#1e293b] ${
                          alert.status === 'Acknowledged' || alert.status === 'Completed'
                            ? 'border-[#334155] opacity-70'
                            : alert.urgency === 'high'
                            ? 'border-rose-500/50 shadow-xs ring-1 ring-rose-500/20'
                            : isKitchen
                            ? 'border-amber-500/50 shadow-xs ring-1 ring-amber-500/20'
                            : 'border-[#334155] shadow-xs'
                        }`}
                      >
                        {/* Top: Type Badge & Table & Time */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#334155]/60">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isKitchen
                                  ? 'bg-orange-500/20 text-[#FF7A45] border border-orange-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {isKitchen ? <ChefHat className="w-3 h-3" /> : <BellRing className="w-3 h-3" />}
                              <span>{isKitchen ? 'Kitchen Food Ready' : 'Customer Assistance'}</span>
                            </span>

                            <span className="text-xs font-black text-amber-300">
                              Table {alert.tableNumber}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 font-medium">
                            {Math.max(1, Math.round((Date.now() - alert.timestamp) / 1000))}s ago
                          </span>
                        </div>

                        {/* Middle: Live Routing Banner & Telemetry */}
                        <div className="my-2.5 space-y-2">
                          {/* Requirement Specification Routing Banner */}
                          <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                            <span className="text-amber-300">
                              Table {alert.tableNumber} {isKitchen ? 'Food Ready in Kitchen' : 'called for assistance'}
                            </span>
                            <span className="text-slate-400 font-black">&rarr;</span>
                            <span className="text-slate-200">
                              Routed to Employee {assignedEmp ? assignedEmp.name.split(' ')[0] : (alert.assignedEmployeeName || 'Staff')}
                            </span>
                            <span className="text-slate-400 font-black">&rarr;</span>
                            <span className="text-emerald-400">
                              Status: {alert.responseDetails}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-snug">
                            {alert.description}
                          </p>

                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <span>Assigned Staff:</span>
                              <span className="font-bold text-[#f8fafc] flex items-center gap-1">
                                <span
                                  className={`w-4 h-4 rounded-full bg-gradient-to-tr ${
                                    assignedEmp?.avatarBg || 'from-zinc-500 to-zinc-700'
                                  } text-[9px] text-white flex items-center justify-center font-black`}
                                >
                                  {assignedEmp?.initials || 'EM'}
                                </span>
                                {assignedEmp ? assignedEmp.name : 'Unassigned'}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                alert.status === 'Completed' || alert.status === 'Acknowledged'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : alert.status === 'In Transit'
                                  ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {alert.status}
                            </span>
                          </div>
                        </div>

                        {/* Bottom 1-Click Admin Controls */}
                        <div className="pt-2 border-t border-[#334155]/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 1-Click Nudge Button */}
                            <button
                              type="button"
                              onClick={() => handleNudgeEmployee(alert.assignedEmployeeId, alert.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-amber-500/20 text-amber-300 text-[11px] font-black transition active:scale-95 cursor-pointer border border-amber-500/40 flex items-center gap-1 shadow-xs"
                              title="Send instant priority nudge to Employee"
                            >
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>
                                Nudge Employee {alert.nudgedCount ? `(${alert.nudgedCount})` : ''}
                              </span>
                            </button>

                            {/* 1-Click Reassign to another Employee */}
                            <button
                              type="button"
                              onClick={() => setReassignAlertTarget(alert)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-slate-200 text-[11px] font-black transition active:scale-95 cursor-pointer border border-[#334155] flex items-center gap-1 shadow-xs"
                              title="Reassign to another Employee"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-400" />
                              <span>Reassign to another Employee</span>
                            </button>
                          </div>

                          {/* 1-Click Acknowledge as Admin */}
                          {alert.status !== 'Acknowledged' && alert.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                              title="Acknowledge as Admin"
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>Acknowledge as Admin</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. DINING ROOM TABLE ASSIGNMENT MATRIX (Tables 1 – 12) - AT THE BOTTOM
          ========================================================================= */}
      {(activeViewMode === 'matrix' || activeViewMode === 'split') && (
        <section className="bg-[#111827] rounded-3xl border border-[#334155] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#334155]">
            <div className="flex items-center gap-2.5">
              <Table className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="font-black text-[#f8fafc] text-sm sm:text-base">
                  Dining Room Table Assignment Matrix (Tables 1 – 12)
                </h3>
                <p className="text-xs text-slate-400">
                  Click any table to quickly change primary Employee assignment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Assigned
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b] border border-[#334155]" /> Unassigned
              </span>
            </div>
          </div>

          {/* 12 Tables Grid: 3 clean rows of 4 tables each */}
          <div
            className="grid gap-4"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '16px'
            }}
          >
            {ALL_TABLE_NUMBERS.map(tableNum => {
              const assignedEmp = tableToEmployeeMap[tableNum];
              const isAssigned = !!assignedEmp;

              return (
                <div
                  key={tableNum}
                  className={`p-4 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between min-h-[125px] ${
                    isAssigned
                      ? 'bg-[#1e293b] border-[#334155] hover:border-[#FF5A26]/50 shadow-md'
                      : 'bg-[#1e293b]/60 border-dashed border-[#334155] hover:border-slate-500'
                  }`}
                >
                  {/* Top: Table Number & Status Pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#f8fafc] tracking-wide">
                      Table {tableNum}
                    </span>
                    {isAssigned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Assigned
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {/* Middle: Assigned Employee Info */}
                  <div className="my-2.5">
                    {isAssigned ? (
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${assignedEmp.avatarBg} text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          {assignedEmp.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-[#f8fafc] truncate">
                            {assignedEmp.name}
                          </p>
                          <span
                            className={`text-[10px] font-semibold ${
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

                  {/* Bottom: Quick Reassign Dropdown */}
                  <div className="pt-2 border-t border-[#334155]">
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
          4. MODAL 1: ADD / EDIT EMPLOYEE MODAL
          ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-[#f8fafc]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#f8fafc]">
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
                      className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer border ${
                        formData.status === statusOption
                          ? statusOption === 'Active'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                            : statusOption === 'Busy'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/40'
                            : 'bg-slate-700 text-white border-slate-600 shadow-md shadow-black/40'
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

              {/* Initial Assigned Tables Pill Multi-Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Assigned Tables (Select all that apply)
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-[#1e293b] border border-[#334155]">
                  {ALL_TABLE_NUMBERS.map(tblNum => {
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/40'
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
                  Selected tables will be automatically reassigned to this Employee.
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
                  className="px-5 py-2 rounded-xl flame-gradient-btn text-white text-xs font-black shadow-lg shadow-[#FF5A26]/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
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
          5. MODAL 2: REASSIGN CALL ALERT MODAL
          ========================================================================= */}
      {reassignAlertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111827] border border-[#334155] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-[#f8fafc]">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#FF7A45]" />
                <h3 className="text-base font-black text-[#f8fafc]">
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
                      className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${emp.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0`}
                    >
                      {emp.initials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f8fafc]">{emp.name}</p>
                      <span className="text-[10px] text-slate-400">{emp.role}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
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
    </div>
  );
}
