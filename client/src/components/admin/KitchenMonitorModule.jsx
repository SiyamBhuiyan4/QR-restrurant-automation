import { useEffect, useState } from 'react';
import { useQuery } from '../../db/telegramDb';
import { Users, Activity, Circle, ChefHat, ConciergeBell, ShieldCheck, KeyRound } from 'lucide-react';
import { api } from '../../convexApi';
import { getAdminToken } from '../../utils/teamSession';
import KitchenDisplay from '../../pages/KitchenDisplay';

/** "just now", "12m ago", "4h ago", "3d ago" */
export function timeAgo(ts, now) {
  if (!ts) return 'never';
  const mins = Math.floor(Math.max(0, now - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const ROLE_META = {
  kitchen: { label: 'Kitchen', icon: ChefHat, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  waiter: { label: 'Waiter', icon: ConciergeBell, cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  manager: { label: 'Manager', icon: ShieldCheck, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' }
};

const STATUS_LABEL = { pending: 'Pending', preparing: 'Cooking', ready: 'Ready', served: 'Served', completed: 'Completed', cancelled: 'Cancelled' };

function describeActivity(a) {
  if (a.kind === 'order_status') {
    const order = a.orderNumber ? `#${a.orderNumber}` : 'an order';
    const table = a.tableNumber ? ` (Table ${a.tableNumber})` : '';
    return `${a.actorName} moved ${order}${table} to ${STATUS_LABEL[a.toStatus] || a.toStatus}`;
  }
  if (a.kind === 'alert') return `⚠ ${a.note}`;
  return a.note || `${a.actorName}: ${a.kind}`;
}

/**
 * Admin view of the kitchen: the live board (view only), who is on duty and what
 * each person is handling, and a feed of staff actions and admin assignments.
 * Kitchen staff run it from the Staff app; the admin can step in (recorded as Admin).
 */
export default function KitchenMonitorModule({ onManageTeam }) {
  const adminToken = getAdminToken();
  const data = useQuery(api.team.monitor, adminToken ? { adminToken } : 'skip');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const team = data?.team || [];
  const activity = data?.activity || [];
  const onlineCount = team.filter((m) => m.online).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
      {/* Kitchen board, view only */}
      <div className="min-w-0">
        <KitchenDisplay isEmbedded adminToken={adminToken} />
      </div>

      <aside className="space-y-5 min-w-0">
        {data?.unauthorized && (
          <div className="adm-card text-xs text-[var(--adm-warning)]">
            Your admin session expired. Sign out and sign in again to see the team.
          </div>
        )}

        {/* Team on duty */}
        <section className="adm-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="adm-section-title flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--adm-primary)]" />
              Team on duty
            </h2>
            <span className="text-xs text-[var(--adm-text-muted)]">{onlineCount} of {team.length} online</span>
          </div>

          {data === undefined && adminToken && <p className="text-xs text-[var(--adm-text-muted)]">Loading team…</p>}

          {data && team.length === 0 && !data.unauthorized && (
            <div className="text-xs text-[var(--adm-text-muted)] space-y-2">
              <p>No staff accounts yet. Create accounts so employees can sign in and run the kitchen.</p>
              {onManageTeam && (
                <button type="button" onClick={onManageTeam} className="adm-btn adm-btn--primary">
                  <KeyRound className="w-4 h-4" /> Add staff accounts
                </button>
              )}
            </div>
          )}

          <ul className="space-y-2">
            {team.map((m) => {
              const tables = m.assignedTables || [];
              return (
                <li key={m._id} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Circle className={`w-2.5 h-2.5 shrink-0 ${m.online ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-600 text-slate-600'}`} />
                      <span className="text-sm font-semibold text-[var(--adm-text)] truncate">{m.name}</span>
                      {!m.active && <span className="text-[10px] text-rose-300">disabled</span>}
                    </div>
                    <span className="flex gap-1 shrink-0">
                      {m.kitchenAccess && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${ROLE_META.kitchen.cls}`}>
                          <ChefHat className="w-3 h-3" /> Kitchen
                        </span>
                      )}
                      {tables.length > 0 && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${ROLE_META.waiter.cls}`}>
                          <ConciergeBell className="w-3 h-3" /> {tables.length} {tables.length === 1 ? 'table' : 'tables'}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--adm-text-muted)] mt-1">
                    {m.title || 'Staff'}
                    {m.station ? ` • ${m.station}` : ''}
                    {tables.length > 0 && ` • Tables ${tables.join(', ')}`}
                  </p>
                  <p className="text-[11px] mt-1">
                    {m.handling.length > 0 ? (
                      <span className="text-[var(--adm-text)]">
                        Handling {m.handling.map((o) => `#${o.orderNumber} (${STATUS_LABEL[o.status] || o.status})`).join(', ')}
                      </span>
                    ) : (
                      <span className="text-[var(--adm-text-muted)]">
                        {m.online ? 'Online, no order in hand' : `Last seen ${timeAgo(m.lastSeenAt || m.lastLoginAt, now)}`}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>

          {team.length > 0 && onManageTeam && (
            <button type="button" onClick={onManageTeam} className="adm-btn w-full mt-3 justify-center">
              <KeyRound className="w-4 h-4" /> Manage team & assignments
            </button>
          )}
        </section>

        {/* Activity feed */}
        <section className="adm-card">
          <h2 className="adm-section-title flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[var(--adm-primary)]" />
            Activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--adm-text-muted)]">Staff sign-ins, kitchen updates and your assignments show here.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {activity.map((a) => (
                <li key={a._id} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-[var(--adm-text)] min-w-0">{describeActivity(a)}</span>
                  <span className="text-[10px] text-[var(--adm-text-muted)] shrink-0 mt-0.5" title={new Date(a.at).toLocaleString()}>
                    {timeAgo(a.at, now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
