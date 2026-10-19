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
  Menu
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
  onToggleSidebar = null
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

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
      title: 'Kitchen Display System (KDS)',
      breadcrumb: 'Kitchen Pass',
      description: 'Cook line Kanban tickets, prep timers & culinary alert chimes'
    },
    floor: {
      title: 'Floor Staff Assistance Console',
      breadcrumb: 'Staff Floor',
      description: 'Live table summons, guest assistance & response telemetry'
    },
    customer: {
      title: 'Customer Menu Simulator',
      breadcrumb: 'Diner Experience',
      description: 'Live interactive preview of customer ordering & river background'
    },
    menu: {
      title: 'Menu Management',
      breadcrumb: 'Menu Catalog',
      description: 'Dishes, pricing, dietary tags & instant 86 stock toggles'
    },
    qr: {
      title: 'Table QR Code Generator',
      breadcrumb: 'QR Generator',
      description: 'High-res printable QR code stickers for all 12 tables'
    },
    employees: {
      title: 'Employees Management Hub',
      breadcrumb: 'Employees',
      description: 'Floor team roster, table allocation matrix & service benchmarks'
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
    <header className={`sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 border-b transition-colors duration-200 select-none ${
      isDarkMode
        ? 'bg-[#0e1320]/95 backdrop-blur-md border-slate-800 text-slate-100'
        : 'bg-white/95 backdrop-blur-md border-slate-200/90 text-slate-800 shadow-2xs'
    }`}>
      {/* LEFT: Mobile Toggle + Breadcrumbs & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle mobile menu"
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
            <span className="text-indigo-600 dark:text-indigo-400">{currentMeta.breadcrumb}</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight truncate text-slate-900 dark:text-white leading-tight">
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* CENTER / RIGHT CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search orders, tables, staff... (⌘K)"
            className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium border outline-none transition ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Pulse Indicator */}
        <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${
          isDarkMode
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live 12 Tables</span>
        </div>

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
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
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
                  <Bell className="w-4 h-4 text-indigo-500" />
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
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
              AD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">Admin</span>
              <span className="text-[9px] font-semibold text-slate-400 leading-none mt-0.5">Manager</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
