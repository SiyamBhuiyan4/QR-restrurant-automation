import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  UtensilsCrossed,
  MessageSquareWarning,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  User,
  Sparkles,
  Layers,
  Flame,
  Radio
} from 'lucide-react';

/**
 * AdminHeader Component
 * 
 * Sticky top navigation header for the SmartDine Admin Dashboard.
 * 
 * Props:
 * - activeTab: string ('overview' | 'tables' | 'employees' | 'reports' | 'menu' | 'qr')
 * - onSelectTab: (tabId: string) => void
 * - searchQuery: string
 * - onSearchChange: (query: string) => void
 * - reportsCount: number
 * - urgentAlerts: Array<{ id, title, type, table, time, detail }> | number
 * - isDarkMode: boolean
 * - onToggleDarkMode: () => void
 * - onRefresh: () => void
 * - isRefreshing: boolean
 * - onToggleSidebar?: () => void (optional for mobile)
 */
export default function AdminHeader({
  activeTab = 'overview',
  onSelectTab = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  reportsCount = 0,
  urgentAlerts = [],
  isDarkMode = true,
  onToggleDarkMode = () => {},
  onRefresh = () => {},
  isRefreshing = false,
  onToggleSidebar = null
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Normalize alerts array
  const alertList = Array.isArray(urgentAlerts)
    ? urgentAlerts
    : typeof urgentAlerts === 'number' && urgentAlerts > 0
    ? [
        {
          id: 'alert-1',
          title: 'Customer assistance requested',
          type: 'assistance',
          table: 'Table 4',
          time: '2m ago',
          detail: 'Needs cutlery & water refill'
        }
      ]
    : [];

  const totalUrgentCount = (alertList.length || 0) + (reportsCount || 0);

  // Active section mapping
  const sectionMeta = {
    overview: {
      title: 'Overview & Analytics',
      breadcrumb: 'Analytics',
      description: 'Real-time revenue, order velocity & operational metrics'
    },
    tables: {
      title: 'Live Tables & Kitchen',
      breadcrumb: 'Live Floor',
      description: 'Active table sessions, service calls & kitchen pipeline'
    },
    employees: {
      // STRICT REQUIREMENT: "Employees", NEVER use "Waiter"!
      title: 'Employees Management',
      breadcrumb: 'Staff & Team',
      description: 'Floor team status, assignments & shift activity'
    },
    reports: {
      title: 'Customer Reports & Notes',
      breadcrumb: 'Customer Feedback',
      description: 'Voice notes, direct feedback & urgent incident notes'
    },
    menu: {
      title: 'Menu Management',
      breadcrumb: 'Catalog',
      description: 'Items, pricing, dietary tags & instant 86 stock toggles'
    },
    qr: {
      title: 'QR Generator',
      breadcrumb: 'QR Batch',
      description: 'High-res printable QR codes for tables and counters'
    }
  };

  const currentMeta = sectionMeta[activeTab === 'stats' ? 'overview' : activeTab] || {
    title: 'Admin Dashboard',
    breadcrumb: 'Dashboard',
    description: 'SmartDine Automation System'
  };

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-18 px-4 sm:px-6 bg-slate-900/85 backdrop-blur-xl border-b border-slate-800/80 shadow-xs select-none">
      
      {/* LEFT: Breadcrumbs, Section Title & Live Floor Pulse */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Sidebar Toggle (if provided) */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Toggle menu"
          >
            <Layers className="w-5 h-5" />
          </button>
        )}

        {/* Breadcrumb & Section Name */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
            <span className="hover:text-indigo-400 cursor-pointer" onClick={() => onSelectTab('overview')}>
              Admin
            </span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-indigo-400 truncate">{currentMeta.breadcrumb}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {currentMeta.title}
            </h1>

            {/* Live Restaurant Pulse Pill */}
            <div
              onClick={() => onSelectTab('tables')}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold cursor-pointer hover:bg-emerald-500/20 transition-all shrink-0"
              title="Click to view live tables"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tracking-tight text-[11px] font-medium">
                Live Floor Active • 12 Tables
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Global Search, Quick Notifications, Theme Toggle, Refresh, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Global Search Input with ⌘K Hint */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search orders, tables, items..."
            aria-label="Global search input"
            className="w-56 lg:w-72 pl-9 pr-14 py-1.5 bg-slate-950/60 border border-slate-750 hover:border-slate-600 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 transition-all focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none text-[10px] font-mono font-medium text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
              <span>⌘</span>
              <span>K</span>
            </div>
          )}
        </div>

        {/* Live Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh live data"
          title="Refresh dashboard data"
          className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Quick Action Notification Bell with Interactive Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            aria-label="Toggle notifications"
            className={`relative p-2 rounded-xl border transition-all active:scale-95 ${
              isNotificationsOpen
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            {totalUrgentCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-[10px] shadow-md shadow-rose-950">
                {totalUrgentCount > 9 ? '9+' : totalUrgentCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Preview Popover */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Live Alerts &amp; Actions
                  </span>
                </div>
                {totalUrgentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {totalUrgentCount} Pending
                  </span>
                )}
              </div>

              {/* Alerts Content List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                
                {/* 1. Urgent Customer Reports Section */}
                {reportsCount > 0 && (
                  <div className="p-3.5 hover:bg-slate-800/40 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquareWarning className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300">
                            Customer Issues Reported
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Action Required</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {reportsCount} new customer {reportsCount === 1 ? 'report / note' : 'reports / notes'} need attention.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTab('reports');
                            setIsNotificationsOpen(false);
                          }}
                          className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        >
                          Review in Customer Reports
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Ready-For-Pickup Orders or Urgent Call Alerts */}
                {alertList.length > 0 ? (
                  alertList.map((alert, idx) => (
                    <div key={alert.id || idx} className="p-3.5 hover:bg-slate-800/40 transition">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 truncate">
                              {alert.title || 'Ready for Pickup'}
                            </span>
                            <span className="text-[10px] text-slate-500">{alert.time || 'Just now'}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {alert.detail || `${alert.table || 'Table'}: Food cooked and awaiting floor delivery.`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTab('tables');
                              setIsNotificationsOpen(false);
                            }}
                            className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                          >
                            Jump to Floor Map
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  reportsCount === 0 && (
                    <div className="p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-slate-200">All Systems Nominal</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Zero pending customer complaints or kitchen delays.
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live Notification Stream
                </span>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="hover:text-white transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Dark theme active' : 'Light theme active'}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400 transition-transform -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* Admin Profile Card */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-750 hover:border-slate-700 cursor-pointer transition-all select-none"
            title="Admin Siyam • General Manager"
          >
            {/* Manager Avatar */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-black text-xs shadow-md shadow-indigo-950 shrink-0">
              <span>SY</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>

            {/* Admin Name & Role Badge */}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white tracking-tight leading-tight">
                Admin Siyam
              </span>
              <span className="text-[10px] text-indigo-300 font-medium leading-none mt-0.5">
                General Manager
              </span>
            </div>
          </div>

          {/* Profile Popover Details */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2.5 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-md">
                  SY
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Admin Siyam</h4>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Super Admin Tier
                  </span>
                </div>
              </div>

              <div className="py-2.5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Permissions:</span>
                  <span className="font-semibold text-emerald-400">Full Access</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Session Status:</span>
                  <span className="font-semibold text-slate-200">Active (Encrypted)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="font-semibold text-indigo-300">Production SaaS</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-500">SmartDine v2.4</span>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
