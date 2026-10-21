import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { MessageSquare, X, Send, AlertTriangle, ArrowLeft, ShieldCheck, Users, Search } from 'lucide-react';
import { api } from '../../convexApi';
import { timeAgo, errorText } from './staffUtils';

/**
 * Staff messages: floating button + panel. Threads: Admin (always) and guest
 * conversations for the staff member's tables. Staff cannot send alerts.
 * `openKey` / `onOpenKey` let the rest of the app open a thread (e.g. from a table card).
 */
export default function StaffMessages({ staffToken, inbox, isOpen, onOpenChange, openKey, onOpenKey, now }) {
  const unreadCount = inbox
    ? (inbox.admin.unread ? 1 : 0) + (inbox.canChatGuests ? inbox.guests.filter((g) => g.unread).length : 0)
    : 0;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-center transition active:scale-95"
          aria-label="Open messages"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-[#0B0F17]">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 flex">
          <div className="w-full h-full sm:w-[400px] sm:h-[600px] sm:max-h-[85vh] bg-[#111827] sm:rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-200">
            {openKey ? (
              <Thread
                staffToken={staffToken}
                threadKey={openKey}
                title={titleFor(openKey, inbox)}
                onBack={() => onOpenKey(null)}
                onClose={() => onOpenChange(false)}
                now={now}
              />
            ) : (
              <ThreadList inbox={inbox} onPick={onOpenKey} onClose={() => onOpenChange(false)} now={now} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function titleFor(key, inbox) {
  if (!key) return '';
  if (key.startsWith('staff:')) return 'Admin';
  const t = key.match(/^table:(\d+)$/);
  if (t) return `Table ${t[1]} (everyone)`;
  const g = inbox?.guests.find((t) => t.key === key);
  const m = key.match(/^guest:(\d+):/);
  return `Table ${g?.tableNumber ?? (m ? m[1] : '')} guest`;
}

function ThreadList({ inbox, onPick, onClose, now }) {
  const [search, setSearch] = useState('');
  // "#5" opens a message to everyone at Table 5 (only the staff member's own tables)
  const hash = search.trim().match(/^#\s*(\d{1,3})$/);
  const hashTable = hash && Number(hash[1]) > 0 ? Number(hash[1]) : null;
  const myTables = inbox?.assignedTables || [];
  const guests = (inbox?.guests || []).filter((g) => !hashTable || g.tableNumber === hashTable);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100">Messages</h2>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Close messages">
          <X className="w-5 h-5" />
        </button>
      </header>
      {inbox?.canChatGuests && (
        <div className="px-3 py-2 border-b border-slate-800">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="#5 to message Table 5"
              className="bg-transparent outline-none text-xs w-full placeholder:text-slate-500"
            />
          </label>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {hashTable && (
          myTables.includes(hashTable) ? (
            <button
              type="button"
              onClick={() => onPick(`table:${hashTable}`)}
              className="w-full text-left px-4 py-3 border-b border-slate-800 bg-indigo-500/10 hover:bg-indigo-500/15 transition"
            >
              <span className="block text-sm font-semibold text-indigo-200">Table {hashTable}</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Message everyone at this table (they see it from “Management”)</span>
            </button>
          ) : (
            <p className="px-4 py-3 text-xs text-amber-300 border-b border-slate-800">
              Table {hashTable} isn't assigned to you. Your tables: {myTables.join(', ')}
            </p>
          )
        )}
        {!inbox ? (
          <p className="p-4 text-xs text-slate-500">Loading…</p>
        ) : (
          <>
            <Row
              icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
              title="Admin"
              text={inbox.admin.lastText || 'Message your manager'}
              alert={inbox.admin.lastIsAlert}
              time={inbox.admin.lastMessageAt ? timeAgo(inbox.admin.lastMessageAt, now) : ''}
              unread={inbox.admin.unread}
              onClick={() => onPick(inbox.admin.key)}
            />
            {inbox.canChatGuests && (
              <>
                <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Guests at your tables</p>
                {guests.length === 0 && <p className="px-4 py-2 text-xs text-slate-500">No guest messages yet. Type #5 above to message Table 5.</p>}
                {guests.map((g) => (
                  <Row
                    key={g.key}
                    icon={<Users className="w-4 h-4 text-indigo-300" />}
                    title={g.kind === 'table' ? `Table ${g.tableNumber} (everyone)` : `Table ${g.tableNumber} guest`}
                    text={`${g.lastSenderType === 'guest' ? '' : 'You/Admin: '}${g.lastText}`}
                    time={timeAgo(g.lastMessageAt, now)}
                    unread={g.unread}
                    onClick={() => onPick(g.key)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Row({ icon, title, text, time, unread, alert, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/50 transition flex gap-3">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${unread ? 'font-semibold text-white' : 'text-slate-200'}`}>{title}</span>
          <span className="text-[10px] text-slate-500 shrink-0">{time}</span>
        </span>
        <span className={`flex items-center gap-1 text-xs truncate ${alert ? 'text-rose-300' : unread ? 'text-slate-200' : 'text-slate-500'}`}>
          {alert && <AlertTriangle className="w-3 h-3 shrink-0" />}
          <span className="truncate">{text}</span>
          {unread && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
        </span>
      </span>
    </button>
  );
}

function Thread({ staffToken, threadKey, title, onBack, onClose, now }) {
  const data = useQuery(api.chat.staffMessages, { staffToken, key: threadKey });
  const send = useMutation(api.chat.staffSend);
  const markRead = useMutation(api.chat.staffMarkRead);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const count = data?.messages?.length ?? 0;

  // Mark read when opened and whenever new messages arrive while open
  useEffect(() => {
    markRead({ staffToken, key: threadKey }).catch(() => {});
  }, [staffToken, threadKey, count, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count, threadKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError('');
    try {
      await send({ staffToken, key: threadKey, text });
      setDraft('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 px-3 py-3 border-b border-slate-800">
        <button type="button" onClick={onBack} className="p-1 text-slate-400 hover:text-white" aria-label="Back to messages">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-sm font-semibold text-slate-100 truncate">{title}</h2>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Close messages">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {data === undefined && <p className="text-xs text-slate-500">Loading…</p>}
        {data === null && <p className="text-xs text-slate-500">You no longer have access to this conversation.</p>}
        {data && data.messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center mt-8">No messages yet.</p>
        )}
        {data?.messages.map((m) => {
          const mine = m.senderType === 'staff';
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  m.isAlert
                    ? 'bg-rose-950/80 border border-rose-500/60 text-rose-100'
                    : mine
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-100'
                }`}
              >
                {m.isAlert && (
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-300 mb-0.5">
                    <AlertTriangle className="w-3 h-3" /> Alert
                  </div>
                )}
                {!mine && !m.isAlert && <div className="text-[10px] font-semibold text-slate-400 mb-0.5">{m.senderName}</div>}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-slate-400'}`} title={new Date(m.createdAt).toLocaleString()}>
                  {timeAgo(m.createdAt, now)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-800 p-2.5">
        {error && <p className="text-[11px] text-rose-300 mb-1.5 px-1">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={`Message ${title}…`}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm outline-none focus:border-indigo-500/60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 w-10 h-10 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </>
  );
}
