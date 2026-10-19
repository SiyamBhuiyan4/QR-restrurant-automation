import React, { useState, useEffect, useCallback } from 'react';
import KitchenDisplay from './KitchenDisplay';
import EmployeesModule from '../components/admin/EmployeesModule';

/**
 * EmployeeView (SmartDine Staff & Kitchen Hub)
 * 
 * Houses the Employee View with Kitchen Display System (KDS) under it as requested:
 * "kitchen ta employee er under e thkbe"
 * 
 * Features:
 * - Top header with branding "👨‍🍳 SmartDine Staff & Kitchen Hub"
 * - Tab switcher with 2 tabs:
 *     1. 'kitchen': 🍳 Kitchen Display (KDS) - renders <KitchenDisplay isEmbedded={true} />
 *     2. 'roster': 👥 Staff Roster & Shifts - renders <EmployeesModule isEmbedded={true} />
 * - URL query parameter support: ?tab=kitchen and ?tab=roster (default: 'kitchen')
 * - Full browser back/forward history synchronization
 * - Dark slate styling matching SmartDine architecture
 */
export default function EmployeeView() {
  // Helper to read tab from URL query parameter (?tab=kitchen | ?tab=roster) or subpath (/employee/roster)
  const getTabFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'kitchen';
    try {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/roster')) return 'roster';
      if (path.includes('/kitchen')) return 'kitchen';
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam === 'roster') return 'roster';
      if (tabParam === 'kitchen') return 'kitchen';
    } catch (e) {
      console.warn('[EmployeeView] URL search params error:', e);
    }
    return 'kitchen';
  }, []);

  const [activeTab, setActiveTab] = useState(getTabFromUrl);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* =========================================================================
          TOP HEADER: 👨‍🍳 SmartDine Staff & Kitchen Hub + Tab Switcher
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
                  <span>SmartDine Staff & Kitchen Hub</span>
                  <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Hub
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Unified operational center for kitchen operations, shifts & table dispatch
                </p>
              </div>
            </div>

            {/* Mobile Live Pill */}
            <div className="flex md:hidden items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live</span>
            </div>
          </div>

          {/* Center / Right: Tab Switcher & Live Indicator */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            {/* Tab Switcher */}
            <nav
              aria-label="Staff Hub Tabs"
              className="inline-flex p-1 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-inner w-full sm:w-auto justify-center"
            >
              <button
                type="button"
                onClick={() => handleTabChange('kitchen')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'kitchen'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'kitchen'}
                role="tab"
              >
                <span className="text-base">🍳</span>
                <span>Kitchen Display (KDS)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('roster')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                aria-selected={activeTab === 'roster'}
                role="tab"
              >
                <span className="text-base">👥</span>
                <span>Staff Roster & Shifts</span>
              </button>
            </nav>

            {/* Desktop Live Hub Indicator */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Hub Synchronized</span>
            </div>

            {/* Quick Navigation to Other Views */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <a
                href="/"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition"
                title="Customer Menu View"
              >
                <span>🍽️ Customer</span>
              </a>
              <a
                href="/waiter"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition"
                title="On-Field Waiter Console"
              >
                <span>🛎️ Waiter</span>
              </a>
              <a
                href="/admin"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition"
                title="Admin Dashboard"
              >
                <span>🛡️ Admin</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN HUB CONTENT
          ========================================================================= */}
      <main className="flex-1 w-full flex flex-col">
        {activeTab === 'kitchen' && (
          <div className="flex-1 w-full animate-fadeIn">
            <KitchenDisplay isEmbedded={true} />
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <EmployeesModule isEmbedded={true} />
          </div>
        )}
      </main>
    </div>
  );
}
