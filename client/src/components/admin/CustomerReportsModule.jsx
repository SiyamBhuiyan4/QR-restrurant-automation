import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  UserPlus,
  Search,
  Check,
  X,
  Volume2,
  VolumeX,
  Send,
  Zap,
  RotateCcw,
  Plus,
  ArrowRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Audio chime (Web Audio API — no external assets)
// ─────────────────────────────────────────────────────────────────────────────
class Chime {
  constructor() { this.ctx = null; this.muted = false; }
  _init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) this.ctx = new A();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  _play(freq1, freq2, delay = 0.12) {
    if (this.muted) return;
    try {
      this._init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [[freq1, 0, 0.35, 'sine', 0.3], [freq2, delay, 0.7, 'triangle', 0.25]].forEach(([f, d, dur, type, vol]) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t + d);
        g.gain.setValueAtTime(vol, t + d);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t + d); o.stop(t + d + dur);
      });
    } catch (_) {}
  }
  urgent()  { this._play(880, 1320); }
  success() { this._play(523, 659); }
}
const chime = new Chime();

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────
const STAFF = [
  { id: 'emp-1', name: 'Marcus Vance',    role: 'Floor Employee',      status: 'busy',      zone: 'Table 4' },
  { id: 'emp-2', name: 'Elena Rostova',   role: 'Senior Floor Lead',   status: 'available', zone: 'Floor Lead' },
  { id: 'emp-3', name: 'David Kim',       role: 'Senior Captain',      status: 'available', zone: 'Booth Section' },
  { id: 'emp-4', name: 'Sophia Chen',     role: 'Sommelier & Host',    status: 'available', zone: 'Balcony' },
  { id: 'emp-5', name: "Liam O'Connor",   role: 'Lead Runner',         status: 'available', zone: 'Expedite Pass' },
  { id: 'emp-6', name: 'Isabella Diaz',   role: 'VIP Concierge',       status: 'available', zone: 'Private Dining' },
];

const DEMO_POOL = [
  { table: 9,  note: 'Missing side of garlic truffle butter for the ribeye.',         severity: 'critical' },
  { table: 15, note: 'Too cold near AC vent — elderly guest needs a blanket.',         severity: 'moderate' },
  { table: 3,  note: 'Waiting 25 mins for dessert course.',                            severity: 'critical' },
  { table: 21, note: 'Red wine spill — need fresh tablecloth immediately.',            severity: 'critical' },
  { table: 14, note: 'Requesting gluten-free bread substitutes for the appetizer dip.',severity: 'general'  },
];

const INITIAL_REPORTS = [
  {
    id: 'rep-101', table: 4, note: 'Requested extra napkins and water 10 mins ago — no one came.',
    severity: 'critical', status: 'new', createdAt: Date.now() - 4 * 60000,
    staffId: 'emp-1', dispatch: null, resolvedAt: null, resolutionTime: null, resolutionNote: null
  },
  {
    id: 'rep-102', table: 12, note: 'Food arrived warm instead of hot. Wagyu steak needs reheating.',
    severity: 'critical', status: 'new', createdAt: Date.now() - 9 * 60000,
    staffId: 'emp-2', dispatch: null, resolvedAt: null, resolutionTime: null, resolutionNote: null
  },
  {
    id: 'rep-103', table: 7, note: 'Need help splitting bill across three cards with corporate dining credit.',
    severity: 'moderate', status: 'in_progress', createdAt: Date.now() - 18 * 60000,
    staffId: 'emp-3',
    dispatch: { staffId: 'emp-3', note: 'David dispatched with wireless handheld POS.' },
    resolvedAt: null, resolutionTime: null, resolutionNote: null
  },
  {
    id: 'rep-104', table: 18, note: 'Anniversary celebration — requesting two complimentary champagne flutes.',
    severity: 'general', status: 'resolved', createdAt: Date.now() - 42 * 60000,
    staffId: 'emp-4',
    dispatch: { staffId: 'emp-4', note: 'Sophia notified for anniversary hospitality package.' },
    resolvedAt: Date.now() - 28 * 60000, resolutionTime: '14 mins',
    resolutionNote: 'Delivered complimentary Prosecco flutes & macaron board.'
  },
];

const STORAGE_KEY = 'smartdine_customer_reports_v2';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return 'Just now';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${Math.max(1, s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const SEV_CONFIG = {
  critical: { label: 'Critical', color: 'text-rose-400',   bg: 'bg-rose-500/15 border-rose-500/40',   dot: 'bg-rose-500',   icon: AlertTriangle },
  moderate: { label: 'Moderate', color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/40', dot: 'bg-amber-400',  icon: AlertCircle   },
  general:  { label: 'General',  color: 'text-slate-400',  bg: 'bg-slate-700/40 border-slate-600/40', dot: 'bg-slate-500',  icon: MessageSquare },
};

const STATUS_CONFIG = {
  new:         { label: 'New',         pill: 'bg-rose-500/20 text-rose-300 border-rose-500/30',       dot: 'bg-rose-500 animate-pulse' },
  in_progress: { label: 'In Progress', pill: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   dot: 'bg-amber-400' },
  resolved:    { label: 'Resolved',    pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SevBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.general;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerReportsModule({ className = '' }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_REPORTS;
  });

  const [tab, setTab]                   = useState('all');
  const [severity, setSeverity]         = useState('all');
  const [search, setSearch]             = useState('');
  const [muted, setMuted]               = useState(false);
  const [toast, setToast]               = useState(null);
  const [tick, setTick]                 = useState(0);

  // Modals
  const [dispatchRpt, setDispatchRpt]   = useState(null);
  const [dispatchStaff, setDispatchStaff] = useState(STAFF[1].id);
  const [dispatchNote, setDispatchNote] = useState('');
  const [reassignRpt, setReassignRpt]   = useState(null);
  const [reassignStaff, setReassignStaff] = useState(STAFF[2].id);
  const [resolveRpt, setResolveRpt]     = useState(null);
  const [resolveNote, setResolveNote]   = useState('');

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch (_) {}
  }, [reports]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => ({
    total:      reports.length,
    newCount:   reports.filter(r => r.status === 'new').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved:   reports.filter(r => r.status === 'resolved').length,
  }), [reports]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (tab === 'new' && r.status !== 'new') return false;
      if (tab === 'in_progress' && r.status !== 'in_progress') return false;
      if (tab === 'resolved' && r.status !== 'resolved') return false;
      if (severity !== 'all' && r.severity !== severity) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const staff = STAFF.find(s => s.id === r.staffId);
        return (
          String(r.table).includes(q) ||
          r.note.toLowerCase().includes(q) ||
          (staff?.name.toLowerCase().includes(q)) ||
          (r.resolutionNote?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [reports, tab, severity, search]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const assignStaff = (reportId, staffId) => {
    const s = STAFF.find(x => x.id === staffId) || STAFF[0];
    setReports(prev => prev.map(r => r.id !== reportId ? r : {
      ...r, staffId: s.id,
      status: r.status === 'new' ? 'in_progress' : r.status,
      dispatch: { staffId: s.id, note: `${s.name} assigned to Table ${r.table}` }
    }));
    chime.success();
    showToast(`${s.name} assigned`, 'success');
  };

  const priorityPing = (report) => {
    const s = STAFF.find(x => x.id === report.staffId) || STAFF[0];
    setReports(prev => prev.map(r => r.id !== report.id ? r : {
      ...r,
      status: r.status === 'new' ? 'in_progress' : r.status,
      dispatch: { staffId: s.id, note: `Priority ping sent to ${s.name}` }
    }));
    chime.urgent();
    showToast(`Priority ping → ${s.name} (Table ${report.table})`, 'warn');
  };

  const markResolved = (report) => {
    const ms = Date.now();
    const mins = Math.max(1, Math.round((ms - report.createdAt) / 60000));
    setReports(prev => prev.map(r => r.id !== report.id ? r : {
      ...r, status: 'resolved', resolvedAt: ms,
      resolutionTime: `${mins} min${mins === 1 ? '' : 's'}`,
      resolutionNote: 'Resolved — customer confirmed satisfied.'
    }));
    chime.success();
    showToast(`Table ${report.table} resolved`, 'success');
  };

  const reopen = (report) => {
    setReports(prev => prev.map(r => r.id !== report.id ? r : {
      ...r, status: 'in_progress', resolvedAt: null, resolutionTime: null, resolutionNote: null
    }));
    showToast(`Table ${report.table} reopened`, 'info');
  };

  const confirmDispatch = () => {
    if (!dispatchRpt) return;
    const s = STAFF.find(x => x.id === dispatchStaff) || STAFF[0];
    setReports(prev => prev.map(r => r.id !== dispatchRpt.id ? r : {
      ...r, staffId: s.id,
      status: r.status === 'new' ? 'in_progress' : r.status,
      dispatch: { staffId: s.id, note: dispatchNote.trim() || `${s.name} dispatched to Table ${r.table}` }
    }));
    chime.success();
    showToast(`${s.name} dispatched to Table ${dispatchRpt.table}`, 'success');
    setDispatchRpt(null);
  };

  const confirmReassign = () => {
    if (!reassignRpt) return;
    const s = STAFF.find(x => x.id === reassignStaff) || STAFF[0];
    const prev_name = STAFF.find(x => x.id === reassignRpt.staffId)?.name || '—';
    setReports(prev => prev.map(r => r.id !== reassignRpt.id ? r : {
      ...r, staffId: s.id,
      status: r.status === 'new' ? 'in_progress' : r.status,
      dispatch: { staffId: s.id, note: `Reassigned from ${prev_name} → ${s.name}` }
    }));
    chime.success();
    showToast(`Table ${reassignRpt.table} reassigned to ${s.name}`, 'success');
    setReassignRpt(null);
  };

  const confirmResolve = () => {
    if (!resolveRpt) return;
    const ms = Date.now();
    const mins = Math.max(1, Math.round((ms - resolveRpt.createdAt) / 60000));
    const note = resolveNote.trim() || 'Resolved by manager.';
    setReports(prev => prev.map(r => r.id !== resolveRpt.id ? r : {
      ...r, status: 'resolved', resolvedAt: ms,
      resolutionTime: `${mins} min${mins === 1 ? '' : 's'}`,
      resolutionNote: note.startsWith('Resolved') ? note : `Resolved — ${note}`
    }));
    chime.success();
    showToast(`Table ${resolveRpt.table} marked resolved`, 'success');
    setResolveRpt(null);
  };

  const simulateNew = () => {
    const t = DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)];
    const s = STAFF[Math.floor(Math.random() * STAFF.length)];
    const r = {
      id: `rep-${Date.now()}`, table: t.table, note: t.note, severity: t.severity,
      status: 'new', createdAt: Date.now(), staffId: s.id,
      dispatch: null, resolvedAt: null, resolutionTime: null, resolutionNote: null
    };
    setReports(prev => [r, ...prev]);
    chime.urgent();
    showToast(`New report — Table ${t.table}`, 'warn');
  };

  const openDispatch = (report) => {
    setDispatchRpt(report);
    const avail = STAFF.find(s => s.status === 'available' && s.id !== report.staffId);
    setDispatchStaff(avail?.id || STAFF[0].id);
    setDispatchNote('');
  };

  const openReassign = (report) => {
    setReassignRpt(report);
    const other = STAFF.find(s => s.id !== report.staffId && s.status === 'available') || STAFF[0];
    setReassignStaff(other.id);
  };

  const openResolve = (report) => {
    setResolveRpt(report);
    setResolveNote(report.resolutionNote || '');
  };

  const TABS = [
    { id: 'all',         label: 'All',         count: metrics.total      },
    { id: 'new',         label: 'New',          count: metrics.newCount,   alert: metrics.newCount > 0 },
    { id: 'in_progress', label: 'In Progress',  count: metrics.inProgress },
    { id: 'resolved',    label: 'Resolved',     count: metrics.resolved   },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative w-full text-slate-100 ${className}`}
      style={{ backgroundColor: '#0b0f19', minHeight: '100%' }}
    >
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fadeIn">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-semibold backdrop-blur-md ${
            toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200' :
            toast.type === 'warn'    ? 'bg-rose-950/95 border-rose-500/50 text-rose-200' :
                                       'bg-slate-800/95 border-slate-600/50 text-slate-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> :
             toast.type === 'warn'    ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" /> :
                                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />}
            <span>{toast.msg}</span>
            <button type="button" onClick={() => setToast(null)} className="ml-1 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/25 to-orange-600/10 border border-orange-500/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Customer Reports & Notes</h2>
            <p className="text-xs text-slate-500">Direct customer feedback from the digital menu</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            type="button"
            onClick={() => { const next = !muted; setMuted(next); chime.muted = next; if (!next) chime.success(); }}
            className={`p-2 rounded-lg border text-xs transition cursor-pointer ${
              muted ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
            title={muted ? 'Unmute' : 'Mute alerts'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => { if (window.confirm('Reset to default demo reports?')) { setReports(INITIAL_REPORTS); showToast('Reset complete', 'info'); } }}
            className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white text-xs transition cursor-pointer"
            title="Reset demo data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Simulate */}
          <button
            type="button"
            onClick={simulateNew}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulate Report
          </button>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',       value: metrics.total,      color: 'text-white',        accent: 'bg-slate-700/40 border-slate-600/40'           },
          { label: 'New',         value: metrics.newCount,   color: metrics.newCount > 0 ? 'text-rose-300' : 'text-white', accent: metrics.newCount > 0 ? 'bg-rose-500/15 border-rose-500/40' : 'bg-slate-700/40 border-slate-600/40' },
          { label: 'In Progress', value: metrics.inProgress, color: 'text-amber-300',    accent: 'bg-amber-500/10 border-amber-500/30'           },
          { label: 'Resolved',    value: metrics.resolved,   color: 'text-emerald-300',  accent: 'bg-emerald-500/10 border-emerald-500/30'       },
        ].map(k => (
          <div key={k.label} className={`p-4 rounded-xl border ${k.accent} flex flex-col`}>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{k.label}</span>
            <span className={`text-3xl font-extrabold mt-1 ${k.color}`}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 p-3 rounded-xl bg-[#111726]/85 border border-slate-800">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                tab === t.id ? 'bg-black/25 text-white' : t.alert ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-slate-800 text-slate-400'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Severity + Search */}
        <div className="flex items-center gap-2">
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-orange-500/60 cursor-pointer"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="moderate">Moderate</option>
            <option value="general">General</option>
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search table, note, staff..."
              className="w-56 pl-8 pr-3 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60"
            />
          </div>
        </div>
      </div>

      {/* ── Report Cards ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-14 rounded-xl border border-dashed border-slate-800 bg-[#111726]/50">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No reports match your filters</p>
            <p className="text-xs text-slate-600 mt-1">Try adjusting the tab or search query</p>
          </div>
        ) : (
          filtered.map(report => {
            const staff     = STAFF.find(s => s.id === report.staffId) || STAFF[0];
            const isNew     = report.status === 'new';
            const isIP      = report.status === 'in_progress';
            const isRes     = report.status === 'resolved';
            const isCrit    = report.severity === 'critical';

            return (
              <div
                key={report.id}
                className={`rounded-xl border p-4 transition-all ${
                  isCrit && !isRes
                    ? 'bg-[#111726]/85 border-rose-500/30 ring-1 ring-rose-500/10'
                    : isRes
                    ? 'bg-[#111726]/60 border-emerald-500/20 opacity-90'
                    : 'bg-[#111726]/85 border-slate-800'
                }`}
              >
                {/* Card top row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {/* Table badge */}
                    <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold text-xs">
                      Table {report.table}
                    </span>
                    <SevBadge severity={report.severity} />
                    <StatusPill status={report.status} />
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(report.createdAt)}
                  </span>
                </div>

                {/* Note text */}
                <p className="text-sm text-slate-200 font-medium leading-relaxed mb-3 px-1">
                  "{report.note}"
                </p>

                {/* Assigned staff row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0b0f19]/60 border border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar initials */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {staff.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{staff.name}</span>
                        <span className="text-[10px] text-slate-400">{staff.role}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      </div>
                      {report.dispatch && (
                        <p className="text-[11px] text-amber-400/90 mt-0.5 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {report.dispatch.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick assign dropdown */}
                  <select
                    value={report.staffId}
                    onChange={e => assignStaff(report.id, e.target.value)}
                    className="text-xs bg-[#0b0f19] border border-slate-700 text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500/60 cursor-pointer"
                  >
                    {STAFF.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Resolved note */}
                {isRes && report.resolutionNote && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/25 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-200 leading-relaxed">{report.resolutionNote}</p>
                      <span className="text-[11px] text-emerald-400/70 mt-0.5 block">
                        Resolved in {report.resolutionTime || '—'} · {timeAgo(report.resolvedAt)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/60">
                  {/* Left actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openDispatch(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      title="Dispatch employee"
                    >
                      <Send className="w-3.5 h-3.5 text-orange-400" />
                      Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => openReassign(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      title="Reassign to another employee"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      Reassign
                    </button>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1.5">
                    {!isRes && (
                      <button
                        type="button"
                        onClick={() => priorityPing(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Ping
                      </button>
                    )}
                    {!isRes ? (
                      <>
                        <button
                          type="button"
                          onClick={() => markResolved(report)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => openResolve(report)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/40 text-emerald-400 text-xs transition cursor-pointer"
                          title="Resolve with custom note"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reopen(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1 — DISPATCH
      ═══════════════════════════════════════════════════════════════════════ */}
      {dispatchRpt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111726] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dispatch to Table {dispatchRpt.table}</h3>
                  <p className="text-xs text-slate-500">Select employee & add a note</p>
                </div>
              </div>
              <button type="button" onClick={() => setDispatchRpt(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Issue preview */}
            <div className="p-3 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-slate-300 italic">
              "{dispatchRpt.note}"
            </div>

            {/* Staff picker */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Select Employee</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {STAFF.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDispatchStaff(s.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      dispatchStaff === s.id
                        ? 'bg-orange-500/15 border-orange-500/50 text-white'
                        : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-white truncate">{s.name}</div>
                    <div className="text-slate-500 truncate">{s.role}</div>
                    <span className={`text-[10px] font-bold ${s.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {s.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <input
              type="text"
              value={dispatchNote}
              onChange={e => setDispatchNote(e.target.value)}
              placeholder="Optional directive note..."
              className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60"
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setDispatchRpt(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmDispatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold cursor-pointer active:scale-95">
                <Send className="w-3.5 h-3.5" /> Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2 — REASSIGN
      ═══════════════════════════════════════════════════════════════════════ */}
      {reassignRpt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111726] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reassign Table {reassignRpt.table}</h3>
                  <p className="text-xs text-slate-500">Switch to a different employee</p>
                </div>
              </div>
              <button type="button" onClick={() => setReassignRpt(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current → New */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Current</div>
                <div className="text-white font-semibold">{STAFF.find(s => s.id === reassignRpt.staffId)?.name}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-amber-400 uppercase tracking-wider text-[10px]">New</div>
                <div className="text-white font-semibold">{STAFF.find(s => s.id === reassignStaff)?.name}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {STAFF.filter(s => s.id !== reassignRpt.staffId).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setReassignStaff(s.id)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    reassignStaff === s.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-white'
                      : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-white truncate">{s.name}</div>
                  <div className="text-slate-500 truncate">{s.role}</div>
                  <span className={`text-[10px] font-bold ${s.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>{s.status}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setReassignRpt(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmReassign}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer active:scale-95">
                <UserCheck className="w-3.5 h-3.5" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3 — RESOLVE WITH NOTE
      ═══════════════════════════════════════════════════════════════════════ */}
      {resolveRpt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111726] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Resolve Table {resolveRpt.table}</h3>
                  <p className="text-xs text-slate-500">Add a resolution note</p>
                </div>
              </div>
              <button type="button" onClick={() => setResolveRpt(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-slate-400 italic">
              "{resolveRpt.note}"
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Delivered napkins & water.',
                'Chef refired — customer happy.',
                'Bill split & discount applied.',
                'Manager follow-up complete.',
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setResolveNote(p)}
                  className="px-2.5 py-1 rounded-lg bg-[#0b0f19] hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder="Describe what was done to resolve this..."
              className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setResolveRpt(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmResolve}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer active:scale-95">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
