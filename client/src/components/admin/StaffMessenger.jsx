import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '../../db/telegramDb';
import { MessageSquare, X, Send, AlertTriangle, Search, ArrowLeft, ChefHat, Users } from 'lucide-react';
import { api } from '../../convexApi';
import { getAdminToken } from '../../utils/teamSession';

/** Relative time like "just now", "12m ago", "4h ago", "3d ago" */
function timeAgo(timestamp, nowMs) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const mins = Math.floor(Math.max(0, nowMs - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Full timestamp for the tooltip, e.g. "21 Oct, 3:04 PM" */
function fullTime(timestamp) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '';
  return new Date(ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Short two-tone beep for new messages; browsers may block audio until a click, so failures are ignored */
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    });
    setTimeout(() => { try { ctx.close(); } catch (_) { /* ignore */ } }, 600);
  } catch (_) { /* audio blocked */ }
}

function errorText(err) {
  const raw = err?.data || err?.message || 'Could not send';
  return String(raw).replace(/^.*ConvexError:\s*/s, '').replace(/\s+at .*$/s, '');
}

/**
 * StaffMessenger: admin's floating message bubble that opens a split panel.
 * Left: staff (admin <-> one staff member, alerts go here) and guest conversations
 * (a guest's phone at a table <-> that table's staff + admin). Right: the thread and composer.
 * Everything is stored in Convex (convex/chat.js), so it works across devices.
 */
export default function StaffMessenger() {
  const adminToken = getAdminToken();
  const inbox = useQuery(api.chat.adminInbox, adminToken ? { adminToken } : 'skip');

  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sendAsAlert, setSendAsAlert] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const threadEndRef = useRef(null);

  const thread = useQuery(
    api.chat.adminMessages,
    adminToken && isOpen && selectedKey ? { adminToken, key: selectedKey } : 'skip'
  );
  const sendMessage = useMutation(api.chat.adminSend);
  const markRead = useMutation(api.chat.adminMarkRead);

  // Keep relative times ("4h ago") fresh
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const staff = inbox?.staff || [];
  const guests = inbox?.guests || [];
  const unreadCount = staff.filter(s => s.unread).length + guests.filter(g => g.unread).length;

  // Beep when a new unread conversation appears while the panel is closed
  const prevUnreadRef = useRef(null);
  useEffect(() => {
    if (inbox === undefined) return;
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    if (prev !== null && unreadCount > prev && !isOpen) playBeep();
  }, [unreadCount, inbox, isOpen]);

  const term = search.trim().toLowerCase();
  // "#5" in the search opens a conversation with everyone at Table 5
  const hashMatch = term.match(/^#\s*(\d{1,3})$/);
  const hashTable = hashMatch && Number(hashMatch[1]) > 0 ? Number(hashMatch[1]) : null;
  const coverFor = (table) => staff.filter(s => s.active && (s.assignedTables || []).includes(table)).map(s => s.name);
  const staffList = useMemo(
    () => (hashTable ? [] : staff.filter(s => !term || `${s.name} ${s.title}`.toLowerCase().includes(term))),
    [staff, term, hashTable]
  );
  const guestList = useMemo(
    () => guests.filter(g => (hashTable
      ? g.tableNumber === hashTable
      : !term || `table ${g.tableNumber} ${g.coveredBy.join(' ')}`.toLowerCase().includes(term))),
    [guests, term, hashTable]
  );

  const selectedStaff = staff.find(s => s.key === selectedKey) || null;
  const selectedGuest = guests.find(g => g.key === selectedKey) || null;
  const isStaffThread = !!selectedKey && selectedKey.startsWith('staff:');
  const tableKeyMatch = selectedKey && selectedKey.match(/^table:(\d+)$/);
  const selectedTable = tableKeyMatch ? Number(tableKeyMatch[1]) : null;
  const messages = thread?.messages || [];

  // Mark read when a thread opens and whenever new messages arrive while it is open
  const lastMsgAt = messages.length ? messages[messages.length - 1].createdAt : 0;
  useEffect(() => {
    if (!isOpen || !selectedKey || !adminToken) return;
    markRead({ adminToken, key: selectedKey }).catch(() => {});
  }, [isOpen, selectedKey, lastMsgAt, adminToken, markRead]);

  // Scroll to the newest message
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, selectedKey, isOpen]);

  // Alerts only go to staff threads
  useEffect(() => {
    if (!isStaffThread) setSendAsAlert(false);
  }, [isStaffThread]);

  const openThread = (key) => {
    setSelectedKey(key);
    setSendError('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedKey || !adminToken || sending) return;
    setSending(true);
    setSendError('');
    try {
      await sendMessage({ adminToken, key: selectedKey, text, isAlert: isStaffThread && sendAsAlert });
      setDraft('');
      setSendAsAlert(false);
    } catch (err) {
      setSendError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  // "Seen" / "Sent" under the admin's last message
  const lastAdminIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].senderType === 'admin') return i;
    return -1;
  })();
  const lastAdminSeen = lastAdminIndex >= 0 && (thread?.otherReadAt || 0) >= messages[lastAdminIndex].createdAt;

  const threadTitle = selectedStaff
    ? selectedStaff.name
    : selectedTable
      ? `Table ${selectedTable} (everyone at the table)`
      : selectedGuest ? `Table ${selectedGuest.tableNumber} guest` : '';
  const threadSub = selectedStaff
    ? [selectedStaff.title, selectedStaff.kitchenAccess ? 'Kitchen' : null, selectedStaff.assignedTables?.length ? `Tables ${selectedStaff.assignedTables.join(', ')}` : null].filter(Boolean).join(' • ') || 'Staff'
    : selectedTable
      ? (coverFor(selectedTable).length ? `Covered by ${coverFor(selectedTable).join(', ')}` : 'No staff assigned to this table')
    : selectedGuest
      ? (selectedGuest.coveredBy.length ? `Covered by ${selectedGuest.coveredBy.join(', ')}` : 'No staff assigned to this table')
      : '';

  return (
    <>
      {/* Floating message bubble */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-white shadow-2xl shadow-amber-500/30 flex items-center justify-center cursor-pointer transition active:scale-95"
            aria-label="Open messages"
            title="Messages"
          >
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-[#0b0f19]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 flex">
          <div className="w-full h-full sm:w-[780px] sm:h-[600px] sm:max-h-[85vh] bg-[#111726] sm:rounded-2xl border border-[#2A384C] shadow-2xl flex flex-col sm:flex-row overflow-hidden text-slate-200">

            {/* LEFT: conversations */}
            <aside className={`${selectedKey ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 shrink-0 flex-col min-h-0 border-b sm:border-b-0 sm:border-r border-[#1E293B]`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
                <h2 className="font-bold text-sm text-white">Messages</h2>
                <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="Close messages">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-3 py-2 border-b border-[#1E293B]">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff, or #5 for Table 5"
                    className="bg-transparent outline-none text-sm w-full placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {!adminToken || inbox?.unauthorized ? (
                  <p className="p-4 text-sm text-amber-300">Your admin session expired. Sign out and sign in again to see messages.</p>
                ) : inbox === undefined ? (
                  <p className="p-4 text-sm text-slate-500">Loading…</p>
                ) : (
                  <>
                    {hashTable && (
                      <button
                        type="button"
                        onClick={() => openThread(`table:${hashTable}`)}
                        className={`w-full text-left px-4 py-3 border-b border-[#1E293B] cursor-pointer transition ${selectedKey === `table:${hashTable}` ? 'bg-[#1E293B]' : 'bg-amber-500/10 hover:bg-amber-500/15'}`}
                      >
                        <div className="text-sm font-bold text-amber-300">Table {hashTable}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Message everyone at this table
                          {coverFor(hashTable).length ? ` • Covered by ${coverFor(hashTable).join(', ')}` : ' • No staff assigned'}
                        </div>
                      </button>
                    )}
                    {!hashTable && (
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ChefHat className="w-3 h-3" /> Staff
                    </div>
                    )}
                    {!hashTable && staffList.length === 0 && (
                      <p className="px-4 pb-2 text-xs text-slate-500">
                        {staff.length === 0 ? 'No staff accounts yet. Add them on the Staff page.' : 'No match.'}
                      </p>
                    )}
                    {staffList.map((s) => {
                      const isActive = s.key === selectedKey;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => openThread(s.key)}
                          className={`w-full text-left px-4 py-2.5 border-b border-[#1E293B]/60 cursor-pointer transition ${isActive ? 'bg-[#1E293B]' : 'hover:bg-[#1E293B]/50'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${s.online ? 'bg-emerald-400' : 'bg-slate-600'}`} title={s.online ? 'Online' : 'Offline'} />
                              <span className={`text-sm truncate ${s.unread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>{s.name}</span>
                              {!s.active && <span className="text-[10px] text-rose-300">disabled</span>}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              {s.lastMessageAt > 0 && <span className="text-[10px] text-slate-500">{timeAgo(s.lastMessageAt, nowMs)}</span>}
                              {s.unread && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {s.title || (s.kitchenAccess ? 'Kitchen' : 'Staff')}
                          </div>
                          {s.lastText && (
                            <p className={`text-xs mt-0.5 truncate ${s.lastIsAlert ? 'text-rose-300' : s.unread ? 'text-slate-200' : 'text-slate-500'}`}>
                              {s.lastIsAlert ? '⚠ ' : ''}{s.lastSenderType === 'admin' ? 'You: ' : ''}{s.lastText}
                            </p>
                          )}
                        </button>
                      );
                    })}

                    <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Guests
                    </div>
                    {guestList.length === 0 && (
                      <p className="px-4 pb-3 text-xs text-slate-500">
                        {guests.length === 0 ? 'No guest messages yet. Guests can write from the menu.' : 'No match.'}
                      </p>
                    )}
                    {guestList.map((g) => {
                      const isActive = g.key === selectedKey;
                      return (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => openThread(g.key)}
                          className={`w-full text-left px-4 py-2.5 border-b border-[#1E293B]/60 cursor-pointer transition ${isActive ? 'bg-[#1E293B]' : 'hover:bg-[#1E293B]/50'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${g.unread ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
                              {g.kind === 'table' ? `Table ${g.tableNumber} (whole table)` : `Table ${g.tableNumber} guest`}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-500">{timeAgo(g.lastMessageAt, nowMs)}</span>
                              {g.unread && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {g.coveredBy.length ? `Covered by ${g.coveredBy.join(', ')}` : 'No staff on this table'}
                          </div>
                          <p className={`text-xs mt-0.5 truncate ${g.unread ? 'text-slate-200' : 'text-slate-500'}`}>
                            {g.lastSenderType === 'admin' ? 'You: ' : g.lastSenderType === 'staff' ? 'Staff: ' : ''}{g.lastText}
                          </p>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </aside>

            {/* RIGHT: thread */}
            <section className={`${selectedKey ? 'flex' : 'hidden sm:flex'} flex-1 min-w-0 min-h-0 flex-col`}>
              {!selectedKey ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">
                  Pick a staff member or a guest conversation.
                </div>
              ) : (
                <>
                  <header className="flex items-center gap-3 px-4 py-3 border-b border-[#1E293B]">
                    <button type="button" onClick={() => setSelectedKey(null)} className="sm:hidden text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="Back to conversations">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                        {threadTitle}
                        {selectedStaff && (
                          <span className={`text-[10px] font-semibold ${selectedStaff.online ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {selectedStaff.online ? 'Online' : 'Offline'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{threadSub}</div>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} className="hidden sm:block text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="Close messages">
                      <X className="w-5 h-5" />
                    </button>
                  </header>

                  {!isStaffThread && (
                    <div className="px-4 py-2 text-[11px] text-slate-400 bg-[#0B0F19] border-b border-[#1E293B]">
                      {selectedTable
                        ? `Every guest at Table ${selectedTable} sees this as a message from “Management”. Staff on this table see it too.`
                        : 'The guest sees your replies as “Management”. Staff on this table see this conversation too.'}
                    </div>
                  )}

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                    {thread === undefined && <p className="text-sm text-slate-500 text-center mt-8">Loading…</p>}
                    {thread !== undefined && messages.length === 0 && (
                      <p className="text-sm text-slate-500 text-center mt-8">
                        {isStaffThread ? 'No messages yet. Say hi or send an alert below.' : 'No messages yet.'}
                      </p>
                    )}
                    {messages.map((m, idx) => {
                      const mine = m.senderType === 'admin';
                      const who = mine ? 'You' : m.senderType === 'guest' ? 'Guest' : m.senderName;
                      return (
                        <div key={m._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                              m.isAlert
                                ? 'bg-rose-950/70 border border-rose-500/60 text-rose-100'
                                : mine
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-[#1E293B] text-slate-100'
                            }`}
                          >
                            {m.isAlert && (
                              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-300 mb-1">
                                <AlertTriangle className="w-3 h-3" /> Alert
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            <div
                              className={`text-[10px] mt-1 ${mine ? (m.isAlert ? 'text-rose-300/80' : 'text-white/80') : 'text-slate-400'}`}
                              title={fullTime(m.createdAt)}
                            >
                              {who} · {timeAgo(m.createdAt, nowMs)}
                            </div>
                          </div>
                          {idx === lastAdminIndex && (
                            <span className="text-[10px] text-slate-500 mt-0.5">{lastAdminSeen ? 'Seen' : 'Sent'}</span>
                          )}
                        </div>
                      );
                    })}
                    <div ref={threadEndRef} />
                  </div>

                  <form onSubmit={handleSend} className="border-t border-[#1E293B] p-3 space-y-2">
                    {sendError && <p className="text-xs text-rose-300">{sendError}</p>}
                    <div className="flex items-center gap-2">
                      {isStaffThread && (
                        <button
                          type="button"
                          onClick={() => setSendAsAlert(v => !v)}
                          className={`shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold border cursor-pointer transition ${
                            sendAsAlert ? 'bg-rose-600 border-rose-500 text-white' : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:text-white'
                          }`}
                          aria-pressed={sendAsAlert}
                          title="Send as alert"
                        >
                          <AlertTriangle className="w-4 h-4 inline -mt-0.5" /> Alert
                        </button>
                      )}
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={500}
                        placeholder={
                          sendAsAlert
                            ? `Alert for ${threadTitle}…`
                            : isStaffThread ? `Message ${threadTitle}…` : 'Reply as Management…'
                        }
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0B0F19] border text-sm outline-none ${sendAsAlert ? 'border-rose-500/60 focus:border-rose-500' : 'border-[#1E293B] focus:border-amber-500/60'}`}
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        className={`shrink-0 w-10 h-10 rounded-lg disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition active:scale-95 ${sendAsAlert ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 hover:bg-amber-400'}`}
                        aria-label={sendAsAlert ? 'Send alert' : 'Send message'}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
