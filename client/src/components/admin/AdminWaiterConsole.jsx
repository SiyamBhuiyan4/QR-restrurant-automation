import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  User,
  ConciergeBell,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  X,
  Phone,
  Mail,
  Flame,
  BadgeAlert
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useSocket, useSocketListener } from '../../context/SocketContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convexApi';
import TableSecurityModal, { TableSecurityModal as PasscodeConfirmDialog } from './TableSecurityModal';

/**
 * Format relative elapsed time
 */
function formatCallTime(timestamp, currentTime) {
  const created = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp) || currentTime;
  const elapsed = Math.max(0, Math.floor((currentTime - created) / 1000));

  if (elapsed < 15) return 'Just now';
  if (elapsed < 60) return `${elapsed}s ago`;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  if (mins < 60) {
    return `${mins}m ${secs}s ago`;
  }
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

/**
 * Generate a random 4-digit PIN
 */
function generateRandomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function AdminWaiterConsole({ currentEmployee = null, isEmployeeMode = false }) {
  const restaurant = useRestaurant();
  const { socket } = useSocket();

  // Active Tab: 'all' = All Waiters Overview, or employee.id = Specific Waiter Console
  const [selectedWaiterId, setSelectedWaiterId] = useState('all');

  // Live Timer for relative times
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Password Visibility map { [waiterId]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // Modal State for Add / Edit Waiter
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    username: '',
    password: '',
    assignedTables: []
  });

  // Direct Message Modal / Nudge State
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [modalMessageType, setModalMessageType] = useState('normal'); // 'normal' | 'alert'
  const [inlineMessage, setInlineMessage] = useState('');
  const [inlineMessageType, setInlineMessageType] = useState('normal'); // 'normal' | 'alert'
  const [toastMessage, setToastMessage] = useState(null);

  // Convex mutations if available
  let resolveConvexCall = null;
  try {
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Employees List
  const employees = useMemo(() => {
    if (restaurant?.employees && Array.isArray(restaurant.employees)) {
      return restaurant.employees;
    }
    return [];
  }, [restaurant?.employees]);

  // Active Assistance Calls (Merged Context & localStorage)
  const calls = useMemo(() => {
    const map = new Map();

    if (restaurant?.assistanceCalls && Array.isArray(restaurant.assistanceCalls)) {
      restaurant.assistanceCalls.forEach(c => {
        if (!c) return;
        const callId = String(c.id || c._id || `tbl_${c.table_number || c.tableNumber || c.table}`);
        map.set(callId, c);
      });
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('smartdine_active_assistance_calls');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(c => {
              if (!c) return;
              const callId = String(c.id || c._id || `tbl_${c.table_number || c.tableNumber || c.table}`);
              if (!map.has(callId)) map.set(callId, c);
            });
          }
        }
      } catch (_) {}
    }

    return Array.from(map.values()).filter(c => c && c.status !== 'resolved');
  }, [restaurant?.assistanceCalls]);

  // Venue Tables Count
  const totalTablesCount = restaurant?.tableCount || (restaurant?.tables?.length ?? 12);
  const allTableNumbers = useMemo(() => {
    return Array.from({ length: totalTablesCount }, (_, i) => i + 1);
  }, [totalTablesCount]);

  // Filter floor staff / waiters
  const waiters = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      // Include floor staff, waiters, hosts, or everyone if list is small
      return (
        r.includes('waiter') ||
        r.includes('floor') ||
        r.includes('host') ||
        r.includes('server') ||
        r.includes('specialist') ||
        employees.length <= 10
      );
    });
  }, [employees]);

  // Currently selected waiter for detail view
  const activeWaiter = useMemo(() => {
    if (selectedWaiterId === 'all') return null;
    return employees.find(
      e => e.id === selectedWaiterId || String(e.numericId) === String(selectedWaiterId)
    );
  }, [selectedWaiterId, employees]);

  // Filter staff messages for active waiter
  const waiterStaffMessages = useMemo(() => {
    if (!activeWaiter || !restaurant?.staffMessages || !Array.isArray(restaurant.staffMessages)) {
      return [];
    }
    const empId = activeWaiter.id;
    const numId = String(activeWaiter.numericId);
    const user = (activeWaiter.username || '').toLowerCase();

    return restaurant.staffMessages.filter(
      m =>
        m.toWaiterId === empId ||
        String(m.toWaiterId) === numId ||
        (m.toWaiterId && m.toWaiterId.toLowerCase() === user)
    );
  }, [activeWaiter, restaurant?.staffMessages]);

  // Helper: Get calls for a specific waiter's assigned tables
  const getCallsForWaiter = useCallback((waiter) => {
    if (!waiter) return [];
    const assigned = (waiter.assignedTables || waiter.tables || []).map(Number);
    return calls.filter(call => {
      const tbl = Number(call.table_number || call.tableNumber || call.table);
      return assigned.includes(tbl);
    });
  }, [calls]);

  // Active calls for currently selected waiter
  const selectedWaiterCalls = useMemo(() => {
    if (!activeWaiter) return [];
    return getCallsForWaiter(activeWaiter);
  }, [activeWaiter, getCallsForWaiter]);

  // Copy helper
  const handleCopy = (text, key) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast(`Copied ${text} to clipboard!`, 'info');
    }
  };

  // Toggle Password visibility
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Resolve Call Handler (Admin Direct Resolution)
  const handleResolveCall = async (callId, tableNum) => {
    const finalTable = Number(tableNum);

    // 1. Resolve via RestaurantContext (broadcasts state across tabs)
    if (restaurant?.resolveAssistanceCall) {
      restaurant.resolveAssistanceCall(finalTable || callId);
    }

    // 2. Broadcast via Socket.IO
    if (socket?.connected) {
      socket.emit('waiter:resolve', { id: callId, table: finalTable });
    }

    // 3. Resolve via Convex Cloud
    if (resolveConvexCall && typeof callId === 'string' && !callId.startsWith('call_')) {
      try {
        await resolveConvexCall({ callId });
      } catch (_) {}
    }

    // 4. Update backend REST API
    fetch(`/api/waiter/calls/${callId}/resolve`, { method: 'PATCH' }).catch(() => {});

    showToast(`Table ${finalTable || ''} call marked as resolved venue-wide.`, 'success');
  };

  // Open Modal to Add Waiter
  const handleOpenAddModal = () => {
    const nextNum = employees.length + 1;
    const defaultUser = `waiter${nextNum}`;
    const defaultPin = generateRandomPin();

    setEditingEmployee(null);
    setFormData({
      name: '',
      role: 'Floor Specialist',
      shift: 'Morning Shift (08:00 - 16:00)',
      username: defaultUser,
      password: defaultPin,
      assignedTables: []
    });
    setShowModalPassword(true);
    setIsModalOpen(true);
  };

  // Open Modal to Edit Waiter
  const handleOpenEditModal = (waiter) => {
    setEditingEmployee(waiter);
    setFormData({
      name: waiter.name || '',
      role: waiter.role || 'Floor Specialist',
      shift: waiter.shift || 'Morning Shift (08:00 - 16:00)',
      username: waiter.username || waiter.accountCode?.toLowerCase() || '',
      password: waiter.password || waiter.passcode || waiter.waiterPin || '1234',
      assignedTables: (waiter.assignedTables || waiter.tables || []).map(Number)
    });
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  // Save Add/Edit Form
  const handleSaveEmployee = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Please enter waiter full name', 'error');
      return;
    }
    if (!formData.username.trim()) {
      showToast('Please set a login username', 'error');
      return;
    }
    if (!formData.password.trim()) {
      showToast('Please set a login password', 'error');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanPassword = formData.password.trim();
    const cleanTables = formData.assignedTables.map(Number).sort((a, b) => a - b);

    if (editingEmployee) {
      // Edit existing employee
      if (restaurant?.setEmployees) {
        restaurant.setEmployees(prev =>
          prev.map(emp => {
            if (emp.id === editingEmployee.id || String(emp.numericId) === String(editingEmployee.numericId)) {
              return {
                ...emp,
                name: formData.name.trim(),
                role: formData.role,
                shift: formData.shift,
                username: cleanUsername,
                password: cleanPassword,
                accountCode: cleanUsername.toUpperCase(),
                waiterCode: cleanUsername.toUpperCase(),
                passcode: cleanPassword,
                pin: cleanPassword,
                waiterPin: cleanPassword,
                assignedTables: cleanTables
              };
            }
            // Remove reassigned tables from other employees
            if (Array.isArray(emp.assignedTables)) {
              return {
                ...emp,
                assignedTables: emp.assignedTables.filter(t => !cleanTables.includes(Number(t)))
              };
            }
            return emp;
          })
        );
      }

      // Update table assignments in tables state
      if (restaurant?.assignTableToEmployee) {
        cleanTables.forEach(tNum => {
          restaurant.assignTableToEmployee(tNum, editingEmployee.id);
        });
      }

      showToast(`Updated credentials & tables for ${formData.name}`, 'success');
    } else {
      // Hire new employee
      if (restaurant?.hireEmployee) {
        const created = restaurant.hireEmployee({
          name: formData.name.trim(),
          role: formData.role,
          shift: formData.shift,
          username: cleanUsername,
          password: cleanPassword,
          accountCode: cleanUsername.toUpperCase(),
          passcode: cleanPassword,
          assignedTables: cleanTables
        });

        if (created?.id && restaurant?.assignTableToEmployee) {
          cleanTables.forEach(tNum => {
            restaurant.assignTableToEmployee(tNum, created.id);
          });
        }
      }

      showToast(`Added waiter ${formData.name}! Credentials: ${cleanUsername} / ${cleanPassword}`, 'success');
    }

    setIsModalOpen(false);
  };

  // Security Confirmation Modal State (Requires Admin PIN 808080)
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionTitle: '',
    actionDescription: '',
    actionNotice: '',
    pendingAction: null
  });

  // Delete Waiter Handler
  const handleDeleteWaiter = (waiterId, waiterName) => {
    if (restaurant?.removeEmployee) {
      restaurant.removeEmployee(waiterId);
      showToast(`Removed ${waiterName}`, 'info');
      if (selectedWaiterId === waiterId) {
        setSelectedWaiterId('all');
      }
    }
  };

  const requestDeleteWaiter = (waiterId, waiterName) => {
    setSecurityModalState({
      isOpen: true,
      actionTitle: `Authorize Delete Waiter • ${waiterName}`,
      actionDescription: `Permanently delete waiter account for ${waiterName} from the roster.`,
      actionNotice: 'Admin PIN verification (808080) required to delete staff.',
      pendingAction: () => {
        setIsModalOpen(false);
        handleDeleteWaiter(waiterId, waiterName);
      }
    });
  };

  // Send Direct Message / Nudge to Waiter
  const handleSendNudge = (waiter) => {
    setMessageTarget(waiter);
    setMessageText('');
    setModalMessageType('normal');
  };

  const handleDispatchMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !messageTarget) return;

    const isAlert = modalMessageType === 'alert';
    const senderFrom = isEmployeeMode ? 'Employee' : 'Admin';
    const senderName = isEmployeeMode && currentEmployee?.name ? currentEmployee.name : 'Head Desk / Admin';
    const senderRole = isEmployeeMode && currentEmployee?.role ? currentEmployee.role : 'Admin';
    const senderEmpId = isEmployeeMode && currentEmployee?.id ? currentEmployee.id : 'admin';
    const senderStaffId = isEmployeeMode && (currentEmployee?.staffId || currentEmployee?.numericId || currentEmployee?.accountCode)
      ? String(currentEmployee.staffId || currentEmployee.numericId || currentEmployee.accountCode)
      : 'ADMIN';

    if (restaurant?.sendStaffMessage) {
      restaurant.sendStaffMessage(messageTarget.id, messageText.trim(), {
        urgent: isAlert,
        isAlert: isAlert,
        category: isAlert ? 'alert' : 'normal',
        from: senderFrom,
        fromName: senderName,
        fromRole: senderRole,
        fromEmployeeId: senderEmpId,
        fromStaffId: senderStaffId
      });
    }

    // Send via socket
    if (socket?.connected) {
      socket.emit('waiter:admin_nudge', {
        waiterId: messageTarget.id,
        waiterName: messageTarget.name,
        message: messageText.trim(),
        isAlert: isAlert,
        category: isAlert ? 'alert' : 'normal',
        from: senderFrom,
        fromName: senderName,
        fromRole: senderRole,
        fromEmployeeId: senderEmpId,
        fromStaffId: senderStaffId,
        timestamp: Date.now()
      });
    }

    showToast(
      isAlert
        ? `🚨 Urgent Alert dispatched to ${messageTarget.name}'s phone!`
        : `💬 Text instruction dispatched to ${messageTarget.name}'s phone!`,
      isAlert ? 'warning' : 'success'
    );
    setMessageTarget(null);
    setMessageText('');
    setModalMessageType('normal');
  };

  const handleSendInlineMessage = (e) => {
    e.preventDefault();
    if (!inlineMessage.trim() || !activeWaiter) return;

    const isAlert = inlineMessageType === 'alert';
    const senderFrom = isEmployeeMode ? 'Employee' : 'Admin';
    const senderName = isEmployeeMode && currentEmployee?.name ? currentEmployee.name : 'Head Desk / Admin';
    const senderRole = isEmployeeMode && currentEmployee?.role ? currentEmployee.role : 'Admin';
    const senderEmpId = isEmployeeMode && currentEmployee?.id ? currentEmployee.id : 'admin';
    const senderStaffId = isEmployeeMode && (currentEmployee?.staffId || currentEmployee?.numericId || currentEmployee?.accountCode)
      ? String(currentEmployee.staffId || currentEmployee.numericId || currentEmployee.accountCode)
      : 'ADMIN';

    if (restaurant?.sendStaffMessage) {
      restaurant.sendStaffMessage(activeWaiter.id, inlineMessage.trim(), {
        urgent: isAlert,
        isAlert: isAlert,
        category: isAlert ? 'alert' : 'normal',
        from: senderFrom,
        fromName: senderName,
        fromRole: senderRole,
        fromEmployeeId: senderEmpId,
        fromStaffId: senderStaffId
      });
    }

    if (socket?.connected) {
      socket.emit('waiter:admin_nudge', {
        waiterId: activeWaiter.id,
        waiterName: activeWaiter.name,
        message: inlineMessage.trim(),
        isAlert: isAlert,
        category: isAlert ? 'alert' : 'normal',
        from: senderFrom,
        fromName: senderName,
        fromRole: senderRole,
        fromEmployeeId: senderEmpId,
        fromStaffId: senderStaffId,
        timestamp: Date.now()
      });
    }

    showToast(
      isAlert
        ? `🚨 Urgent Alert dispatched to ${activeWaiter.name}'s phone!`
        : `💬 Text instruction sent to ${activeWaiter.name}!`,
      isAlert ? 'warning' : 'success'
    );
    setInlineMessage('');
  };

  return (
    <div className="bg-[#080B10] text-slate-100 min-h-[600px] flex flex-col font-sans select-none antialiased">
      {/* =======================================================================
          TOP BAR: GOD-MODE CONSOLE HEADER
          ======================================================================= */}
      <div className="p-5 sm:p-6 bg-slate-900/95 border-b border-white/[0.08] backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <ConciergeBell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>On-Field Waiter Console</span>
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isEmployeeMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isEmployeeMode ? 'Kitchen Hub Dispatch' : 'Admin God-Mode'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEmployeeMode
                    ? `Kitchen & Staff console active for ${currentEmployee?.name || 'Staff'}. Real-time waiter oversight & pass dispatch.`
                    : 'Live God-mode oversight across all floor waiters, table custody, and customer assistance calls. Zero login required.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Synced Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Synced</span>
            </div>

            {/* Total Waiters Count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/[0.08] text-slate-300 text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{waiters.length} Waiters Roster</span>
            </div>

            {/* Active Calls Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              calls.length > 0
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-slate-800 border-white/[0.08] text-slate-400'
            }`}>
              <ConciergeBell className="w-3.5 h-3.5 text-rose-400" />
              <span>{calls.length} Active {calls.length === 1 ? 'Call' : 'Calls'}</span>
            </div>

            {/* Quick Link to open /waiter */}
            <a
              href="/waiter"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/[0.08] text-amber-400 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              title="Open the standalone waiter login page in a new window"
            >
              <span>Open /waiter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* =====================================================================
            HORIZONTAL TABS (LIVE WAITER SWITCHER & MONITOR)
            [ All Waiters Overview ] [ Rakib Ahmed (T1, T2, T3) ] [ Hasan Mahmud (T4, T5, T6) ] ... [ + Add Waiter ]
            ===================================================================== */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Tab 1: All Waiters Overview */}
          <button
            type="button"
            onClick={() => setSelectedWaiterId('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
              selectedWaiterId === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/[0.06] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Waiters Overview</span>
            {calls.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                selectedWaiterId === 'all' ? 'bg-slate-950 text-amber-400' : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {calls.length}
              </span>
            )}
          </button>

          {/* Waiter Tabs */}
          {waiters.map(waiter => {
            const isSelected = selectedWaiterId === waiter.id || String(selectedWaiterId) === String(waiter.numericId);
            const waiterCalls = getCallsForWaiter(waiter);
            const tablesSummary = (waiter.assignedTables || waiter.tables || [])
              .map(t => `T${t}`)
              .join(', ');

            return (
              <button
                key={waiter.id}
                type="button"
                onClick={() => setSelectedWaiterId(waiter.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/[0.06] hover:text-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-200'
                }`}>
                  {waiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <span>{waiter.name}</span>
                <span className={`text-[10px] font-bold opacity-80 ${
                  isSelected ? 'text-slate-950' : 'text-slate-400'
                }`}>
                  ({tablesSummary || 'No Tbls'})
                </span>
                {waiterCalls.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black animate-pulse ${
                    isSelected ? 'bg-slate-950 text-rose-400' : 'bg-rose-500 text-white'
                  }`}>
                    🚨 {waiterCalls.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Tab: + Add Waiter */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black transition shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Waiter</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2.5 ${
            toastMessage.type === 'error'
              ? 'bg-rose-500 text-white shadow-rose-500/30'
              : toastMessage.type === 'info'
              ? 'bg-blue-600 text-white shadow-blue-500/30'
              : 'bg-emerald-600 text-white shadow-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW 1: ALL WAITERS OVERVIEW (selectedWaiterId === 'all')
          ======================================================================= */}
      {selectedWaiterId === 'all' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Quick Notice Banner */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Full Waiter Fleet Overview (God-Mode)
                </h3>
                <p className="text-xs text-slate-400">
                  Click on any waiter's tab or card to view their personal live console, or give them their Username & Password to log in on their mobile phone.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Waiter Account</span>
            </button>
          </div>

          {/* Waiters Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {waiters.map(waiter => {
              const waiterCalls = getCallsForWaiter(waiter);
              const assignedTables = (waiter.assignedTables || waiter.tables || []).map(Number).sort((a, b) => a - b);
              const username = waiter.username || waiter.accountCode?.toLowerCase() || 'waiter';

              return (
                <div
                  key={waiter.id}
                  className={`p-5 rounded-3xl border transition shadow-xl flex flex-col justify-between ${
                    waiterCalls.length > 0
                      ? 'bg-slate-900/90 border-amber-500/40'
                      : 'bg-slate-900/90 border-white/[0.08] hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Waiter Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                          {waiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-2">
                            <span>{waiter.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/[0.06]">
                              {waiter.staffId || waiter.accountCode || `WAIT-${waiter.numericId || '101'}`}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            {waiter.role || 'Floor Specialist'} &bull; {waiter.shift || 'Morning Shift'}
                          </p>
                        </div>
                      </div>

                      {/* Edit Action */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(waiter)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Edit waiter details & credentials"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Waiter Login Credentials Box (For Admin Reference) */}
                    <div className="p-3 rounded-2xl bg-[#0B0F19] border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1 text-amber-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Mobile Login Credentials</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Use at /waiter</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {/* Username */}
                        <div className="p-2 rounded-xl bg-slate-900 border border-white/[0.06] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-sans">Username</span>
                            <span className="font-bold text-amber-400">{username}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(username, `user-${waiter.id}`)}
                            className="text-slate-400 hover:text-white p-1"
                            title="Copy Username"
                          >
                            {copiedKey === `user-${waiter.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Password */}
                        <div className="p-2 rounded-xl bg-slate-900 border border-white/[0.06] flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-bold uppercase text-slate-500">Password</p>
                            <p className="text-slate-500 tracking-widest">••••••••</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Tables */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Assigned Tables</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {assignedTables.length} Tables
                        </span>
                      </div>

                      {assignedTables.length === 0 ? (
                        <div className="py-2 px-3 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-xs text-slate-400">
                          No tables currently assigned.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedTables.map(tblNum => {
                            const isCalling = waiterCalls.some(
                              c => Number(c.table_number || c.tableNumber || c.table) === tblNum
                            );
                            return (
                              <span
                                key={`badge-${waiter.id}-${tblNum}`}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                  isCalling
                                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                                    : 'bg-slate-800 text-slate-200 border border-white/[0.06]'
                                }`}
                              >
                                <span>T{tblNum}</span>
                                {isCalling && <ConciergeBell className="w-3 h-3 animate-ping" />}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Live Assistance Calls for this waiter */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <ConciergeBell className="w-3.5 h-3.5 text-rose-400" />
                          <span>Live Customer Calls</span>
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.2 rounded-full ${
                          waiterCalls.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {waiterCalls.length} Pending
                        </span>
                      </div>

                      {waiterCalls.length === 0 ? (
                        <div className="py-2.5 px-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>All assigned tables peaceful</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {waiterCalls.map(call => {
                            const callId = call.id || call._id || `c-${Math.random()}`;
                            const tbl = Number(call.table_number || call.tableNumber || call.table);
                            const reason = call.reason || 'Assistance requested';
                            const msg = call.custom_message || call.message || call.note;

                            return (
                              <div
                                key={callId}
                                className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 space-y-2 shadow-inner"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-rose-200 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                                    <span>TABLE {tbl}</span>
                                  </span>
                                  <span className="text-[10px] text-rose-300 font-mono">
                                    {formatCallTime(call.created_at || call.createdAt, currentTime)}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-white line-clamp-1">{reason}</p>
                                {msg && (
                                  <p className="text-[11px] text-rose-200/80 italic line-clamp-2 bg-rose-900/30 p-1.5 rounded-lg border border-rose-500/20">
                                    "{msg}"
                                  </p>
                                )}

                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleResolveCall(callId, tbl)}
                                    className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition active:scale-95 cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                    <span>Resolve Call</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendNudge(waiter)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Text Waiter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedWaiterId(waiter.id)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                    >
                      <span>Open Live Console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Venue-Wide Customer Calls Feed */}
          {calls.length > 0 && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <ConciergeBell className="w-4 h-4 animate-bounce" />
                  </div>
                  <h3 className="text-sm font-black text-white">
                    Live Venue-Wide Assistance Calls Feed ({calls.length})
                  </h3>
                </div>
                <span className="text-xs text-rose-400 font-bold">
                  Instant Floor Dispatch
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {calls.map(call => {
                  const callId = call.id || call._id || `c-${Math.random()}`;
                  const tbl = Number(call.table_number || call.tableNumber || call.table);
                  const reason = call.reason || 'Assistance requested';
                  const msg = call.custom_message || call.message || call.note;

                  // Find assigned waiter
                  const assignedEmp = waiters.find(w =>
                    (w.assignedTables || w.tables || []).map(Number).includes(tbl)
                  );

                  return (
                    <div
                      key={`global-call-${callId}`}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/40 space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500 text-white text-xs font-black flex items-center gap-1.5">
                          <ConciergeBell className="w-3.5 h-3.5" />
                          <span>TABLE {tbl}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatCallTime(call.created_at || call.createdAt, currentTime)}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white">{reason}</h4>
                        {msg && (
                          <p className="text-xs text-slate-300 italic bg-slate-900 p-2 rounded-xl border border-white/[0.06] mt-1">
                            "{msg}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                        <span className="text-slate-400">
                          Assigned: <strong className="text-amber-400 font-bold">{assignedEmp ? assignedEmp.name : 'Unassigned'}</strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleResolveCall(callId, tbl)}
                          className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" strokeWidth={3} />
                          <span>Resolve</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VIEW 2: SPECIFIC WAITER LIVE PERSONAL CONSOLE (selectedWaiterId !== 'all')
          Admin can watch everything live for this waiter without any login!
          ======================================================================= */}
      {selectedWaiterId !== 'all' && activeWaiter && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Back button & Waiter Profile Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWaiterId('all')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Return to fleet overview"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-base flex items-center justify-center shrink-0 shadow-lg">
                {activeWaiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">
                    {activeWaiter.name}
                  </h2>
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Console (God-Mode)
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {activeWaiter.role || 'Floor Specialist'} &bull; Staff ID: {activeWaiter.staffId || activeWaiter.accountCode || `WAIT-${activeWaiter.numericId || '101'}`}
                </p>
              </div>
            </div>

            {/* Quick Actions & Credentials */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Credentials chip */}
              <div className="px-3 py-1.5 rounded-xl bg-[#0B0F19] border border-amber-500/30 text-xs font-mono text-slate-300 flex items-center gap-2">
                <span className="text-amber-400 font-bold">User:</span>
                <span>{activeWaiter.username || activeWaiter.accountCode?.toLowerCase() || 'waiter'}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold">Pass:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => handleOpenEditModal(activeWaiter)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Tables/Login</span>
              </button>

              {/* Nudge Button */}
              <button
                type="button"
                onClick={() => handleSendNudge(activeWaiter)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Nudge Phone</span>
              </button>
            </div>
          </div>

          {/* Assigned Tables Section */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white">
                  Tables Assigned to {activeWaiter.name}
                </h3>
              </div>

              <span className="text-xs text-amber-400 font-bold">
                {(activeWaiter.assignedTables || activeWaiter.tables || []).length} Tables Total
              </span>
            </div>

            {(!activeWaiter.assignedTables || activeWaiter.assignedTables.length === 0) ? (
              <div className="py-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                No tables assigned yet to this waiter. Use "Edit Tables/Login" above to assign tables.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {(activeWaiter.assignedTables || activeWaiter.tables || []).map(Number).sort((a, b) => a - b).map(tblNum => {
                  const isCalling = selectedWaiterCalls.some(
                    c => Number(c.table_number || c.tableNumber || c.table) === tblNum
                  );

                  return (
                    <div
                      key={`active-waiter-tbl-${tblNum}`}
                      className={`px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-black transition flex items-center gap-2 ${
                        isCalling
                          ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/30 animate-pulse'
                          : 'bg-[#0B0F19] border-white/[0.07] text-slate-200'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isCalling ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                      }`} />
                      <span>Table {tblNum}</span>
                      {isCalling && (
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">
                          Calling
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Calls List for this Waiter */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ConciergeBell className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  Live Customer Calls ({selectedWaiterCalls.length})
                </h3>
              </div>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                selectedWaiterCalls.length > 0 ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {selectedWaiterCalls.length > 0 ? `${selectedWaiterCalls.length} Calling Now` : 'All Peaceful'}
              </span>
            </div>

            {selectedWaiterCalls.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-white">
                  All assigned tables peaceful
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When a customer at {activeWaiter.name}'s tables calls for assistance, the alert card will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedWaiterCalls.map(call => {
                  const callId = call.id || call._id || `c-${Math.random()}`;
                  const tbl = Number(call.table_number || call.tableNumber || call.table);
                  const reason = call.reason || 'Assistance requested';
                  const msg = call.custom_message || call.message || call.note;

                  return (
                    <div
                      key={`personal-call-${callId}`}
                      className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border-2 border-rose-500/80 shadow-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-400 animate-ping" />
                          <h4 className="text-base font-black text-white tracking-wide">
                            TABLE {tbl}
                          </h4>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white">
                            Active Call
                          </span>
                        </div>

                        <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatCallTime(call.created_at || call.createdAt, currentTime)}</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-100">{reason}</p>
                        {msg && (
                          <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] text-xs text-slate-200 italic">
                            "{msg}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                        <span className="text-xs text-slate-400">
                          Waiter Phone Alert: <span className="text-emerald-400 font-bold">Ring &amp; Vibration Active</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleResolveCall(callId, tbl)}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4 text-slate-950" strokeWidth={3} />
                          <span>Mark as Resolved</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Text Dispatch & Live Chat Section */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Direct Text Dispatch to {activeWaiter.name}'s Phone
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Text instructions appear instantly on {activeWaiter.name}'s mobile screen with sound &amp; vibration alert.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400">
                {waiterStaffMessages.length} {waiterStaffMessages.length === 1 ? 'Message' : 'Messages'}
              </span>
            </div>

            {/* Messages Feed */}
            {waiterStaffMessages.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                No active text instructions sent to {activeWaiter.name} yet. Type a message below to dispatch!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {waiterStaffMessages.map(msg => {
                  const isAlert = msg.isAlert || msg.category === 'alert';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isAlert
                          ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30'
                          : msg.status === 'acknowledged'
                            ? 'bg-emerald-950/30 border-emerald-500/30'
                            : 'bg-[#0B0F19] border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black flex items-center gap-1.5 ${
                          isAlert ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {isAlert ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> : <MessageSquare className="w-3.5 h-3.5" />}
                          <span>{isAlert ? '🚨 Urgent Call Alert / Reminder' : '💬 Normal Text Instruction'}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatCallTime(msg.timestamp, currentTime)}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            msg.status === 'acknowledged'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isAlert
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}>
                            {msg.status === 'acknowledged' ? '✓ Acknowledged by Waiter' : 'Pending Acknowledgment'}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs font-semibold mt-1.5 ${isAlert ? 'text-rose-100 font-bold' : 'text-white'}`}>
                        "{msg.text}"
                      </p>

                      {/* Waiter Replies */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1">
                          {msg.replies.map((rep, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[11px] text-emerald-300">
                              <span className="font-bold">↳ {activeWaiter.name}:</span>
                              <span className="italic">"{rep.text}"</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Message Type Selector: Normal vs Urgent Alert */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setInlineMessageType('normal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    inlineMessageType === 'normal'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 Normal Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInlineMessageType('alert')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    inlineMessageType === 'alert'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>🚨 Urgent Call Alert</span>
                </button>
              </div>

              {inlineMessageType === 'alert' && (
                <span className="text-[11px] font-semibold text-rose-400 animate-pulse flex items-center gap-1">
                  <span>⚡ Phone will vibrate &amp; bounce badge on waiter's screen</span>
                </span>
              )}
            </div>

            {/* Quick Chips when in Alert mode (e.g. for forgotten calls) */}
            {inlineMessageType === 'alert' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Alerts:</span>
                {selectedWaiterCalls.map(c => {
                  const t = c.table_number || c.tableNumber || c.table;
                  return (
                    <button
                      key={c.id || t}
                      type="button"
                      onClick={() => setInlineMessage(`Table ${t} call waiter korse, tumi jaoni keno? Taratari jao!`)}
                      className="px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      🚨 Table {t} Waiter Forgotten Call!
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setInlineMessage('Customer assistance call pending! Please attend immediately.')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
                >
                  ⚠️ Assistance Call Pending
                </button>
                <button
                  type="button"
                  onClick={() => setInlineMessage('Customer table e wait kortese, check koro taratari.')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
                >
                  🏃 Customer Waiting
                </button>
              </div>
            )}

            {/* Quick Send Input Form */}
            <form onSubmit={handleSendInlineMessage} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                required
                placeholder={
                  inlineMessageType === 'alert'
                    ? `Type urgent alert for ${activeWaiter.name} (e.g. "Table 4 call waiter korse, taratari jao")...`
                    : `Type normal instruction for ${activeWaiter.name} (e.g. "Table 7 needs water" or "Side counter e jao")...`
                }
                value={inlineMessage}
                onChange={e => setInlineMessage(e.target.value)}
                className={`flex-1 bg-[#0B0F19] border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                  inlineMessageType === 'alert'
                    ? 'border-rose-500/60 focus:border-rose-400'
                    : 'border-white/[0.08] focus:border-amber-500'
                }`}
              />
              <button
                type="submit"
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md ${
                  inlineMessageType === 'alert'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {inlineMessageType === 'alert' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span>Send Urgent Alert</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-slate-950" />
                    <span>Send Text</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 1: ADD / EDIT WAITER (Name, Role, Username, Password, Tables)
          ======================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726] border border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingEmployee ? `Edit Waiter: ${editingEmployee.name}` : 'Register New Floor Waiter'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set login credentials and assign floor tables.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="mt-4 space-y-4">
              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rakib Ahmed"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Floor Specialist">Floor Specialist</option>
                    <option value="Senior Host">Senior Host</option>
                    <option value="Head Waiter">Head Waiter</option>
                    <option value="Operations Lead">Operations Lead</option>
                  </select>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-amber-500/25 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Waiter Login Credentials
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Used by the waiter to log into /waiter on their mobile device.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const autoUser = formData.name
                        ? formData.name.toLowerCase().replace(/\s+/g, '')
                        : `waiter${Math.floor(Math.random() * 900 + 100)}`;
                      const pin = generateRandomPin();
                      setFormData({ ...formData, username: autoUser, password: pin });
                      showToast('Generated fresh Username & Password!', 'info');
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto Generate</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. rakib"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                      className="w-full bg-[#111726] border border-white/[0.08] text-amber-400 font-mono font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Password *</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password: generateRandomPin() })}
                        className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                      >
                        Roll Random
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        required
                        placeholder="e.g. 1234"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-[#111726] border border-white/[0.08] text-emerald-400 font-mono font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Tables */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Assigned Tables</span>
                  <span className="text-[11px] text-slate-400">
                    {formData.assignedTables.length} tables selected
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-[#0B0F19] border border-white/[0.07]">
                  {allTableNumbers.map(tblNum => {
                    const isSelected = formData.assignedTables.includes(tblNum);
                    return (
                      <button
                        key={`form-tbl-${tblNum}`}
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
                            : 'bg-[#131926] text-slate-400 border border-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span>T{tblNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                {editingEmployee ? (
                  <button
                    type="button"
                    onClick={() => {
                      requestDeleteWaiter(editingEmployee.id, editingEmployee.name);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete waiter</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>{editingEmployee ? 'Save Changes' : 'Register Waiter'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: SEND URGENT NUDGE / MESSAGE TO WAITER PHONE
          ======================================================================= */}
      {messageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726] border border-white/[0.08] rounded-3xl w-full max-w-md shadow-2xl p-6 relative text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  Send Dispatch Nudge to {messageTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMessageTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchMessage} className="mt-4 space-y-3">
              {/* Type Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setModalMessageType('normal')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMessageType === 'normal'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 Normal Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMessageType('alert')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalMessageType === 'alert'
                      ? 'bg-rose-600 text-white shadow shadow-rose-600/30'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>🚨 Urgent Call Alert</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {modalMessageType === 'alert' ? '🚨 Urgent Alert Message / Call Reminder' : 'Message / Task'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    modalMessageType === 'alert'
                      ? "e.g. Table 4 call waiter korse, tumi jaoni keno? Taratari jao!"
                      : "e.g. Table 3 has been waiting on appetizers for 15 mins. Please check-in."
                  }
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  className={`w-full bg-[#0B0F19] border rounded-xl p-3 text-xs text-white focus:outline-none ${
                    modalMessageType === 'alert'
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-white/[0.08] focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageTarget(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    modalMessageType === 'alert'
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 text-white shadow-rose-600/30'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {modalMessageType === 'alert' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      <span>Send Urgent Alert</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Send Nudge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Admin PIN Passcode Confirmation Modal */}
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
