import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { Users, Plus, X, Trash2, RefreshCw, Copy, Check, ChefHat, Grid3X3, Circle, KeyRound, Pencil, History } from 'lucide-react';
import StaffHistory from './StaffHistory';
import { api } from '../../convexApi';
import { getAdminToken } from '../../utils/teamSession';
import { useRestaurant } from '../../context/RestaurantContext';

const STAFF_APP_URL = 'https://smartdine-employee.vercel.app';
const STATUS_LABEL = { pending: 'Pending', preparing: 'Cooking', ready: 'Ready', served: 'Served' };

/** "just now", "12m ago", "4h ago", "3d ago" */
function timeAgo(ts, now) {
  if (!ts) return 'never';
  const mins = Math.floor(Math.max(0, now - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parseTables(text) {
  return [...new Set(String(text || '')
    .split(/[\s,]+/)
    .map((t) => Number(t))
    .filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
}

function errorText(err) {
  const raw = err?.data || err?.message || 'Something went wrong';
  return String(raw).replace(/^.*ConvexError:\s*/s, '').replace(/\s+at .*$/s, '');
}

/** Short random password the admin hands to the staff member */
function suggestPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** What the person can do, e.g. "Kitchen + Tables 1, 2" */
function accessSummary(acc) {
  const parts = [];
  if (acc.kitchenAccess) parts.push('Kitchen');
  if (acc.assignedTables?.length) parts.push(`Tables ${acc.assignedTables.join(', ')}`);
  return parts.length ? parts.join(' + ') : 'No access assigned';
}

function OnlineDot({ online }) {
  return (
    <Circle
      className={`w-2.5 h-2.5 shrink-0 ${online ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-600 text-slate-600'}`}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}

/**
 * Clickable table chips: pick which tables someone covers.
 * `owners` maps table -> name of the person who has it now (not this person);
 * picking such a table moves it over (one table, one person).
 */
function TablePicker({ value, onChange, tableCount, owners = {} }) {
  const selected = new Set(value);
  const toggle = (n) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange([...next].sort((a, b) => a - b));
  };
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => {
        const on = selected.has(n);
        const owner = owners[n];
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggle(n)}
            aria-pressed={on}
            title={owner ? (on ? `Moves from ${owner}` : `Table ${n} is with ${owner}. Pick it to move it here.`) : `Table ${n} is free`}
            className={`min-w-8 h-8 px-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center leading-none ${
              on
                ? 'bg-[var(--adm-primary)] text-[var(--adm-primary-fg)] border-[var(--adm-primary)]'
                : owner
                  ? 'bg-[var(--adm-surface-2)] text-[var(--adm-text-muted)] border-dashed border-[var(--adm-border)] hover:text-[var(--adm-text)]'
                  : 'bg-[var(--adm-surface-2)] text-[var(--adm-text)] border-[var(--adm-border)] hover:border-[var(--adm-primary)]'
            }`}
          >
            <span>{n}</span>
            {owner && <span className="text-[8px] font-medium opacity-80 max-w-[3.5rem] truncate mt-0.5">{owner.split(' ')[0]}</span>}
          </button>
        );
      })}
      {(() => {
        const moving = value.filter((n) => owners[n]);
        if (!moving.length) return null;
        const byOwner = {};
        moving.forEach((n) => (byOwner[owners[n]] = byOwner[owners[n]] || []).push(n));
        return (
          <p className="w-full text-[11px] text-[var(--adm-warning)] mt-1">
            {Object.entries(byOwner).map(([name, ts]) => `Table${ts.length > 1 ? 's' : ''} ${ts.join(', ')} will be taken from ${name}`).join('; ')}
          </p>
        );
      })()}
    </div>
  );
}

/**
 * Staff: one place to create staff sign-ins, give kitchen access, assign tables and
 * see who covers what and what each person is doing right now. Staff use these
 * credentials on the Staff app and only see the work assigned to them.
 */
export default function StaffManagementModule({ tableCount: tableCountProp }) {
  const restaurant = useRestaurant();
  const tableCount = Math.max(1, Number(tableCountProp || restaurant?.tableCount) || 12);

  const adminToken = getAdminToken();
  const list = useQuery(api.team.listAccounts, adminToken ? { adminToken } : 'skip');
  const monitor = useQuery(api.team.monitor, adminToken ? { adminToken } : 'skip');
  const createAccount = useAction(api.team.createAccount);
  const resetPassword = useAction(api.team.resetPassword);
  const updateAccount = useMutation(api.team.updateAccount);
  const deleteAccount = useMutation(api.team.deleteAccount);

  const emptyForm = () => ({ name: '', username: '', password: suggestPassword(), title: '', kitchenAccess: false, tables: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState(null); // { name, username, password } shown once
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [rowError, setRowError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState('team'); // team | history
  const [historyPerson, setHistoryPerson] = useState('');
  const openHistory = (accountId = '') => {
    setHistoryPerson(accountId ? String(accountId) : '');
    setView('history');
  };
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const accounts = list?.accounts || [];
  // Live status (online, handling) by account id from the monitor
  const live = useMemo(() => {
    const map = new Map();
    for (const m of monitor?.team || []) map.set(String(m._id), m);
    return map;
  }, [monitor]);

  const people = accounts.map((acc) => {
    const m = live.get(String(acc._id));
    return { ...acc, online: m ? m.online : acc.online, handling: m?.handling || [] };
  });
  const activePeople = people.filter((p) => p.active);
  const kitchenCrew = activePeople.filter((p) => p.kitchenAccess);

  const coverage = useMemo(() => {
    const map = {};
    for (const p of activePeople) for (const t of p.assignedTables || []) (map[t] = map[t] || []).push(p);
    return map;
  }, [activePeople]);
  // Who has each table now, optionally ignoring one account (the one being edited)
  const ownersExcept = (accountId) => {
    const map = {};
    for (const p of people) {
      if (String(p._id) === String(accountId)) continue;
      for (const t of p.assignedTables || []) map[t] = p.name;
    }
    return map;
  };
  const uncovered = Array.from({ length: tableCount }, (_, i) => i + 1).filter((t) => !coverage[t]);

  const unauthorized = list?.unauthorized || monitor?.unauthorized;

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createAccount({
        adminToken,
        name: form.name,
        username: form.username,
        password: form.password,
        title: form.title,
        kitchenAccess: form.kitchenAccess,
        assignedTables: form.tables
      });
      setIssued({ name: form.name, username: form.username.trim().toLowerCase(), password: form.password });
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (acc) => {
    setEditing(acc._id);
    setRowError('');
    setDraft({ name: acc.name, title: acc.title || '', kitchenAccess: acc.kitchenAccess, tables: acc.assignedTables || [] });
  };

  const run = async (acc, fn) => {
    setRowError('');
    setBusyId(acc._id);
    try {
      await fn();
    } catch (err) {
      setRowError(`${acc.name}: ${errorText(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = (acc) => run(acc, async () => {
    await updateAccount({
      adminToken,
      accountId: acc._id,
      name: draft.name,
      title: draft.title,
      kitchenAccess: draft.kitchenAccess,
      assignedTables: draft.tables
    });
    setEditing(null);
  });

  const toggleKitchen = (acc) => run(acc, () => updateAccount({ adminToken, accountId: acc._id, kitchenAccess: !acc.kitchenAccess }));
  const toggleActive = (acc) => run(acc, () => updateAccount({ adminToken, accountId: acc._id, active: !acc.active }));

  const handleReset = (acc) => run(acc, async () => {
    if (!window.confirm(`Give ${acc.name} a new password? They will be signed out on every device.`)) return;
    const password = suggestPassword();
    await resetPassword({ adminToken, accountId: acc._id, password });
    setIssued({ name: acc.name, username: acc.username, password });
  });

  const handleDelete = (acc) => run(acc, async () => {
    if (!window.confirm(`Delete ${acc.name}'s account? They will be signed out and cannot sign in again.`)) return;
    await deleteAccount({ adminToken, accountId: acc._id });
  });

  const copyIssued = async () => {
    if (!issued) return;
    const text = `SmartDine staff sign-in\nName: ${issued.name}\nUsername: ${issued.username}\nPassword: ${issued.password}\nStaff app: ${STAFF_APP_URL}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { /* clipboard blocked */ }
  };

  if (!adminToken || unauthorized) {
    return (
      <div className="adm-card text-sm text-[var(--adm-warning)]">
        Your admin session expired. Sign out and sign in again to manage staff.
      </div>
    );
  }

  const loading = list === undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="adm-card flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--adm-text)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--adm-primary)]" /> Staff
          </h1>
          <p className="adm-section-sub">
            Create sign-ins and decide who does what. Kitchen access opens the kitchen screen; tables give the
            orders, calls and guest messages for those tables. Staff sign in at{' '}
            <a href={STAFF_APP_URL} target="_blank" rel="noreferrer" className="underline">smartdine-employee.vercel.app</a>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div role="tablist" aria-label="Staff views" className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
            {[{ id: 'team', label: 'Team', icon: Users }, { id: 'history', label: 'History', icon: History }].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                onClick={() => (t.id === 'history' ? openHistory(historyPerson) : setView('team'))}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
                  view === t.id ? 'bg-[var(--adm-primary)] text-[var(--adm-primary-fg)]' : 'text-[var(--adm-text-muted)] hover:text-[var(--adm-text)]'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {view === 'team' && (
            <button type="button" onClick={() => { setShowForm((v) => !v); setFormError(''); }} className="adm-btn adm-btn--primary">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Close' : 'Add staff'}
            </button>
          )}
        </div>
      </header>

      {view === 'history' ? (
        <StaffHistory people={people} personId={historyPerson} onPersonChange={setHistoryPerson} />
      ) : (
      <>

      {/* Credentials to hand over (shown once) */}
      {issued && (
        <div className="adm-card" style={{ borderColor: 'var(--adm-success)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm min-w-0">
              <p className="font-semibold text-[var(--adm-text)]">Give these to {issued.name}</p>
              <p className="text-[var(--adm-text-muted)] text-xs mt-1">
                Username <span className="font-mono text-[var(--adm-text)]">{issued.username}</span> • Password{' '}
                <span className="font-mono text-[var(--adm-text)]">{issued.password}</span> • {STAFF_APP_URL}
              </p>
              <p className="text-[11px] text-[var(--adm-text-muted)] mt-1">The password is not shown again. Use Reset password if it gets lost.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={copyIssued} className="adm-btn">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => setIssued(null)} className="adm-btn adm-btn--ghost">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Add staff */}
      {showForm && (
        <form onSubmit={handleCreate} className="adm-card space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs space-y-1">
              <span className="text-[var(--adm-text-muted)] font-semibold">Full name</span>
              <input className="adm-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-[var(--adm-text-muted)] font-semibold">Title</span>
              <input className="adm-input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Waiter, Chef" maxLength={60} />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-[var(--adm-text-muted)] font-semibold">Username</span>
              <input className="adm-input w-full" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="e.g. rakib" autoCapitalize="none" autoComplete="off" />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-[var(--adm-text-muted)] font-semibold">Password</span>
              <div className="flex gap-2">
                <input className="adm-input w-full font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} autoComplete="off" />
                <button type="button" onClick={() => setForm({ ...form, password: suggestPassword() })} className="adm-btn shrink-0" title="New random password" aria-label="New random password">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--adm-text)] cursor-pointer w-fit">
            <input type="checkbox" checked={form.kitchenAccess} onChange={(e) => setForm({ ...form, kitchenAccess: e.target.checked })} />
            <ChefHat className="w-4 h-4 text-[var(--adm-primary)]" />
            Kitchen access <span className="text-xs text-[var(--adm-text-muted)]">(sees and runs the kitchen screen)</span>
          </label>

          <div className="space-y-1.5">
            <span className="block text-xs text-[var(--adm-text-muted)] font-semibold">
              Tables {form.tables.length > 0 && <span className="text-[var(--adm-text)]">({form.tables.join(', ')})</span>}
            </span>
            <TablePicker value={form.tables} onChange={(tables) => setForm({ ...form, tables })} tableCount={tableCount} owners={ownersExcept(null)} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--adm-danger)]">{formError}</span>
            <button type="submit" disabled={saving} className="adm-btn adm-btn--primary">
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      )}

      {/* Who manages what */}
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        <section className="adm-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="adm-section-title flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[var(--adm-primary)]" /> Kitchen crew
            </h2>
            <span className="text-xs text-[var(--adm-text-muted)]">
              {kitchenCrew.filter((p) => p.online).length} of {kitchenCrew.length} online
            </span>
          </div>
          {kitchenCrew.length === 0 ? (
            <p className="text-xs text-[var(--adm-text-muted)]">Nobody has kitchen access yet. Turn it on for a staff member below.</p>
          ) : (
            <ul className="space-y-2">
              {kitchenCrew.map((p) => {
                const cooking = p.handling.filter((o) => o.status === 'preparing' || o.status === 'ready');
                return (
                  <li key={p._id} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <OnlineDot online={p.online} />
                      <span className="text-sm font-semibold text-[var(--adm-text)] truncate">{p.name}</span>
                      {p.title && <span className="text-[11px] text-[var(--adm-text-muted)] truncate">{p.title}</span>}
                    </div>
                    <p className="text-[11px] mt-0.5 text-[var(--adm-text-muted)]">
                      {cooking.length > 0
                        ? <span className="text-[var(--adm-text)]">{cooking.map((o) => `#${o.orderNumber} ${STATUS_LABEL[o.status] || o.status}`).join(', ')}</span>
                        : p.online ? 'Online, nothing in hand' : `Last seen ${timeAgo(p.lastSeenAt || p.lastLoginAt, now)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="adm-section-title flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-[var(--adm-primary)]" /> Table coverage
            </h2>
            <span className={`text-xs ${uncovered.length ? 'text-[var(--adm-warning)]' : 'text-[var(--adm-success)]'}`}>
              {uncovered.length ? `${uncovered.length} table${uncovered.length === 1 ? '' : 's'} with nobody assigned` : 'Every table is covered'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {Array.from({ length: tableCount }, (_, i) => i + 1).map((t) => {
              const who = coverage[t] || [];
              const busy = who.some((p) => p.handling.some((o) => o.tableNumber === t));
              return (
                <div
                  key={t}
                  className="rounded-xl border px-3 py-2 min-w-0"
                  style={{
                    background: 'var(--adm-surface-2)',
                    borderColor: who.length ? 'var(--adm-border)' : 'var(--adm-warning)'
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--adm-text)]">Table {t}</span>
                    {busy && <span className="text-[10px] font-semibold text-[var(--adm-primary)]">Active</span>}
                  </div>
                  {who.length ? (
                    <ul className="mt-1 space-y-0.5">
                      {who.map((p) => (
                        <li key={p._id} className="flex items-center gap-1.5 text-[11px] text-[var(--adm-text)] min-w-0">
                          <OnlineDot online={p.online} />
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] text-[var(--adm-warning)]">Not covered</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Accounts and assignments */}
      <section className="adm-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="adm-section-title flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[var(--adm-primary)]" /> Staff accounts
          </h2>
          <span className="text-xs text-[var(--adm-text-muted)]">
            {people.filter((p) => p.online).length} online • {people.length} total
          </span>
        </div>
        {rowError && <p className="text-xs text-[var(--adm-danger)] mb-2">{rowError}</p>}

        {loading ? (
          <p className="text-xs text-[var(--adm-text-muted)]">Loading…</p>
        ) : people.length === 0 ? (
          <p className="text-xs text-[var(--adm-text-muted)]">No staff yet. Use "Add staff" to create the first sign-in.</p>
        ) : (
          <ul className="divide-y divide-[var(--adm-border)]">
            {people.map((acc) => {
              const isEditing = editing === acc._id;
              const isBusy = busyId === acc._id;
              return (
                <li key={acc._id} className="py-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs space-y-1">
                          <span className="text-[var(--adm-text-muted)] font-semibold">Name</span>
                          <input className="adm-input w-full" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
                        </label>
                        <label className="text-xs space-y-1">
                          <span className="text-[var(--adm-text-muted)] font-semibold">Title</span>
                          <input className="adm-input w-full" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Waiter, Chef" maxLength={60} />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[var(--adm-text)] cursor-pointer w-fit">
                        <input type="checkbox" checked={draft.kitchenAccess} onChange={(e) => setDraft({ ...draft, kitchenAccess: e.target.checked })} />
                        <ChefHat className="w-4 h-4 text-[var(--adm-primary)]" /> Kitchen access
                      </label>
                      <div className="space-y-1.5">
                        <span className="block text-xs text-[var(--adm-text-muted)] font-semibold">
                          Tables {draft.tables.length > 0 && <span className="text-[var(--adm-text)]">({draft.tables.join(', ')})</span>}
                        </span>
                        <TablePicker value={draft.tables} onChange={(tables) => setDraft({ ...draft, tables })} tableCount={Math.max(tableCount, ...draft.tables)} owners={ownersExcept(acc._id)} />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={isBusy} onClick={() => saveEdit(acc)} className="adm-btn adm-btn--primary">{isBusy ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => setEditing(null)} className="adm-btn adm-btn--ghost">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <OnlineDot online={acc.active && acc.online} />
                          <span className="text-sm font-semibold text-[var(--adm-text)] truncate">{acc.name}</span>
                          {acc.title && <span className="text-xs text-[var(--adm-text-muted)] truncate">{acc.title}</span>}
                          <span className="font-mono text-[11px] text-[var(--adm-text-muted)]">@{acc.username}</span>
                          {!acc.active && <span className="text-[11px] font-semibold text-[var(--adm-danger)]">Disabled</span>}
                        </div>
                        <p className="text-xs text-[var(--adm-text)] mt-1">{accessSummary(acc)}</p>
                        <p className="text-[11px] text-[var(--adm-text-muted)] mt-0.5">
                          {acc.handling.length > 0
                            ? `Handling ${acc.handling.map((o) => `#${o.orderNumber} (${STATUS_LABEL[o.status] || o.status})`).join(', ')}`
                            : acc.online ? 'Online now' : `Last seen ${timeAgo(acc.lastSeenAt || acc.lastLoginAt, now)}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => startEdit(acc)} className="adm-btn" disabled={isBusy}>
                          <Pencil className="w-3.5 h-3.5" /> Assign
                        </button>
                        <button type="button" onClick={() => toggleKitchen(acc)} className="adm-btn" disabled={isBusy} title="Turn kitchen access on or off">
                          <ChefHat className="w-3.5 h-3.5" /> {acc.kitchenAccess ? 'Remove kitchen' : 'Give kitchen'}
                        </button>
                        <button type="button" onClick={() => toggleActive(acc)} className="adm-btn" disabled={isBusy}>
                          {acc.active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" onClick={() => openHistory(acc._id)} className="adm-btn" title={`What ${acc.name} has done`}>
                          <History className="w-3.5 h-3.5" /> History
                        </button>
                        <button type="button" onClick={() => handleReset(acc)} className="adm-btn" disabled={isBusy}>Reset password</button>
                        <button type="button" onClick={() => handleDelete(acc)} className="adm-btn adm-btn--ghost" disabled={isBusy} aria-label={`Delete ${acc.name}`} title="Delete account">
                          <Trash2 className="w-4 h-4 text-[var(--adm-danger)]" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </>
      )}
    </div>
  );
}
