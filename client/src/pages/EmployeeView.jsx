import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { ChefHat, Lock, User, Eye, EyeOff, LogOut, AlertTriangle, ArrowRight, LayoutGrid, X, Inbox } from 'lucide-react';
import { api } from '../convexApi';
import { staffLogin, staffLogout, getStaffToken } from '../utils/teamSession';
import KitchenDisplay from './KitchenDisplay';
import StaffTables from '../components/staff/StaffTables';
import StaffMessages from '../components/staff/StaffMessages';
import { playAlertBeep } from '../components/staff/staffUtils';

/**
 * SmartDine Staff: one app for every staff member (kitchen and floor).
 *
 * Staff sign in with the account the admin created in Staff management. They only
 * see what the admin assigned:
 *   - Kitchen access → the kitchen screen (start cooking, mark ready)
 *   - Tables         → My Tables (waiter calls, orders to serve, guest messages)
 * Everyone can message the admin; table staff can also message their tables' guests.
 * Alerts from the admin arrive as messages, with a banner and a beep.
 */
export default function EmployeeView() {
  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------
  const [staffToken, setStaffToken] = useState(() => getStaffToken());
  const account = useQuery(api.team.staffMe, staffToken ? { staffToken } : 'skip');
  const inbox = useQuery(api.chat.staffInbox, staffToken && account ? { staffToken } : 'skip');
  const sendHeartbeat = useMutation(api.team.staffHeartbeat);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get('tab');
      return tab === 'tables' ? 'tables' : 'kitchen';
    } catch (_) {
      return 'kitchen';
    }
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatKey, setChatKey] = useState(null);
  const [alertBanner, setAlertBanner] = useState(null); // { text, at }
  const [now, setNow] = useState(() => Date.now());
  const lastAlertAtRef = useRef(null);

  // A token the server no longer accepts (expired, disabled, password reset) signs out
  useEffect(() => {
    if (staffToken && account === null) {
      staffLogout();
      setStaffToken('');
    }
  }, [staffToken, account]);

  // Presence for the admin: ping while signed in
  useEffect(() => {
    if (!staffToken || !account) return undefined;
    sendHeartbeat({ staffToken }).catch(() => {});
    const timer = setInterval(() => sendHeartbeat({ staffToken }).catch(() => {}), 60000);
    return () => clearInterval(timer);
  }, [staffToken, account, sendHeartbeat]);

  // Keep relative times fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // New unread alert from the admin → banner + beep (alerts already unread at sign-in show the banner without a beep)
  useEffect(() => {
    const admin = inbox?.admin;
    if (!admin) return;
    if (lastAlertAtRef.current === null) {
      lastAlertAtRef.current = admin.lastIsAlert ? admin.lastMessageAt : 0;
      if (admin.unread && admin.lastIsAlert) setAlertBanner({ text: admin.lastText, at: admin.lastMessageAt });
      return;
    }
    if (admin.lastIsAlert && admin.unread && admin.lastMessageAt > lastAlertAtRef.current) {
      lastAlertAtRef.current = admin.lastMessageAt;
      setAlertBanner({ text: admin.lastText, at: admin.lastMessageAt });
      playAlertBeep();
    }
  }, [inbox]);

  // Clear the banner once the admin thread has been read
  useEffect(() => {
    if (alertBanner && inbox && !inbox.admin.unread) setAlertBanner(null);
  }, [inbox, alertBanner]);

  const hasKitchen = !!account?.kitchenAccess;
  const tables = account?.assignedTables || [];
  const hasTables = tables.length > 0;
  const tabs = useMemo(() => {
    const list = [];
    if (hasKitchen) list.push({ key: 'kitchen', label: 'Kitchen', icon: ChefHat });
    if (hasTables) list.push({ key: 'tables', label: 'My Tables', icon: LayoutGrid });
    return list;
  }, [hasKitchen, hasTables]);
  const visibleTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  const guestUnread = (inbox?.guests || []).filter((g) => g.unread).length;

  const selectTab = (key) => {
    setActiveTab(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', key);
      window.history.replaceState({}, '', url.toString());
    } catch (_) { /* ignore */ }
  };

  const openChat = (key) => {
    setChatKey(key);
    setChatOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }
    setIsSubmitting(true);
    const result = await staffLogin(username, password);
    setIsSubmitting(false);
    if (result.ok) {
      setPassword('');
      lastAlertAtRef.current = null;
      setStaffToken(getStaffToken());
    } else {
      setLoginError(result.error);
    }
  };

  const handleLogout = async () => {
    await staffLogout();
    setStaffToken('');
    setChatOpen(false);
    setChatKey(null);
    setAlertBanner(null);
    lastAlertAtRef.current = null;
    setUsername('');
    setPassword('');
  };

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------
  if (staffToken && account === undefined) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-400 flex items-center justify-center text-sm">Signing in…</div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">SmartDine Staff</h1>
            <p className="text-xs text-slate-400">Sign in with the username and password your manager gave you</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-amber-400" /> Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username from your manager"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-400" /> Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header: who is signed in and what they were given */}
      <header className="sticky top-0 z-30 bg-[#111827]/95 backdrop-blur border-b border-slate-800 px-3 sm:px-5 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {account.name}
                {account.title && <span className="text-slate-400 font-normal"> · {account.title}</span>}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {hasKitchen && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">Kitchen</span>
                )}
                {hasTables && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    Tables {tables.join(', ')}
                  </span>
                )}
                {!hasKitchen && !hasTables && <span className="text-[10px] text-slate-500">No assignment yet</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {tabs.length > 1 && (
          <nav className="max-w-7xl mx-auto flex gap-1.5 mt-2.5" role="tablist" aria-label="Your work">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = visibleTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    active ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.key === 'tables' && guestUnread > 0 && (
                    <span className="px-1.5 rounded-md text-[11px] font-semibold bg-indigo-500 text-white">{guestUnread}</span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Alert from the admin */}
      {alertBanner && inbox && (
        <div role="alert" className="mx-3 sm:mx-5 mt-3 rounded-xl border border-rose-500/60 bg-rose-950/90 px-3.5 py-3 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose-300">Alert from admin</p>
            <p className="text-sm text-rose-50 break-words">{alertBanner.text}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => openChat(inbox.admin.key)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/30 hover:bg-rose-500/40 text-rose-50 border border-rose-400/40"
            >
              Open
            </button>
            <button type="button" onClick={() => setAlertBanner(null)} className="p-1 text-rose-200 hover:text-white" aria-label="Dismiss alert">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto">
        {visibleTab === 'kitchen' && (
          <div className="sm:p-3">
            <KitchenDisplay
              isEmbedded
              currentEmployee={{ id: String(account._id), name: account.name, role: account.title || 'Kitchen' }}
              staffToken={staffToken}
              stationLabel={`${account.name}${account.station ? ` • ${account.station}` : ''}`}
            />
          </div>
        )}

        {visibleTab === 'tables' && (
          <StaffTables staffToken={staffToken} guestThreads={inbox?.guests || []} onOpenChat={openChat} now={now} />
        )}

        {!visibleTab && (
          <div className="p-6 sm:p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold">Your manager hasn't assigned you anything yet</h2>
            <p className="text-sm text-slate-400 max-w-sm">
              When you're given kitchen access or tables, they show up here. You can still message the admin.
            </p>
            {inbox && (
              <button
                type="button"
                onClick={() => openChat(inbox.admin.key)}
                className="mt-1 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/35"
              >
                Message admin
              </button>
            )}
          </div>
        )}
      </main>

      <StaffMessages
        staffToken={staffToken}
        inbox={inbox}
        isOpen={chatOpen}
        onOpenChange={(open) => {
          setChatOpen(open);
          if (!open) setChatKey(null);
        }}
        openKey={chatKey}
        onOpenKey={setChatKey}
        now={now}
      />
    </div>
  );
}
