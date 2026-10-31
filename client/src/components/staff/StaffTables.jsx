import { useState } from 'react';
import { useQuery, useMutation } from '../../db/telegramDb';
import { BellRing, Check, MessageSquare, UtensilsCrossed, Timer } from 'lucide-react';
import { api } from '../../convexApi';
import { timeAgo, errorText, STATUS_STYLE } from './staffUtils';

/**
 * My Tables: one card per table the admin assigned. Waiter calls to answer,
 * open orders (mark served once the kitchen marks them ready) and guest messages.
 */
export default function StaffTables({ staffToken, guestThreads = [], onOpenChat, now }) {
  const tables = useQuery(api.team.staffTables, staffToken ? { staffToken } : 'skip');
  const resolveCall = useMutation(api.team.staffResolveCall);
  const setStatus = useMutation(api.team.staffSetOrderStatus);
  const closeTable = useMutation(api.sessions.staffCloseTable);
  const [busyId, setBusyId] = useState(null);
  const [confirmTable, setConfirmTable] = useState(null); // table awaiting a second tap to clear
  const [error, setError] = useState('');

  const run = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  if (tables === undefined) {
    return <p className="p-5 text-sm text-slate-400">Loading your tables…</p>;
  }
  if (!tables) {
    return <p className="p-5 text-sm text-slate-400">Your session ended. Sign in again.</p>;
  }

  return (
    <div className="p-3 sm:p-5 space-y-3">
      {error && (
        <div className="px-3 py-2 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => {
          const threads = guestThreads.filter((g) => g.tableNumber === table.tableNumber);
          const unreadThreads = threads.filter((g) => g.unread);
          const openOrders = table.orders.filter((o) => o.status !== 'served');
          const recentServed = table.orders.filter((o) => o.status === 'served').slice(0, 2);
          const hasCalls = table.calls.length > 0;

          return (
            <section
              key={table.tableNumber}
              className={`rounded-xl border bg-[#161F30] p-3.5 flex flex-col gap-3 ${
                hasCalls ? 'border-amber-500/50' : 'border-slate-800/90'
              }`}
            >
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Table {table.tableNumber}</h2>
                <div className="flex items-center gap-1.5">
                  {hasCalls && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <BellRing className="w-3 h-3" /> {table.calls.length} call{table.calls.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">{openOrders.length} open</span>
                </div>
              </header>

              {/* Guests ordering from this table: clearing it makes the next guest scan the QR again */}
              {table.sessionOpen && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-2">
                  <p className="text-xs text-emerald-200 min-w-0">Guests can order from this table</p>
                  <button
                    type="button"
                    disabled={busyId === `clear-${table.tableNumber}`}
                    onClick={() => {
                      if (confirmTable !== table.tableNumber) {
                        setConfirmTable(table.tableNumber);
                        setTimeout(() => setConfirmTable((cur) => (cur === table.tableNumber ? null : cur)), 4000);
                        return;
                      }
                      setConfirmTable(null);
                      run(`clear-${table.tableNumber}`, () => closeTable({ staffToken, tableNumber: table.tableNumber }));
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-60 ${
                      confirmTable === table.tableNumber
                        ? 'bg-rose-500/25 text-rose-100 border-rose-400/50'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border-emerald-500/35'
                    }`}
                  >
                    {busyId === `clear-${table.tableNumber}` ? 'Clearing…' : confirmTable === table.tableNumber ? 'Tap again to clear' : 'Clear table'}
                  </button>
                </div>
              )}

              {/* Waiter calls */}
              {table.calls.map((call) => (
                <div key={call._id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-200 truncate capitalize">{call.reason}</p>
                    <p className="text-[11px] text-amber-300/70">{timeAgo(call.createdAt, now)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === call._id}
                    onClick={() => run(call._id, () => resolveCall({ staffToken, callId: call._id }))}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/35 disabled:opacity-60"
                  >
                    <Check className="w-3.5 h-3.5" /> {busyId === call._id ? 'Saving…' : 'Done'}
                  </button>
                </div>
              ))}

              {/* Orders */}
              {openOrders.length === 0 && recentServed.length === 0 && table.calls.length === 0 && (
                <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-lg">Nothing open on this table</p>
              )}

              {[...openOrders, ...recentServed].map((order) => {
                const st = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                return (
                  <div key={order._id} className="rounded-lg bg-slate-900/75 border border-slate-800/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400 truncate">#{order.orderNumber}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Timer className="w-3 h-3" /> {timeAgo(order.createdAt, now)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {order.items.map((item, i) => (
                        <li key={i} className="text-xs text-slate-200 flex gap-2 min-w-0">
                          <span className="font-mono font-semibold text-amber-400 shrink-0">{item.quantity}×</span>
                          <span className="truncate">{item.name}</span>
                          {item.note && <span className="text-[11px] text-slate-400 italic truncate">· {item.note}</span>}
                        </li>
                      ))}
                    </ul>
                    {order.handledByName && order.status !== 'pending' && (
                      <p className="text-[11px] text-slate-500">
                        <UtensilsCrossed className="w-3 h-3 inline -mt-0.5 mr-1" />
                        {order.status === 'preparing' ? 'Cooking' : 'By'} {order.handledByName}
                      </p>
                    )}
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        disabled={busyId === order._id}
                        onClick={() => run(order._id, () => setStatus({ staffToken, orderId: String(order._id), status: 'served' }))}
                        className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/35 disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" /> {busyId === order._id ? 'Saving…' : 'Mark served'}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Guest messages for this table */}
              {threads.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenChat?.((unreadThreads[0] || threads[0]).key)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                    unreadThreads.length
                      ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {unreadThreads.length ? `${unreadThreads.length} new guest message${unreadThreads.length > 1 ? 's' : ''}` : 'Guest messages'}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
