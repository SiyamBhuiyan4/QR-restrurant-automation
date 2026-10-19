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
  ConciergeBell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  User,
  Sparkles,
  Radio,
  Menu,
  Plus,
  Lock,
  LogOut
} from 'lucide-react';

/**
 * AdminHeader Component
 * 
 * Sticky Top Navigation Header for the SmartDine Admin Suite.
 * Features Breadcrumbs, Live Pulse, Global Search (⌘K), Notifications Drawer,
 * Dark/Light Mode Switcher, and Manager Profile.
 */
export default function AdminHeader({
  activeTab = 'overview',
  onSelectTab = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  reportsCount = 0,
  urgentAlerts = [],
  isDarkMode = false,
  onToggleDarkMode = () => {},
  onRefresh = () => {},
  isRefreshing = false,
  onToggleSidebar = null,
  tableCount = 12,
  onAddTable = null,
  onRemoveTable = null,
  onSetTableCount = null,
  onLogout = null
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const handleLockLogout = () => {
    try {
      sessionStorage.removeItem('smartdine_admin_auth');
    } catch (_) {}
    if (typeof onLogout === 'function') {
      onLogout();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Normalize alerts
  const alertList = Array.isArray(urgentAlerts) ? urgentAlerts : [];
  const totalUrgentCount = (alertList.length || 0) + (reportsCount || 0);

  // Metadata mapping for all 10 views
  const sectionMeta = {
    overview: {
      title: 'Overview & Revenue Analytics',
      breadcrumb: 'Analytics',
      description: 'Real-time sales telemetry, side calendar & order velocity'
    },
    tables: {
      title: 'Live Tables & Floor Tracking',
      breadcrumb: 'Floor Grid',
      description: 'Active table sessions, service calls & 4-stage kitchen pipeline'
    },
    orders: {
      title: 'Live Orders Pipeline',
      breadcrumb: 'Orders Feed',
      description: 'Real-time kitchen tickets, customer voice notes & invoice tickets'
    },
    kds: {
      title: 'Employee & Kitchen Hub (KDS)',
      breadcrumb: 'Kitchen Pass',
      description: 'Cook line Kanban tickets, prep timers & culinary alert chimes'
    },
    floor: {
      title: 'On-Field Waiter Console',
      breadcrumb: 'Floor Staff',
      description: 'Live table summons, guest assistance & response telemetry'
    },
    menu: {
      title: 'Menu Management',
      breadcrumb: 'Menu Catalog',
      description: 'Dishes, pricing, dietary tags & instant 86 stock toggles'
    },
    qr: {
      title: 'Table QR Code Generator',
      breadcrumb: 'QR Generator',
      description: `High-res printable QR code stickers for all ${tableCount} tables`
    },
    employees: {
      title: 'Employee Roster & Shifts',
      breadcrumb: 'Staff Roster',
      description: 'Floor team roster, table allocation matrix & service benchmarks'
    },
    employee: {
      title: 'Employee & Kitchen Hub',
      breadcrumb: 'Staff Hub',
      description: 'Unified operational center for kitchen operations & shifts'
    },
    reports: {
      title: 'Customer Reports & Admin Notes',
      breadcrumb: 'Customer Feedback',
      description: 'Direct-to-admin issue box, server dispatch & resolution history'
    }
  };

  const currentMeta = sectionMeta[activeTab === 'stats' ? 'overview' : activeTab] || {
    title: 'Admin Dashboard',
    breadcrumb: 'Dashboard',
    description: 'SmartDine Automation System'
  };

  // Keyboard shortcut listener (⌘K / Ctrl+K)
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

  // Click outside to dismiss dropdowns
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
    <header
      className="admin-header sticky top-0 z-30 transition-colors duration-200 select-none border-b border-slate-800"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 28px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#0f172a'
      }}
    >
      {/* LEFT: Mobile Toggle + Breadcrumbs & Title */}
      <div
        className="flex items-center gap-3"
        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle mobile menu"
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
            <span className="text-amber-400 font-bold">{currentMeta.breadcrumb}</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight whitespace-nowrap">
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* CENTER: Quick Search */}
      <div
        className="relative hidden md:block"
        style={{ maxWidth: '320px', width: '100%' }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search orders, tables, staff... (⌘K)"
          className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border border-slate-700 bg-slate-900 text-white placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dynamic Floor Tables Count Badge (Navigates to Live Tables) */}
        <button
          type="button"
          onClick={() => onSelectTab('tables')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/40 shadow-lg shadow-amber-500/10 text-xs transition cursor-pointer"
          title="Click to view and manage Live Tables"
        >
          <UtensilsCrossed className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-extrabold text-amber-300 hidden min-[480px]:inline">Tables:</span>
          <span className="font-black text-white bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded-lg min-w-[28px] text-center text-xs">
            {tableCount}
          </span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-xl border transition cursor-pointer ${
            isDarkMode
              ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
          }`}
          title="Refresh dashboard data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className={`p-2 rounded-xl border transition cursor-pointer ${
            isDarkMode
              ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
          }`}
          title={isDarkMode ? 'Switch to Soft Slate (Light)' : 'Switch to Dark Slate'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bell Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className={`relative p-2 rounded-xl border transition cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="System Alerts & Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalUrgentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-sm">
                {totalUrgentCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {isNotificationsOpen && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl p-4 z-50 animate-scaleUp ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-sm">Real-Time Alerts</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                  {totalUrgentCount} Urgent
                </span>
              </div>

              {alertList.length === 0 && reportsCount === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Nominal</p>
                  <p className="text-[11px] text-slate-400">No active customer complaints or delayed orders</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alertList.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        onSelectTab(alert.type === 'report' ? 'reports' : 'tables');
                      }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isDarkMode
                          ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="text-rose-500">{alert.title}</span>
                        <span className="text-[10px] text-slate-400">{alert.time}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-300 text-[11px] line-clamp-2">
                        {alert.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Profile Pill */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
            title="Admin Manager Profile"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
              AD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">Admin</span>
              <span className="text-[9px] font-semibold text-slate-400 leading-none mt-0.5">Manager</span>
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-2 z-50 animate-scaleUp ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Master Admin</p>
                <p className="text-[10px] text-slate-400">Authenticated Manager</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleLockLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock / Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Lock / Logout Button (Next to Profile Badge) */}
        <button
          type="button"
          onClick={handleLockLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          title="Lock Admin Session / Logout"
          aria-label="Lock / Logout"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock / Logout</span>
        </button>
      </div>
    </header>
  );
}
