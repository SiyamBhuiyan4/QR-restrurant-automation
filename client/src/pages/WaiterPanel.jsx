import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  Check,
  CheckCircle2,
  Flame,
  RefreshCw,
  CheckCheck,
  UserCheck,
  ExternalLink,
  Search,
  Wifi,
  WifiOff,
  Users,
  User,
  ShieldCheck,
  ChevronDown,
  X,
  Radio,
  Sparkles
} from 'lucide-react';
import { useSocket, useSocketListener } from '../context/SocketContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import '../styles/staff.css';

/**
 * High-fidelity restaurant desk calling chime synthesizer using Web Audio API.
 * Synthesizes an authentic metallic chime (G#5 / G#6 harmonics) with rapid attack and decay.
 * Works 100% offline with zero external audio assets!
 */
class BellAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async play() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;

      // 1. Fundamental metallic ring: 830.6 Hz (G#5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(830.6, now);
      osc1.frequency.exponentialRampToValueAtTime(820, now + 1.2);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.5);

      // 2. High harmonic chime: 1661 Hz (G#6)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1661.2, now);
      gain2.gain.setValueAtTime(0.25, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.2);

      // 3. Crisp brass ping transient: 2489 Hz
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(2489, now);
      gain3.gain.setValueAtTime(0.18, now);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now);
      osc3.stop(now + 0.4);
    } catch (e) {
      console.warn('[BellAudioSynthesizer] Audio playback error:', e);
    }
  }
}

const bellSynthesizer = new BellAudioSynthesizer();

// Total floor tables in the venue
const TOTAL_FLOOR_TABLES = 12;
const ALL_TABLES = Array.from({ length: TOTAL_FLOOR_TABLES }, (_, i) => i + 1);

// Standard Floor Employee Roster
const DEFAULT_FLOOR_EMPLOYEES = [
  {
    id: 'emp-1',
    name: 'Hasan Ahmed',
    initials: 'HA',
    role: 'Floor Employee',
    tables: [1, 2, 3],
    color: 'from-orange-500 to-amber-600',
    zone: 'Zone 1 (Window Side)'
  },
  {
    id: 'emp-2',
    name: 'Rakib Chowdhury',
    initials: 'RC',
    role: 'Senior Floor Employee',
    tables: [4, 5, 6],
    color: 'from-blue-500 to-indigo-600',
    zone: 'Zone 2 (Central Floor)'
  },
  {
    id: 'emp-3',
    name: 'Nusrat Jahan',
    initials: 'NJ',
    role: 'Senior Floor Employee',
    tables: [7, 8, 9],
    color: 'from-emerald-500 to-teal-600',
    zone: 'Zone 3 (Terrace & Booths)'
  },
  {
    id: 'emp-4',
    name: 'Tanvir Hossain',
    initials: 'TH',
    role: 'Floor Employee',
    tables: [10, 11, 12],
    color: 'from-purple-500 to-violet-600',
    zone: 'Zone 4 (Private Dining)'
  }
];

export default function WaiterPanel() {
  const [calls, setCalls] = useState([]);
  const [resolvedHistory, setResolvedHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'urgent' | 'acknowledged' | 'my-tables' | 'history'
  const [tableSearch, setTableSearch] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('smartdine_waiter_muted') === 'true';
    }
    return false;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [acknowledgedMap, setAcknowledgedMap] = useState({}); // callId -> { employeeName, timestamp }
  const [callEmployeeOverrides, setCallEmployeeOverrides] = useState({}); // callId -> employeeId
  const [bannerAlert, setBannerAlert] = useState(null);
  const [isChimeAnimating, setIsChimeAnimating] = useState(false);
  const [isExclusiveEmployeeMode, setIsExclusiveEmployeeMode] = useState(false); // Exclusive toggle for assigned tables

  // Table Assignments State (Floor Employee Roster)
  const [employeeRoster, setEmployeeRoster] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('smartdine_floor_employee_roster') ||
          localStorage.getItem('smartdine_floor_staff_roster');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return DEFAULT_FLOOR_EMPLOYEES;
  });

  const [activeEmployeeFilter, setActiveEmployeeFilter] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem('smartdine_active_employee_id') ||
        localStorage.getItem('smartdine_active_staff_id') ||
        'all'
      );
    }
    return 'all';
  });

  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);

  // Restaurant Context for dynamic tables and employee coverage
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  // Sync employee roster from centralized context
  useEffect(() => {
    if (restaurant?.employees && Array.isArray(restaurant.employees) && restaurant.employees.length > 0) {
      setEmployeeRoster(restaurant.employees.map(e => ({
        id: e.id,
        numericId: e.numericId,
        name: e.name,
        initials: e.initials,
        role: e.role,
        tables: e.assignedTables || e.tables || [],
        color: e.color || 'from-orange-500 to-amber-600',
        zone: e.zone,
        status: e.status
      })));
    }
  }, [restaurant?.employees]);

  // Sync assistance calls from centralized context
  useEffect(() => {
    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls)) {
      setCalls(prev => {
        const map = new Map();
        prev.forEach(c => map.set(String(c.id ?? c.tableNumber), c));
        restaurant.assistanceCalls.forEach(c => map.set(String(c.id ?? c.tableNumber), c));
        return Array.from(map.values());
      });
      setIsLoading(false);
    }
  }, [restaurant?.assistanceCalls]);

  const totalFloorTables = restaurant?.tableCount || TOTAL_FLOOR_TABLES;
  const displayTables = useMemo(() => Array.from({ length: totalFloorTables }, (_, i) => i + 1), [totalFloorTables]);

  // Persist employee roster
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_floor_employee_roster', JSON.stringify(employeeRoster));
    }
  }, [employeeRoster]);

  // Persist active employee filter
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_active_employee_id', activeEmployeeFilter);
    }
  }, [activeEmployeeFilter]);

  // Convex Cloud real-time waiter calls subscription
  let convexCalls = null;
  let resolveConvexCall = null;
  try {
    convexCalls = useQuery(api.waiter.getCalls, { status: 'pending' });
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Sync Convex calls
  useEffect(() => {
    if (convexCalls && Array.isArray(convexCalls)) {
      setCalls(convexCalls.map((c) => ({ ...c, id: c.id ?? c._id })));
      setIsLoading(false);
    }
  }, [convexCalls]);

  // Socket Context
  const { isConnected, socket } = useSocket();

  // Sync mute state to synthesizer
  useEffect(() => {
    bellSynthesizer.isMuted = isMuted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartdine_waiter_muted', String(isMuted));
    }
  }, [isMuted]);

  // Live timer tick every 1000ms for accurate elapsed time calculation & urgency pulsing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active assistance calls from backend
  const fetchCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/waiter/calls', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        setCalls(data);
      } else {
        // Fallback to /api/waiter
        const fallback = await fetch('/api/waiter');
        if (fallback.ok) {
          const json = await fallback.json();
          setCalls(Array.isArray(json) ? json : json.data || []);
        }
      }
    } catch (err) {
      console.warn('[EmployeeConsole] Failed to fetch active calls:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Unlock Web Audio Context on first user click anywhere
  useEffect(() => {
    const handleFirstInteraction = () => {
      bellSynthesizer.init();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Resolve assigned employee for a given table number
  const getAssignedEmployeeForTable = useCallback(
    (tbl) => {
      const num = Number(tbl);
      if (!num || isNaN(num)) return null;
      return employeeRoster.find((s) => s.tables && s.tables.includes(num)) || null;
    },
    [employeeRoster]
  );

  // Trigger audio & visual chime
  const triggerChime = useCallback(() => {
    bellSynthesizer.init();
    bellSynthesizer.play();
    setIsChimeAnimating(true);
    setTimeout(() => {
      setIsChimeAnimating(false);
    }, 1800);
  }, []);

  // Handle incoming real-time assistance request
  const handleIncomingCall = useCallback(
    (newCall) => {
      if (!newCall) return;

      const callId = newCall.id ?? newCall._id ?? Date.now();
      const formattedCall = { ...newCall, id: callId };

      setCalls((prev) => {
        const exists = prev.some(
          (c) =>
            c.id === formattedCall.id ||
            (c.table_number === (formattedCall.table_number || formattedCall.tableNumber) &&
              c.created_at === formattedCall.created_at)
        );
        if (exists) return prev;
        return [formattedCall, ...prev];
      });

      const tableNum =
        formattedCall.table_number ||
        formattedCall.tableNumber ||
        formattedCall.table ||
        '?';
      const assigned = getAssignedEmployeeForTable(tableNum);
      const isTargetedToMe =
        activeEmployeeFilter !== 'all' && assigned?.id === activeEmployeeFilter;

      // Sound the calling chime (in exclusive employee mode, prioritize assigned employee chime)
      const shouldChime =
        !isExclusiveEmployeeMode || isTargetedToMe || activeEmployeeFilter === 'all';
      if (shouldChime) {
        triggerChime();
      }

      // Trigger floating alert banner with explicit urgent routing badge
      setBannerAlert({
        tableNumber: tableNum,
        reason: formattedCall.reason || 'Floor Employee Assistance Requested',
        assignedTo: assigned?.name || 'Unassigned (General Employee Pool)',
        isTargetedToMe,
        time: Date.now()
      });

      setTimeout(() => {
        setBannerAlert(null);
      }, 7000);
    },
    [triggerChime, getAssignedEmployeeForTable, activeEmployeeFilter, isExclusiveEmployeeMode]
  );

  // Handle incoming real-time resolved event
  const handleResolvedCall = useCallback((payload) => {
    const resolvedId =
      typeof payload === 'object' && payload !== null
        ? payload.id ?? payload.call_id ?? (payload.call && payload.call.id)
        : payload;
    if (!resolvedId) return;

    setCalls((prev) => {
      const match = prev.find((c) => String(c.id) === String(resolvedId));
      if (match) {
        setResolvedHistory((hist) => [
          { ...match, status: 'resolved', resolvedAt: Date.now() },
          ...hist.slice(0, 49) // Keep last 50
        ]);
      }
      return prev.filter((c) => String(c.id) !== String(resolvedId));
    });

    setAcknowledgedMap((prev) => {
      const next = { ...prev };
      delete next[resolvedId];
      return next;
    });
  }, []);

  // Handle incoming real-time acknowledge event (multi-device sync)
  const handleIncomingAcknowledge = useCallback((payload) => {
    if (!payload?.id) return;
    setAcknowledgedMap((prev) => ({
      ...prev,
      [payload.id]: {
        staffName: payload.staffName || payload.employeeName || 'Floor Employee',
        timestamp: Date.now()
      }
    }));
  }, []);

  // Handle incoming real-time table assignment sync
  const handleIncomingAssignment = useCallback((payload) => {
    if (!payload) return;
    const employeeId = payload.employeeId || payload.staffId;
    if (payload.callId && employeeId) {
      setCallEmployeeOverrides((prev) => ({
        ...prev,
        [payload.callId]: employeeId
      }));
    }
  }, []);

  // Real-time Socket.IO event listeners
  useSocketListener('waiter:call', handleIncomingCall);
  useSocketListener('waiter:resolved', handleResolvedCall);
  useSocketListener('waiter:resolve', handleResolvedCall);
  useSocketListener('waiter:acknowledge', handleIncomingAcknowledge);
  useSocketListener('waiter:assigned', handleIncomingAssignment);

  // Acknowledge a request ("Attending Table")
  const handleAcknowledge = (call) => {
    const callId = call.id;
    const currentEmployee =
      activeEmployeeFilter !== 'all'
        ? employeeRoster.find((s) => s.id === activeEmployeeFilter)
        : getAssignedEmployeeForTable(call.table_number || call.tableNumber);

    const employeeName = currentEmployee ? currentEmployee.name : 'Floor Employee';

    setAcknowledgedMap((prev) => ({
      ...prev,
      [callId]: {
        staffName: employeeName,
        timestamp: Date.now()
      }
    }));

    if (socket?.connected) {
      socket.emit('waiter:acknowledge', {
        id: callId,
        staffId: currentEmployee?.id || null,
        employeeId: currentEmployee?.id || null,
        staffName: employeeName,
        employeeName
      });
    }
  };

  // Assign request to a specific floor employee
  const handleAssignCall = (callId, employeeId) => {
    setCallEmployeeOverrides((prev) => ({
      ...prev,
      [callId]: employeeId
    }));

    if (socket?.connected) {
      socket.emit('waiter:assigned', {
        id: callId,
        callId,
        staffId: employeeId,
        employeeId
      });
    }
  };

  // Resolve a call ("Done / Resolved")
  const handleResolve = async (callId) => {
    const targetCall = calls.find((c) => c.id === callId);

    // Optimistic UI update
    setCalls((prev) => prev.filter((c) => c.id !== callId));
    if (targetCall) {
      setResolvedHistory((prev) => [
        { ...targetCall, status: 'resolved', resolvedAt: Date.now() },
        ...prev.slice(0, 49)
      ]);
    }
    setAcknowledgedMap((prev) => {
      const next = { ...prev };
      delete next[callId];
      return next;
    });

    // Also resolve in Restaurant Context
    if (restaurant?.resolveAssistanceCall) {
      restaurant.resolveAssistanceCall(targetCall?.tableNumber || targetCall?.table_number || callId);
    }

    // Broadcast resolve over Socket.IO immediately
    if (socket?.connected) {
      socket.emit('waiter:resolve', { id: callId });
    }

    // Resolve in Convex Cloud if available
    if (resolveConvexCall && typeof callId === 'string' && !String(callId).startsWith('call_')) {
      try {
        await resolveConvexCall({ callId });
      } catch (_) {}
    }

    // Resolve in backend DB
    try {
      const res = await fetch(`/api/waiter/calls/${callId}/resolve`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        // Try POST fallback
        await fetch(`/api/waiter/calls/${callId}/resolve`, {
          method: 'POST',
          headers: { Accept: 'application/json' }
        });
      }
    } catch (err) {
      console.warn('[EmployeeConsole] Resolve endpoint error:', err);
    }
  };

  // Reassign table to employee in the roster
  const handleReassignTable = (tableNumber, newEmployeeId) => {
    if (restaurant?.assignTableToEmployee) {
      restaurant.assignTableToEmployee(tableNumber, newEmployeeId);
    }
    setEmployeeRoster((prev) =>
      prev.map((emp) => {
        const hasTable = (emp.tables || []).includes(tableNumber);
        if (emp.id === newEmployeeId) {
          if (!hasTable) {
            return { ...emp, tables: [...(emp.tables || []), tableNumber].sort((a, b) => a - b) };
          }
          return emp;
        } else if (hasTable) {
          return { ...emp, tables: (emp.tables || []).filter((t) => t !== tableNumber) };
        }
        return emp;
      })
    );
  };

  // Calculate elapsed time & check if urgent (> 3 minutes / 180 seconds)
  const getCallMetrics = useCallback(
    (call) => {
      const createdTime = call.created_at ? new Date(call.created_at).getTime() : currentTime;
      const elapsedMs = Math.max(0, currentTime - createdTime);
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const remainingSeconds = elapsedSeconds % 60;

      // 3 minutes = 180 seconds
      const isUrgent = elapsedSeconds >= 180;

      let timeText = '';
      if (elapsedSeconds < 60) {
        timeText = `${elapsedSeconds}s ago`;
      } else if (elapsedMinutes < 60) {
        timeText = `${elapsedMinutes}m ${remainingSeconds}s ago`;
      } else {
        const hours = Math.floor(elapsedMinutes / 60);
        timeText = `${hours}h ${elapsedMinutes % 60}m ago`;
      }

      return {
        elapsedSeconds,
        elapsedMinutes,
        isUrgent,
        timeText
      };
    },
    [currentTime]
  );

  // Active user / employee filter details
  const activeEmployee = useMemo(() => {
    if (activeEmployeeFilter === 'all') return null;
    return employeeRoster.find((s) => s.id === activeEmployeeFilter) || null;
  }, [activeEmployeeFilter, employeeRoster]);

  // Filtered calls: supports targeted call routing and exclusive employee mode
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const table = String(call.table_number || call.tableNumber || call.table || '');
      const tableNum = Number(table);
      const reason = String(call.reason || '').toLowerCase();
      const customMsg = String(call.custom_message || '').toLowerCase();

      // Resolve effective assigned employee
      const overrideEmployeeId = callEmployeeOverrides[call.id];
      const defaultAssigned = getAssignedEmployeeForTable(tableNum);
      const effectiveEmployee = overrideEmployeeId
        ? employeeRoster.find((s) => s.id === overrideEmployeeId)
        : defaultAssigned;

      const employeeName = effectiveEmployee ? effectiveEmployee.name.toLowerCase() : '';

      // Search match
      const query = tableSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        table.includes(query) ||
        reason.includes(query) ||
        customMsg.includes(query) ||
        employeeName.includes(query);

      if (!matchesSearch) return false;

      const { isUrgent } = getCallMetrics(call);
      const isAck = !!acknowledgedMap[call.id];

      // Employee targeted routing & exclusive filtering
      if (activeEmployeeFilter !== 'all') {
        const isAssignedToActiveEmployee =
          effectiveEmployee && effectiveEmployee.id === activeEmployeeFilter;
        // In exclusive employee mode OR 'my-tables' tab, show EXCLUSIVELY calls for this employee's tables
        if ((activeTab === 'my-tables' || isExclusiveEmployeeMode) && !isAssignedToActiveEmployee) {
          return false;
        }
      }

      if (activeTab === 'urgent') return isUrgent;
      if (activeTab === 'acknowledged') return isAck;
      return true; // 'all' or 'my-tables'
    });
  }, [
    calls,
    tableSearch,
    activeTab,
    isExclusiveEmployeeMode,
    acknowledgedMap,
    callEmployeeOverrides,
    activeEmployeeFilter,
    getAssignedEmployeeForTable,
    employeeRoster,
    getCallMetrics
  ]);

  // Aggregate stats
  const stats = useMemo(() => {
    let urgentCount = 0;
    let acknowledgedCount = 0;
    let myAssignedCount = 0;
    let maxElapsed = 0;

    calls.forEach((c) => {
      const { isUrgent, elapsedSeconds } = getCallMetrics(c);
      if (isUrgent) urgentCount++;
      if (acknowledgedMap[c.id]) acknowledgedCount++;

      const tbl = Number(c.table_number || c.tableNumber || c.table);
      const overrideEmployeeId = callEmployeeOverrides[c.id];
      const assigned = overrideEmployeeId
        ? employeeRoster.find((s) => s.id === overrideEmployeeId)
        : getAssignedEmployeeForTable(tbl);

      if (activeEmployeeFilter !== 'all' && assigned?.id === activeEmployeeFilter) {
        myAssignedCount++;
      }

      if (elapsedSeconds > maxElapsed) maxElapsed = elapsedSeconds;
    });

    const maxWaitText =
      maxElapsed >= 60
        ? `${Math.floor(maxElapsed / 60)}m ${maxElapsed % 60}s`
        : `${maxElapsed}s`;

    return {
      total: calls.length,
      urgentCount,
      acknowledgedCount,
      myAssignedCount,
      maxWaitText: calls.length > 0 ? maxWaitText : '0s'
    };
  }, [
    calls,
    acknowledgedMap,
    callEmployeeOverrides,
    activeEmployeeFilter,
    employeeRoster,
    getAssignedEmployeeForTable,
    getCallMetrics
  ]);

  return (
    <div className="staff-root min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Branding & Role Identity */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-orange-500/20 transition-transform ${
                  isChimeAnimating ? 'scale-110 ring-4 ring-amber-400' : ''
                }`}
              >
                <BellRing
                  className={`w-5 h-5 text-neutral-950 ${
                    isChimeAnimating ? 'animate-wiggle text-white' : ''
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Floor Employee Console
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Employee Assistance Hub
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-medium">
                  Real-Time Table Dispatch &amp; Floor Service Requests
                </p>
              </div>
            </div>

            {/* Socket Status indicator for mobile */}
            <div className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 text-[11px] font-semibold border border-neutral-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-neutral-200">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          {/* Right: Employee Selector, Table Assignments, Audio & Controls */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {/* Active Employee Filter Selector */}
            <div className="relative inline-flex items-center">
              <label htmlFor="employee-filter-select" className="sr-only">
                Filter by Floor Employee
              </label>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:border-neutral-600">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  id="employee-filter-select"
                  aria-label="Filter by Floor Employee"
                  value={activeEmployeeFilter}
                  onChange={(e) => setActiveEmployeeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-neutral-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-neutral-800 text-neutral-100">
                    All Active Employees (Full Floor)
                  </option>
                  {employeeRoster.map((st) => (
                    <option
                      key={st.id}
                      value={st.id}
                      className="bg-neutral-800 text-neutral-100"
                    >
                      {st.name} (Tables {st.tables.join(', ') || 'None'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exclusive Mode Button when Employee is selected */}
            {activeEmployeeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setIsExclusiveEmployeeMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                  isExclusiveEmployeeMode
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
                title="Filter console exclusively for my assigned tables"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isExclusiveEmployeeMode ? 'Exclusive Mode: ON' : 'Exclusive Mode'}</span>
              </button>
            )}

            {/* Table Assignments Overview Button */}
            <button
              type="button"
              onClick={() => setIsAssignmentsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition active:scale-95 cursor-pointer"
              title="View and reassign table zones among floor employees"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Table Assignments</span>
            </button>

            {/* Desktop Socket Status Badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80'
                  : 'bg-rose-950/70 text-rose-300 border-rose-700/80 animate-pulse'
              }`}
              title={
                isConnected
                  ? 'Real-time WebSocket connected'
                  : 'Connecting to Socket.IO server'
              }
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Real-Time Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reconnecting...</span>
                </>
              )}
            </div>

            {/* Audio Chime Mute / Unmute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                isMuted
                  ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={
                isMuted
                  ? 'Audio chime is muted. Tap to enable chime alerts.'
                  : 'Audio chime is active. Tap to mute.'
              }
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chime Active</span>
                </>
              )}
            </button>

            {/* Test Calling Chime Button */}
            <button
              type="button"
              onClick={triggerChime}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition active:scale-95 cursor-pointer ${
                isChimeAnimating ? 'ring-2 ring-amber-400 text-amber-300' : ''
              }`}
              title="Test Web Audio desk calling chime"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Chime</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={fetchCalls}
              disabled={isLoading}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Refresh requests"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Incoming Alert Banner with Urgent Routed Alert Badge */}
      {bannerAlert && (
        <div
          className={`text-white px-4 py-2.5 shadow-xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-slide-up border-b ${
            bannerAlert.isTargetedToMe
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 border-emerald-400/40 ring-2 ring-emerald-400/30'
              : 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 border-white/20'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">🔔</span>
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/30 text-white font-black tracking-wide">
                  Table #{bannerAlert.tableNumber} requested assistance
                </span>
                <span className="text-white/90 font-bold">&rarr;</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/20 font-black text-amber-100 border border-white/30">
                  Routed to assigned employee: {bannerAlert.assignedTo}
                </span>
                {bannerAlert.reason && (
                  <span className="text-white/80 font-medium text-xs ml-1">
                    ({bannerAlert.reason})
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerAlert(null)}
              className="text-white hover:text-amber-200 px-2 py-0.5 rounded cursor-pointer font-black text-sm shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Floor KPI Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Active Requests */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-300 font-bold uppercase tracking-wider">
                Active Requests
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.total}
              </p>
            </div>
          </div>

          {/* Card 2: Urgent Calls (> 3m) */}
          <div
            className={`border rounded-2xl p-4 flex items-center gap-3.5 shadow-md transition-all ${
              stats.urgentCount > 0
                ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-100 animate-pulse'
                : 'bg-neutral-800 border border-neutral-700 text-neutral-300'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                stats.urgentCount > 0
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                  : 'bg-neutral-700 text-neutral-300'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                Urgent (&gt; 3 min)
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  stats.urgentCount > 0 ? 'text-rose-300' : 'text-neutral-200'
                }`}
              >
                {stats.urgentCount}
              </p>
            </div>
          </div>

          {/* Card 3: Being Attended */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-300 font-bold uppercase tracking-wider">
                In Progress
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.acknowledgedCount}
              </p>
            </div>
          </div>

          {/* Card 4: Max Wait Time */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-300 font-bold uppercase tracking-wider">
                Longest Wait
              </p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.maxWaitText}
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bar, Active Employee Scope & Table Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-800/80 p-2.5 rounded-2xl border border-neutral-700">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              All Requests ({calls.length})
            </button>

            {activeEmployeeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTab('my-tables')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'my-tables'
                    ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Assigned Tables ({stats.myAssignedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'urgent'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : stats.urgentCount > 0
                  ? 'bg-rose-950/80 text-rose-200 hover:bg-rose-900/80 border border-rose-700'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Urgent ({stats.urgentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('acknowledged')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                activeTab === 'acknowledged'
                  ? 'bg-sky-500 text-neutral-950 shadow-md shadow-sky-500/30'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              In Progress ({stats.acknowledgedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-neutral-100 text-neutral-950 shadow-md'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
              }`}
            >
              Resolved Today ({resolvedHistory.length})
            </button>
          </div>

          {/* Quick Table / Employee Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table, reason, employee..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Display: Calls Grid OR History List */}
        {activeTab === 'history' ? (
          /* RESOLVED HISTORY LIST */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-300">
                Recently Resolved Today ({resolvedHistory.length})
              </h2>
              {resolvedHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setResolvedHistory([])}
                  className="text-xs text-neutral-400 hover:text-neutral-200 underline cursor-pointer font-semibold"
                >
                  Clear History
                </button>
              )}
            </div>

            {resolvedHistory.length === 0 ? (
              <div className="text-center py-12 bg-neutral-800 border border-neutral-700 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-neutral-200 text-sm font-bold">
                  No resolved assistance requests yet this session.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {resolvedHistory.map((item) => {
                  const tbl = item.table_number || item.tableNumber || item.table;
                  const assigned = getAssignedEmployeeForTable(tbl);
                  return (
                    <div
                      key={'hist-' + item.id}
                      className="p-4 rounded-2xl bg-neutral-800 border border-neutral-700 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-neutral-700 text-white">
                          Table {tbl}
                        </span>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Resolved
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-100 mt-2 truncate">
                        {item.reason}
                      </p>
                      <div className="mt-2 pt-2 border-t border-neutral-700/60 flex items-center justify-between text-[11px] text-neutral-300">
                        <span>Employee: {assigned?.name || 'General Employee Pool'}</span>
                        <span className="text-neutral-400">Completed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CALLS GRID */
          <div>
            {filteredCalls.length === 0 ? (
              /* Calming Empty State */
              <div className="staff-empty text-center py-16 px-4 bg-neutral-800/60 border border-dashed border-neutral-700 rounded-3xl space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    All Tables Attended To!
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto mt-1">
                    No pending assistance requests right now. The employee console chime
                    will automatically sound when a guest calls for service.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-700 text-xs text-neutral-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Listening for guest assistance requests across assigned tables</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCalls.map((call) => {
                  const { isUrgent, timeText } = getCallMetrics(call);
                  const isAcknowledged = !!acknowledgedMap[call.id];
                  const ackInfo = acknowledgedMap[call.id];
                  const tableNum =
                    call.table_number || call.tableNumber || call.table || '?';

                  // Assigned employee determination
                  const overrideEmployeeId = callEmployeeOverrides[call.id];
                  const defaultEmployee = getAssignedEmployeeForTable(tableNum);
                  const effectiveEmployee = overrideEmployeeId
                    ? employeeRoster.find((s) => s.id === overrideEmployeeId)
                    : defaultEmployee;
                  const isAssignedToMe =
                    activeEmployeeFilter !== 'all' &&
                    effectiveEmployee?.id === activeEmployeeFilter;

                  // High-contrast, accessible card styling
                  let cardStyles =
                    'relative rounded-3xl p-5 border transition-all duration-300 shadow-xl flex flex-col justify-between ';

                  if (isUrgent) {
                    // Pulsing red urgent state (> 3 minutes)
                    cardStyles +=
                      'bg-rose-950/80 border-2 border-rose-500 ring-4 ring-rose-500/30 text-white animate-pulse';
                  } else if (isAcknowledged) {
                    // Acknowledged attending state
                    cardStyles +=
                      'bg-neutral-800 border-2 border-sky-500/80 ring-2 ring-sky-500/20 text-neutral-100';
                  } else {
                    // Normal active state
                    cardStyles +=
                      'bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-100';
                  }

                  return (
                    <div key={call.id} className={cardStyles}>
                      {/* Top Header inside Card */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {/* Table Badge & Zone info */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black px-3.5 py-1 rounded-2xl shadow-sm tracking-tight ${
                                isUrgent
                                  ? 'bg-rose-500 text-white shadow-rose-950/60'
                                  : 'bg-amber-500 text-neutral-950'
                              }`}
                            >
                              TABLE {tableNum}
                            </span>

                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white border border-rose-400 text-[10px] font-black uppercase tracking-wide">
                                <Flame className="w-3.5 h-3.5 text-white" />
                                <span>&gt; 3m Wait</span>
                              </span>
                            )}
                          </div>

                          {/* Time Elapsed Badge */}
                          <div
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                              isUrgent
                                ? 'bg-rose-900/90 text-rose-100 border-rose-600'
                                : 'bg-neutral-900 text-neutral-200 border-neutral-700'
                            }`}
                            title={`Call placed at ${call.created_at || 'unknown'}`}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{timeText}</span>
                          </div>
                        </div>

                        {/* Urgent Alert Badge with Route details */}
                        <div
                          className={`mb-3 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                            isUrgent
                              ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-sm animate-pulse'
                              : isAssignedToMe
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                              : 'bg-neutral-900/90 border-neutral-700/80 text-neutral-300'
                          }`}
                        >
                          {isUrgent ? (
                            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">
                            Table #{tableNum} requested assistance &rarr; Routed to assigned employee:{' '}
                            <strong className="text-white">
                              {effectiveEmployee?.name || 'Unassigned (General Pool)'}
                            </strong>
                          </span>
                        </div>

                        {/* Assigned Employee Tag / Quick Reassignment */}
                        <div className="flex items-center justify-between gap-2 mb-3 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-700/80 text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full bg-gradient-to-tr ${
                                effectiveEmployee?.color || 'from-neutral-600 to-neutral-700'
                              } flex items-center justify-center text-[10px] font-black text-white shrink-0`}
                            >
                              {effectiveEmployee?.initials || 'FE'}
                            </div>
                            <div className="truncate">
                              <span className="text-neutral-400 text-[10px] uppercase font-bold block leading-none">
                                Assigned Employee
                              </span>
                              <span className="text-white font-extrabold truncate">
                                {effectiveEmployee?.name || 'Unassigned (General Employee Pool)'}
                              </span>
                            </div>
                          </div>

                          {/* Quick Reassign Dropdown */}
                          <div className="relative">
                            <label htmlFor={`assign-select-${call.id}`} className="sr-only">
                              Assign Employee
                            </label>
                            <select
                              id={`assign-select-${call.id}`}
                              aria-label="Assign Employee"
                              value={effectiveEmployee?.id || ''}
                              onChange={(e) => handleAssignCall(call.id, e.target.value)}
                              className="bg-neutral-800 text-[11px] font-bold text-neutral-200 border border-neutral-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                            >
                              <option value="" disabled className="bg-neutral-800 text-neutral-300">
                                Reassign Employee...
                              </option>
                              {employeeRoster.map((st) => (
                                <option
                                  key={st.id}
                                  value={st.id}
                                  className="bg-neutral-800 text-neutral-100"
                                >
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Request Reason & Customer Notes */}
                        <div className="my-3 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80">
                          <p className="text-[11px] uppercase font-extrabold tracking-wider text-neutral-400 mb-1">
                            Requested Service
                          </p>
                          <p className="text-base font-black text-white leading-snug">
                            {call.reason || 'Floor Employee Assistance'}
                          </p>
                          {call.custom_message && (
                            <p className="mt-2 text-xs text-neutral-200 bg-neutral-800 border border-neutral-700 p-2.5 rounded-xl font-medium">
                              "{call.custom_message}"
                            </p>
                          )}
                        </div>

                        {/* Acknowledged Status Pill */}
                        {isAcknowledged && (
                          <div className="mb-3 px-3 py-1.5 rounded-xl bg-sky-950 border border-sky-400/60 text-sky-200 text-xs font-bold flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>
                              Attending:{' '}
                              <strong className="text-white">
                                {ackInfo?.staffName || 'Floor Employee'}
                              </strong>{' '}
                              is assisting this table
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Acknowledge & Done / Resolved */}
                      <div className="pt-3 border-t border-neutral-700/80 flex items-center gap-2">
                        {/* Acknowledge Button */}
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(call)}
                          disabled={isAcknowledged}
                          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                            isAcknowledged
                              ? 'bg-sky-950 text-sky-300 border border-sky-600/60'
                              : 'bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600'
                          }`}
                        >
                          {isAcknowledged ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-sky-400" />
                              <span>Attending</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                              <span>Acknowledge</span>
                            </>
                          )}
                        </button>

                        {/* Done / Resolved Button */}
                        <button
                          type="button"
                          onClick={() => handleResolve(call.id)}
                          className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Done / Resolved</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Table Assignments Management Modal */}
      {isAssignmentsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  Floor Table Assignments Matrix
                </h3>
                <p className="text-xs text-neutral-400">
                  Assign tables to dedicated floor employees for instant dispatch
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Table Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayTables.map((tblNum) => {
                const assigned = getAssignedEmployeeForTable(tblNum);
                const hasActiveCall = calls.some(
                  (c) =>
                    Number(c.table_number || c.tableNumber || c.table) === tblNum
                );

                return (
                  <div
                    key={'assign-tbl-' + tblNum}
                    className="p-3.5 rounded-2xl bg-neutral-800 border border-neutral-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">
                        Table {tblNum}
                      </span>
                      {hasActiveCall ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div>
                      <label htmlFor={`modal-assign-table-${tblNum}`} className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">
                        Assigned Employee
                      </label>
                      <select
                        id={`modal-assign-table-${tblNum}`}
                        aria-label={`Assigned Employee for Table ${tblNum}`}
                        value={assigned?.id || ''}
                        onChange={(e) => handleReassignTable(tblNum, e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="" disabled className="bg-neutral-900 text-neutral-400">
                          Select employee...
                        </option>
                        {employeeRoster.map((st) => (
                          <option
                            key={st.id}
                            value={st.id}
                            className="bg-neutral-900 text-neutral-100"
                          >
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAssignmentsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <footer className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span>Floor Employee Console &bull; Employee Assistance Hub &bull; Offline-First</span>
          </div>

          {/* Quick links to sister modules */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Customer View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/kds"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Kitchen Display (KDS)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/admin"
              className="text-neutral-400 hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <span>Admin Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
