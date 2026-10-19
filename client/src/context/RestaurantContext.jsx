import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TABLE_STATUS,
  TABLE_LOCATION,
  EMPLOYEE_ROLE,
  EMPLOYEE_STATUS,
  mockTables as defaultMockTables,
  mockEmployees as defaultMockEmployees
} from '../data/adminMockData';
import { useSocket, useSocketListener } from './SocketContext';

const RestaurantContext = createContext(null);

export const STORAGE_KEYS = {
  TABLES: 'smartdine_restaurant_tables',
  EMPLOYEES: 'smartdine_restaurant_employees',
  TABLE_COUNT: 'smartdine_table_count',
  CALLS: 'smartdine_active_assistance_calls',
  REPORTS: 'smartdine_customer_reports_v4'
};

export const DEFAULT_EMPLOYEE_ROSTER = [
  {
    id: 'emp-1',
    numericId: 1,
    name: 'Rakib Ahmed',
    initials: 'RA',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'Active',
    assignedTables: [1, 6, 11],
    color: 'from-orange-500 to-amber-600',
    avatarColor: '#f59e0b',
    avatarBg: 'from-orange-500 to-amber-600',
    zone: 'Zone 1 (Main Hall)',
    phone: '+880 1712-345001',
    email: 'rakib.ahmed@restaurant.local',
    avgResponseTime: '11s',
    onTimeRate: '99%'
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
    color: 'from-blue-500 to-indigo-600',
    avatarColor: '#3b82f6',
    avatarBg: 'from-blue-500 to-indigo-600',
    zone: 'Zone 2 (Window Side)',
    phone: '+880 1819-456002',
    email: 'hasan.mahmud@restaurant.local',
    avgResponseTime: '11s',
    onTimeRate: '98%'
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
    color: 'from-purple-500 to-violet-600',
    avatarColor: '#8b5cf6',
    avatarBg: 'from-purple-500 to-violet-600',
    zone: 'Zone 3 (Patio & Terrace)',
    phone: '+880 1913-789003',
    email: 'priya.sen@restaurant.local',
    avgResponseTime: '11s',
    onTimeRate: '100%'
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
    color: 'from-amber-500 to-yellow-600',
    avatarColor: '#f59e0b',
    avatarBg: 'from-amber-500 to-yellow-600',
    zone: 'Zone 4 (Central Hall)',
    phone: '+880 1614-234004',
    email: 'tanvir.rahman@restaurant.local',
    avgResponseTime: '11s',
    onTimeRate: '97%'
  },
  {
    id: 'emp-5',
    numericId: 5,
    name: 'Sadia Islam',
    initials: 'SI',
    role: 'Senior Host',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'Active',
    assignedTables: [5, 10],
    color: 'from-pink-500 to-rose-600',
    avatarColor: '#ec4899',
    avatarBg: 'from-pink-500 to-rose-600',
    zone: 'Zone 5 (Private Dining)',
    phone: '+880 1515-678005',
    email: 'sadia.islam@restaurant.local',
    avgResponseTime: '11s',
    onTimeRate: '98%'
  }
];

export const DEFAULT_CUSTOMER_REPORTS = [
  {
    id: 'rep-101',
    table: 4,
    note: 'Requested extra napkins and water 10 mins ago — no one came.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 4 * 60000,
    staffId: 'emp-1',
    dispatch: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-102',
    table: 12,
    note: 'Food arrived warm instead of hot. Wagyu steak needs reheating.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 9 * 60000,
    staffId: 'emp-2',
    dispatch: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-103',
    table: 7,
    note: 'Need help splitting bill across three cards with corporate dining credit.',
    severity: 'moderate',
    status: 'in_progress',
    createdAt: Date.now() - 18 * 60000,
    staffId: 'emp-3',
    dispatch: { staffId: 'emp-3', note: 'Priya Sen dispatched with wireless handheld POS.' },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: [
      { id: 'm1', to: 'employee', text: 'Please go to Table 7 with the POS terminal.', sentAt: Date.now() - 15 * 60000, from: 'Admin' },
      { id: 'm2', to: 'customer', text: 'We are on our way to your table right now!', sentAt: Date.now() - 14 * 60000, from: 'Admin' }
    ]
  },
  {
    id: 'rep-104',
    table: 8,
    note: 'Anniversary celebration — requesting two complimentary champagne flutes.',
    severity: 'general',
    status: 'resolved',
    createdAt: Date.now() - 42 * 60000,
    staffId: 'emp-4',
    dispatch: { staffId: 'emp-4', note: 'Tanvir Rahman notified for anniversary hospitality package.' },
    resolvedAt: Date.now() - 28 * 60000,
    resolutionTime: '14 mins',
    resolutionNote: 'Delivered complimentary Prosecco flutes & macaron board.',
    messages: []
  }
];

export function createTableRecord(tableNumber, assignedEmployeeId = null) {
  const locations = [TABLE_LOCATION.MAIN_HALL, TABLE_LOCATION.WINDOW, TABLE_LOCATION.PATIO];
  const capacities = [2, 4, 4, 6, 8];
  const idx = tableNumber - 1;
  return {
    id: tableNumber,
    tableNumber,
    name: `Table ${tableNumber}`,
    status: TABLE_STATUS.AVAILABLE,
    assignedEmployeeId: assignedEmployeeId,
    currentOrderId: null,
    capacity: capacities[idx % capacities.length],
    seats: capacities[idx % capacities.length],
    location: locations[idx % locations.length],
    zone: locations[idx % locations.length],
    activeCall: false
  };
}

export function RestaurantProvider({ children }) {
  const socketContext = useSocket ? useSocket() : null;

  // 1. Total Table Count (Always dynamically aligned with floor tables)
  const [tableCount, setTableCountState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
        if (savedTables) {
          const parsed = JSON.parse(savedTables);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const maxNum = parsed.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
            return Math.max(maxNum, parsed.length);
          }
        }
        const saved = localStorage.getItem(STORAGE_KEYS.TABLE_COUNT);
        if (saved) {
          const num = parseInt(saved, 10);
          if (!isNaN(num) && num >= 1 && num <= 60) return num;
        }
      } catch (_) {}
    }
    return 12;
  });

  // 2. Employees Array (Central Roster)
  const [employees, setEmployeesState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(e => {
              if (e.id === 'emp-5' || e.numericId === 5 || e.name === 'Saima Islam') {
                return {
                  ...e,
                  name: 'Sadia Islam',
                  email: e.email ? e.email.replace('saima', 'sadia') : 'sadia.islam@restaurant.local'
                };
              }
              return e;
            });
          }
        }
      } catch (_) {}
    }
    return DEFAULT_EMPLOYEE_ROSTER;
  });

  // 3. Tables Array (Central Floor Grid)
  const [tables, setTablesState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    // Initialize standard floor based on default roster
    const initialTables = [];
    for (let i = 1; i <= 12; i++) {
      // Find assigned employee
      const assigned = DEFAULT_EMPLOYEE_ROSTER.find(e => e.assignedTables?.includes(i));
      const record = createTableRecord(i, assigned ? assigned.id : null);
      if (i === 1 || i === 5) record.status = TABLE_STATUS.ORDER_RUNNING;
      if (i === 2) record.status = TABLE_STATUS.READY_IN_KITCHEN;
      if (i === 4) record.status = TABLE_STATUS.NEED_ASSISTANCE;
      initialTables.push(record);
    }
    return initialTables;
  });

  // 4. Live Assistance Calls
  const [assistanceCalls, setAssistanceCalls] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  // 5. Customer Reports & Notes
  const [customerReports, setCustomerReportsState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(r => ({ messages: [], ...r }));
          }
        }
        // Fallback migration from older v3 key if v4 is not yet populated
        const legacyV3 = localStorage.getItem('smartdine_customer_reports_v3');
        if (legacyV3) {
          const parsedV3 = JSON.parse(legacyV3);
          if (Array.isArray(parsedV3) && parsedV3.length > 0) {
            return parsedV3.map(r => {
              let staffId = r.staffId || 'emp-1';
              if (staffId === 'emp-6') staffId = 'emp-5';
              return { messages: [], ...r, staffId };
            });
          }
        }
      } catch (_) {}
    }
    return DEFAULT_CUSTOMER_REPORTS;
  });

  // Broadcast Channel for ultra-fast same-origin cross-tab synchronization
  const broadcastChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('smartdine_restaurant_state');
    }
    return null;
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(tableCount));
    }
  }, [tableCount]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      // Backwards-compatibility for older WaiterPanel localStorage key
      const legacyRoster = employees.map(e => ({
        id: e.id,
        name: e.name,
        initials: e.initials,
        role: e.role,
        tables: e.assignedTables,
        color: e.color || 'from-orange-500 to-amber-600',
        zone: e.zone
      }));
      localStorage.setItem('smartdine_floor_staff_roster', JSON.stringify(legacyRoster));
    }
  }, [employees]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    }
    // Automatically ensure tableCount stays locked to actual floor tables count / max number
    if (Array.isArray(tables) && tables.length > 0) {
      const maxNum = tables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
      const effectiveCount = Math.max(maxNum, tables.length);
      setTableCountState(prev => {
        if (prev !== effectiveCount) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(effectiveCount));
          }
          return effectiveCount;
        }
        return prev;
      });
    }
  }, [tables]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(assistanceCalls));
    }
  }, [assistanceCalls]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(customerReports));
    }
  }, [customerReports]);

  // Broadcast state changes across tabs
  const broadcastState = useCallback((type, data) => {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
      } catch (_) {}
    }
  }, [broadcastChannel]);

  // Listen to cross-tab BroadcastChannel
  useEffect(() => {
    if (!broadcastChannel) return;
    const handleMessage = (e) => {
      const msg = e.data;
      if (!msg || !msg.type) return;
      if (msg.type === 'SYNC_ALL' && msg.data) {
        if (msg.data.tableCount) setTableCountState(msg.data.tableCount);
        if (msg.data.employees) setEmployeesState(msg.data.employees);
        if (msg.data.tables) setTablesState(msg.data.tables);
        if (msg.data.calls) setAssistanceCalls(msg.data.calls);
        if (msg.data.reports) setCustomerReportsState(msg.data.reports);
      } else if (msg.type === 'TABLE_COUNT_UPDATED') {
        setTableCountState(msg.data);
      } else if (msg.type === 'TABLES_UPDATED') {
        setTablesState(msg.data);
      } else if (msg.type === 'EMPLOYEES_UPDATED') {
        setEmployeesState(msg.data);
      } else if (msg.type === 'CALLS_UPDATED') {
        setAssistanceCalls(msg.data);
      } else if (msg.type === 'REPORTS_UPDATED') {
        setCustomerReportsState(msg.data);
      }
    };
    broadcastChannel.addEventListener('message', handleMessage);
    return () => broadcastChannel.removeEventListener('message', handleMessage);
  }, [broadcastChannel]);

  // Listen to window storage events (fallback for browsers without BroadcastChannel)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEYS.TABLE_COUNT && e.newValue) {
        const val = parseInt(e.newValue, 10);
        if (!isNaN(val)) setTableCountState(val);
      }
      if (e.key === STORAGE_KEYS.TABLES && e.newValue) {
        try { setTablesState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.EMPLOYEES && e.newValue) {
        try { setEmployeesState(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.CALLS && e.newValue) {
        try { setAssistanceCalls(JSON.parse(e.newValue)); } catch (_) {}
      }
      if (e.key === STORAGE_KEYS.REPORTS && e.newValue) {
        try { setCustomerReportsState(JSON.parse(e.newValue)); } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ---------------------------------------------------------------------------
  // HELPER LOOKUPS
  // ---------------------------------------------------------------------------
  const getAssignedEmployeeForTable = useCallback((tableNumber) => {
    const tblNum = Number(tableNumber);
    if (!tblNum || isNaN(tblNum)) return null;

    // Check direct table record first
    const table = tables.find(t => t.tableNumber === tblNum);
    if (table && table.assignedEmployeeId) {
      const emp = employees.find(e => e.id === table.assignedEmployeeId || String(e.numericId) === String(table.assignedEmployeeId));
      if (emp) return emp;
    }

    // Fallback: search employees by assignedTables
    const empByTables = employees.find(e => e.assignedTables?.includes(tblNum));
    if (empByTables) return empByTables;

    return null;
  }, [tables, employees]);

  // ---------------------------------------------------------------------------
  // DYNAMIC TABLE COUNT CONTROLS (Rule 1)
  // ---------------------------------------------------------------------------
  const setTableCount = useCallback((newCount) => {
    const target = Math.max(1, Math.min(60, parseInt(newCount, 10) || 1));
    setTableCountState(target);

    setTablesState(prevTables => {
      let nextTables;
      if (target === prevTables.length) {
        nextTables = prevTables;
      } else if (target > prevTables.length) {
        const added = [];
        for (let i = prevTables.length + 1; i <= target; i++) {
          added.push(createTableRecord(i, null));
        }
        nextTables = [...prevTables, ...added];
      } else {
        nextTables = prevTables.slice(0, target);
      }

      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // Also sanitize assignedTables on employees so they don't hold table numbers > target
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => ({
        ...emp,
        assignedTables: (emp.assignedTables || []).filter(t => t <= target)
      }));
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    broadcastState('TABLE_COUNT_UPDATED', target);
  }, [broadcastState]);

  // 1-Click / Custom Add New Table
  const addTable = useCallback((tableConfig = {}) => {
    let created = null;
    setTableCountState(prevCount => {
      const nextNum = Math.min(60, prevCount + 1);
      if (nextNum === prevCount) return prevCount;

      const locations = [TABLE_LOCATION.MAIN_HALL, TABLE_LOCATION.WINDOW, TABLE_LOCATION.PATIO];
      created = {
        ...createTableRecord(nextNum, tableConfig.assignedEmployeeId || null),
        capacity: Number(tableConfig.seats || tableConfig.capacity) || 4,
        seats: Number(tableConfig.seats || tableConfig.capacity) || 4,
        zone: tableConfig.zone || tableConfig.location || locations[(nextNum - 1) % locations.length],
        location: tableConfig.zone || tableConfig.location || locations[(nextNum - 1) % locations.length],
        assignedEmployeeId: tableConfig.assignedEmployeeId || null
      };

      setTablesState(prevTables => {
        const nextTables = [...prevTables, created];
        broadcastState('TABLES_UPDATED', nextTables);
        return nextTables;
      });

      broadcastState('TABLE_COUNT_UPDATED', nextNum);
      return nextNum;
    });

    return created;
  }, [broadcastState]);

  // 1-Click / Target Remove Table
  const removeTable = useCallback((tableNumberToRemove = null) => {
    let success = false;
    setTableCountState(prevCount => {
      if (prevCount <= 1) return prevCount;
      const nextCount = prevCount - 1;
      const targetNum = tableNumberToRemove ? Number(tableNumberToRemove) : prevCount;

      setTablesState(prevTables => {
        const filtered = prevTables.filter(t => t.tableNumber !== targetNum);
        // Re-index remaining tables from 1 to nextCount
        const reindexed = filtered.map((t, idx) => ({
          ...t,
          id: idx + 1,
          tableNumber: idx + 1,
          name: `Table ${idx + 1}`
        }));
        broadcastState('TABLES_UPDATED', reindexed);
        return reindexed;
      });

      setEmployeesState(prevEmps => {
        const nextEmps = prevEmps.map(emp => ({
          ...emp,
          assignedTables: (emp.assignedTables || []).filter(t => t !== targetNum && t <= nextCount)
        }));
        broadcastState('EMPLOYEES_UPDATED', nextEmps);
        return nextEmps;
      });

      broadcastState('TABLE_COUNT_UPDATED', nextCount);
      success = true;
      return nextCount;
    });

    return success;
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // DIRECT EMPLOYEE ASSIGNMENT TO TABLE (Rule 2)
  // ---------------------------------------------------------------------------
  const assignTableToEmployee = useCallback((tableNumber, employeeId) => {
    const tblNum = Number(tableNumber);
    const targetEmpId = employeeId ? String(employeeId) : null;

    // 1. Update tables
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (t.tableNumber === tblNum) {
          return { ...t, assignedEmployeeId: targetEmpId };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // 2. Update employees: remove table from other employees, add to target employee
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        const currentTables = emp.assignedTables || [];
        const isTarget = targetEmpId && (emp.id === targetEmpId || String(emp.numericId) === String(targetEmpId));

        if (isTarget) {
          const updated = Array.from(new Set([...currentTables, tblNum])).sort((a, b) => a - b);
          return { ...emp, assignedTables: updated };
        } else {
          const updated = currentTables.filter(t => t !== tblNum);
          return { ...emp, assignedTables: updated };
        }
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // Emit Socket.IO event if available
    if (socketContext?.emit) {
      socketContext.emit('waiter:assigned', { table: tblNum, employeeId: targetEmpId });
    }
  }, [broadcastState, socketContext]);

  // ---------------------------------------------------------------------------
  // 1-CLICK BULK TRANSFER / LINK TABLES FOR ABSENT EMPLOYEE (Rule 4)
  // ---------------------------------------------------------------------------
  const reassignAllTables = useCallback((sourceEmployeeId, targetBackupEmployeeId, markAbsent = true) => {
    const srcId = String(sourceEmployeeId);
    const backupId = String(targetBackupEmployeeId);

    const sourceEmp = employees.find(e => e.id === srcId || String(e.numericId) === srcId);
    const backupEmp = employees.find(e => e.id === backupId || String(e.numericId) === backupId);

    if (!sourceEmp || !backupEmp) return { success: false, count: 0 };

    const tablesToTransfer = [...(sourceEmp.assignedTables || [])];

    // 1. Re-link tables state
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (tablesToTransfer.includes(t.tableNumber)) {
          return { ...t, assignedEmployeeId: backupEmp.id };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    // 2. Update employee records
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        if (emp.id === sourceEmp.id) {
          return {
            ...emp,
            status: markAbsent ? 'Absent / Off-duty' : emp.status,
            assignedTables: []
          };
        }
        if (emp.id === backupEmp.id) {
          const combined = Array.from(new Set([...(emp.assignedTables || []), ...tablesToTransfer])).sort((a, b) => a - b);
          return {
            ...emp,
            assignedTables: combined
          };
        }
        return emp;
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // 3. Reroute active assistance calls for those tables
    setAssistanceCalls(prevCalls => {
      const nextCalls = prevCalls.map(c => {
        if (tablesToTransfer.includes(Number(c.tableNumber || c.table_number || c.table))) {
          return {
            ...c,
            assignedEmployeeId: backupEmp.id,
            assignedEmployeeName: backupEmp.name,
            assignedEmployeeRole: backupEmp.role,
            routedNote: `Re-routed to backup employee: ${backupEmp.name}`
          };
        }
        return c;
      });
      broadcastState('CALLS_UPDATED', nextCalls);
      return nextCalls;
    });

    return {
      success: true,
      transferredTables: tablesToTransfer,
      count: tablesToTransfer.length,
      sourceName: sourceEmp.name,
      backupName: backupEmp.name
    };
  }, [employees, broadcastState]);

  // ---------------------------------------------------------------------------
  // UPDATE EMPLOYEE STATUS
  // ---------------------------------------------------------------------------
  const setEmployeeStatus = useCallback((employeeId, newStatus) => {
    const idStr = String(employeeId);
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => {
        if (emp.id === idStr || String(emp.numericId) === idStr) {
          return { ...emp, status: newStatus };
        }
        return emp;
      });
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // AUTO-BALANCE TABLES EVENLY ACROSS ACTIVE EMPLOYEES
  // ---------------------------------------------------------------------------
  const autoBalanceTables = useCallback(() => {
    const activeStaff = employees.filter(e => e.status === 'Active' || e.status === 'Busy');
    if (activeStaff.length === 0) return;

    const allNums = Array.from({ length: tableCount }, (_, i) => i + 1);
    const newAssignments = {};
    activeStaff.forEach(s => { newAssignments[s.id] = []; });

    allNums.forEach((tbl, idx) => {
      const targetStaff = activeStaff[idx % activeStaff.length];
      newAssignments[targetStaff.id].push(tbl);
    });

    // Update employees
    setEmployeesState(prevEmps => {
      const nextEmps = prevEmps.map(emp => ({
        ...emp,
        assignedTables: newAssignments[emp.id] || []
      }));
      broadcastState('EMPLOYEES_UPDATED', nextEmps);
      return nextEmps;
    });

    // Update tables
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        let assignedId = null;
        for (const [empId, tblList] of Object.entries(newAssignments)) {
          if (tblList.includes(t.tableNumber)) {
            assignedId = empId;
            break;
          }
        }
        return { ...t, assignedEmployeeId: assignedId };
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });
  }, [employees, tableCount, broadcastState]);

  // ---------------------------------------------------------------------------
  // ASSISTANCE CALLS & ROUTING (Rule 3)
  // ---------------------------------------------------------------------------
  const registerAssistanceCall = useCallback((callData) => {
    const tableNum = Number(callData.tableNumber || callData.table_number || callData.table);
    const assignedEmp = getAssignedEmployeeForTable(tableNum);

    const enrichedCall = {
      id: callData.id || `call-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tableNumber: tableNum,
      table_number: tableNum,
      table: tableNum,
      reason: callData.reason || 'Assistance Requested',
      type: callData.type || 'assistance',
      customMessage: callData.customMessage || callData.custom_message || '',
      timestamp: callData.timestamp || Date.now(),
      status: 'pending',
      assignedEmployeeId: assignedEmp ? assignedEmp.id : null,
      assignedEmployeeName: assignedEmp ? assignedEmp.name : 'Unassigned (General Pool)',
      assignedEmployeeRole: assignedEmp ? assignedEmp.role : 'Floor Specialist',
      routingDetail: `Table #${tableNum} requested assistance -> Routed to assigned employee: ${assignedEmp ? assignedEmp.name : 'Unassigned'}`
    };

    setAssistanceCalls(prevCalls => {
      const existing = prevCalls.filter(c => Number(c.tableNumber) !== tableNum);
      const next = [enrichedCall, ...existing];
      broadcastState('CALLS_UPDATED', next);
      return next;
    });

    // Update table status to NEED_ASSISTANCE
    setTablesState(prevTables => {
      const nextTables = prevTables.map(t => {
        if (t.tableNumber === tableNum) {
          return { ...t, status: TABLE_STATUS.NEED_ASSISTANCE, activeCall: true };
        }
        return t;
      });
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });

    return enrichedCall;
  }, [getAssignedEmployeeForTable, broadcastState]);

  const resolveAssistanceCall = useCallback((tableNumberOrCallId) => {
    let resolvedTableNum = null;

    setAssistanceCalls(prevCalls => {
      const target = prevCalls.find(
        c => c.id === tableNumberOrCallId || Number(c.tableNumber) === Number(tableNumberOrCallId)
      );
      if (target) {
        resolvedTableNum = Number(target.tableNumber);
      }
      const next = prevCalls.filter(
        c => c.id !== tableNumberOrCallId && Number(c.tableNumber) !== Number(tableNumberOrCallId)
      );
      broadcastState('CALLS_UPDATED', next);
      return next;
    });

    if (resolvedTableNum) {
      setTablesState(prevTables => {
        const nextTables = prevTables.map(t => {
          if (t.tableNumber === resolvedTableNum) {
            const nextStatus = t.currentOrderId ? TABLE_STATUS.ORDER_RUNNING : TABLE_STATUS.AVAILABLE;
            return { ...t, status: nextStatus, activeCall: false };
          }
          return t;
        });
        broadcastState('TABLES_UPDATED', nextTables);
        return nextTables;
      });
    }
  }, [broadcastState]);

  // Listen to incoming Socket.IO events for live calls
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;

    const handleSocketCall = (data) => {
      if (data) registerAssistanceCall(data);
    };

    const handleSocketResolve = (data) => {
      const id = data?.id || data?.table_number || data?.tableNumber || data?.table;
      if (id) resolveAssistanceCall(id);
    };

    socket.on('waiter:call', handleSocketCall);
    socket.on('waiter:resolve', handleSocketResolve);
    socket.on('waiter:resolved', handleSocketResolve);

    return () => {
      socket.off('waiter:call', handleSocketCall);
      socket.off('waiter:resolve', handleSocketResolve);
      socket.off('waiter:resolved', handleSocketResolve);
    };
  }, [socketContext, registerAssistanceCall, resolveAssistanceCall]);

  // Central synchronized setTables that keeps tableCount locked in 1:1 parity
  const setTables = useCallback((updater) => {
    setTablesState(prevTables => {
      const nextTables = typeof updater === 'function' ? updater(prevTables) : updater;
      if (Array.isArray(nextTables)) {
        const maxNum = nextTables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
        const calculatedCount = Math.max(maxNum, nextTables.length);
        setTableCountState(prev => (prev !== calculatedCount ? calculatedCount : prev));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.TABLE_COUNT, String(calculatedCount));
          localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(nextTables));
        }
        broadcastState('TABLE_COUNT_UPDATED', calculatedCount);
      }
      broadcastState('TABLES_UPDATED', nextTables);
      return nextTables;
    });
  }, [broadcastState]);

  // ---------------------------------------------------------------------------
  // CUSTOMER REPORTS & NOTES (Rule 5 & Cross-View State Sync)
  // ---------------------------------------------------------------------------
  const setCustomerReports = useCallback((updater) => {
    setCustomerReportsState(prevReports => {
      const nextReports = typeof updater === 'function' ? updater(prevReports) : updater;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(nextReports));
        } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', nextReports);
      return nextReports;
    });
  }, [broadcastState]);

  const addCustomerReport = useCallback((reportData) => {
    const tblNum = Number(reportData.table || reportData.tableNumber || 1);
    const assignedEmp = getAssignedEmployeeForTable(tblNum) || employees[0];
    const newReport = {
      id: reportData.id || `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      table: tblNum,
      note: reportData.note || reportData.complaintText || '',
      severity: reportData.severity || 'general',
      status: reportData.status || 'new',
      createdAt: reportData.createdAt || Date.now(),
      staffId: reportData.staffId || (assignedEmp ? assignedEmp.id : 'emp-1'),
      dispatch: reportData.dispatch || null,
      resolvedAt: null,
      resolutionTime: null,
      resolutionNote: null,
      messages: reportData.messages || []
    };

    setCustomerReportsState(prev => {
      const next = [newReport, ...prev];
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });

    return newReport;
  }, [getAssignedEmployeeForTable, employees, broadcastState]);

  const updateCustomerReport = useCallback((reportId, patchOrUpdater) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          if (typeof patchOrUpdater === 'function') {
            return patchOrUpdater(r);
          }
          return { ...r, ...patchOrUpdater };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const assignReportStaff = useCallback((reportId, staffId, dispatchNote = null) => {
    const targetEmp = employees.find(e => e.id === staffId || String(e.numericId) === String(staffId)) || employees[0];
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const noteText = dispatchNote || `${targetEmp.name} assigned to Table ${r.table}`;
          return {
            ...r,
            staffId: targetEmp.id,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatch: { staffId: targetEmp.id, note: noteText }
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [employees, broadcastState]);

  const sendReportMessage = useCallback((reportId, to, text, from = 'Admin') => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return null;

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      to,
      text: cleanText,
      sentAt: Date.now(),
      from
    };

    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const emp = employees.find(e => e.id === r.staffId) || employees[0];
          const autoProgress = (to === 'employee' && r.status === 'new');
          return {
            ...r,
            messages: [...(r.messages || []), msg],
            status: autoProgress ? 'in_progress' : r.status,
            dispatch: (to === 'employee' && !r.dispatch)
              ? { staffId: r.staffId, note: `Message sent to ${emp.name}` }
              : r.dispatch
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });

    return msg;
  }, [employees, broadcastState]);

  const resolveCustomerReport = useCallback((reportId, customResolutionNote = null) => {
    const now = Date.now();
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const elapsedMin = Math.max(1, Math.round((now - (r.createdAt || now)) / 60000));
          const note = customResolutionNote?.trim() || 'Resolved — customer confirmed satisfied.';
          return {
            ...r,
            status: 'resolved',
            resolvedAt: now,
            resolutionTime: `${elapsedMin} min${elapsedMin === 1 ? '' : 's'}`,
            resolutionNote: note.startsWith('Resolved') ? note : `Resolved — ${note}`
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const reopenCustomerReport = useCallback((reportId) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'in_progress',
            resolvedAt: null,
            resolutionTime: null,
            resolutionNote: null
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [broadcastState]);

  const priorityPingReport = useCallback((reportId) => {
    setCustomerReportsState(prev => {
      const next = prev.map(r => {
        if (r.id === reportId) {
          const emp = employees.find(e => e.id === r.staffId) || employees[0];
          return {
            ...r,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatch: { staffId: r.staffId, note: `Priority ping sent to ${emp.name}` }
          };
        }
        return r;
      });
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(next)); } catch (_) {}
      }
      broadcastState('REPORTS_UPDATED', next);
      return next;
    });
  }, [employees, broadcastState]);

  const resetCustomerReports = useCallback((newReports = null) => {
    const target = newReports || DEFAULT_CUSTOMER_REPORTS;
    setCustomerReportsState(target);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(target)); } catch (_) {}
    }
    broadcastState('REPORTS_UPDATED', target);
  }, [broadcastState]);

  const getReportsForEmployee = useCallback((employeeId) => {
    const empId = String(employeeId);
    return customerReports.filter(r => r.staffId === empId || String(r.staffId) === empId);
  }, [customerReports]);

  const getReportsForTable = useCallback((tableNumber) => {
    const tbl = Number(tableNumber);
    return customerReports.filter(r => Number(r.table) === tbl);
  }, [customerReports]);

  const contextValue = {
    // State
    tableCount,
    tables,
    employees,
    assistanceCalls,
    customerReports,

    // Lookups
    getAssignedEmployeeForTable,
    getReportsForEmployee,
    getReportsForTable,

    // Actions (Floor & Tables)
    setTableCount,
    addTable,
    removeTable,
    setTables,
    setEmployees: setEmployeesState,
    assignTableToEmployee,
    reassignAllTables,
    setEmployeeStatus,
    autoBalanceTables,
    registerAssistanceCall,
    resolveAssistanceCall,

    // Actions (Customer Reports & Notes)
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports
  };

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

export function useCustomerReports() {
  const {
    customerReports,
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports,
    getReportsForEmployee,
    getReportsForTable,
    employees
  } = useRestaurant();

  return {
    reports: customerReports,
    customerReports,
    setCustomerReports,
    addCustomerReport,
    updateCustomerReport,
    assignReportStaff,
    sendReportMessage,
    resolveCustomerReport,
    reopenCustomerReport,
    priorityPingReport,
    resetCustomerReports,
    getReportsForEmployee,
    getReportsForTable,
    employees
  };
}

export default RestaurantContext;
