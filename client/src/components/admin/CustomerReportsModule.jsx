import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Check,
  X,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  Plus,
  MessageCircle,
  User,
  Utensils,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCheck,
  Smartphone,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

// ─────────────────────────────────────────────────────────────────────────────
// Audio Synthesizer Chime
// ─────────────────────────────────────────────────────────────────────────────
class ChimeSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _play(freq1, freq2, type = 'sine', duration = 0.3, vol = 0.25, delay = 0.1) {
    if (this.muted) return;
    try {
      this._init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [
        [freq1, 0, duration, type, vol],
        [freq2, delay, duration * 1.2, 'triangle', vol * 0.8]
      ].forEach(([f, d, dur, waveType, v]) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = waveType;
        osc.frequency.setValueAtTime(f, t + d);
        gain.gain.setValueAtTime(v, t + d);
        gain.gain.exponentialRampToValueAtTime(0.001, t + d + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + d);
        osc.stop(t + d + dur);
      });
    } catch (_) {}
  }

  urgent()  { this._play(880, 1320, 'sine', 0.4, 0.3, 0.09); }
  success() { this._play(523, 659, 'triangle', 0.35, 0.25, 0.12); }
  soft()    { this._play(640, 800, 'sine', 0.25, 0.2, 0.08); }
}

const chime = new ChimeSystem();

// ─────────────────────────────────────────────────────────────────────────────
// Real Staff Roster & Venue Table Map
// ─────────────────────────────────────────────────────────────────────────────
export const REAL_STAFF = [
  {
    id: 'emp-1',
    numericId: 1,
    name: 'Rakib Ahmed',
    initials: 'RA',
    role: 'Floor Specialist',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'available',
    zone: 'Tables 1, 6, 11',
    gradient: 'from-amber-500 to-orange-600',
    avatarBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'emp-2',
    numericId: 2,
    name: 'Hasan Mahmud',
    initials: 'HM',
    role: 'Senior Host',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'available',
    zone: 'Tables 2, 7, 12',
    gradient: 'from-blue-500 to-indigo-600',
    avatarBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    id: 'emp-3',
    numericId: 3,
    name: 'Priya Sen',
    initials: 'PS',
    role: 'Operations Lead',
    shift: 'Morning Shift (08:00 - 16:00)',
    status: 'available',
    zone: 'Tables 3, 8',
    gradient: 'from-purple-500 to-pink-600',
    avatarBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'emp-4',
    numericId: 4,
    name: 'Tanvir Rahman',
    initials: 'TR',
    role: 'Floor Specialist',
    shift: 'Mid Shift (12:00 - 20:00)',
    status: 'busy',
    zone: 'Tables 4, 9',
    gradient: 'from-emerald-500 to-teal-600',
    avatarBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'emp-5',
    numericId: 5,
    name: 'Sadia Islam',
    initials: 'SI',
    role: 'Senior Host',
    shift: 'Evening Shift (16:00 - 00:00)',
    status: 'available',
    zone: 'Tables 5, 10',
    gradient: 'from-rose-500 to-pink-600',
    avatarBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
];

export const TABLE_ZONES = {
  1: 'Main Hall',
  2: 'Window Area',
  3: 'Main Hall',
  4: 'Patio West',
  5: 'Window Area',
  6: 'Main Hall',
  7: 'Patio West',
  8: 'Main Hall',
  9: 'Patio East',
  10: 'Private Dining',
  11: 'Main Hall',
  12: 'VIP Terrace',
};

const CUSTOMER_PRESETS = [
  'On our way to your table right now!',
  'Sorry for the delay — your request is being prioritized.',
  'Assistance is arriving at your table in 1 minute.',
  'Thank you for letting us know — fixing this right away.',
  'Requested items are being brought to your table now.',
];

const STAFF_PRESETS = [
  'Please attend Table #{table} immediately.',
  'Jao kaj koro — high priority task right now.',
  'Customer waiting at Table #{table} — resolve and mark done.',
  'Bring the requested items to the table now.',
  'Check in with guest at Table #{table} and confirm satisfaction.',
];

const RESOLUTION_PRESETS = [
  'Delivered requested items & guest confirmed satisfaction.',
  'Table wiped clean & fresh tableware provided promptly.',
  'Kitchen refired order with priority expediting.',
  'AC vent & seating arrangement adjusted to guest comfort.',
  'Split bill completed & loyalty discount applied.',
];

/**
 * Realistic Restaurant Issues for Testing & Simulation:
 * napkins, steak temperature, wine spill, allergy substitute, check split
 */
export const REALISTIC_CUSTOMER_ISSUES = [
  {
    id: 'napkins',
    title: 'Extra Napkins & Cutlery',
    shortLabel: 'Napkins & Cutlery',
    icon: '🧻',
    defaultTable: 4,
    note: 'Requested extra cloth napkins and clean steak knives for Table #4.',
    severity: 'general',
    category: 'Amenities',
    customerName: 'Sultana Begum'
  },
  {
    id: 'steak_temperature',
    title: 'Steak Temperature Refire',
    shortLabel: 'Steak Temperature',
    icon: '🥩',
    defaultTable: 7,
    note: 'Wagyu Ribeye served rare instead of medium; guest requested kitchen refire immediately.',
    severity: 'critical',
    category: 'Kitchen / Quality',
    customerName: 'Tahmid Hasan'
  },
  {
    id: 'wine_spill',
    title: 'Red Wine Spill',
    shortLabel: 'Wine Spill Cleanup',
    icon: '🍷',
    defaultTable: 3,
    note: 'Red wine spilled on Table #3 — urgently need replacement linens, napkins, and floor cleanup.',
    severity: 'critical',
    category: 'Urgent Spill',
    customerName: 'Farhan Zahed'
  },
  {
    id: 'allergy_substitute',
    title: 'Allergy Ingredient Substitute',
    shortLabel: 'Allergy Substitute',
    icon: '⚠️',
    defaultTable: 9,
    note: 'Severe shellfish & peanut allergy; guest requesting confirmed chef substitutions for appetizer dip.',
    severity: 'critical',
    category: 'Food Safety',
    customerName: 'Sadia Akhter'
  },
  {
    id: 'check_split',
    title: 'Check Split Across Cards',
    shortLabel: 'Split Bill 4 Ways',
    icon: '💳',
    defaultTable: 11,
    note: 'Guest requesting bill split 4 ways across corporate credit cards with separate tax receipts.',
    severity: 'moderate',
    category: 'Billing',
    customerName: 'Fahim Morshed'
  }
];

const DEMO_POOL = [
  ...REALISTIC_CUSTOMER_ISSUES.map(issue => ({
    table: issue.defaultTable,
    customerName: issue.customerName,
    note: issue.note,
    severity: issue.severity
  })),
  { table: 1,  customerName: 'Karim Uddin',   note: 'Need child high-chair and extra sanitized wet wipes.', severity: 'moderate' },
  { table: 8,  customerName: 'Sadia Akhter',  note: 'Beverage glass had a small hairline chip; requesting fresh glass.', severity: 'critical' },
  { table: 6,  customerName: 'Imran Hossain', note: 'Requesting gluten-free bread substitutes for the mezze appetizer.', severity: 'general' },
  { table: 5,  customerName: 'Tasnim Ahmed',  note: 'Spilled water on table runner — need quick towel and fresh cloth.', severity: 'critical' },
];

const INITIAL_REPORTS = [
  {
    id: 'rep-101',
    table: 4,
    customerName: 'Rafiqul Islam',
    note: 'Requested extra napkins, water refill, and cutlery 10 mins ago — no one came to the table yet.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 4 * 60000,
    staffId: 'emp-4', // Tanvir Rahman
    dispatch: { staffId: 'emp-4', note: 'Assigned to Tanvir Rahman (Patio West Zone)' },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-102',
    table: 12,
    customerName: 'Mehnaz Haque',
    note: 'Food arrived warm instead of sizzling hot. Wagyu steak needs reheating or fresh kitchen refire.',
    severity: 'critical',
    status: 'new',
    createdAt: Date.now() - 9 * 60000,
    staffId: 'emp-2', // Hasan Mahmud
    dispatch: { staffId: 'emp-2', note: 'Assigned to Hasan Mahmud (VIP Terrace Zone)' },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: []
  },
  {
    id: 'rep-103',
    table: 7,
    customerName: 'Tahmid Hasan',
    note: 'Need help splitting bill across two corporate cards and applying VIP dining club reward.',
    severity: 'moderate',
    status: 'in_progress',
    createdAt: Date.now() - 18 * 60000,
    staffId: 'emp-2', // Hasan Mahmud
    dispatch: { staffId: 'emp-2', note: 'Hasan dispatched with wireless handheld POS terminal.' },
    resolvedAt: null,
    resolutionTime: null,
    resolutionNote: null,
    messages: [
      { id: 'm1', to: 'employee', text: 'Please attend Table 7 immediately with the wireless POS terminal.', sentAt: Date.now() - 15 * 60000, from: 'Admin' },
      { id: 'm2', to: 'customer', text: 'On our way to your table right now with the POS terminal!', sentAt: Date.now() - 14 * 60000, from: 'Admin' },
    ]
  },
  {
    id: 'rep-104',
    table: 2,
    customerName: 'Nadia Karim',
    note: 'AC vent airflow is blowing cold air directly onto Table 2 seating; elderly guest feels uncomfortable.',
    severity: 'general',
    status: 'resolved',
    createdAt: Date.now() - 42 * 60000,
    staffId: 'emp-1', // Rakib Ahmed
    dispatch: { staffId: 'emp-1', note: 'Rakib Ahmed addressed AC vent baffle.' },
    resolvedAt: Date.now() - 28 * 60000,
    resolutionTime: '14 mins',
    resolutionNote: 'Adjusted vent angle upward and provided a warm hospitality wrap.',
    messages: [
      { id: 'm3', to: 'employee', text: 'Check on Table 2 AC vent promptly.', sentAt: Date.now() - 38 * 60000, from: 'Admin' },
      { id: 'm4', to: 'customer', text: 'Assistance is at your table right away to adjust the temperature!', sentAt: Date.now() - 36 * 60000, from: 'Admin' }
    ]
  },
];

export const STORAGE_KEY_V4 = 'smartdine_customer_reports_v4';
export const STORAGE_KEY_V3 = 'smartdine_customer_reports_v3';
export const STORAGE_KEY_REPORTS = STORAGE_KEY_V4;
export const STORAGE_KEY = STORAGE_KEY_V4;
export const MUTED_STORAGE_KEY = 'smartdine_customer_reports_muted';

/**
 * Helper to compute live pending and urgent customer request counts
 * for top-level navigation tabs and badges without full component mounting.
 */
export function getCustomerReportsCount() {
  if (typeof window === 'undefined') {
    return { total: INITIAL_REPORTS.length, pending: 2, urgent: 2, newCount: 2 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V4) || localStorage.getItem(STORAGE_KEY_V3);
    const reports = raw ? JSON.parse(raw) : INITIAL_REPORTS;
    if (Array.isArray(reports)) {
      const pending = reports.filter(r => r.status !== 'resolved');
      const urgent = reports.filter(r => r.status !== 'resolved' && (r.severity === 'critical' || r.status === 'new'));
      const newCount = reports.filter(r => r.status === 'new').length;
      return {
        total: reports.length,
        pending: pending.length,
        urgent: urgent.length,
        newCount
      };
    }
  } catch (e) {
    console.warn('[CustomerReportsModule] getCustomerReportsCount error:', e);
  }
  return { total: 0, pending: 0, urgent: 0, newCount: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return 'Just now';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatClockTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges: Severity & Status
// ─────────────────────────────────────────────────────────────────────────────
function SeverityPill({ severity }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-sm shadow-rose-950/30">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        Critical
      </span>
    );
  }
  if (severity === 'moderate') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        Moderate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800/80 border border-slate-700/80 text-slate-300">
      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      General
    </span>
  );
}

function StatusPill({ status }) {
  if (status === 'new') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-sm shadow-rose-950/40">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
        New Issue
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      Resolved
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Focused Messaging Drawer
// ─────────────────────────────────────────────────────────────────────────────
function InlineMessageDrawer({
  report,
  staff,
  activeTarget,
  onChangeTarget,
  onSendMessage,
  onClose,
  employeeMode,
  currentEmployee
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const messages = report.messages || [];
  const presets = activeTarget === 'customer'
    ? CUSTOMER_PRESETS
    : STAFF_PRESETS.map(p => p.replace('{table}', report.table));

  // Auto-scroll chat history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeTarget]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const sender = employeeMode && currentEmployee ? currentEmployee.name : 'Admin';
    onSendMessage(report.id, activeTarget, inputText.trim(), sender);
    setInputText('');
  };

  const handleApplyPreset = (preset) => {
    setInputText(preset);
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-slate-700/80 bg-[#0B0F19]/95 backdrop-blur-md overflow-hidden shadow-2xl transition-all animate-fadeIn">
      {/* Drawer Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/90 px-3 py-1.5 bg-slate-900/60">
        <div className="flex items-center gap-2">
          {/* Tab 1: Customer */}
          <button
            type="button"
            onClick={() => onChangeTarget('customer')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTarget === 'customer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-cyan-400" />
            <span>Customer (Table #{report.table})</span>
            {messages.filter(m => m.to === 'customer').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200 text-[10px] font-black">
                {messages.filter(m => m.to === 'customer').length}
              </span>
            )}
          </button>

          {/* Tab 2: Staff */}
          <button
            type="button"
            onClick={() => onChangeTarget('employee')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTarget === 'employee'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Staff ({staff?.name || 'Assigned'})</span>
            {messages.filter(m => m.to === 'employee').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-black">
                {messages.filter(m => m.to === 'employee').length}
              </span>
            )}
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close Message Bar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message History Thread */}
      <div className="max-h-44 overflow-y-auto p-3.5 space-y-2.5 bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-slate-500">
              No messages sent yet. Use the presets or write a direct text below.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isCustomer = m.to === 'customer';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md border ${
                    isCustomer
                      ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-100 rounded-tl-sm'
                      : 'bg-amber-950/70 border-amber-500/40 text-amber-100 rounded-tr-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[10px] font-bold opacity-80 pb-0.5 border-b border-white/10">
                    {isCustomer ? (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Utensils className="w-2.5 h-2.5" /> To Table #{report.table} Guest
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Smartphone className="w-2.5 h-2.5" /> To Staff ({staff?.name})
                      </span>
                    )}
                    <span className="ml-auto text-slate-400 font-mono">
                      {m.from ? `${m.from} · ` : ''}{formatClockTime(m.sentAt)}
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed select-text">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick 1-Click Preset Suggestions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-orange-400" />
          <span>One-Click Presets for {activeTarget === 'customer' ? `Table #${report.table}` : staff?.name}:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-left ${
                activeTarget === 'customer'
                  ? 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
                  : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/30 text-amber-300 hover:border-amber-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box & Send Button */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              activeTarget === 'customer'
                ? `Direct SMS / notification to Table #${report.table} customer...`
                : `Directive to ${staff?.name} (e.g. jao kaj koro / attend table immediately)...`
            }
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-500 bg-[#0B0F19] border focus:outline-none transition ${
              activeTarget === 'customer'
                ? 'border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40'
                : 'border-amber-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim()}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTarget === 'customer'
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Resolution Drawer
// ─────────────────────────────────────────────────────────────────────────────
function InlineResolutionDrawer({ report, onConfirm, onCancel }) {
  const [note, setNote] = useState('');

  return (
    <div className="mt-3.5 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Add Resolution Note for Table #{report.table}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {RESOLUTION_PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setNote(p)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/20 text-emerald-200 transition cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Custom resolution memo (e.g. Handled by staff, guest satisfied)..."
          className="flex-1 px-3 py-2 rounded-xl text-xs bg-[#0B0F19] border border-emerald-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={() => onConfirm(note)}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Confirm Resolved</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master CustomerReportsModule Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerReportsModule({
  className = '',
  isEmbedded = false,
  employeeMode = false,
  currentEmployeeId = 'emp-1'
}) {
  // Restaurant Context for dynamic table and floor employee routing
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  // ── State ──────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_V4) || localStorage.getItem(STORAGE_KEY_V3);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(r => ({ messages: [], ...r }));
          }
        }
      }
    } catch (_) {}
    return INITIAL_REPORTS;
  });

  const [tab, setTab] = useState('all'); // 'all' | 'new' | 'in_progress' | 'resolved' | 'assigned_to_me'
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStaffId, setActiveStaffId] = useState(currentEmployeeId);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  // Mute audio state
  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
      }
    } catch (_) {}
    return false;
  });

  // Track active messaging drawers: { [reportId]: 'customer' | 'employee' }
  const [activeDrawers, setActiveDrawers] = useState({});

  // Track inline resolution drawers: { [reportId]: boolean }
  const [resolutionDrawers, setResolutionDrawers] = useState({});

  // ── Sync Mute with Chime ───────────────────────────────────────────────────
  useEffect(() => {
    chime.muted = muted;
    try {
      localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
    } catch (_) {}
  }, [muted]);

  // ── Periodic Tick to Refresh Elapsed Time Badges ───────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // ── Persist Reports to LocalStorage & Dispatch Event ───────────────────────
  const saveReports = useCallback((newReports) => {
    setReports(newReports);
    try {
      const payload = JSON.stringify(newReports);
      localStorage.setItem(STORAGE_KEY_V4, payload);
      localStorage.setItem(STORAGE_KEY_V3, payload);
      window.dispatchEvent(new CustomEvent('smartdine:report_updated', {
        detail: { reports: newReports }
      }));
      window.dispatchEvent(new CustomEvent('smartdine:reports-updated', {
        detail: { reports: newReports }
      }));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('smartdine_restaurant_state');
          bc.postMessage({ type: 'REPORTS_UPDATED', data: newReports, timestamp: Date.now() });
          bc.close();
        } catch (_) {}
      }
    } catch (_) {}
  }, []);

  // ── Toast Notification ────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Listen to Cross-tab & Cross-module Updates ────────────────────────────
  useEffect(() => {
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.onmessage = (e) => {
          if (!e.data) return;

          if (e.data.type === 'REPORTS_UPDATED' && Array.isArray(e.data.data)) {
            setReports(e.data.data);
          } else if (e.data.type === 'SYNC_ALL' && Array.isArray(e.data.data?.reports)) {
            setReports(e.data.data.reports);
          } else if (e.data.type === 'CUSTOMER_REPLY' && e.data.data) {
            const reply = e.data.data;
            setReports(prev => {
              const updated = prev.map(r => {
                const matchesId = reply.reportId && r.id === reply.reportId;
                const matchesTable = reply.table && Number(r.table) === Number(reply.table) && r.status !== 'resolved';
                if (matchesId || matchesTable) {
                  const already = (r.messages || []).some(m => m.id === reply.id);
                  if (already) return r;
                  return {
                    ...r,
                    messages: [
                      ...(r.messages || []),
                      {
                        id: reply.id || `reply-${Date.now()}`,
                        to: 'staff',
                        from: reply.from || `Customer (Table #${reply.table})`,
                        text: reply.text,
                        sentAt: reply.sentAt || Date.now()
                      }
                    ]
                  };
                }
                return r;
              });
              try {
                localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(updated));
                localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(updated));
              } catch (_) {}
              return updated;
            });
            chime.urgent();
            showToast(`💬 Reply from Table #${reply.table}: "${reply.text}"`, 'warn');
          } else if (e.data.type === 'NEW_CUSTOMER_REPORT' && e.data.data) {
            const newRpt = e.data.data;
            setReports(prev => {
              if (prev.some(r => r.id === newRpt.id)) return prev;
              const next = [newRpt, ...prev];
              try {
                localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(next));
                localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(next));
              } catch (_) {}
              return next;
            });
            chime.urgent();
            showToast(`🚨 New Request from Table #${newRpt.table}`, 'warn');
          }
        };
      } catch (_) {}
    }

    const handleStorage = (e) => {
      if ((e.key === STORAGE_KEY_V4 || e.key === STORAGE_KEY_V3) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setReports(parsed);
        } catch (_) {}
      } else if (e.key === 'smartdine_customer_reply' && e.newValue) {
        try {
          const reply = JSON.parse(e.newValue);
          setReports(prev => {
            const updated = prev.map(r => {
              const matchesId = reply.reportId && r.id === reply.reportId;
              const matchesTable = reply.table && Number(r.table) === Number(reply.table) && r.status !== 'resolved';
              if (matchesId || matchesTable) {
                const already = (r.messages || []).some(m => m.id === reply.id);
                if (already) return r;
                return {
                  ...r,
                  messages: [
                    ...(r.messages || []),
                    {
                      id: reply.id || `reply-${Date.now()}`,
                      to: 'staff',
                      from: reply.from || `Customer (Table #${reply.table})`,
                      text: reply.text,
                      sentAt: reply.sentAt || Date.now()
                    }
                  ]
                };
              }
              return r;
            });
            return updated;
          });
          chime.urgent();
          showToast(`💬 Reply from Table #${reply.table}: "${reply.text}"`, 'warn');
        } catch (_) {}
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail?.reports) {
        setReports(e.detail.reports);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('smartdine:report_updated', handleCustomEvent);
    window.addEventListener('smartdine:reports-updated', handleCustomEvent);
    return () => {
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('smartdine:report_updated', handleCustomEvent);
      window.removeEventListener('smartdine:reports-updated', handleCustomEvent);
    };
  }, [showToast]);

  // ── Current Active Employee (in employeeMode or assignment selector) ───────
  const currentEmployee = useMemo(() => {
    return REAL_STAFF.find(s => s.id === activeStaffId) || REAL_STAFF[0];
  }, [activeStaffId]);

  // ── KPI Metrics ───────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = reports.length;
    const newCount = reports.filter(r => r.status === 'new').length;
    const inProgress = reports.filter(r => r.status === 'in_progress').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    const assignedToActive = reports.filter(r => r.staffId === activeStaffId && r.status !== 'resolved').length;

    // Calculate average resolution turnaround
    const resolvedItems = reports.filter(r => r.status === 'resolved' && r.resolvedAt && r.createdAt);
    let avgMins = '—';
    if (resolvedItems.length > 0) {
      const totalMins = resolvedItems.reduce((acc, curr) => acc + (curr.resolvedAt - curr.createdAt) / 60000, 0);
      avgMins = `${Math.round(totalMins / resolvedItems.length)}m`;
    }

    return { total, newCount, inProgress, resolved, assignedToActive, avgMins };
  }, [reports, activeStaffId]);

  // ── Filtered List ─────────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Tab filter
      if (tab === 'new' && r.status !== 'new') return false;
      if (tab === 'in_progress' && r.status !== 'in_progress') return false;
      if (tab === 'resolved' && r.status !== 'resolved') return false;
      if (tab === 'assigned_to_me' && r.staffId !== activeStaffId) return false;

      // Severity filter
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const staff = REAL_STAFF.find(s => s.id === r.staffId);
        const zone = TABLE_ZONES[r.table] || '';
        return (
          String(r.table).includes(q) ||
          r.note.toLowerCase().includes(q) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          (staff && staff.name.toLowerCase().includes(q)) ||
          (zone && zone.toLowerCase().includes(q)) ||
          (r.resolutionNote && r.resolutionNote.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [reports, tab, severityFilter, searchQuery, activeStaffId]);

  // ── Action Handlers ───────────────────────────────────────────────────────

  // 1. Assign Staff (Immediate 1-click dropdown)
  const handleAssignStaff = useCallback((reportId, staffId) => {
    const staff = REAL_STAFF.find(s => s.id === staffId) || REAL_STAFF[0];
    const updated = reports.map(r => {
      if (r.id !== reportId) return r;
      return {
        ...r,
        staffId: staff.id,
        status: r.status === 'new' ? 'in_progress' : r.status,
        dispatch: {
          staffId: staff.id,
          note: `Assigned to ${staff.name} (${staff.zone})`
        }
      };
    });
    saveReports(updated);
    chime.success();
    showToast(`✓ Assigned Table #${reports.find(r => r.id === reportId)?.table} to ${staff.name}`, 'success');
  }, [reports, saveReports, showToast]);

  // 2. Toggle or Switch Messaging Drawer
  const handleToggleDrawer = useCallback((reportId, target) => {
    setActiveDrawers(prev => {
      if (prev[reportId] === target) {
        // Close if same button clicked again
        const copy = { ...prev };
        delete copy[reportId];
        return copy;
      }
      return { ...prev, [reportId]: target };
    });
  }, []);

  // 3. Send Message (to customer or staff)
  const handleSendMessage = useCallback((reportId, to, text, senderName) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const timestamp = Date.now();
    const staff = REAL_STAFF.find(s => s.id === report.staffId) || REAL_STAFF[0];

    const newMsg = {
      id: `msg-${timestamp}-${Math.random().toString(36).substr(2, 4)}`,
      to,
      text: text.trim(),
      sentAt: timestamp,
      from: senderName || (to === 'customer' ? (staff?.name ? `Staff (${staff.name})` : 'Management') : 'Admin'),
      staffId: staff.id,
      staffName: staff.name,
      table: Number(report.table),
      reportId: report.id
    };

    if (to === 'customer') {
      // ── TEXT TO CUSTOMER (Table #X) ──
      const tableNum = Number(report.table);
      const tableMsgPayload = {
        id: newMsg.id,
        table: tableNum,
        text: text.trim(),
        from: senderName || (staff?.name ? `Staff (${staff.name})` : 'Floor Management'),
        staffName: staff?.name || 'Floor Management',
        staffId: staff.id,
        sentAt: timestamp,
        reportId: report.id,
        unread: true
      };

      // 1. Save latest message for this table in localStorage
      try {
        localStorage.setItem(`smartdine_table_msg_${tableNum}`, JSON.stringify(tableMsgPayload));
        const histKey = `smartdine_table_msgs_${tableNum}`;
        const rawHist = localStorage.getItem(histKey);
        const histList = rawHist ? JSON.parse(rawHist) : [];
        if (Array.isArray(histList)) {
          histList.push(tableMsgPayload);
          localStorage.setItem(histKey, JSON.stringify(histList.slice(-20)));
        }
      } catch (err) {
        console.warn('[CustomerReportsModule] Error saving table msg:', err);
      }

      // 2. Broadcast via BroadcastChannel
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('smartdine_restaurant_state');
          bc.postMessage({
            type: 'CUSTOMER_MESSAGE',
            data: tableMsgPayload,
            timestamp
          });
          bc.close();
        }
      } catch (_) {}

      // 3. Dispatch custom window event (for same-window / embedded simulator iframes)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartdine:table_message', { detail: tableMsgPayload }));
      }

      chime.soft();
      showToast(`✓ Direct message sent to Table #${report.table} Customer`, 'info');
    } else {
      // ── TEXT TO STAFF ({employeeName}) ──
      // Requirement 2:
      // - Save dispatch message in report's thread
      // - Update report status to 'in_progress' and log dispatch timestamp
      // - Show quick audible chime (Web Audio) and toast notification
      const dispatchRecord = {
        staffId: staff.id,
        staffName: staff.name,
        note: `Directive sent: "${text.trim()}"`,
        dispatchedAt: timestamp,
        dispatchedBy: senderName || 'Admin'
      };

      // Broadcast staff dispatch across tabs
      try {
        const staffDispatchPayload = {
          id: newMsg.id,
          reportId: report.id,
          table: report.table,
          staffId: staff.id,
          staffName: staff.name,
          text: text.trim(),
          dispatchedAt: timestamp
        };
        localStorage.setItem('smartdine_last_staff_dispatch', JSON.stringify(staffDispatchPayload));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('smartdine_restaurant_state');
          bc.postMessage({
            type: 'STAFF_DISPATCH',
            data: staffDispatchPayload,
            timestamp
          });
          bc.close();
        }
      } catch (_) {}

      chime.success();
      showToast(`✓ Dispatched directive to ${staff.name} for Table #${report.table}`, 'success');
    }

    const updated = reports.map(r => {
      if (r.id !== reportId) return r;
      return {
        ...r,
        messages: [...(r.messages || []), newMsg],
        // When texting employee, always ensure status is in_progress and log dispatch timestamp
        status: to === 'employee' ? 'in_progress' : (r.status === 'new' ? 'in_progress' : r.status),
        dispatch: to === 'employee'
          ? {
              staffId: staff.id,
              staffName: staff.name,
              note: `Directive sent: "${text.trim()}"`,
              dispatchedAt: timestamp,
              dispatchedBy: senderName || 'Admin'
            }
          : r.dispatch
      };
    });

    saveReports(updated);
  }, [reports, saveReports, showToast]);

  // 4. Mark Resolved
  const handleMarkResolved = useCallback((reportId, customNote = '') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const now = Date.now();
    const elapsedMinutes = Math.max(1, Math.round((now - report.createdAt) / 60000));
    const finalNote = customNote.trim() || 'Resolved — customer confirmed satisfied.';

    const updated = reports.map(r => {
      if (r.id !== reportId) return r;
      return {
        ...r,
        status: 'resolved',
        resolvedAt: now,
        resolutionTime: `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'}`,
        resolutionNote: finalNote
      };
    });

    saveReports(updated);
    chime.success();
    // Close resolution drawer if open
    setResolutionDrawers(prev => ({ ...prev, [reportId]: false }));
    showToast(`✓ Table #${report.table} marked resolved (${elapsedMinutes}m turnaround)`, 'success');
  }, [reports, saveReports, showToast]);

  // 5. Reopen
  const handleReopen = useCallback((reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const updated = reports.map(r => {
      if (r.id !== reportId) return r;
      return {
        ...r,
        status: 'in_progress',
        resolvedAt: null,
        resolutionTime: null,
        resolutionNote: null
      };
    });

    saveReports(updated);
    showToast(`Table #${report.table} request reopened`, 'warn');
  }, [reports, saveReports, showToast]);

  // 6. Simulate Customer Request (napkins, steak temperature, wine spill, allergy substitute, check split)
  const handleSimulateCustomerRequest = useCallback((issueId = null, overrideTable = null) => {
    let issue = null;
    if (issueId) {
      issue = REALISTIC_CUSTOMER_ISSUES.find(i => i.id === issueId);
    }
    if (!issue) {
      issue = REALISTIC_CUSTOMER_ISSUES[Math.floor(Math.random() * REALISTIC_CUSTOMER_ISSUES.length)];
    }

    const targetTable = overrideTable ? Number(overrideTable) : issue.defaultTable;
    const staff = (restaurant?.getAssignedEmployeeForTable?.(targetTable)) ||
      REAL_STAFF.find(s => s.zone?.includes(String(targetTable))) ||
      REAL_STAFF[Math.floor(Math.random() * REAL_STAFF.length)];

    const now = Date.now();
    const newReport = {
      id: `rep-${now}-${Math.random().toString(36).substr(2, 4)}`,
      table: targetTable,
      customerName: issue.customerName || `Guest (Table #${targetTable})`,
      note: issue.note,
      severity: issue.severity,
      status: 'new',
      createdAt: now,
      staffId: staff.id,
      dispatch: { staffId: staff.id, note: `Auto-assigned to ${staff.name} (${staff.role})` },
      resolvedAt: null,
      resolutionTime: null,
      resolutionNote: null,
      messages: []
    };

    saveReports([newReport, ...reports]);

    // Register with Restaurant Context assistance calls so floor map highlights table
    if (restaurant?.registerAssistanceCall) {
      restaurant.registerAssistanceCall({
        id: `call-${now}`,
        tableNumber: targetTable,
        table_number: targetTable,
        table: targetTable,
        reason: `${issue.shortLabel}: ${issue.note}`,
        type: issue.id,
        customMessage: issue.note,
        timestamp: now
      });
    } else {
      try {
        const storedCalls = JSON.parse(localStorage.getItem('smartdine_active_assistance_calls') || '[]');
        const newCall = {
          id: `call-${now}`,
          tableNumber: targetTable,
          reason: `${issue.shortLabel}: ${issue.note}`,
          type: issue.id,
          status: 'pending',
          timestamp: now,
          assignedEmployeeName: staff.name
        };
        localStorage.setItem('smartdine_active_assistance_calls', JSON.stringify([newCall, ...storedCalls]));
      } catch (_) {}
    }

    // Broadcast across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({
          type: 'NEW_CUSTOMER_REPORT',
          data: newReport,
          timestamp: now
        });
        bc.close();
      }
    } catch (_) {}

    chime.urgent();
    showToast(`🚨 Simulated: ${issue.title} (Table #${targetTable})`, 'warn');
  }, [reports, saveReports, showToast, restaurant]);

  // Alias for backward-compatibility
  const handleSimulateNew = useCallback(() => {
    handleSimulateCustomerRequest();
  }, [handleSimulateCustomerRequest]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative w-full text-slate-100 ${
        isEmbedded ? 'p-0' : 'p-4 sm:p-6 lg:p-8'
      } ${className}`}
      style={{ backgroundColor: '#0B0F19', minHeight: '100%' }}
    >
      {/* ── Global Floating Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn pointer-events-none">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl pointer-events-auto text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
                : toast.type === 'warn'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/50 animate-bounce'
                : 'bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/60'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="leading-tight">{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Top Header & Actions ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-[1px] shadow-lg shadow-orange-500/20 flex-shrink-0">
            <div className="w-full h-full rounded-2xl bg-[#0B0F19] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {employeeMode ? 'Staff Floor Requests & Notes' : 'Customer Reports & Notes'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300">
                Live Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Direct table assistance · Assign staff · 2-way text with customer or staff · Instant resolution
            </p>
          </div>
        </div>

        {/* Right Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Active Employee Selector in employeeMode */}
          {employeeMode && (
            <div className="flex items-center gap-2 bg-[#111726]/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Staff:</span>
              <select
                value={activeStaffId}
                onChange={(e) => setActiveStaffId(e.target.value)}
                className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
              >
                {REAL_STAFF.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.initials})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (!next) chime.success();
            }}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              muted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
            title={muted ? 'Unmute Audio Chimes' : 'Mute Audio Alerts'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* ── Realistic Customer Request Simulation Suite ── */}
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSimulateMenu(prev => !prev)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black shadow-lg shadow-orange-500/25 transition active:scale-95 cursor-pointer"
              title="Simulate realistic customer issues: napkins, steak temperature, wine spill, allergy substitute, check split"
            >
              <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Simulate Customer Request</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Quick 1-click issue launcher buttons */}
            <div className="hidden lg:flex items-center gap-1 bg-[#111726] border border-slate-800 rounded-xl p-1">
              {REALISTIC_CUSTOMER_ISSUES.map(issue => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => handleSimulateCustomerRequest(issue.id)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer flex items-center gap-1"
                  title={`Simulate ${issue.title} (Table #${issue.defaultTable})`}
                >
                  <span>{issue.icon}</span>
                  <span className="hidden xl:inline">{issue.shortLabel.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Dropdown Menu */}
            {showSimulateMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#0f172a]/95 border border-amber-500/40 p-2.5 shadow-2xl z-50 animate-fadeIn backdrop-blur-xl text-slate-100">
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 border-b border-slate-800">
                  <span>Realistic Restaurant Issues</span>
                  <button
                    type="button"
                    onClick={() => setShowSimulateMenu(false)}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 mt-2">
                  {REALISTIC_CUSTOMER_ISSUES.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => {
                        handleSimulateCustomerRequest(issue.id);
                        setShowSimulateMenu(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-800/80 transition cursor-pointer text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{issue.icon}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white group-hover:text-amber-300 truncate">
                            {issue.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Table #{issue.defaultTable} &bull; {issue.category}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        issue.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : issue.severity === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {issue.severity}
                      </span>
                    </button>
                  ))}

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleSimulateCustomerRequest();
                        setShowSimulateMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Random Realistic Issue</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Executive KPI Metrics ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {/* Metric 1: Total */}
        <div className="p-4 rounded-2xl bg-[#111726]/90 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Reports</span>
            <MessageSquare className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{metrics.total}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">All customer logs</span>
          </div>
        </div>

        {/* Metric 2: Urgent / New */}
        <div
          className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between transition-all ${
            metrics.newCount > 0
              ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
              : 'bg-[#111726]/90 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              New / Urgent
            </span>
            {metrics.newCount > 0 ? (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                metrics.newCount > 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {metrics.newCount}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Needs floor dispatch</span>
          </div>
        </div>

        {/* Metric 3: In Progress */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-300">{metrics.inProgress}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Staff on way to table</span>
          </div>
        </div>

        {/* Metric 4: Resolved */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300">{metrics.resolved}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Confirmed satisfied</span>
          </div>
        </div>

        {/* Metric 5: Avg Turnaround or Assigned to Me */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 rounded-2xl bg-[#111726]/90 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {employeeMode ? 'My Active' : 'Avg Resolution'}
            </span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-300">
              {employeeMode ? metrics.assignedToActive : metrics.avgMins}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {employeeMode ? `Assigned to ${currentEmployee.name}` : 'Floor response rate'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Clean Filter & Search Header ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 p-3 rounded-2xl bg-[#111726]/90 border border-slate-800/80 backdrop-blur-md">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Requests', count: metrics.total },
            { id: 'new', label: 'New Issues', count: metrics.newCount, alert: metrics.newCount > 0 },
            { id: 'in_progress', label: 'In Progress', count: metrics.inProgress },
            { id: 'resolved', label: 'Resolved', count: metrics.resolved },
            ...(employeeMode
              ? [{ id: 'assigned_to_me', label: `My Assigned (${currentEmployee.initials})`, count: metrics.assignedToActive }]
              : [])
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  tab === t.id
                    ? 'bg-black/30 text-white'
                    : t.alert
                    ? 'bg-rose-500/30 text-rose-300 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-2">
          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Issues</option>
            <option value="moderate">Moderate</option>
            <option value="general">General Requests</option>
          </select>

          {/* Real-time Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, note, staff..."
              className="w-48 sm:w-60 pl-8 pr-7 py-2 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Report Cards Container ────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-800 bg-[#111726]/40 backdrop-blur-md">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No customer reports match this view</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Change your filters or click "Simulate Report" to test live table notifications.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const staff = REAL_STAFF.find(s => s.id === report.staffId) || REAL_STAFF[0];
            const isResolved = report.status === 'resolved';
            const isCritical = report.severity === 'critical';
            const tableZone = TABLE_ZONES[report.table] || 'Main Hall';
            const drawerTarget = activeDrawers[report.id] || null;
            const isResDrawerOpen = resolutionDrawers[report.id] || false;

            const customerMsgs = (report.messages || []).filter(m => m.to === 'customer');
            const staffMsgs = (report.messages || []).filter(m => m.to === 'employee');

            return (
              <div
                key={report.id}
                className={`admin-card border p-4 sm:p-5 transition-all duration-200 backdrop-blur-md shadow-xl ${
                  isCritical && !isResolved
                    ? 'bg-[#111726]/95 border-rose-500/40 shadow-rose-950/20 ring-1 ring-rose-500/20'
                    : isResolved
                    ? 'bg-[#111726]/60 border-emerald-500/25 opacity-90'
                    : 'bg-[#111726]/90 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* ── Top Bar: Table Info + Badges + Timestamp ─────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Table Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 font-black text-xs shadow-sm">
                      <Utensils className="w-3.5 h-3.5 text-orange-400" />
                      Table #{report.table} • {tableZone}
                    </span>

                    {/* Severity Pill */}
                    <SeverityPill severity={report.severity} />

                    {/* Status Pill */}
                    <StatusPill status={report.status} />

                    {/* Guest Name if available */}
                    {report.customerName && (
                      <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                        Guest: <strong className="text-slate-300">{report.customerName}</strong>
                      </span>
                    )}
                  </div>

                  {/* Elapsed Time */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono ml-auto">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{timeAgo(report.createdAt)}</span>
                    <span className="text-slate-600">({formatClockTime(report.createdAt)})</span>
                  </div>
                </div>

                {/* ── Body: Prominent Customer Request Text ─────────────────── */}
                <div className="mb-4 pl-3.5 border-l-2 border-orange-500/60 py-1 bg-slate-900/40 rounded-r-xl pr-3">
                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed select-text">
                    "{report.note}"
                  </p>
                </div>

                {/* ── Resolved Success Banner (if resolved) ────────────────── */}
                {isResolved && report.resolutionNote && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 mb-4 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-200 font-semibold leading-relaxed">
                        {report.resolutionNote}
                      </p>
                      <span className="text-[11px] text-emerald-400/80 mt-0.5 block font-mono">
                        Resolved in {report.resolutionTime || 'few mins'} · {timeAgo(report.resolvedAt)}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Assigned Staff Strip (Inline & Clutter-Free) ──────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F19]/80 border border-slate-800/80 mb-4">
                  {/* Staff Info */}
                  <div className="flex items-center gap-3">
                    {/* Avatar Initials */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border ${staff.avatarBg}`}
                    >
                      {staff.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">{staff.name}</span>
                        <span className="text-[11px] text-slate-400">{staff.role}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            staff.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          title={`Status: ${staff.status}`}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {staff.zone} · {staff.shift}
                      </p>
                    </div>
                  </div>

                  {/* Immediate 1-Click Inline Assignment Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 shrink-0 hidden md:inline">
                      Assign To:
                    </span>
                    <select
                      value={report.staffId}
                      onChange={(e) => handleAssignStaff(report.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 hover:border-amber-500/50 text-xs font-bold text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition shadow-sm"
                    >
                      {REAL_STAFF.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.initials}) — {s.status === 'available' ? '🟢 Free' : '🟡 Busy'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── TWO EXPLICIT TEXT OPTIONS & RESOLUTION CONTROLS ──────── */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
                  {/* Left: Two Clear Communication / Text Options */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* BUTTON 1: Text Customer (Table #) - Cyan Themed */}
                    <button
                      type="button"
                      onClick={() => handleToggleDrawer(report.id, 'customer')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                        drawerTarget === 'customer'
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                          : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5 text-cyan-400" />
                      <span>💬 Text Customer (Table #{report.table})</span>
                      {customerMsgs.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200 text-[10px] font-black">
                          {customerMsgs.length}
                        </span>
                      )}
                    </button>

                    {/* BUTTON 2: Text Staff ({staff.name}) - Amber Themed */}
                    <button
                      type="button"
                      onClick={() => handleToggleDrawer(report.id, 'employee')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                        drawerTarget === 'employee'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      <span>📱 Text Staff ({staff.name.split(' ')[0]})</span>
                      {staffMsgs.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-black">
                          {staffMsgs.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Right: Resolution Control */}
                  <div className="flex items-center gap-2">
                    {!isResolved ? (
                      <>
                        {/* 1-Click Quick Resolve */}
                        <button
                          type="button"
                          onClick={() => handleMarkResolved(report.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>✓ Mark Resolved</span>
                        </button>

                        {/* Optional Memo Toggle */}
                        <button
                          type="button"
                          onClick={() => setResolutionDrawers(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer text-xs"
                          title="Add Custom Resolution Memo"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      /* Reopen Button */
                      <button
                        type="button"
                        onClick={() => handleReopen(report.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>↺ Reopen</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Inline Focused Messaging Bar (Expands seamlessly) ─────── */}
                {drawerTarget && (
                  <InlineMessageDrawer
                    report={report}
                    staff={staff}
                    activeTarget={drawerTarget}
                    onChangeTarget={(t) => setActiveDrawers(prev => ({ ...prev, [report.id]: t }))}
                    onSendMessage={handleSendMessage}
                    onClose={() => setActiveDrawers(prev => {
                      const c = { ...prev };
                      delete c[report.id];
                      return c;
                    })}
                    employeeMode={employeeMode}
                    currentEmployee={currentEmployee}
                  />
                )}

                {/* ── Inline Resolution Drawer (if user requested memo) ─────── */}
                {isResDrawerOpen && (
                  <InlineResolutionDrawer
                    report={report}
                    onConfirm={(note) => handleMarkResolved(report.id, note)}
                    onCancel={() => setResolutionDrawers(prev => ({ ...prev, [report.id]: false }))}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
