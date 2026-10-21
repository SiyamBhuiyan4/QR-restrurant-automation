import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import {
  History, Search, ChefHat, ClipboardList, AlertTriangle, LogIn, LogOut, ConciergeBell, UserCog, KeyRound, X
} from 'lucide-react';
import { api } from '../../convexApi';
import { getAdminToken } from '../../utils/teamSession';

// Activity kinds -> label, icon, colour (filters and timeline dots)
const KINDS = {
  order_status: { label: 'Orders', icon: ChefHat, tone: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  call: { label: 'Waiter calls', icon: ConciergeBell, tone: 'text-sky-300 bg-sky-500/15 border-sky-500/30' },
  alert: { label: 'Alerts', icon: AlertTriangle, tone: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
  assignment: { label: 'Assignments', icon: UserCog, tone: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' },
  account: { label: 'Accounts', icon: KeyRound, tone: 'text-violet-300 bg-violet-500/15 border-violet-500/30' },
  login: { label: 'Sign-ins', icon: LogIn, tone: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  logout: { label: 'Sign-outs', icon: LogOut, tone: 'text-slate-300 bg-slate-500/15 border-slate-500/30' }
};
const FILTERS = [
  { id: 'all', label: 'All', kinds: null },
  { id: 'orders', label: 'Orders', kinds: ['order_status'] },
  { id: 'calls', label: 'Waiter calls', kinds: ['call'] },
  { id: 'alerts', label: 'Alerts', kinds: ['alert'] },
  { id: 'assign', label: 'Assignments', kinds: ['assignment', 'account'] },
  { id: 'sign', label: 'Sign-ins', kinds: ['login', 'logout'] }
];
const STATUS_LABEL = { pending: 'Pending', preparing: 'Cooking', ready: 'Ready', served: 'Served', completed: 'Completed', cancelled: 'Cancelled' };
const PAGE = 40;

function describe(a) {
  if (a.kind === 'order_status') {
    const order = a.orderNumber ? `#${a.orderNumber}` : 'an order';
    const table = a.tableNumber ? ` • Table ${a.tableNumber}` : '';
    const from = a.fromStatus ? `${STATUS_LABEL[a.fromStatus] || a.fromStatus} → ` : '';
    return { title: `${a.actorName} updated ${order}`, detail: `${from}${STATUS_LABEL[a.toStatus] || a.toStatus}${table}` };
  }
  if (a.kind === 'login') return { title: `${a.actorName} signed in`, detail: '' };
  if (a.kind === 'logout') return { title: `${a.actorName} signed out`, detail: '' };
  if (a.kind === 'alert') {
    const m = (a.note || '').match(/^Alert to ([^:]+):\s*(.*)$/);
    return m ? { title: `Alert sent to ${m[1]}`, detail: m[2] } : { title: 'Alert', detail: a.note || '' };
  }
  if (a.kind === 'assignment') {
    const i = (a.note || '').indexOf(':');
    return i > 0 ? { title: `Changed ${a.note.slice(0, i)}`, detail: a.note.slice(i + 1).trim() } : { title: 'Assignment', detail: a.note || '' };
  }
  return { title: a.note || a.kind, detail: '' };
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

const timeOf = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Staff history: a filterable timeline of what staff did (orders, waiter calls, sign-ins)
 * and what the admin did (assignments, alerts, accounts). Filter by person and type,
 * search the text, grouped by day, with "Load older".
 */
export default function StaffHistory({ people = [], personId = '', onPersonChange }) {
  const adminToken = getAdminToken();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState([]); // older pages loaded with "Load older"
  const [cursor, setCursor] = useState(null);

  const kinds = FILTERS.find((f) => f.id === filter)?.kinds || undefined;
  const baseArgs = adminToken ? { adminToken, limit: PAGE, ...(personId ? { accountId: personId } : {}), ...(kinds ? { kinds } : {}) } : 'skip';
  const first = useQuery(api.team.history, baseArgs);
  const older = useQuery(api.team.history, adminToken && cursor ? { ...baseArgs, before: cursor } : 'skip');

  // Reset paging when the filters change
  useEffect(() => { setPages([]); setCursor(null); }, [filter, personId]);
  useEffect(() => {
    if (older && cursor && !older.unauthorized) setPages((p) => (p.some((pg) => pg.cursor === cursor) ? p : [...p, { cursor, ...older }]));
  }, [older, cursor]);

  const items = useMemo(() => {
    const all = [...(first?.items || []), ...pages.flatMap((p) => p.items)];
    const seen = new Set();
    const term = search.trim().toLowerCase();
    return all.filter((a) => {
      if (seen.has(a._id)) return false;
      seen.add(a._id);
      if (!term) return true;
      const d = describe(a);
      return `${d.title} ${d.detail} ${a.actorName} ${a.orderNumber || ''} table ${a.tableNumber || ''}`.toLowerCase().includes(term);
    });
  }, [first, pages, search]);

  const hasMore = pages.length ? pages[pages.length - 1].hasMore : first?.hasMore;
  const loadingOlder = !!cursor && !pages.some((p) => p.cursor === cursor);
  const loadOlder = () => {
    const last = items[items.length - 1];
    if (last) setCursor(last.at);
  };

  // Group by day for the timeline
  const groups = useMemo(() => {
    const out = [];
    for (const a of items) {
      const label = dayLabel(a.at);
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, rows: [] });
      out[out.length - 1].rows.push(a);
    }
    return out;
  }, [items]);

  // Small counts for the current view
  const counts = useMemo(() => {
    const c = { orders: 0, calls: 0, alerts: 0 };
    for (const a of items) {
      if (a.kind === 'order_status') c.orders++;
      if (a.kind === 'call') c.calls++;
      if (a.kind === 'alert') c.alerts++;
    }
    return c;
  }, [items]);

  const selectedPerson = people.find((p) => String(p._id) === String(personId));

  return (
    <section className="adm-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="adm-section-title flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--adm-primary)]" />
          History
          {selectedPerson && <span className="text-[var(--adm-text-muted)] font-normal">• {selectedPerson.name}</span>}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-[var(--adm-text-muted)]">
          <span><b className="text-[var(--adm-text)]">{counts.orders}</b> order updates</span>
          <span><b className="text-[var(--adm-text)]">{counts.calls}</b> calls answered</span>
          <span><b className="text-[var(--adm-text)]">{counts.alerts}</b> alerts</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2 mb-4">
        <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === f.id ? 'bg-[var(--adm-primary)] text-[var(--adm-primary-fg)]' : 'text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-0">
          <select
            aria-label="Filter by person"
            value={personId}
            onChange={(e) => onPersonChange?.(e.target.value)}
            className="adm-input"
            style={{ width: 'auto', minWidth: 150 }}
          >
            <option value="">Everyone</option>
            {people.map((p) => <option key={p._id} value={String(p._id)}>{p.name}</option>)}
          </select>
          <label className="flex items-center gap-2 adm-input flex-1 min-w-0">
            <Search className="w-4 h-4 text-[var(--adm-text-muted)] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, table, name…"
              className="bg-transparent outline-none w-full text-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]">
                <X className="w-4 h-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      {/* Timeline */}
      {first?.unauthorized ? (
        <p className="text-xs text-[var(--adm-warning)]">Your admin session expired. Sign in again to see history.</p>
      ) : first === undefined ? (
        <p className="text-xs text-[var(--adm-text-muted)]">Loading history…</p>
      ) : groups.length === 0 ? (
        <div className="py-10 text-center text-xs text-[var(--adm-text-muted)] border border-dashed border-[var(--adm-border)] rounded-xl">
          <ClipboardList className="w-5 h-5 mx-auto mb-2 opacity-60" />
          Nothing here yet{search ? ' for this search' : ''}.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="sticky top-0 z-[1] py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--adm-text-muted)]" style={{ background: 'var(--adm-surface)' }}>
                {g.label}
              </div>
              <ol className="relative mt-2 ml-3 border-l border-[var(--adm-border)]">
                {g.rows.map((a) => {
                  const meta = KINDS[a.kind] || KINDS.account;
                  const Icon = meta.icon;
                  const d = describe(a);
                  return (
                    <li key={a._id} className="relative pl-6 pb-3 last:pb-0">
                      <span className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full border flex items-center justify-center ${meta.tone}`}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--adm-text)] leading-snug">{d.title}</p>
                          {d.detail && <p className="text-xs text-[var(--adm-text-muted)] mt-0.5 break-words">{d.detail}</p>}
                        </div>
                        <span className="text-[11px] font-mono text-[var(--adm-text-muted)] shrink-0 mt-0.5" title={new Date(a.at).toLocaleString()}>
                          {timeOf(a.at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          {hasMore && (
            <div className="text-center">
              <button type="button" onClick={loadOlder} disabled={loadingOlder} className="adm-btn">
                {loadingOlder ? 'Loading…' : 'Load older'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
