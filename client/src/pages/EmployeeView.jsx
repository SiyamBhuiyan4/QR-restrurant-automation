import React, { useState, useEffect, useCallback } from 'react';
import { verifyStaffSecret } from '../utils/staffCredentials';
import KitchenDisplay from './KitchenDisplay';
import EmployeesModule from '../components/admin/EmployeesModule';
import CustomerReportsModule, { getCustomerReportsCount } from '../components/admin/CustomerReportsModule';
import AdminWaiterConsole from '../components/admin/AdminWaiterConsole';
import { useRestaurant } from '../context/RestaurantContext';
import { useShiftClock, formatClockTime } from '../utils/shiftClock';
import {
  ChefHat,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  BellRing,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Coffee,
  Clock,
  CheckCircle2
} from 'lucide-react';

/**
 * EmployeeView (SmartDine Staff & Kitchen Hub)
 * 
 * Houses the unified Employee View with Kitchen Display System (KDS), On-Field Waiter Console,
 * Staff Roster, and Customer Reports & Notes.
 * 
 * Authentication Architecture:
 * - Standalone Mode (/employee): Gated by Employee Credentials (Username & Password).
 *   Once logged in, employee sees their personal profile, assigned shift, role badge,
 *   and can dispatch messages/alerts to waiters attributed with their name and role.
 * - Embedded Mode (isEmbedded=true, e.g. inside Admin Panel): God-Mode full access with ZERO login prompt.
 * 
 * Top-Level Navigation Tabs:
 *   1. 'kitchen': 🍳 Kitchen Display (KDS)
 *   2. 'waiter':  🛎️ On-Field Waiter Console (Kitchen Staff Dispatch & Floor Monitoring)
 *   3. 'roster':  👥 Staff Roster & Shifts
 *   4. 'reports': 📋 Customer Requests & Notes
 */
export default function EmployeeView({ isEmbedded = false }) {
  const restaurant = useRestaurant();
  const { authenticateEmployee, employees, setEmployeeStatus } = restaurant || {};

  // ---------------------------------------------------------------------------
  // AUTHENTICATION STATE (Standalone Mode Only)
  // ---------------------------------------------------------------------------
  const [loggedInEmployee, setLoggedInEmployee] = useState(() => {
    if (isEmbedded) return null;
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('smartdine_logged_in_employee');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return null;
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to read tab from URL query parameter (?tab=kitchen | ?tab=waiter | ?tab=roster | ?tab=reports) or subpaths
  const getTabFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'kitchen';
    try {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/reports') || path.includes('/requests')) return 'reports';
      if (path.includes('/roster') || path.includes('/shifts')) return 'roster';
      if (path.includes('/waiter') || path.includes('/floor')) return 'waiter';
      if (path.includes('/kitchen') || path.includes('/kds')) return 'kitchen';

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam === 'reports' || tabParam === 'requests') return 'reports';
      if (tabParam === 'roster' || tabParam === 'shifts') return 'roster';
      if (tabParam === 'waiter' || tabParam === 'floor') return 'waiter';
      if (tabParam === 'kitchen' || tabParam === 'kds') return 'kitchen';
    } catch (e) {
      console.warn('[EmployeeView] URL search params error:', e);
    }
    return 'kitchen';
  }, []);

  const [activeTab, setActiveTab] = useState(getTabFromUrl);
  const [reportsCount, setReportsCount] = useState(() => getCustomerReportsCount());
  // Shift clock for the logged-in employee (stored in localStorage, read by the Staff roster)
  const shift = useShiftClock(loggedInEmployee);

  // Handle Employee Login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      let matched = null;
      if (authenticateEmployee) {
        matched = authenticateEmployee(username, password);
      } else if (employees && Array.isArray(employees)) {
        const u = username.trim().toLowerCase();
        const p = password.trim();
        matched = employees.find(emp => {
          const empU = (emp.username || emp.accountCode || '').toLowerCase();
          return empU === u && verifyStaffSecret(emp, p);
        });
      }

      if (matched) {
        setLoggedInEmployee(matched);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('smartdine_logged_in_employee', JSON.stringify(matched));
          } catch (_) {}
        }
        setLoginError('');
      } else {
        setLoginError('Invalid username or password. Please verify credentials provided by Admin.');
      }
    } catch (err) {
      setLoginError('Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Autofill for Testing
  const handleFillCredentials = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setLoginError('');
  };

  // Handle Employee Logout
  const handleLogout = () => {
    setLoggedInEmployee(null);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('smartdine_logged_in_employee');
      } catch (_) {}
    }
    setUsername('');
    setPassword('');
    setLoginError('');
  };

  // Keep live customer requests badge counter synchronized across tabs & updates
  useEffect(() => {
    const syncReportsCount = () => {
      setReportsCount(getCustomerReportsCount());
    };

    syncReportsCount();

    window.addEventListener('storage', syncReportsCount);
    window.addEventListener('smartdine:report_updated', syncReportsCount);
    window.addEventListener('smartdine:reports-updated', syncReportsCount);
    const interval = setInterval(syncReportsCount, 4000);

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.onmessage = (e) => {
          if (e.data?.type === 'REPORTS_UPDATED' || (e.data?.type === 'SYNC_ALL' && e.data.data?.reports)) {
            syncReportsCount();
          }
        };
      } catch (_) {}
    }

    return () => {
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
      window.removeEventListener('storage', syncReportsCount);
      window.removeEventListener('smartdine:report_updated', syncReportsCount);
      window.removeEventListener('smartdine:reports-updated', syncReportsCount);
      clearInterval(interval);
    };
  }, []);

  // Synchronize state when browser back/forward buttons (popstate) or custom navigate events are triggered
  useEffect(() => {
    const syncTab = () => {
      setActiveTab(getTabFromUrl());
    };

    window.addEventListener('popstate', syncTab);
    window.addEventListener('smartdine:navigate', syncTab);
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('smartdine:navigate', syncTab);
    };
  }, [getTabFromUrl]);

  // Tab switch handler: updates activeTab state & syncs URL search params without page reload
  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', newTab);
        window.history.pushState({ tab: newTab }, '', url.toString());
      } catch (e) {
        console.warn('[EmployeeView] PushState error:', e);
      }
    }
  }, []);

  // ===========================================================================
  // SCREEN 1: EMPLOYEE LOGIN SCREEN (Standalone Mode Only when NOT logged in)
  // ===========================================================================
  if (!isEmbedded && !loggedInEmployee) {
    return (
      <div className="min-h-screen bg-[#080B10] text-slate-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
        <div className="w-full max-w-md bg-gradient-to-b from-[#111726] to-[#0B0F19] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/20 space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/25 text-3xl">
              👨‍🍳
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight pt-2">
              Employee &amp; Kitchen Hub
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Enter credentials assigned by Management to access Kitchen &amp; Floor systems
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. kabir, tariq, rahim"
                autoComplete="username"
                autoFocus
                required
                className="w-full bg-[#080B10] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter employee password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#080B10] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? 'Verifying...' : 'Login to Staff Hub'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick links */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <a href="/" className="hover:text-amber-400 transition">
              ← Customer Menu
            </a>
            <a href="/waiter" className="hover:text-amber-400 transition">
              Waiter Portal →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCREEN 2: AUTHENTICATED EMPLOYEE & KITCHEN HUB
  // ===========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* =========================================================================
          TOP HEADER: 👨‍🍳 SmartDine Staff & Kitchen Hub + Tab Switcher + Profile/Logout
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 sm:px-6 py-3">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          
          {/* Left: Branding & Status */}
          <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/20 text-xl flex-shrink-0">
                👨‍🍳
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>SmartDine Staff &amp; Kitchen Hub</span>
                  <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Hub
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Kitchen operations, on-field waiter dispatch, shifts &amp; customer requests
                </p>
              </div>
            </div>

            {/* Mobile Live Pill */}
            <div className="flex md:hidden items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live</span>
            </div>
          </div>

          {/* Center: Tab Switcher */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            <nav
              aria-label="Staff Hub Tabs"
              className="inline-flex p-1 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-inner w-full sm:w-auto justify-center flex-wrap sm:flex-nowrap gap-1"
            >
              {/* Tab 1: 🍳 Kitchen Display (KDS) */}
              <button
                type="button"
                onClick={() => handleTabChange('kitchen')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'kitchen'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'kitchen'}
                role="tab"
              >
                <span className="text-base">🍳</span>
                <span className="whitespace-nowrap">Kitchen KDS</span>
              </button>

              {/* Tab 2: 🛎️ On-Field Waiter Console (NEW: Employee floor access & dispatch) */}
              <button
                type="button"
                onClick={() => handleTabChange('waiter')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'waiter' || activeTab === 'floor'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'waiter' || activeTab === 'floor'}
                role="tab"
              >
                <span className="text-base">🛎️</span>
                <span className="whitespace-nowrap">Waiter Console</span>
              </button>

              {/* Tab 3: 👥 Staff Roster & Shifts */}
              <button
                type="button"
                onClick={() => handleTabChange('roster')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'roster'}
                role="tab"
              >
                <span className="text-base">👥</span>
                <span className="whitespace-nowrap">Roster &amp; Shifts</span>
              </button>

              {/* Tab 4: 📋 Customer Requests & Notes */}
              <button
                type="button"
                onClick={() => handleTabChange('reports')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'reports' || activeTab === 'requests'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'reports' || activeTab === 'requests'}
                role="tab"
              >
                <span className="text-base">📋</span>
                <span className="whitespace-nowrap">Requests</span>
                {reportsCount.pending > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-transform ${
                      activeTab === 'reports' || activeTab === 'requests'
                        ? 'bg-slate-950 text-amber-400 border border-slate-900 shadow-sm'
                        : reportsCount.urgent > 0
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/50'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                    title={`${reportsCount.pending} pending requests (${reportsCount.urgent} urgent)`}
                  >
                    {reportsCount.pending}
                  </span>
                )}
              </button>
            </nav>

            {/* Right: Employee Profile / Logout (or Admin God-Mode Badge) */}
            <div className="flex items-center gap-2 ml-1">
              {!isEmbedded && loggedInEmployee ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                    <span className="font-bold text-white">{loggedInEmployee.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {loggedInEmployee.role || 'Staff'}
                    </span>
                    {(loggedInEmployee.staffId || loggedInEmployee.numericId) && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{loggedInEmployee.staffId || loggedInEmployee.numericId}
                      </span>
                    )}
                  </div>
                  {/* Shift clock in / out */}
                  <button
                    type="button"
                    onClick={shift.toggle}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 ${
                      shift.clockedIn
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={shift.clockedIn ? `On shift since ${formatClockTime(shift.clockInAt)}` : 'Clock in to your shift'}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{shift.clockedIn ? 'Clock out' : 'Clock in'}</span>
                  </button>
                  {(() => {
                    const liveEmp = (employees || []).find(
                      e => String(e.id) === String(loggedInEmployee.id) || String(e.numericId) === String(loggedInEmployee.numericId)
                    );
                    if (!liveEmp || typeof setEmployeeStatus !== 'function') return null;
                    const onBreak = liveEmp.status === 'On Break';
                    return (
                      <button
                        type="button"
                        onClick={() => setEmployeeStatus(liveEmp.id, onBreak ? 'Active' : 'On Break')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 ${
                          onBreak
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={onBreak ? 'Back from break' : 'Go on break (admin sees your status)'}
                      >
                        <Coffee className="w-3.5 h-3.5" />
                        <span>{onBreak ? 'Back from break' : 'On break'}</span>
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
                    title="Logout from Employee Hub"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin God-Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN HUB CONTENT
          ========================================================================= */}
      <main className="flex-1 w-full flex flex-col">
        {/* TAB 1: KITCHEN DISPLAY SYSTEM */}
        {activeTab === 'kitchen' && (
          <div className="flex-1 w-full animate-fadeIn">
            <KitchenDisplay
              isEmbedded={true}
              currentEmployee={loggedInEmployee}
            />
          </div>
        )}

        {/* TAB 2: ON-FIELD WAITER CONSOLE (KITCHEN & STAFF DISPATCH) */}
        {(activeTab === 'waiter' || activeTab === 'floor') && (
          <div className="flex-1 w-full animate-fadeIn">
            <AdminWaiterConsole
              currentEmployee={loggedInEmployee}
              isEmployeeMode={!isEmbedded}
            />
          </div>
        )}

        {/* TAB 3: STAFF ROSTER & SHIFTS */}
        {activeTab === 'roster' && (
          <div className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <EmployeesModule isEmbedded={true} />
          </div>
        )}

        {/* TAB 4: CUSTOMER REQUESTS & NOTES */}
        {(activeTab === 'reports' || activeTab === 'requests') && (
          <div className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <CustomerReportsModule isEmbedded={true} employeeMode={true} />
          </div>
        )}
      </main>
    </div>
  );
}
