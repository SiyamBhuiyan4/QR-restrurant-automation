import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  Filter,
  Search,
  Check,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  Flame,
  ArrowRight,
  ShieldCheck,
  Send,
  History,
  TrendingUp,
  Award,
  Zap,
  PhoneCall,
  UserX,
  PlusCircle,
  RotateCcw
} from 'lucide-react';

/**
 * Built-in Web Audio API Chime Synthesizer
 * Produces crisp two-tone restaurant desk bell chimes without any external audio asset dependencies.
 */
class DirectReportChime {
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

  playUrgentChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Two-tone urgent bell sequence: 880Hz (A5) -> 1320Hz (E6)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(870, now + 0.35);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(1300, now + 0.7);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);
    } catch (_) {}
  }

  playSuccessChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (_) {}
  }
}

const chimeSynthesizer = new DirectReportChime();

// Initial Mock Staff Members roster with avatars & roles
const STAFF_ROSTER = [
  {
    id: 'emp-1',
    name: 'Marcus Vance',
    role: 'Floor Employee',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
    status: 'busy',
    activeTable: 'Table 4',
    rating: 4.8
  },
  {
    id: 'emp-2',
    name: 'Elena Rostova',
    role: 'Senior Floor Lead',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces',
    status: 'available',
    activeTable: 'Floor Lead',
    rating: 4.95
  },
  {
    id: 'emp-3',
    name: 'David Kim',
    role: 'Senior Captain',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
    status: 'available',
    activeTable: 'Booth Section',
    rating: 4.9
  },
  {
    id: 'emp-4',
    name: 'Sophia Chen',
    role: 'Sommelier & Host',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
    status: 'available',
    activeTable: 'Balcony & Wine',
    rating: 4.92
  },
  {
    id: 'emp-5',
    name: 'Liam O’Connor',
    role: 'Lead Runner & Support',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
    status: 'available',
    activeTable: 'Expedite Pass',
    rating: 4.75
  },
  {
    id: 'emp-6',
    name: 'Isabella Diaz',
    role: 'VIP Concierge',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces',
    status: 'available',
    activeTable: 'Private Dining',
    rating: 5.0
  }
];

// Initial default reports matching user specification:
// Total Notes (4), Urgent / New (2), In Progress (1), Resolved (1).
const INITIAL_REPORTS = [
  {
    id: 'rep-101',
    tableNumber: 4,
    tableLocation: 'Patio West • Bay View',
    customerNote: 'Requested extra napkins and water 10 mins ago, no one came yet. Kids are getting restless.',
    severity: 'critical', // 'critical' | 'moderate' | 'general'
    status: 'new', // 'new' | 'in_progress' | 'resolved'
    createdAt: Date.now() - 4 * 60 * 1000, // 4 mins ago
    assignedStaffId: 'emp-1',
    dispatchLog: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null
  },
  {
    id: 'rep-102',
    tableNumber: 12,
    tableLocation: 'Main Dining • Center Row',
    customerNote: 'Food arrived warm instead of hot. Wagyu steak needs reheating or fresh preparation please.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 9 * 60 * 1000, // 9 mins ago
    assignedStaffId: 'emp-2',
    dispatchLog: null,
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null
  },
  {
    id: 'rep-103',
    tableNumber: 7,
    tableLocation: 'Booth 2 • South Wing',
    customerNote: 'Need assistance with bill splitting across three cards and applying our corporate dining credit.',
    severity: 'moderate',
    status: 'in_progress',
    createdAt: Date.now() - 18 * 60 * 1000, // 18 mins ago
    assignedStaffId: 'emp-3',
    dispatchLog: {
      staffId: 'emp-3',
      timestamp: Date.now() - 10 * 60 * 1000,
      note: 'Priority alert sent: David dispatched with wireless handheld POS terminal.'
    },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null
  },
  {
    id: 'rep-104',
    tableNumber: 18,
    tableLocation: 'Balcony Terrace • Table 18',
    customerNote: 'Celebration anniversary request: Would love two complimentary champagne flutes if possible.',
    severity: 'general',
    status: 'resolved',
    createdAt: Date.now() - 42 * 60 * 1000, // 42 mins ago
    assignedStaffId: 'emp-4',
    dispatchLog: {
      staffId: 'emp-4',
      timestamp: Date.now() - 36 * 60 * 1000,
      note: 'Sophia notified for anniversary hospitality package.'
    },
    resolvedAt: Date.now() - 28 * 60 * 1000, // resolved 28 mins ago
    resolutionTime: '14 mins',
    resolutionNote: 'Resolved - Delivered complimentary vintage Prosecco flutes & anniversary artisanal macaron board with signed chef card.'
  }
];

// Pool of realistic simulation notes for demo button
const SIMULATION_NOTE_POOL = [
  {
    tableNumber: 9,
    tableLocation: 'Window Alcove • Table 9',
    customerNote: 'Missing side of garlic truffle butter for the ribeye dish. Assigned employee hasn’t returned to check on us.',
    severity: 'critical'
  },
  {
    tableNumber: 15,
    tableLocation: 'Garden Lounge • Table 15',
    customerNote: 'The draft near the overhead AC vent is too cold for our elderly guest. Could someone adjust temperature or bring a blanket?',
    severity: 'moderate'
  },
  {
    tableNumber: 3,
    tableLocation: 'Chef’s Counter • Seat 3-4',
    customerNote: 'We have been waiting 25 mins for our dessert course to drop. Can an admin check the pastry station timing?',
    severity: 'critical'
  },
  {
    tableNumber: 21,
    tableLocation: 'Private Cellar • Table 21',
    customerNote: 'Accidental spill of red wine on tablecloth. Need discreet cleanup and fresh cloth napkins immediately.',
    severity: 'critical'
  },
  {
    tableNumber: 14,
    tableLocation: 'East Courtyard • Table 14',
    customerNote: 'Can we request gluten-free bread substitutes for the appetizer dip? Digital menu showed allergy option.',
    severity: 'general'
  }
];

const STORAGE_KEY = 'smartdine_customer_reports_v1';

export default function CustomerReportsModule({ className = '' }) {
  // Reports state initialized from localStorage with fallback
  const [reports, setReports] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return INITIAL_REPORTS;
  });

  // Current filter tab: 'all' | 'new' | 'in_progress' | 'resolved'
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'critical' | 'moderate' | 'general'
  const [isMuted, setIsMuted] = useState(false);
  const [ticker, setTicker] = useState(0);

  // Modals state
  // Dispatch Modal
  const [dispatchModalReport, setDispatchModalReport] = useState(null);
  const [selectedStaffToDispatch, setSelectedStaffToDispatch] = useState(STAFF_ROSTER[1].id);
  const [dispatchPriorityNote, setDispatchPriorityNote] = useState('');

  // Reassign Modal
  const [reassignModalReport, setReassignModalReport] = useState(null);
  const [selectedStaffToReassign, setSelectedStaffToReassign] = useState(STAFF_ROSTER[2].id);

  // Resolve Modal
  const [resolveModalReport, setResolveModalReport] = useState(null);
  const [resolutionInput, setResolutionInput] = useState('');

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // Save to localStorage whenever reports change
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      } catch (_) {}
    }
  }, [reports]);

  // Periodic ticker to recalculate elapsed relative times every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Show auto-dismissing toast
  const triggerToast = useCallback((title, subtitle = '', type = 'info') => {
    setToastMessage({ title, subtitle, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Format relative timestamp
  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [ticker]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = reports.length;
    const urgentNew = reports.filter((r) => r.status === 'new').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    const criticalCount = reports.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length;
    return { total, urgentNew, inProgress, resolved, criticalCount };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Tab filter
      if (activeTab === 'new' && item.status !== 'new') return false;
      if (activeTab === 'in_progress' && item.status !== 'in_progress') return false;
      if (activeTab === 'resolved' && item.status !== 'resolved') return false;

      // Severity filter
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTable = String(item.tableNumber).includes(q) || (item.tableLocation || '').toLowerCase().includes(q);
        const matchesNote = (item.customerNote || '').toLowerCase().includes(q);
        const staff = STAFF_ROSTER.find((s) => s.id === item.assignedStaffId);
        const matchesStaff = staff && staff.name.toLowerCase().includes(q);
        const matchesRes = (item.resolutionNote || '').toLowerCase().includes(q);
        if (!matchesTable && !matchesNote && !matchesStaff && !matchesRes) {
          return false;
        }
      }

      return true;
    });
  }, [reports, activeTab, severityFilter, searchQuery]);

  // Direct Action 1: Assign / Dispatch Employee via Dropdown (updates state immediately)
  const handleDirectAssignEmployee = (reportId, newStaffId) => {
    const targetStaff = STAFF_ROSTER.find((s) => s.id === newStaffId) || STAFF_ROSTER[0];
    const targetReport = reports.find((r) => r.id === reportId);
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            assignedStaffId: targetStaff.id,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatchLog: {
              staffId: targetStaff.id,
              timestamp: Date.now(),
              note: `Direct dispatch: ${targetStaff.name} assigned to Table ${r.tableNumber}`
            }
          };
        }
        return r;
      })
    );
    chimeSynthesizer.playSuccessChime();
    triggerToast(
      `Assigned ${targetStaff.name} to Table ${targetReport ? targetReport.tableNumber : ''}`,
      `Employee assigned and dispatched immediately.`,
      'success'
    );
  };

  // Direct Action 2: Priority Ping Button (updates state immediately)
  const handlePriorityPing = (report) => {
    const assignedStaff = STAFF_ROSTER.find((s) => s.id === report.assignedStaffId) || STAFF_ROSTER[0];
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === report.id) {
          return {
            ...r,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatchLog: {
              staffId: assignedStaff.id,
              timestamp: Date.now(),
              note: `Priority Ping: Urgent assistance beamed to ${assignedStaff.name} for Table ${r.tableNumber}!`
            }
          };
        }
        return r;
      })
    );
    chimeSynthesizer.playUrgentChime();
    triggerToast(
      `Priority Ping Sent!`,
      `Urgent alert beamed to ${assignedStaff.name} for Table ${report.tableNumber}.`,
      'critical'
    );
  };

  // Direct Action 3: Mark Resolved Button (updates state immediately)
  const handleDirectMarkResolved = (report) => {
    const resolvedTimeMs = Date.now();
    const elapsedMinutes = Math.max(1, Math.round((resolvedTimeMs - report.createdAt) / 60000));
    const resolutionTimeString = `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'}`;
    const defaultNote = report.customerNote.toLowerCase().includes('napkin') || report.customerNote.toLowerCase().includes('water')
      ? 'Delivered napkins and fresh water promptly; customer verified satisfied.'
      : report.customerNote.toLowerCase().includes('warm') || report.customerNote.toLowerCase().includes('steak')
      ? 'Kitchen reprepared hot Wagyu steak with priority manager table check.'
      : report.customerNote.toLowerCase().includes('bill')
      ? 'Payment settled smoothly and applied dining discount.'
      : 'Resolved table inquiry directly with customer; full dining satisfaction confirmed.';

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === report.id) {
          return {
            ...r,
            status: 'resolved',
            resolvedAt: resolvedTimeMs,
            resolutionTime: resolutionTimeString,
            resolutionNote: `Resolved - ${defaultNote}`
          };
        }
        return r;
      })
    );
    chimeSynthesizer.playSuccessChime();
    triggerToast(
      `Table ${report.tableNumber} Marked as Resolved!`,
      `Audited in ${resolutionTimeString}. Logged into quality records.`,
      'success'
    );
  };

  // Direct Action 4: Reopen Issue
  const handleDirectReopen = (report) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === report.id) {
          return {
            ...r,
            status: 'in_progress',
            resolvedAt: null,
            resolutionTime: null,
            resolutionNote: null
          };
        }
        return r;
      })
    );
    triggerToast(`Table ${report.tableNumber} Reopened`, `Issue status changed back to In Progress.`, 'info');
  };

  // 1-Click Action 1: Open Dispatch Modal
  const handleOpenDispatch = (report) => {
    setDispatchModalReport(report);
    // Default to an available employee
    const available = STAFF_ROSTER.find((s) => s.status === 'available' && s.id !== report.assignedStaffId);
    setSelectedStaffToDispatch(available ? available.id : STAFF_ROSTER[0].id);
    setDispatchPriorityNote('');
  };

  // Submit Dispatch Action
  const handleConfirmDispatch = () => {
    if (!dispatchModalReport) return;
    const targetStaff = STAFF_ROSTER.find((s) => s.id === selectedStaffToDispatch) || STAFF_ROSTER[0];
    const reportId = dispatchModalReport.id;

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            assignedStaffId: targetStaff.id,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatchLog: {
              staffId: targetStaff.id,
              timestamp: Date.now(),
              note: dispatchPriorityNote.trim()
                ? `Priority dispatch: "${dispatchPriorityNote.trim()}"`
                : `Urgent priority dispatch: ${targetStaff.name} sent to Table ${r.tableNumber}`
            }
          };
        }
        return r;
      })
    );

    chimeSynthesizer.playSuccessChime();
    triggerToast(
      `Dispatched ${targetStaff.name} to Table ${dispatchModalReport.tableNumber}`,
      `Urgent priority alert beamed to staff handheld device.`,
      'success'
    );
    setDispatchModalReport(null);
  };

  // 1-Click Action 2: Open Reassign Modal
  const handleOpenReassign = (report) => {
    setReassignModalReport(report);
    const other = STAFF_ROSTER.find((s) => s.id !== report.assignedStaffId && s.status === 'available') || STAFF_ROSTER[0];
    setSelectedStaffToReassign(other.id);
  };

  // Submit Reassignment Action
  const handleConfirmReassign = () => {
    if (!reassignModalReport) return;
    const newStaff = STAFF_ROSTER.find((s) => s.id === selectedStaffToReassign) || STAFF_ROSTER[0];
    const prevStaff = STAFF_ROSTER.find((s) => s.id === reassignModalReport.assignedStaffId);
    const reportId = reassignModalReport.id;

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            assignedStaffId: newStaff.id,
            status: r.status === 'new' ? 'in_progress' : r.status,
            dispatchLog: {
              staffId: newStaff.id,
              timestamp: Date.now(),
              note: `Table reassigned from ${prevStaff ? prevStaff.name : 'previous employee'} to ${newStaff.name} due to pace of service.`
            }
          };
        }
        return r;
      })
    );

    chimeSynthesizer.playSuccessChime();
    triggerToast(
      `Table ${reassignModalReport.tableNumber} Reassigned to ${newStaff.name}`,
      `Previous employee released. Service continuity restored.`,
      'success'
    );
    setReassignModalReport(null);
  };

  // 1-Click Action 3: Open Mark as Resolved Modal
  const handleOpenResolve = (report) => {
    setResolveModalReport(report);
    // Provide smart default preset based on note
    if (report.customerNote.toLowerCase().includes('napkin') || report.customerNote.toLowerCase().includes('water')) {
      setResolutionInput('Napkins delivered immediately and complimentary drink served.');
    } else if (report.customerNote.toLowerCase().includes('warm') || report.customerNote.toLowerCase().includes('food') || report.customerNote.toLowerCase().includes('steak')) {
      setResolutionInput('Chef prepared fresh hot Wagyu steak & manager table-check complete.');
    } else if (report.customerNote.toLowerCase().includes('bill') || report.customerNote.toLowerCase().includes('credit')) {
      setResolutionInput('Bill split successfully across 3 cards and dining discount applied.');
    } else {
      setResolutionInput('Resolved with customer directly; diner fully satisfied.');
    }
  };

  // Submit Resolution Action
  const handleConfirmResolve = () => {
    if (!resolveModalReport) return;
    const reportId = resolveModalReport.id;
    const resolvedTimeMs = Date.now();
    const elapsedMinutes = Math.max(1, Math.round((resolvedTimeMs - resolveModalReport.createdAt) / 60000));
    const resolutionTimeString = `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'}`;

    const noteToSave = resolutionInput.trim() || 'Resolved by Manager with table follow-up.';

    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'resolved',
            resolvedAt: resolvedTimeMs,
            resolutionTime: resolutionTimeString,
            resolutionNote: noteToSave.startsWith('Resolved -') ? noteToSave : `Resolved - ${noteToSave}`
          };
        }
        return r;
      })
    );

    chimeSynthesizer.playSuccessChime();
    triggerToast(
      `Table ${resolveModalReport.tableNumber} Marked as Resolved!`,
      `Audited in ${resolutionTimeString}. Logged into resolved history.`,
      'success'
    );
    setResolveModalReport(null);
  };

  // 5. "Simulate New Customer Note" Demo Trigger
  const handleSimulateNewCustomerNote = () => {
    const randomTemplate = SIMULATION_NOTE_POOL[Math.floor(Math.random() * SIMULATION_NOTE_POOL.length)];
    // Pick an employee
    const randomStaff = STAFF_ROSTER[Math.floor(Math.random() * STAFF_ROSTER.length)];
    
    const newReport = {
      id: `rep-${Date.now().toString().slice(-4)}`,
      tableNumber: randomTemplate.tableNumber,
      tableLocation: randomTemplate.tableLocation,
      customerNote: randomTemplate.customerNote,
      severity: randomTemplate.severity,
      status: 'new',
      createdAt: Date.now(),
      assignedStaffId: randomStaff.id,
      dispatchLog: null,
      resolvedAt: null,
      resolutionTime: null,
      resolutionNote: null
    };

    setReports((prev) => [newReport, ...prev]);

    // Play chime sound
    chimeSynthesizer.playUrgentChime();

    // Trigger high-priority alert toast
    triggerToast(
      `🚨 LIVE ALERT: Table ${newReport.tableNumber} Customer Report!`,
      `"${newReport.customerNote.slice(0, 65)}..."`,
      'critical'
    );
  };

  // Reset to original demo dataset
  const handleResetDemo = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset all customer reports back to clean demo initial state?')) {
      setReports(INITIAL_REPORTS);
      triggerToast('Reset Complete', 'Default 4 reports restored.', 'info');
    }
  };

  return (
    <div
      className={`customer-reports-module text-[#f8fafc] rounded-3xl border border-[#334155] shadow-2xl relative overflow-hidden w-full ${className}`}
      style={{ width: '100%', padding: '24px 28px', backgroundColor: '#0f172a', boxSizing: 'border-box' }}
    >
      
      {/* Subtle Ambient Radial Highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5A26]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-800/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* =========================================================================
          LIVE FLOATING TOAST NOTIFICATION
          ========================================================================= */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-fadeIn shadow-2xl">
          <div className={`p-4 rounded-2xl border backdrop-blur-xl flex items-start gap-3 shadow-2xl ${
            toastMessage.type === 'critical'
              ? 'bg-rose-950/95 border-rose-500/70 text-rose-100 ring-2 ring-rose-500/50 shadow-rose-900/50'
              : toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100 ring-2 ring-emerald-500/40 shadow-emerald-900/50'
              : 'bg-[#1e293b] border-[#334155] text-slate-200'
          }`}>
            <div className="mt-0.5 shrink-0">
              {toastMessage.type === 'critical' ? (
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center animate-bounce">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              ) : toastMessage.type === 'success' ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-slate-300 border border-[#334155] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-sm font-black tracking-tight">{toastMessage.title}</h4>
              {toastMessage.subtitle && (
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toastMessage.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. DIRECT CONSUMER-TO-ADMIN CHANNEL: HEADER & DESCRIPTION
          ========================================================================= */}
      <div className="p-6 sm:p-8 border-b border-[#334155] relative z-10 bg-[#111827] rounded-2xl mb-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Header Title & Explanatory Badge */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] text-white flex items-center justify-center shadow-lg shadow-[#FF5A26]/30 ring-1 ring-[#FF7A45]/40 shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-[#f8fafc] tracking-tight">
                    Customer Reports &amp; Direct-to-Admin Notes
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/40 text-rose-400 animate-pulse">
                    Live Channel
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Direct Consumer-to-Admin communication loop. These reports and notes originate <strong className="text-slate-100">exclusively from the customer digital menu</strong> directly to executive floor management, bypassing service bottlenecks for immediate intervention.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar: Simulate Demo & Audio Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-start lg:self-center">
            
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                chimeSynthesizer.isMuted = next;
                if (!next) chimeSynthesizer.playSuccessChime();
              }}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMuted
                  ? 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-900/30'
              }`}
              title={isMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio ON'}</span>
            </button>

            {/* Reset Demo Button */}
            <button
              type="button"
              onClick={handleResetDemo}
              className="p-2.5 rounded-2xl bg-[#1e293b] hover:bg-slate-700 border border-[#334155] text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Reset to 4 initial default demo reports"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* 5. "SIMULATE NEW CUSTOMER NOTE" DEMO BUTTON */}
            <button
              type="button"
              onClick={handleSimulateNewCustomerNote}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] hover:from-[#FF7A45] hover:to-[#FF5A26] text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF5A26]/40 ring-1 ring-[#FF7A45]/60 transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer group"
              title="Simulate receiving an instant customer issue from a diner table in real-time"
            >
              <Flame className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform animate-pulse" />
              <span>Simulate New Customer Note</span>
              <PlusCircle className="w-4 h-4 opacity-80" />
            </button>

          </div>

        </div>

        {/* =========================================================================
            1. METRIC COUNTERS: Total Notes, Urgent / New, In Progress, Resolved
            ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          
          {/* Total Notes */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 transition-all hover:border-slate-500 shadow-sm">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
              <span>Total Notes</span>
              <MessageSquare className="w-4 h-4 text-[#FF7A45]" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#f8fafc] tracking-tight">{metrics.total}</span>
              <span className="text-xs text-slate-400">received</span>
            </div>
          </div>

          {/* Urgent / New */}
          <div className={`rounded-2xl p-4 transition-all border shadow-sm ${
            metrics.urgentNew > 0
              ? 'bg-[#1e293b] border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30'
              : 'bg-[#1e293b] border-[#334155] text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className={metrics.urgentNew > 0 ? 'text-rose-400' : 'text-slate-400'}>Urgent / New</span>
              <AlertTriangle className={`w-4 h-4 ${metrics.urgentNew > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-black tracking-tight ${metrics.urgentNew > 0 ? 'text-rose-300' : 'text-[#f8fafc]'}`}>
                {metrics.urgentNew}
              </span>
              <span className="text-xs font-semibold">
                {metrics.urgentNew > 0 ? 'require action' : 'all dispatched'}
              </span>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 transition-all hover:border-amber-500/40 shadow-sm">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
              <span className="text-amber-400">In Progress</span>
              <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-300 tracking-tight">{metrics.inProgress}</span>
              <span className="text-xs text-amber-300/80">being handled</span>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 transition-all hover:border-emerald-500/40 shadow-sm">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold uppercase tracking-wider">
              <span className="text-emerald-400">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-300 tracking-tight">{metrics.resolved}</span>
              <span className="text-xs text-emerald-300/80">closed cases</span>
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          FILTER TABS, SEVERITY SELECTOR & SEARCH
          ========================================================================= */}
      <div className="p-4 sm:p-6 bg-[#111827] border-b border-[#334155] rounded-2xl mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative z-10 shadow-xl">
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#1e293b] rounded-2xl border border-[#334155] overflow-x-auto">
          {[
            { id: 'all', label: 'All Reports', count: metrics.total },
            { id: 'new', label: 'New Issues', count: metrics.urgentNew, highlight: metrics.urgentNew > 0 },
            { id: 'in_progress', label: 'In Progress', count: metrics.inProgress },
            { id: 'resolved', label: 'Resolved', count: metrics.resolved },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] text-white shadow-md shadow-[#FF5A26]/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === tab.id
                  ? 'bg-black/30 text-white'
                  : tab.highlight
                  ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                  : 'bg-[#0f172a] text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Severity Filter & Search Bar */}
        <div className="flex items-center gap-2.5">
          
          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] focus:outline-none focus:border-[#FF5A26] cursor-pointer"
          >
            <option value="all" className="bg-[#111827]">All Severities</option>
            <option value="critical" className="bg-[#111827]">Critical / High</option>
            <option value="moderate" className="bg-[#111827]">Moderate</option>
            <option value="general" className="bg-[#111827]">General Note</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, note, or employee..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#FF5A26]"
            />
          </div>

        </div>

      </div>

      {/* =========================================================================
          2. REPORT CARDS LIST & 4. RESOLVED HISTORY LOG
          ========================================================================= */}
      <div className="space-y-4 relative z-10 mb-6">
        
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#111827] rounded-3xl border border-dashed border-[#334155]">
            <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#f8fafc]">No reports found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No customer reports match your current filters. Tap "Simulate New Customer Note" above to test receiving live notes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => {
              const assignedStaff = STAFF_ROSTER.find((s) => s.id === report.assignedStaffId) || STAFF_ROSTER[0];
              const isCritical = report.severity === 'critical';
              const isModerate = report.severity === 'moderate';
              const isResolved = report.status === 'resolved';
              const isNew = report.status === 'new';
              const isInProgress = report.status === 'in_progress';

              return (
                <div
                  key={report.id}
                  className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 shadow-xl space-y-4 relative ${
                    isCritical && !isResolved
                      ? 'bg-[#111827] border-rose-500/50 hover:border-rose-500/70 ring-1 ring-rose-500/20 shadow-rose-950/20'
                      : isResolved
                      ? 'bg-[#111827] border-emerald-500/30 hover:border-emerald-500/50 opacity-95'
                      : 'bg-[#111827] border-[#334155] hover:border-slate-600'
                  }`}
                >
                  
                  {/* Top Bar: Table Badge, Severity, Status, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                    
                    {/* Left: Table Badge & Table Location */}
                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#FF5A26]/20 to-[#FF7A45]/15 border border-[#FF5A26]/40 text-white font-black text-sm flex items-center gap-2 shadow-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A26] animate-pulse" />
                        <span>Table {report.tableNumber}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-300">
                        {report.tableLocation}
                      </span>
                    </div>

                    {/* Right: Badges & Timestamp */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      
                      {/* Severity Badge */}
                      {isCritical && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600/20 border border-rose-500/50 text-rose-300 shadow-xs shadow-rose-950/50 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Critical / High</span>
                        </span>
                      )}

                      {isModerate && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Moderate</span>
                        </span>
                      )}

                      {!isCritical && !isModerate && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>General Note</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      {isNew && (
                        <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-500/40">
                          New Issue
                        </span>
                      )}

                      {isInProgress && (
                        <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400 animate-spin-slow" />
                          <span>In Progress</span>
                        </span>
                      )}

                      {isResolved && (
                        <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Resolved</span>
                        </span>
                      )}

                      {/* Timestamp & Elapsed */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pl-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatTimeAgo(report.createdAt)}</span>
                      </div>

                    </div>

                  </div>

                  {/* Customer Note / Complaint Text */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#FF5A26]" />
                      <span>Customer Digital Menu Note:</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] text-[#f8fafc] text-sm sm:text-base font-medium leading-relaxed shadow-inner">
                      "{report.customerNote}"
                    </div>
                  </div>

                  {/* Employee Assignment Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={assignedStaff.avatar}
                          alt={assignedStaff.name}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#334155] shadow-sm"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e293b] ${
                            assignedStaff.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          title={`Status: ${assignedStaff.status}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#f8fafc]">{assignedStaff.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#0f172a] text-slate-300 border border-[#334155]">
                            {assignedStaff.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          Assigned table lead &bull; Workload: <strong className="text-slate-200">{assignedStaff.activeTable}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Dispatch info if exists */}
                    {report.dispatchLog && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 max-w-md">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{report.dispatchLog.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Resolved Details Banner if Resolved */}
                  {isResolved && (
                    <div className="p-4 rounded-2xl bg-[#1e293b] border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Quality Audit Log • Issue Closed</span>
                        </span>
                        <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg text-[11px]">
                          Resolution Time: {report.resolutionTime || 'Under 15 mins'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed italic">
                        "{report.resolutionNote}"
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-emerald-300/70 pt-1 border-t border-emerald-500/20">
                        <span>Audited by Floor Manager</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenResolve(report)}
                            className="text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                            title="Edit resolution audit note"
                          >
                            Edit Note
                          </button>
                          <span>Closed {formatTimeAgo(report.resolvedAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =========================================================================
                      ADMIN ACTION BAR (Assign/Dispatch Employee dropdown, Priority Ping, Mark Resolved)
                      Aligned in a clean flex row at the bottom of the card
                      ========================================================================= */}
                  <div className="pt-3 border-t border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Assign/Dispatch Employee Dropdown & Modal Triggers */}
                    <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                        <UserPlus className="w-3.5 h-3.5 text-[#FF7A45]" />
                        <span>Assign Employee:</span>
                      </span>
                      <select
                        value={report.assignedStaffId || ''}
                        onChange={(e) => handleDirectAssignEmployee(report.id, e.target.value)}
                        className="flex-1 bg-[#1e293b] border border-[#334155] text-xs font-semibold text-[#f8fafc] rounded-xl py-2 px-3 focus:outline-none focus:border-[#FF5A26] cursor-pointer"
                        title="1-click direct dispatch employee"
                      >
                        {STAFF_ROSTER.map((staff) => (
                          <option key={staff.id} value={staff.id} className="bg-[#111827] text-[#f8fafc]">
                            {staff.name} — {staff.role} ({staff.status})
                          </option>
                        ))}
                      </select>
                      {/* Open Dispatch Directives Modal */}
                      <button
                        type="button"
                        onClick={() => handleOpenDispatch(report)}
                        className="p-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-[#f8fafc] border border-[#334155] text-xs font-bold transition shrink-0 cursor-pointer"
                        title="Open Dispatch Directives Modal with priority notes"
                      >
                        <Send className="w-3.5 h-3.5 text-[#FF7A45]" />
                      </button>
                      {/* Open Reassign Table Modal */}
                      <button
                        type="button"
                        onClick={() => handleOpenReassign(report)}
                        className="p-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-[#f8fafc] border border-[#334155] text-xs font-bold transition shrink-0 cursor-pointer"
                        title="Open Reassign Table Modal"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>

                    {/* Right: Priority Ping Button & Mark Resolved Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Priority Ping button */}
                      <button
                        type="button"
                        onClick={() => handlePriorityPing(report)}
                        className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-500 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title="Send urgent priority ping to assigned employee"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Priority Ping</span>
                      </button>

                      {/* Mark Resolved controls */}
                      {!isResolved ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDirectMarkResolved(report)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Mark as resolved immediately with automatic resolution note (1-click)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Mark Resolved</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenResolve(report)}
                            className="p-2 rounded-xl bg-[#1e293b] hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                            title="Resolve with custom resolution note & quick presets modal"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenResolve(report)}
                            className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition flex items-center gap-1.5 border border-[#334155] cursor-pointer"
                            title="Edit resolution audit note"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Resolved ✓ (Edit Note)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectReopen(report)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-slate-400 hover:text-[#f8fafc] text-xs font-bold transition border border-[#334155] cursor-pointer"
                            title="Click to reopen issue"
                          >
                            <span>Reopen</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* =========================================================================
          4. RESOLVED QUALITY AUDITING METRICS STRIP
          ========================================================================= */}
      <div className="p-6 bg-[#111827] border-t border-[#334155] rounded-2xl mb-4 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
            Quality Auditing &amp; Resolution Performance Metrics
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                Avg Resolution Time
              </span>
              <span className="text-2xl font-black text-[#f8fafc] mt-1 block">8.5 mins</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                Resolution Rate
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">97.8%</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
                Customer Recovery Score
              </span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">4.9 / 5.0</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: ASSIGN / DISPATCH EMPLOYEE MODAL
          ========================================================================= */}
      {dispatchModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] border border-[#334155] rounded-3xl p-6 shadow-2xl space-y-5 text-[#f8fafc]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A26]/20 text-[#FF7A45] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f8fafc]">
                    Dispatch Employee to Table {dispatchModalReport.tableNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Send high-priority intervention alert to staff handheld
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalReport(null)}
                className="text-slate-400 hover:text-[#f8fafc] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complaint Context Preview */}
            <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] text-xs space-y-1">
              <span className="font-bold text-[#FF7A45] uppercase tracking-wider block text-[10px]">
                Issue Description:
              </span>
              <p className="text-[#f8fafc] font-medium">"{dispatchModalReport.customerNote}"</p>
            </div>

            {/* Select Active Employee */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Select Floor Employee:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {STAFF_ROSTER.map((staff) => {
                  const isSelected = selectedStaffToDispatch === staff.id;
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => setSelectedStaffToDispatch(staff.id)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF5A26]/15 border-[#FF5A26] text-[#f8fafc] ring-1 ring-[#FF7A45]'
                          : 'bg-[#1e293b] border-[#334155] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#f8fafc] block truncate">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{staff.role}</span>
                        <span className={`text-[9px] font-black uppercase ${
                          staff.status === 'available' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {staff.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Directives Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Priority Directive Note (Optional):
              </label>
              <input
                type="text"
                value={dispatchPriorityNote}
                onChange={(e) => setDispatchPriorityNote(e.target.value)}
                placeholder="e.g. Bring extra napkins and ice water immediately with apology"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#FF5A26]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setDispatchModalReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A26] to-[#FF7A45] hover:from-[#FF7A45] hover:to-[#FF5A26] text-[#f8fafc] text-xs font-black shadow-lg shadow-[#FF5A26]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Urgent Dispatch</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REASSIGN TABLE MODAL
          ========================================================================= */}
      {reassignModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] border border-[#334155] rounded-3xl p-6 shadow-2xl space-y-5 text-[#f8fafc]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f8fafc]">
                    Reassign Table {reassignModalReport.tableNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Swap employee if table pace or attention is lagging
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalReport(null)}
                className="text-slate-400 hover:text-[#f8fafc] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Employee vs Replacement */}
            <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Employee</span>
                <span className="text-[#f8fafc] font-bold">
                  {STAFF_ROSTER.find((s) => s.id === reassignModalReport.assignedStaffId)?.name || 'Marcus Vance'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold block">New Assigned Lead</span>
                <span className="text-[#f8fafc] font-bold">
                  {STAFF_ROSTER.find((s) => s.id === selectedStaffToReassign)?.name}
                </span>
              </div>
            </div>

            {/* Selection Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Choose Replacement Employee:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {STAFF_ROSTER.filter((s) => s.id !== reassignModalReport.assignedStaffId).map((staff) => {
                  const isSelected = selectedStaffToReassign === staff.id;
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => setSelectedStaffToReassign(staff.id)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-[#f8fafc] ring-1 ring-amber-400'
                          : 'bg-[#1e293b] border-[#334155] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#f8fafc] block truncate">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{staff.role}</span>
                        <span className={`text-[9px] font-black uppercase ${
                          staff.status === 'available' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {staff.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setReassignModalReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-[#f8fafc] text-xs font-black shadow-lg shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Confirm Reassignment</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: MARK AS RESOLVED MODAL WITH QUICK PRESETS
          ========================================================================= */}
      {resolveModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#111827] border border-[#334155] rounded-3xl p-6 shadow-2xl space-y-5 text-[#f8fafc]">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f8fafc]">
                    Resolve Table {resolveModalReport.tableNumber} Issue
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record resolution note for quality auditing &amp; service log
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalReport(null)}
                className="text-slate-400 hover:text-[#f8fafc] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original Complaint Review */}
            <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-[#334155] text-xs space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                Original Customer Complaint:
              </span>
              <p className="text-[#f8fafc] font-medium italic">"{resolveModalReport.customerNote}"</p>
            </div>

            {/* Quick Resolution Preset Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Quick Preset Resolution Templates:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Delivered napkins and fresh water with complimentary drink.',
                  'Wagyu steak refired hot by Head Chef; customer delighted.',
                  'Split bill across three cards & applied dining promo.',
                  'Manager table visit completed; guest satisfaction confirmed.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResolutionInput(preset)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1e293b] hover:bg-emerald-950/40 border border-[#334155] hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-emerald-200 text-left transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Resolution &amp; Audit Note:
              </label>
              <textarea
                rows={3}
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="Enter actions taken to resolve the complaint..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => setResolveModalReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#f8fafc] text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Resolution &amp; Close Case</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
