import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { verifyAdminPin } from '../../utils/adminAuth';
import { STAFF_PASSWORD_MASK, isValidStaffPassword, createStaffCredential, stripPlainCredentials } from '../../utils/staffCredentials';
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
import OrderCorrectionModal from './OrderCorrectionModal';
import { TableBillLookup } from './BillReceipt';
import '../../styles/staff.css';
import '../../styles/admin-floor.css';

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

  // Open server orders per table, used for waiter void requests
  const [serverTableOrders, setServerTableOrders] = useState([]);
  const [waiterCorrectionOrder, setWaiterCorrectionOrder] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const loadOpenOrders = () => {
      fetch('/api/orders?limit=50')
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (cancelled || !json?.success || !Array.isArray(json.data)) return;
          setServerTableOrders(json.data
            .filter(o => !['completed', 'cancelled'].includes(String(o.status || '').toLowerCase()))
            .map(o => ({
              id: String(o.id),
              orderNumber: o.order_number,
              tableNumber: Number(o.table_number),
              status: o.status,
              items: (o.items || []).map(it => ({
                id: it.id,
                name: it.name,
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1
              })),
              total: Number(o.total_amount) || 0
            })));
        })
        .catch(() => {});
    };
    loadOpenOrders();
    const timer = setInterval(loadOpenOrders, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

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
  // Inline 'Set new password' panel (edit mode). The current password is never displayed.
  const [pwReset, setPwReset] = useState({ open: false, next: '', confirm: '', masterPin: '', error: '' });
  const [pwResetChecking, setPwResetChecking] = useState(false);

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
  // Staff-to-staff contact: any waiter/employee can message a colleague
  const [peerTargetId, setPeerTargetId] = useState('');
  const [peerText, setPeerText] = useState('');
  const [peerSent, setPeerSent] = useState('');
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
    setEditingEmployee(null);
    setPwReset({ open: false, next: '', confirm: '', masterPin: '', error: '' });
    setFormData({
      name: '',
      role: 'Floor Specialist',
      shift: 'Morning Shift (08:00 - 16:00)',
      username: defaultUser,
      password: '',
      assignedTables: []
    });
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  // Open Modal to Edit Waiter
  const handleOpenEditModal = (waiter) => {
    setEditingEmployee(waiter);
    setPwReset({ open: false, next: '', confirm: '', masterPin: '', error: '' });
    setFormData({
      name: waiter.name || '',
      role: waiter.role || 'Floor Specialist',
      shift: waiter.shift || 'Morning Shift (08:00 - 16:00)',
      username: waiter.username || waiter.accountCode?.toLowerCase() || '',
      password: '',
      assignedTables: (waiter.assignedTables || waiter.tables || []).map(Number)
    });
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  // Set a new password for an existing waiter (master PIN required). Old value is never shown.
  const submitPwReset = async (e) => {
    e.preventDefault();
    if (!editingEmployee || pwResetChecking) return;
    const next = pwReset.next.trim();
    if (!isValidStaffPassword(next)) {
      setPwReset(p => ({ ...p, error: 'Password must be 4 to 8 digits.' }));
      return;
    }
    if (next !== pwReset.confirm.trim()) {
      setPwReset(p => ({ ...p, error: 'The two passwords do not match.' }));
      return;
    }
    setPwResetChecking(true);
    const pinOk = await verifyAdminPin(pwReset.masterPin.trim());
    setPwResetChecking(false);
    if (!pinOk) {
      setPwReset(p => ({ ...p, error: 'Admin master PIN is incorrect. Password was not changed.' }));
      return;
    }
    const patch = createStaffCredential(next);
    const targetId = editingEmployee.id;
    if (restaurant?.setEmployees) {
      restaurant.setEmployees(prev => prev.map(emp =>
        (emp.id === targetId || String(emp.numericId) === String(editingEmployee.numericId))
          ? stripPlainCredentials({ ...emp, ...patch })
          : emp
      ));
    }
    if (restaurant?.updateEmployeeCredentials) {
      restaurant.updateEmployeeCredentials(targetId, patch);
    }
    setPwReset({ open: false, next: '', confirm: '', masterPin: '', error: '' });
    showToast(`Password updated for ${formData.name || 'waiter'}. It cannot be viewed again.`, 'success');
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
    let credential = null;
    if (!editingEmployee) {
      const pw = String(formData.password || '').trim();
      if (!isValidStaffPassword(pw)) {
        showToast('Password must be 4 to 8 digits', 'error');
        return;
      }
      credential = createStaffCredential(pw);
    }

    const cleanUsername = formData.username.trim().toLowerCase();
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
                accountCode: cleanUsername.toUpperCase(),
                waiterCode: cleanUsername.toUpperCase(),
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
          accountCode: cleanUsername.toUpperCase(),
          passwordHash: credential.passwordHash,
          passwordSalt: credential.passwordSalt,
          passwordUpdatedAt: credential.passwordUpdatedAt,
          assignedTables: cleanTables
        });

        if (created?.id && restaurant?.assignTableToEmployee) {
          cleanTables.forEach(tNum => {
            restaurant.assignTableToEmployee(tNum, created.id);
          });
        }
      }

      showToast(`Added waiter ${formData.name} with login ID ${cleanUsername}. The password is not shown again.`, 'success');
    }

    setIsModalOpen(false);
  };

  // Security Confirmation Modal State (Requires admin PIN)
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
      actionNotice: 'Admin PIN verification required to delete staff.',
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
    <div className="flr-root" style={{ minHeight: 0 }}>

      {/* BILL: print a table's open bill (preview, print, settle) */}
      <TableBillLookup />

      {/* HEADER: title, live status and waiter switcher */}
      <div className="flr-panel flr-stack" style={{ gap: '0.9rem' }}>
        <div className="flr-toolbar">
          <div className="flr-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
            <div className="flr-avatar" style={{ width: '2.5rem', height: '2.5rem', background: 'var(--adm-primary)', color: 'var(--adm-primary-fg)' }}>
              <ConciergeBell className="w-5 h-5" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="flr-title" style={{ fontSize: '1.05rem' }}>Waiter console</h1>
              <p className="flr-muted" style={{ margin: '0.15rem 0 0' }}>
                {isEmployeeMode
                  ? `Signed in as ${currentEmployee?.name || 'staff'}. Watch calls and send instructions to waiters.`
                  : 'Live view of every floor waiter, their tables and customer calls.'}
              </p>
            </div>
          </div>

          <div className="flr-row">
            <span className="flr-tone-chip" data-tone="success">
              <span className="flr-dot flr-dot--pulse" />
              Live
            </span>
            <span className="flr-tone-chip" data-tone="neutral">
              <Users className="w-3.5 h-3.5" />
              {waiters.length} waiters
            </span>
            <span className="flr-tone-chip" data-tone={calls.length > 0 ? 'danger' : 'neutral'}>
              <ConciergeBell className="w-3.5 h-3.5" />
              {calls.length} active {calls.length === 1 ? 'call' : 'calls'}
            </span>
            <a
              href="/waiter"
              target="_blank"
              rel="noreferrer"
              className="flr-btn"
              title="Open the standalone waiter login page in a new window"
              style={{ minHeight: '2rem', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
            >
              <span>Open /waiter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Waiter switcher: all waiters or one waiter's live console */}
        <div className="flr-tabs" role="tablist" aria-label="Choose waiter">
          <button
            type="button"
            role="tab"
            aria-selected={selectedWaiterId === 'all'}
            aria-pressed={selectedWaiterId === 'all'}
            onClick={() => setSelectedWaiterId('all')}
            className="flr-tab"
          >
            <Users className="w-3.5 h-3.5" />
            <span>All waiters</span>
            {calls.length > 0 && (
              <span className="flr-tab__count" style={{ background: 'var(--adm-danger)', color: '#fff' }}>{calls.length}</span>
            )}
          </button>

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
                role="tab"
                aria-selected={isSelected}
                aria-pressed={isSelected}
                onClick={() => setSelectedWaiterId(waiter.id)}
                className="flr-tab"
              >
                <span className="flr-avatar" style={{ width: '1.4rem', height: '1.4rem', fontSize: '0.6rem', borderRadius: 6, background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
                  {waiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span>{waiter.name}</span>
                <span className="flr-muted" style={{ fontSize: '0.7rem' }}>({tablesSummary || 'no tables'})</span>
                {waiterCalls.length > 0 && (
                  <span className="flr-tab__count" style={{ background: 'var(--adm-danger)', color: '#fff' }}>{waiterCalls.length}</span>
                )}
              </button>
            );
          })}

          <button type="button" onClick={handleOpenAddModal} className="flr-tab" style={{ borderStyle: 'dashed' }}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add waiter</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="flr-toast" role="status" style={{
          borderLeftColor: toastMessage.type === 'error'
            ? 'var(--adm-danger)'
            : toastMessage.type === 'warning'
            ? 'var(--adm-warning)'
            : toastMessage.type === 'info'
            ? 'var(--adm-info)'
            : 'var(--adm-success)'
        }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* VIEW 1: ALL WAITERS OVERVIEW */}
      {selectedWaiterId === 'all' && (
        <div className="flr-stack" style={{ gap: '1rem' }}>
          <div className="flr-panel flr-row flr-row--between" style={{ gap: '0.75rem' }}>
            <div className="flr-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--adm-text-muted)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className="flr-strong">Waiter fleet</div>
                <div className="flr-muted">Open a waiter to see their live console, or share their login with them.</div>
              </div>
            </div>
            <button type="button" onClick={handleOpenAddModal} className="flr-btn flr-btn--primary">
              <Plus className="w-4 h-4" />
              <span>Create waiter account</span>
            </button>
          </div>

          {/* Venue-wide call queue, first so unanswered calls are visible on phones */}
          {calls.length > 0 && (
            <section className="flr-panel flr-stack" data-tone="danger" style={{ borderLeft: '4px solid var(--adm-danger)' }}>
              <div className="flr-row flr-row--between">
                <h3 className="flr-title">Call queue ({calls.length})</h3>
                <span className="flr-tone-chip" data-tone="danger">Needs a waiter</span>
              </div>
              <div className="flr-console" style={{ gap: '0.6rem' }}>
                {calls.map(call => {
                  const callId = call.id || call._id || `c-${Math.random()}`;
                  const tbl = Number(call.table_number || call.tableNumber || call.table);
                  const reason = call.reason || 'Assistance requested';
                  const msg = call.custom_message || call.message || call.note;

                  const assignedEmp = waiters.find(w =>
                    (w.assignedTables || w.tables || []).map(Number).includes(tbl)
                  );

                  return (
                    <div key={`global-call-${callId}`} className="flr-req" data-tone="danger">
                      <div className="flr-req__row">
                        <span className="flr-strong">Table {tbl}</span>
                        <span className="flr-muted flr-row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                          <Clock className="w-3 h-3" />
                          <span>{formatCallTime(call.created_at || call.createdAt, currentTime)}</span>
                        </span>
                      </div>
                      <div>
                        <div style={{ color: 'var(--adm-text)', fontWeight: 600 }}>{reason}</div>
                        {msg && <div className="flr-muted" style={{ fontStyle: 'italic', marginTop: 2 }}>&quot;{msg}&quot;</div>}
                      </div>
                      <div className="flr-req__row">
                        <span className="flr-muted">Assigned: <span className="flr-strong">{assignedEmp ? assignedEmp.name : 'Unassigned'}</span></span>
                        <button
                          type="button"
                          onClick={() => handleResolveCall(callId, tbl)}
                          className="flr-btn flr-btn--primary"
                          style={{ minHeight: '2.75rem' }}
                        >
                          <Check className="w-4 h-4" />
                          <span>Resolve</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Waiter cards */}
          <div className="flr-tables" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
            {waiters.map(waiter => {
              const waiterCalls = getCallsForWaiter(waiter);
              const assignedTables = (waiter.assignedTables || waiter.tables || []).map(Number).sort((a, b) => a - b);
              const username = waiter.username || waiter.accountCode?.toLowerCase() || 'waiter';
              const initials = waiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

              return (
                <article
                  key={waiter.id}
                  className="flr-panel flr-stack"
                  data-tone={waiterCalls.length > 0 ? 'danger' : 'success'}
                  style={{ justifyContent: 'space-between', borderLeft: `4px solid ${waiterCalls.length > 0 ? 'var(--adm-danger)' : 'var(--adm-border)'}` }}
                >
                  <div className="flr-stack" style={{ gap: '0.75rem' }}>
                    <div className="flr-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                      <div className="flr-avatar" style={{ width: '2.4rem', height: '2.4rem', background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
                        {initials}
                      </div>
                      <div className="flr-grow">
                        <div className="flr-strong flr-ellipsis">{waiter.name}</div>
                        <div className="flr-muted flr-ellipsis">{waiter.role || 'Floor Specialist'} &middot; {waiter.shift || 'Morning Shift'}</div>
                        <div className="flr-muted" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{waiter.staffId || waiter.accountCode || `WAIT-${waiter.numericId || '101'}`}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(waiter)}
                        className="flr-btn flr-btn--ghost flr-btn--icon"
                        title="Edit waiter details and credentials"
                        aria-label={`Edit ${waiter.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Login details (password stays masked, as in the original) */}
                    <details className="flr-box">
                      <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--adm-text-muted)' }}>
                        Login details (for /waiter)
                      </summary>
                      <div className="flr-row" style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <div className="flr-box flr-row flr-row--between" style={{ padding: '0.4rem 0.5rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="flr-label" style={{ fontSize: '0.6rem' }}>Username</div>
                            <div className="flr-strong flr-ellipsis" style={{ fontFamily: 'monospace' }}>{username}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(username, `user-${waiter.id}`)}
                            className="flr-btn flr-btn--ghost flr-btn--icon"
                            title="Copy username"
                            aria-label="Copy username"
                            style={{ minHeight: '1.8rem', width: '1.8rem' }}
                          >
                            {copiedKey === `user-${waiter.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="flr-box" style={{ padding: '0.4rem 0.5rem' }}>
                          <div className="flr-label" style={{ fontSize: '0.6rem' }}>Password</div>
                          <div className="flr-muted" style={{ letterSpacing: '0.2em' }}>••••••••</div>
                        </div>
                      </div>
                    </details>

                    {/* Assigned tables */}
                    <div className="flr-stack" style={{ gap: '0.4rem' }}>
                      <div className="flr-row flr-row--between">
                        <span className="flr-label">Tables</span>
                        <span className="flr-muted">{assignedTables.length} assigned</span>
                      </div>
                      {assignedTables.length === 0 ? (
                        <div className="flr-muted">No tables assigned.</div>
                      ) : (
                        <div className="flr-row" style={{ gap: 6 }}>
                          {assignedTables.map(tblNum => {
                            const isCalling = waiterCalls.some(
                              c => Number(c.table_number || c.tableNumber || c.table) === tblNum
                            );
                            return (
                              <span
                                key={`badge-${waiter.id}-${tblNum}`}
                                className="flr-tone-chip"
                                data-tone={isCalling ? 'danger' : 'neutral'}
                                style={{ fontFamily: 'monospace' }}
                              >
                                T{tblNum}
                                {isCalling && <ConciergeBell className="w-3 h-3" />}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Live calls for this waiter */}
                    <div className="flr-stack" style={{ gap: '0.4rem' }}>
                      <div className="flr-row flr-row--between">
                        <span className="flr-label">Calls</span>
                        <span className="flr-tone-chip" data-tone={waiterCalls.length > 0 ? 'danger' : 'success'}>
                          {waiterCalls.length > 0 ? `${waiterCalls.length} pending` : 'None pending'}
                        </span>
                      </div>

                      {waiterCalls.map(call => {
                        const callId = call.id || call._id || `c-${Math.random()}`;
                        const tbl = Number(call.table_number || call.tableNumber || call.table);
                        const reason = call.reason || 'Assistance requested';
                        const msg = call.custom_message || call.message || call.note;

                        return (
                          <div key={callId} className="flr-req" data-tone="danger" style={{ padding: '0.6rem 0.7rem' }}>
                            <div className="flr-req__row">
                              <span className="flr-strong">Table {tbl}</span>
                              <span className="flr-muted">{formatCallTime(call.created_at || call.createdAt, currentTime)}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>{reason}</div>
                            {msg && <div className="flr-muted" style={{ fontStyle: 'italic' }}>&quot;{msg}&quot;</div>}
                            <div className="flr-req__row" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => handleResolveCall(callId, tbl)}
                                className="flr-btn flr-btn--primary"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Resolve</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.75rem' }}>
                    <button type="button" onClick={() => handleSendNudge(waiter)} className="flr-btn">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Text waiter</span>
                    </button>
                    <button type="button" onClick={() => setSelectedWaiterId(waiter.id)} className="flr-btn flr-btn--primary">
                      <span>Open console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: ONE WAITER'S LIVE CONSOLE */}
      {selectedWaiterId !== 'all' && activeWaiter && (
        <div className="flr-console">
          <div className="flr-stack" style={{ gap: '1rem', minWidth: 0 }}>
            {/* Profile bar */}
            <div className="flr-panel flr-row flr-row--between" style={{ gap: '0.75rem' }}>
              <div className="flr-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => setSelectedWaiterId('all')}
                  className="flr-btn flr-btn--icon"
                  title="Back to all waiters"
                  aria-label="Back to all waiters"
                >
                  <ArrowRight className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
                </button>
                <div className="flr-avatar" style={{ width: '2.5rem', height: '2.5rem', background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
                  {activeWaiter.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="flr-strong flr-ellipsis" style={{ fontSize: '1rem' }}>{activeWaiter.name}</div>
                  <div className="flr-muted flr-ellipsis">
                    {activeWaiter.role || 'Floor Specialist'} &middot; {activeWaiter.staffId || activeWaiter.accountCode || `WAIT-${activeWaiter.numericId || '101'}`}
                  </div>
                </div>
              </div>
              <div className="flr-row">
                <button type="button" onClick={() => handleOpenEditModal(activeWaiter)} className="flr-btn">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit tables / login</span>
                </button>
                <button type="button" onClick={() => handleSendNudge(activeWaiter)} className="flr-btn">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Nudge phone</span>
                </button>
              </div>
            </div>

            {/* Tables assigned */}
            <div className="flr-panel flr-stack" style={{ gap: '0.6rem' }}>
              <div className="flr-row flr-row--between">
                <span className="flr-title">Assigned tables</span>
                <span className="flr-muted">{(activeWaiter.assignedTables || activeWaiter.tables || []).length} total</span>
              </div>

              {(!activeWaiter.assignedTables || activeWaiter.assignedTables.length === 0) ? (
                <div className="flr-box flr-muted" style={{ textAlign: 'center' }}>
                  No tables assigned yet. Use &quot;Edit tables / login&quot; to assign tables.
                </div>
              ) : (
                <div className="flr-tables" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem' }}>
                  {(activeWaiter.assignedTables || activeWaiter.tables || []).map(Number).sort((a, b) => a - b).map(tblNum => {
                    const isCalling = selectedWaiterCalls.some(
                      c => Number(c.table_number || c.tableNumber || c.table) === tblNum
                    );
                    return (
                      <div
                        key={`active-waiter-tbl-${tblNum}`}
                        className="flr-table"
                        data-tone={isCalling ? 'danger' : 'success'}
                        style={{ alignItems: 'center', textAlign: 'center', padding: '0.6rem 0.4rem' }}
                      >
                        <span className="flr-table__num">{tblNum}</span>
                        <span className="flr-tone-chip" data-tone={isCalling ? 'danger' : 'success'}>
                          {isCalling ? 'Calling' : 'Clear'}
                        </span>
                        {serverTableOrders.some(o => o.tableNumber === tblNum) && (
                          <button
                            type="button"
                            onClick={() => setWaiterCorrectionOrder(serverTableOrders.find(o => o.tableNumber === tblNum))}
                            className="text-[11px] font-bold underline cursor-pointer"
                            style={{ color: 'var(--adm-primary)', background: 'none', border: 'none', padding: 0 }}
                          >
                            Request void
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <OrderCorrectionModal
                isOpen={Boolean(waiterCorrectionOrder)}
                order={waiterCorrectionOrder}
                mode="waiter"
                actor={{
                  actorType: 'employee',
                  actorId: String(activeWaiter.id),
                  actorName: activeWaiter.name,
                  actorRole: activeWaiter.role || 'Waiter',
                  actorStaffId: String(activeWaiter.numericId || activeWaiter.id)
                }}
                onClose={() => setWaiterCorrectionOrder(null)}
              />
            </div>

            {/* Calls for this waiter */}
            <div className="flr-stack" style={{ gap: '0.6rem' }}>
              <div className="flr-row flr-row--between">
                <h3 className="flr-title">Calls ({selectedWaiterCalls.length})</h3>
                <span className="flr-tone-chip" data-tone={selectedWaiterCalls.length > 0 ? 'danger' : 'success'}>
                  {selectedWaiterCalls.length > 0 ? `${selectedWaiterCalls.length} waiting` : 'All clear'}
                </span>
              </div>

              {selectedWaiterCalls.length === 0 ? (
                <div className="flr-empty" style={{ padding: '1.5rem 1rem' }}>
                  <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--adm-success)' }} />
                  <div className="flr-strong">No calls right now</div>
                  <p className="flr-muted" style={{ margin: 0, maxWidth: '24rem' }}>
                    When a guest at {activeWaiter.name}&apos;s tables calls for help, the call appears here in real time.
                  </p>
                </div>
              ) : (
                <div className="flr-queue">
                  {selectedWaiterCalls.map(call => {
                    const callId = call.id || call._id || `c-${Math.random()}`;
                    const tbl = Number(call.table_number || call.tableNumber || call.table);
                    const reason = call.reason || 'Assistance requested';
                    const msg = call.custom_message || call.message || call.note;

                    return (
                      <div key={`personal-call-${callId}`} className="flr-req" data-tone="danger" style={{ padding: '0.9rem 1rem' }}>
                        <div className="flr-req__row">
                          <div className="flr-row" style={{ gap: 8 }}>
                            <span className="flr-dot flr-dot--pulse" />
                            <span className="flr-strong" style={{ fontSize: '1rem' }}>Table {tbl}</span>
                            <span className="flr-tone-chip" data-tone="danger">Active call</span>
                          </div>
                          <span className="flr-muted flr-row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatCallTime(call.created_at || call.createdAt, currentTime)}</span>
                          </span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--adm-text)' }}>{reason}</div>
                          {msg && <div className="flr-box" style={{ marginTop: 6, fontStyle: 'italic', fontSize: '0.82rem' }}>&quot;{msg}&quot;</div>}
                        </div>
                        <div className="flr-req__row">
                          <span className="flr-muted">Waiter phone alert is active</span>
                          <button
                            type="button"
                            onClick={() => handleResolveCall(callId, tbl)}
                            className="flr-btn flr-btn--primary"
                            style={{ minHeight: '2.75rem' }}
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark resolved</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Messaging: instructions to this waiter and to colleagues */}
          <div className="flr-panel flr-stack" style={{ gap: '0.8rem', minWidth: 0 }}>
            <div>
              <h3 className="flr-title">Messages for {activeWaiter.name}</h3>
              <p className="flr-muted" style={{ margin: '0.2rem 0 0' }}>
                Shows on the waiter&apos;s phone with a sound and vibration.
              </p>
            </div>

            {/* Staff-to-staff contact: message a colleague from this waiter's account */}
            {employees.filter(e => e.id !== activeWaiter.id).length > 0 && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const target = employees.find(emp => emp.id === peerTargetId);
                  if (!target || !peerText.trim() || !restaurant?.sendStaffMessage) return;
                  // Sender is the real logged-in person (falls back to admin when no employee session)
                  const sender = isEmployeeMode && currentEmployee ? currentEmployee : null;
                  restaurant.sendStaffMessage(target.id, peerText.trim(), {
                    from: sender ? 'Employee' : 'Admin',
                    fromName: sender?.name || 'Head Desk / Admin',
                    fromRole: sender?.role || 'Admin',
                    fromEmployeeId: sender?.id || 'admin',
                    fromStaffId: sender
                      ? String(sender.staffId || sender.numericId || sender.accountCode || '')
                      : 'ADMIN'
                  });
                  setPeerText('');
                  setPeerSent(`Sent to ${target.name}`);
                }}
                className="flr-box flr-stack"
                style={{ gap: '0.5rem' }}
              >
                <span className="flr-label">Message a colleague</span>
                <select
                  value={peerTargetId}
                  onChange={e => setPeerTargetId(e.target.value)}
                  className="flr-select"
                  aria-label="Choose colleague"
                >
                  <option value="">Choose a colleague...</option>
                  {employees.filter(e => e.id !== activeWaiter.id).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <div className="flr-row" style={{ flexWrap: 'nowrap' }}>
                  <input
                    type="text"
                    value={peerText}
                    onChange={e => { setPeerText(e.target.value); setPeerSent(''); }}
                    placeholder="Short message"
                    className="flr-input flr-grow"
                    aria-label="Message to colleague"
                  />
                  <button
                    type="submit"
                    disabled={!peerTargetId || !peerText.trim()}
                    className="flr-btn"
                  >
                    Send
                  </button>
                </div>
                {peerSent && <span className="flr-muted" style={{ color: 'var(--adm-success)' }}>{peerSent}</span>}
              </form>
            )}

            {/* Message feed */}
            {waiterStaffMessages.length === 0 ? (
              <div className="flr-box flr-muted" style={{ textAlign: 'center' }}>
                No messages sent to {activeWaiter.name} yet.
              </div>
            ) : (
              <div className="flr-stack" style={{ gap: '0.5rem', maxHeight: '18rem', overflowY: 'auto' }}>
                {waiterStaffMessages.map(msg => {
                  const isAlert = msg.isAlert || msg.category === 'alert';
                  const acknowledged = msg.status === 'acknowledged';
                  const tone = isAlert ? 'danger' : acknowledged ? 'success' : 'warning';
                  return (
                    <div key={msg.id} className="flr-req" data-tone={tone} style={{ padding: '0.6rem 0.8rem' }}>
                      <div className="flr-req__row">
                        <span className="flr-tone-chip" data-tone={tone}>
                          {isAlert ? 'Urgent alert' : 'Instruction'}
                        </span>
                        <span className="flr-muted">{formatCallTime(msg.timestamp, currentTime)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--adm-text)' }}>&quot;{msg.text}&quot;</div>
                      <div className="flr-muted">
                        {acknowledged ? 'Acknowledged by waiter' : 'Waiting for acknowledgment'}
                      </div>
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="flr-stack" style={{ gap: 2, borderTop: '1px solid var(--adm-border)', paddingTop: 6 }}>
                          {msg.replies.map((rep, idx) => (
                            <div key={idx} className="flr-muted">
                              <span className="flr-strong">{activeWaiter.name}:</span> &quot;{rep.text}&quot;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Type selector: normal or urgent */}
            <div className="flr-row flr-row--between">
              <div className="flr-tabs" role="group" aria-label="Message type" style={{ overflow: 'visible' }}>
                <button
                  type="button"
                  aria-pressed={inlineMessageType === 'normal'}
                  onClick={() => setInlineMessageType('normal')}
                  className="flr-tab"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
                <button
                  type="button"
                  data-tone="danger"
                  aria-pressed={inlineMessageType === 'alert'}
                  onClick={() => setInlineMessageType('alert')}
                  className="flr-tab"
                  style={inlineMessageType === 'alert' ? { background: 'var(--adm-danger)', borderColor: 'var(--adm-danger)', color: '#fff' } : undefined}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgent alert</span>
                </button>
              </div>
              {inlineMessageType === 'alert' && (
                <span className="flr-muted" style={{ color: 'var(--adm-danger)' }}>Phone will vibrate</span>
              )}
            </div>

            {/* Quick templates for urgent mode */}
            {inlineMessageType === 'alert' && (
              <div className="flr-row" style={{ gap: 6 }}>
                {selectedWaiterCalls.map(c => {
                  const t = c.table_number || c.tableNumber || c.table;
                  return (
                    <button
                      key={c.id || t}
                      type="button"
                      onClick={() => setInlineMessage(`Table ${t} call waiter korse, tumi jaoni keno? Taratari jao!`)}
                      className="flr-tone-chip flr-btn--ghost"
                      data-tone="danger"
                      style={{ cursor: 'pointer' }}
                    >
                      Table {t} waiting
                    </button>
                  );
                })}
                <button type="button" onClick={() => setInlineMessage('Customer assistance call pending! Please attend immediately.')} className="flr-btn" style={{ minHeight: '1.9rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                  Assistance pending
                </button>
                <button type="button" onClick={() => setInlineMessage('Customer table e wait kortese, check koro taratari.')} className="flr-btn" style={{ minHeight: '1.9rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                  Customer waiting
                </button>
              </div>
            )}

            {/* Send form */}
            <form onSubmit={handleSendInlineMessage} className="flr-row" style={{ flexWrap: 'nowrap' }}>
              <input
                type="text"
                required
                placeholder={
                  inlineMessageType === 'alert'
                    ? `Urgent message for ${activeWaiter.name}`
                    : `Instruction for ${activeWaiter.name}`
                }
                value={inlineMessage}
                onChange={e => setInlineMessage(e.target.value)}
                className="flr-input flr-grow"
                aria-label="Message to waiter"
              />
              <button
                type="submit"
                className={inlineMessageType === 'alert' ? 'flr-btn' : 'flr-btn flr-btn--primary'}
                style={inlineMessageType === 'alert' ? { background: 'var(--adm-danger)', borderColor: 'transparent', color: '#fff' } : undefined}
              >
                {inlineMessageType === 'alert' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{inlineMessageType === 'alert' ? 'Send alert' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT WAITER */}
      {isModalOpen && (
        <div className="flr-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="flr-modal" role="dialog" aria-modal="true" aria-label="Waiter details" style={{ maxWidth: '32rem' }} onClick={e => e.stopPropagation()}>
            <button type="button" className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close" onClick={() => setIsModalOpen(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            <div style={{ paddingBottom: '0.8rem', borderBottom: '1px solid var(--adm-border)', paddingRight: '2.5rem' }}>
              <h3 className="flr-title" style={{ fontSize: '1.05rem' }}>
                {editingEmployee ? `Edit ${editingEmployee.name}` : 'Add a floor waiter'}
              </h3>
              <p className="flr-muted" style={{ margin: '0.2rem 0 0' }}>Set login details and assign tables.</p>
            </div>

            <form onSubmit={handleSaveEmployee} className="flr-stack" style={{ gap: '1rem', paddingTop: '1rem' }}>
              <div className="flr-console" style={{ gap: '0.75rem' }}>
                <label className="flr-stack" style={{ gap: '0.3rem' }}>
                  <span className="flr-label">Full name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rakib Ahmed"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="flr-input"
                  />
                </label>
                <label className="flr-stack" style={{ gap: '0.3rem' }}>
                  <span className="flr-label">Role</span>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="flr-select"
                  >
                    <option value="Floor Specialist">Floor Specialist</option>
                    <option value="Senior Host">Senior Host</option>
                    <option value="Head Waiter">Head Waiter</option>
                    <option value="Operations Lead">Operations Lead</option>
                  </select>
                </label>
              </div>

              <div className="flr-box flr-stack" style={{ gap: '0.6rem', padding: '0.8rem' }}>
                <div className="flr-row flr-row--between">
                  <div>
                    <div className="flr-strong">Login credentials</div>
                    <div className="flr-muted">Used at /waiter on the waiter&apos;s phone.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const autoUser = formData.name
                        ? formData.name.toLowerCase().replace(/\s+/g, '')
                        : `waiter${Math.floor(Math.random() * 900 + 100)}`;
                      setFormData({ ...formData, username: autoUser });
                      showToast('Generated a fresh username', 'info');
                    }}
                    className="flr-btn"
                    style={{ minHeight: '2rem', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto username</span>
                  </button>
                </div>

                <div className="flr-console" style={{ gap: '0.75rem' }}>
                  <label className="flr-stack" style={{ gap: '0.3rem' }}>
                    <span className="flr-label">Username *</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. rakib"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                      className="flr-input"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </label>
                  {!editingEmployee ? (
                    <label className="flr-stack" style={{ gap: '0.3rem' }}>
                      <span className="flr-label">Initial password * (4 to 8 digits)</span>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        required
                        maxLength={8}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '') })}
                        className="flr-input"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </label>
                  ) : (
                    <div className="flr-stack" style={{ gap: '0.3rem' }}>
                      <span className="flr-label">Password</span>
                      <span className="flr-row flr-row--between">
                        <span className="flr-muted" style={{ letterSpacing: '0.2em' }}>{STAFF_PASSWORD_MASK}</span>
                        <button
                          type="button"
                          onClick={() => setPwReset(p => ({ ...p, open: true, error: '' }))}
                          className="flr-btn"
                          style={{ minHeight: '2rem', fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                        >
                          Set new password
                        </button>
                      </span>
                      {pwReset.open && (
                        <form onSubmit={submitPwReset} className="flr-box flr-stack" style={{ gap: '0.4rem', padding: '0.6rem' }}>
                          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} required placeholder="New password (4 to 8 digits)" value={pwReset.next}
                            onChange={e => setPwReset(p => ({ ...p, next: e.target.value.replace(/\D/g, ''), error: '' }))} className="flr-input" />
                          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} required placeholder="Confirm new password" value={pwReset.confirm}
                            onChange={e => setPwReset(p => ({ ...p, confirm: e.target.value.replace(/\D/g, ''), error: '' }))} className="flr-input" />
                          <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} required placeholder="Admin master PIN" value={pwReset.masterPin}
                            onChange={e => setPwReset(p => ({ ...p, masterPin: e.target.value, error: '' }))} className="flr-input" />
                          {pwReset.error && <span role="alert" style={{ color: 'var(--adm-danger)', fontSize: '0.8rem', fontWeight: 600 }}>{pwReset.error}</span>}
                          <span className="flr-row" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button type="button" className="flr-btn" onClick={() => setPwReset({ open: false, next: '', confirm: '', masterPin: '', error: '' })}>Cancel</button>
                            <button type="submit" className="flr-btn flr-btn--primary" disabled={pwResetChecking}>{pwResetChecking ? 'Checking PIN...' : 'Save new password'}</button>
                          </span>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flr-stack" style={{ gap: '0.4rem' }}>
                <div className="flr-row flr-row--between">
                  <span className="flr-label">Assigned tables</span>
                  <span className="flr-muted">{formData.assignedTables.length} selected</span>
                </div>
                <div className="flr-row" style={{ gap: 6 }}>
                  {allTableNumbers.map(tblNum => {
                    const isSelected = formData.assignedTables.includes(tblNum);
                    return (
                      <button
                        key={`form-tbl-${tblNum}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          const next = isSelected
                            ? formData.assignedTables.filter(t => t !== tblNum)
                            : [...formData.assignedTables, tblNum];
                          setFormData({ ...formData, assignedTables: next });
                        }}
                        className="flr-choice"
                        style={{ minWidth: '3.2rem' }}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>T{tblNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flr-row flr-row--between" style={{ borderTop: '1px solid var(--adm-border)', paddingTop: '0.9rem' }}>
                {editingEmployee ? (
                  <button
                    type="button"
                    onClick={() => {
                      requestDeleteWaiter(editingEmployee.id, editingEmployee.name);
                    }}
                    className="flr-btn flr-btn--danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete waiter</span>
                  </button>
                ) : <span />}
                <div className="flr-row">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flr-btn flr-btn--ghost">
                    Cancel
                  </button>
                  <button type="submit" className="flr-btn flr-btn--primary">
                    <Check className="w-4 h-4" />
                    <span>{editingEmployee ? 'Save changes' : 'Add waiter'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH NUDGE / MESSAGE TO WAITER PHONE */}
      {messageTarget && (
        <div className="flr-backdrop" onClick={() => setMessageTarget(null)}>
          <div className="flr-modal" role="dialog" aria-modal="true" aria-label="Message waiter" onClick={e => e.stopPropagation()}>
            <button type="button" className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close" onClick={() => setMessageTarget(null)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>

            <div style={{ paddingBottom: '0.8rem', borderBottom: '1px solid var(--adm-border)', paddingRight: '2.5rem' }}>
              <h3 className="flr-title" style={{ fontSize: '1rem' }}>Message {messageTarget.name}</h3>
            </div>

            <form onSubmit={handleDispatchMessage} className="flr-stack" style={{ gap: '0.8rem', paddingTop: '1rem' }}>
              <div className="flr-tabs" role="group" aria-label="Message type" style={{ overflow: 'visible' }}>
                <button
                  type="button"
                  aria-pressed={modalMessageType === 'normal'}
                  onClick={() => setModalMessageType('normal')}
                  className="flr-tab"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
                <button
                  type="button"
                  aria-pressed={modalMessageType === 'alert'}
                  onClick={() => setModalMessageType('alert')}
                  className="flr-tab"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    ...(modalMessageType === 'alert' ? { background: 'var(--adm-danger)', borderColor: 'var(--adm-danger)', color: '#fff' } : { color: 'var(--adm-danger)' })
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgent alert</span>
                </button>
              </div>

              <label className="flr-stack" style={{ gap: '0.3rem' }}>
                <span className="flr-label">{modalMessageType === 'alert' ? 'Urgent message' : 'Message or task'}</span>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    modalMessageType === 'alert'
                      ? 'e.g. Table 4 is waiting for a waiter. Please go now.'
                      : 'e.g. Table 3 has been waiting for appetizers for 15 minutes.'
                  }
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  className="flr-input"
                  style={{ resize: 'vertical' }}
                />
              </label>

              <div className="flr-row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setMessageTarget(null)} className="flr-btn flr-btn--ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flr-btn flr-btn--primary"
                  style={modalMessageType === 'alert' ? { background: 'var(--adm-danger)', color: '#fff' } : undefined}
                >
                  {modalMessageType === 'alert' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{modalMessageType === 'alert' ? 'Send urgent alert' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin PIN passcode confirmation (verified on server), unchanged */}
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
