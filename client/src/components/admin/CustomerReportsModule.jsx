import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Utensils,
  ChevronDown,
  Sparkles,
  Zap,
  ArrowLeft,
  Eye,
  Inbox
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import '../../styles/admin-tables.css';
import '../../styles/admin-feedback.css';

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
// ─────────────────────────────────────────────────────────────────────────────
// Feedback presentation helpers (layout + badges + detail panel)
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY_META = {
  critical: { label: 'Critical', icon: AlertTriangle, tone: 'danger' },
  moderate: { label: 'Moderate', icon: AlertCircle, tone: 'warning' },
  general: { label: 'General', icon: MessageSquare, tone: 'neutral' },
};

const STATUS_META = {
  new: { label: 'New', tone: 'danger' },
  in_progress: { label: 'In review', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const DATE_RANGE_OPTIONS = [
  { id: 'all', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

function isInDateRange(ts, range) {
  if (range === 'all' || !ts) return true;
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  const days = range === '7d' ? 7 : 30;
  return Date.now() - ts <= days * 86400000;
}

function getCategory(report) {
  if (report.category) return report.category;
  const match = REALISTIC_CUSTOMER_ISSUES.find(i => i.note === report.note);
  return match?.category || 'General';
}

function SeverityPill({ severity }) {
  const key = SEVERITY_META[severity] ? severity : 'general';
  const meta = SEVERITY_META[key];
  const Icon = meta.icon;
  return (
    <span className={`fb-pill fb-tone--${meta.tone}`}>
      <Icon className="fb-pill__icon" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function StatusPill({ status }) {
  const key = STATUS_META[status] ? status : 'new';
  const meta = STATUS_META[key];
  return (
    <span className={`fb-pill fb-tone--${meta.tone}`}>
      <span className="fb-dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function FeedbackDetail({
  report,
  staff,
  employeeMode,
  currentEmployee,
  onAssign,
  onMarkInReview,
  onResolve,
  onReopen,
  onSend,
  onBack
}) {
  const [target, setTarget] = useState('customer');
  const [draft, setDraft] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const isResolved = report.status === 'resolved';
  const messages = report.messages || [];
  const presets = target === 'customer'
    ? CUSTOMER_PRESETS
    : STAFF_PRESETS.map(p => p.replace('{table}', report.table));
  const sender = employeeMode && currentEmployee ? currentEmployee.name : 'Admin';

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(report.id, target, text, sender);
    setDraft('');
  };

  const handleResolve = () => {
    onResolve(report.id, resolveNote);
    setResolveOpen(false);
    setResolveNote('');
  };

  return (
    <article className="fb-detail" aria-label={`Table ${report.table} request`}>
      <header className="fb-detail__head">
        <button type="button" className="fb-btn fb-btn--ghost fb-detail__back" onClick={onBack}>
          <ArrowLeft className="fb-icon" aria-hidden="true" />
          <span>Back to list</span>
        </button>
        <div className="fb-detail__title-row">
          <div className="fb-min">
            <p className="fb-eyebrow">Table #{report.table} · {TABLE_ZONES[report.table] || 'Main Hall'}</p>
            <h3 className="fb-detail__title">
              {report.customerName ? `Request from ${report.customerName}` : 'Customer request'}
            </h3>
          </div>
          <div className="fb-detail__pills">
            <SeverityPill severity={report.severity} />
            <StatusPill status={report.status} />
          </div>
        </div>
      </header>

      <blockquote className="fb-quote">{report.note}</blockquote>

      {isResolved && report.resolutionNote && (
        <div className="fb-callout fb-callout--success">
          <CheckCircle2 className="fb-icon fb-callout__icon" aria-hidden="true" />
          <div className="fb-min">
            <strong>Resolved{report.resolutionTime ? ` in ${report.resolutionTime}` : ''}</strong>
            <p>{report.resolutionNote}</p>
          </div>
        </div>
      )}

      <dl className="fb-meta">
        <div><dt>Table</dt><dd>#{report.table}</dd></div>
        <div><dt>Category</dt><dd>{getCategory(report)}</dd></div>
        <div><dt>Guest</dt><dd>{report.customerName || '—'}</dd></div>
        <div><dt>Received</dt><dd>{formatClockTime(report.createdAt)} · {timeAgo(report.createdAt)}</dd></div>
        <div><dt>Resolved at</dt><dd>{isResolved && report.resolvedAt ? formatClockTime(report.resolvedAt) : '—'}</dd></div>
        <div><dt>Turnaround</dt><dd>{report.resolutionTime || '—'}</dd></div>
      </dl>

      <section className="fb-section" aria-label="Assigned staff">
        <h4 className="fb-section__title">Assigned staff</h4>
        <div className="fb-staff">
          <div className="fb-avatar" aria-hidden="true">{staff.initials}</div>
          <div className="fb-staff__info">
            <strong>{staff.name}</strong>
            <span>{staff.zone}</span>
            {report.dispatch?.note && <span>{report.dispatch.note}</span>}
          </div>
          <select
            aria-label="Assign staff"
            className="fb-select fb-select--auto"
            value={report.staffId}
            onChange={(e) => onAssign(report.id, e.target.value)}
          >
            {REAL_STAFF.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.status === 'available' ? 'Free' : 'Busy'}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="fb-section" aria-label="Status actions">
        <h4 className="fb-section__title">Status</h4>
        <div className="fb-actions">
          {!isResolved && report.status === 'new' && (
            <button type="button" className="fb-btn fb-btn--info" onClick={() => onMarkInReview(report.id)}>
              <Eye className="fb-icon" aria-hidden="true" />
              <span>Mark in review</span>
            </button>
          )}
          {!isResolved && (
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              aria-expanded={resolveOpen}
              onClick={() => setResolveOpen(o => !o)}
            >
              <Check className="fb-icon" aria-hidden="true" />
              <span>Resolve</span>
            </button>
          )}
          {isResolved && (
            <button type="button" className="fb-btn" onClick={() => onReopen(report.id)}>
              <RotateCcw className="fb-icon" aria-hidden="true" />
              <span>Reopen</span>
            </button>
          )}
        </div>

        {resolveOpen && !isResolved && (
          <div className="fb-resolve">
            <div className="fb-chips">
              {RESOLUTION_PRESETS.map((p) => (
                <button key={p} type="button" className="fb-chip" onClick={() => setResolveNote(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="fb-inline-form">
              <input
                type="text"
                className="fb-input"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Resolution note (optional)"
                aria-label="Resolution note"
              />
              <button type="button" className="fb-btn fb-btn--primary" onClick={handleResolve}>
                <span>Confirm resolved</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="fb-section" aria-label="Replies">
        <h4 className="fb-section__title">
          Replies & notes <span className="fb-count">{messages.length}</span>
        </h4>

        <div className="fb-thread">
          {messages.length === 0 ? (
            <p className="fb-muted">No replies yet. Message the guest or dispatch staff below.</p>
          ) : (
            messages.map((m) => {
              const toGuest = m.to === 'customer';
              const toStaff = m.to === 'employee';
              const kind = toGuest ? 'guest' : toStaff ? 'staff' : 'incoming';
              return (
                <div key={m.id} className={`fb-msg fb-msg--${kind}`}>
                  <div className="fb-msg__meta">
                    <span>{toGuest ? 'To guest' : toStaff ? 'To staff' : 'From guest'}</span>
                    <span>{m.from ? `${m.from} · ` : ''}{formatClockTime(m.sentAt)}</span>
                  </div>
                  <p>{m.text}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="fb-composer">
          <div className="fb-segment" role="tablist" aria-label="Message recipient">
            <button
              type="button"
              role="tab"
              aria-selected={target === 'customer'}
              onClick={() => setTarget('customer')}
            >
              Guest (Table #{report.table})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={target === 'employee'}
              onClick={() => setTarget('employee')}
            >
              Staff ({staff.name.split(' ')[0]})
            </button>
          </div>

          <div className="fb-chips">
            {presets.map((preset) => (
              <button key={preset} type="button" className="fb-chip" onClick={() => setDraft(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <div className="fb-inline-form">
            <input
              type="text"
              className="fb-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              aria-label="Message"
              placeholder={
                target === 'customer'
                  ? `Message to the guest at Table #${report.table}...`
                  : `Directive to ${staff.name}...`
              }
            />
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              onClick={handleSend}
              disabled={!draft.trim()}
            >
              <Send className="fb-icon" aria-hidden="true" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </section>
    </article>
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
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
  const categoryOptions = useMemo(
    () => Array.from(new Set(reports.map(getCategory))).sort(),
    [reports]
  );
  const tableOptions = useMemo(
    () => Array.from(new Set(reports.map(r => Number(r.table))))
      .filter(Number.isFinite)
      .sort((a, b) => a - b),
    [reports]
  );
  const activeFilterCount = [
    tab !== 'all',
    categoryFilter !== 'all',
    dateFilter !== 'all',
    tableFilter !== 'all',
    searchQuery.trim() !== ''
  ].filter(Boolean).length;

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter(r => {
      if (tab === 'new' && r.status !== 'new') return false;
      if (tab === 'in_progress' && r.status !== 'in_progress') return false;
      if (tab === 'resolved' && r.status !== 'resolved') return false;
      if (tab === 'assigned_to_me' && r.staffId !== activeStaffId) return false;
      if (categoryFilter !== 'all' && getCategory(r) !== categoryFilter) return false;
      if (tableFilter !== 'all' && String(r.table) !== tableFilter) return false;
      if (!isInDateRange(r.createdAt, dateFilter)) return false;
      if (q) {
        const staff = REAL_STAFF.find(s => s.id === r.staffId);
        const hit =
          String(r.table).includes(q) ||
          (r.note || '').toLowerCase().includes(q) ||
          (r.customerName || '').toLowerCase().includes(q) ||
          (staff?.name || '').toLowerCase().includes(q) ||
          (TABLE_ZONES[r.table] || '').toLowerCase().includes(q) ||
          (r.resolutionNote || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [reports, tab, categoryFilter, tableFilter, dateFilter, searchQuery, activeStaffId]);

  const clearFilters = () => {
    setTab('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setTableFilter('all');
    setSearchQuery('');
  };

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

  // 4b. Mark In Review (new -> in_progress, same status contract as dispatch)
  const handleMarkInReview = useCallback((reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const updated = reports.map(r => (r.id === reportId ? { ...r, status: 'in_progress' } : r));
    saveReports(updated);
    showToast(`Table #${report.table} marked in review`, 'info');
  }, [reports, saveReports, showToast]);

  // ── Render ────────────────────────────────────────────────────────────────
  const selectedReport = filteredReports.find(r => r.id === selectedId) || null;
  const staffFor = (r) => REAL_STAFF.find(s => s.id === r.staffId) || REAL_STAFF[0];

  const summaryTiles = [
    { id: 'all', label: 'Total', value: metrics.total, hint: 'All requests', tone: 'neutral' },
    { id: 'new', label: 'New', value: metrics.newCount, hint: 'Needs dispatch', tone: 'danger' },
    { id: 'in_progress', label: 'In review', value: metrics.inProgress, hint: 'Staff on the way', tone: 'warning' },
    { id: 'resolved', label: 'Resolved', value: metrics.resolved, hint: 'Closed out', tone: 'success' },
  ];

  return (
    <div className={`fb-root ${isEmbedded ? 'fb-root--embedded' : ''} ${className}`}>
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fb-toast fb-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? (
            <CheckCircle2 className="fb-icon" aria-hidden="true" />
          ) : toast.type === 'warn' ? (
            <AlertTriangle className="fb-icon" aria-hidden="true" />
          ) : (
            <MessageSquare className="fb-icon" aria-hidden="true" />
          )}
          <span>{toast.msg}</span>
          <button type="button" className="fb-btn fb-btn--ghost fb-btn--icon" onClick={() => setToast(null)} aria-label="Dismiss">
            <X className="fb-icon" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="fb-header">
        <div className="fb-min">
          <div className="fb-title-row">
            <h2 className="fb-title">
              {employeeMode ? 'Floor requests & feedback' : 'Customer feedback & requests'}
            </h2>
            <span className="fb-live">Live</span>
          </div>
          <p className="fb-subtitle">
            Table requests, assignments and replies in one place.
          </p>
        </div>

        <div className="fb-header__actions">
          {employeeMode && (
            <label className="fb-field fb-field--inline">
              <span>Staff</span>
              <select
                value={activeStaffId}
                onChange={(e) => setActiveStaffId(e.target.value)}
                className="fb-select fb-select--auto"
              >
                {REAL_STAFF.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.initials})</option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className="fb-btn fb-btn--ghost fb-btn--icon"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (!next) chime.success();
            }}
            title={muted ? 'Unmute audio alerts' : 'Mute audio alerts'}
            aria-label={muted ? 'Unmute audio alerts' : 'Mute audio alerts'}
          >
            {muted ? <VolumeX className="fb-icon" aria-hidden="true" /> : <Volume2 className="fb-icon" aria-hidden="true" />}
          </button>

          <div className="fb-simulate">
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              onClick={() => setShowSimulateMenu(prev => !prev)}
              aria-expanded={showSimulateMenu}
            >
              <Zap className="fb-icon" aria-hidden="true" />
              <span>Simulate request</span>
              <ChevronDown className="fb-icon" aria-hidden="true" />
            </button>

            {showSimulateMenu && (
              <div className="fb-menu" role="menu">
                <div className="fb-menu__head">
                  <span>Realistic restaurant issues</span>
                  <button type="button" className="fb-btn fb-btn--ghost fb-btn--icon" onClick={() => setShowSimulateMenu(false)} aria-label="Close menu">
                    <X className="fb-icon" aria-hidden="true" />
                  </button>
                </div>
                {REALISTIC_CUSTOMER_ISSUES.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    role="menuitem"
                    className="fb-menu__item"
                    onClick={() => {
                      handleSimulateCustomerRequest(issue.id);
                      setShowSimulateMenu(false);
                    }}
                  >
                    <span className="fb-min">
                      <strong>{issue.icon} {issue.title}</strong>
                      <span className="fb-menu__sub">Table #{issue.defaultTable} · {issue.category}</span>
                    </span>
                    <SeverityPill severity={issue.severity} />
                  </button>
                ))}
                <button
                  type="button"
                  className="fb-btn fb-btn--ghost fb-menu__random"
                  onClick={() => {
                    handleSimulateCustomerRequest();
                    setShowSimulateMenu(false);
                  }}
                >
                  <Sparkles className="fb-icon" aria-hidden="true" />
                  <span>Random realistic issue</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Summary counts ────────────────────────────────────────────────── */}
      <section className="fb-stats" aria-label="Summary">
        {summaryTiles.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fb-stat fb-stat--${t.tone} ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
          >
            <span className="fb-stat__label">{t.label}</span>
            <span className="fb-stat__value">{t.value}</span>
            <span className="fb-stat__hint">{t.hint}</span>
          </button>
        ))}
        <div className="fb-stat fb-stat--static">
          <span className="fb-stat__label">{employeeMode ? 'My active' : 'Avg resolution'}</span>
          <span className="fb-stat__value">{employeeMode ? metrics.assignedToActive : metrics.avgMins}</span>
          <span className="fb-stat__hint">
            {employeeMode ? `Assigned to ${currentEmployee.name}` : 'Floor response rate'}
          </span>
        </div>
      </section>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <section className="fb-filters" aria-label="Filters">
        <label className="fb-field">
          <span>Status</span>
          <select className="fb-select" value={tab} onChange={(e) => setTab(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In review</option>
            <option value="resolved">Resolved</option>
            {employeeMode && <option value="assigned_to_me">My assigned</option>}
          </select>
        </label>

        <label className="fb-field">
          <span>Category</span>
          <select className="fb-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="fb-field">
          <span>Date range</span>
          <select className="fb-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            {DATE_RANGE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>

        <label className="fb-field">
          <span>Table</span>
          <select className="fb-select" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="all">All tables</option>
            {tableOptions.map(n => <option key={n} value={String(n)}>Table #{n}</option>)}
          </select>
        </label>

        <label className="fb-field fb-field--search">
          <span>Search</span>
          <div className="fb-search">
            <Search className="fb-icon fb-search__icon" aria-hidden="true" />
            <input
              type="search"
              className="fb-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Table, note, guest, staff..."
            />
          </div>
        </label>

        {activeFilterCount > 0 && (
          <div className="fb-field fb-field--action">
            <span aria-hidden="true">&nbsp;</span>
            <button type="button" className="fb-btn fb-btn--ghost" onClick={clearFilters}>
              Clear filters ({activeFilterCount})
            </button>
          </div>
        )}
      </section>

      {/* ── Inbox: list + detail ──────────────────────────────────────────── */}
      <div className={`fb-body ${selectedReport ? 'fb-body--has-selection' : ''}`}>
        <section className="fb-list" aria-label="Requests">
          <div className="fb-list__head">
            Showing {filteredReports.length} of {reports.length} requests
          </div>

          {filteredReports.length === 0 ? (
            <div className="fb-empty">
              <Inbox className="fb-empty__icon" aria-hidden="true" />
              <strong>No requests match these filters</strong>
              <span>Adjust or clear the filters, or simulate a request to test the flow.</span>
            </div>
          ) : (
            <ul className="fb-list__items">
              {filteredReports.map((r) => {
                const isSelected = r.id === selectedId;
                const classes = [
                  'fb-item',
                  isSelected ? 'is-selected' : '',
                  r.severity === 'critical' && r.status !== 'resolved' ? 'is-urgent' : '',
                  r.status === 'resolved' ? 'is-resolved' : '',
                ].join(' ');
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={classes}
                      onClick={() => setSelectedId(r.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="fb-item__top">
                        <span className="fb-table">Table #{r.table}</span>
                        <StatusPill status={r.status} />
                      </span>
                      <span className="fb-item__note">{r.note}</span>
                      <span className="fb-item__meta">
                        <SeverityPill severity={r.severity} />
                        <span>{getCategory(r)}</span>
                        <span>{staffFor(r).name.split(' ')[0]}</span>
                        <span className="fb-item__time">{timeAgo(r.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="fb-detail-wrap">
          {selectedReport ? (
            <FeedbackDetail
              key={selectedReport.id}
              report={selectedReport}
              staff={staffFor(selectedReport)}
              employeeMode={employeeMode}
              currentEmployee={currentEmployee}
              onAssign={handleAssignStaff}
              onMarkInReview={handleMarkInReview}
              onResolve={handleMarkResolved}
              onReopen={handleReopen}
              onSend={handleSendMessage}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="fb-detail fb-detail--empty">
              <Inbox className="fb-empty__icon" aria-hidden="true" />
              <strong>Select a request</strong>
              <span>Choose a request from the list to see the full message, reply, and update its status.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
