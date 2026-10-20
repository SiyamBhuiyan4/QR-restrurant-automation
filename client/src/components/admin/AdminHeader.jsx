import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  UtensilsCrossed,
  MessageSquareWarning,
  ChefHat,
  ConciergeBell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  ShieldCheck,
  Menu,
  Lock,
  CheckCheck
} from 'lucide-react';

/**
 * AdminHeader Component
 * 
 * Sticky Top Navigation Header for the SmartDine Admin Suite.
 * Features Breadcrumbs, Live Pulse, Global Search (⌘K), Executive Notification Center,
 * Dark/Light Mode Switcher, Table Count Badge, and Manager Profile.
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [dismissedAlertIds, setDismissedAlertIds] = useState(new Set());

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

  // Normalize alerts and synthesize summary report alert if reportsCount > 0 and not listed
  const rawAlertList = Array.isArray(urgentAlerts) ? urgentAlerts : [];
  
  const alertList = useMemo(() => {
    const list = [...rawAlertList];
    const hasReport = list.some(a => a.type === 'report' || a.id?.startsWith('note-'));
    if (reportsCount > 0 && !hasReport) {
      list.push({
        id: 'customer-reports-summary',
        title: `${reportsCount} Customer ${reportsCount === 1 ? 'Report' : 'Reports'} Pending`,
        type: 'report',
        table: 'Guest Feedback',
        time: 'Pending Review',
        detail: 'Direct customer service issues or feedback awaiting manager review and resolution.'
      });
    }
    return list;
  }, [rawAlertList, reportsCount]);

  // Filter out locally dismissed notifications
  const visibleAlerts = useMemo(() => {
    return alertList.filter(a => !dismissedAlertIds.has(a.id));
  }, [alertList, dismissedAlertIds]);

  const totalUnreadCount = visibleAlerts.length;

  const urgentCount = useMemo(() => {
    return visibleAlerts.filter(a => a.type === 'report' || a.type === 'assistance' || a.severity === 'critical' || a.isUrgent).length;
  }, [visibleAlerts]);

  const waiterCallsCount = useMemo(() => {
    return visibleAlerts.filter(a => a.type === 'assistance' || a.id?.startsWith('call-')).length;
  }, [visibleAlerts]);

  const customerReportsCount = useMemo(() => {
    return visibleAlerts.filter(a => a.type === 'report' || a.id?.startsWith('note-')).length;
  }, [visibleAlerts]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'urgent') {
      return visibleAlerts.filter(a => a.type === 'report' || a.type === 'assistance' || a.severity === 'critical' || a.isUrgent);
    }
    if (activeFilter === 'calls') {
      return visibleAlerts.filter(a => a.type === 'assistance' || a.id?.startsWith('call-'));
    }
    if (activeFilter === 'reports') {
      return visibleAlerts.filter(a => a.type === 'report' || a.id?.startsWith('note-'));
    }
    return visibleAlerts;
  }, [visibleAlerts, activeFilter]);

  const handleDismissAlert = (id) => {
    setDismissedAlertIds(prev => new Set([...prev, id]));
  };

  const handleMarkAllRead = () => {
    setDismissedAlertIds(new Set(alertList.map(a => a.id)));
  };

  // Filter tabs config
  const filterTabs = [
    { id: 'all', label: 'All', count: visibleAlerts.length },
    { id: 'urgent', label: 'Urgent', count: urgentCount },
    { id: 'calls', label: 'Waiter Calls', count: waiterCallsCount },
    { id: 'reports', label: 'Customer Reports', count: customerReportsCount }
  ];

  // Metadata mapping for all views
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
      description: 'Live ticket stream, prep timers & culinary alert chimes'
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
      className={`admin-header sticky top-0 z-30 transition-colors duration-200 select-none border-b ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 28px',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0'
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
            className={`lg:hidden p-2 rounded-xl transition ${
              isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <div className={`flex items-center gap-2 text-[11px] font-bold ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <span>Admin</span>
            <ChevronRight className={`w-3 h-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={isDarkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold'}>
              {currentMeta.breadcrumb}
            </span>
          </div>
          <h1 className={`text-base sm:text-lg font-black tracking-tight leading-tight whitespace-nowrap ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* CENTER: Quick Search */}
      <div
        className="relative hidden md:block"
        style={{ maxWidth: '320px', width: '100%' }}
      >
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-400'
        }`} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search orders, tables, staff... (⌘K)"
          className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-white placeholder-slate-400'
              : 'border-slate-200 bg-slate-100 text-slate-900 placeholder-slate-400'
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
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
          <span className="font-extrabold text-amber-400 dark:text-amber-300 hidden min-[480px]:inline">Tables:</span>
          <span className={`font-black px-2 py-0.5 rounded-lg min-w-[28px] text-center text-xs border ${
            isDarkMode
              ? 'bg-slate-900 text-white border-amber-500/40'
              : 'bg-white text-slate-900 border-amber-500/40'
          }`}>
            {tableCount}
          </span>
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

        {/* Executive Notifications Bell Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isNotificationsOpen
                ? 'ring-2 ring-amber-400/50 bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/15'
                : totalUnreadCount > 0
                  ? isDarkMode
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-md shadow-rose-500/10'
                    : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-600'
                  : isDarkMode
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Executive Notification Center & System Alerts"
            aria-label="Executive Notification Center"
            aria-expanded={isNotificationsOpen}
          >
            <div className="relative">
              <Bell className={`w-4 h-4 ${
                totalUnreadCount > 0
                  ? 'text-rose-400'
                  : isNotificationsOpen
                    ? 'text-amber-400'
                    : isDarkMode
                      ? 'text-slate-300'
                      : 'text-slate-600'
              }`} />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md shadow-rose-500/40 border border-slate-900">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {/* Executive Notifications Popover */}
          {isNotificationsOpen && (
            <div
              className={`absolute right-0 mt-2.5 w-[360px] sm:w-[460px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scaleUp backdrop-blur-xl ${
                isDarkMode
                  ? 'bg-slate-900/98 border-slate-700/80 text-slate-100 shadow-black/60'
                  : 'bg-white/98 border-slate-200 text-slate-800 shadow-slate-400/30'
              }`}
              style={{ maxHeight: 'min(85vh, 620px)', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header: Radiant Bell Icon + Title + Live Urgent Counter + Mark All as Read */}
              <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20 shrink-0">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <div>
                    <h3 className={`font-black text-sm tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      System Alerts & Operations Feed
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Live table summons, reports & kitchen flow
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {visibleAlerts.length > 0 ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse whitespace-nowrap">
                      {visibleAlerts.length} Urgent
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      All Nominal
                    </span>
                  )}
                  {visibleAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                        isDarkMode
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
                      }`}
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">Mark All Read</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Categories Tabs */}
              <div className={`px-4 pt-2.5 pb-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-100/60'
              }`}>
                {filterTabs.map(tab => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive
                          ? 'bg-amber-400 text-slate-950'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Alert Cards Feed / Empty State */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[380px]">
                {filteredAlerts.length === 0 ? (
                  /* Reassurance Empty State */
                  <div className="py-8 px-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h4 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      All Floor Stations Nominal
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[300px] mx-auto leading-relaxed">
                      No active guest issues or delayed tickets across tables & kitchen pass.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-semibold text-emerald-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Floor Telemetry Live
                      </span>
                      <span>•</span>
                      <span>Kitchen Pass Clear</span>
                    </div>
                    {dismissedAlertIds.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setDismissedAlertIds(new Set())}
                        className="mt-4 text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
                      >
                        Restore {dismissedAlertIds.size} dismissed {dismissedAlertIds.size === 1 ? 'alert' : 'alerts'}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAlerts.map(alert => {
                    const isReport = alert.type === 'report' || alert.id?.startsWith('note-');
                    const isAssistance = alert.type === 'assistance' || alert.id?.startsWith('call-');
                    const isKitchen = alert.type === 'kitchen' || alert.id?.startsWith('ready-');

                    const theme = isReport
                      ? {
                          border: isDarkMode
                            ? 'border-rose-500/35 bg-rose-950/20 hover:border-rose-500/50'
                            : 'border-rose-200 bg-rose-50/80 hover:border-rose-300',
                          tagBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                          IconComponent: MessageSquareWarning,
                          iconColor: 'text-rose-400',
                          tagText: 'Customer Report',
                          primaryActionText: 'View Report →',
                          primaryActionTab: 'reports'
                        }
                      : isAssistance
                        ? {
                            border: isDarkMode
                              ? 'border-amber-500/35 bg-amber-950/20 hover:border-amber-500/50'
                              : 'border-amber-200 bg-amber-50/80 hover:border-amber-300',
                            tagBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                            IconComponent: ConciergeBell,
                            iconColor: 'text-amber-400',
                            tagText: 'Waiter Summon',
                            primaryActionText: 'Floor Console →',
                            primaryActionTab: 'floor'
                          }
                        : isKitchen
                          ? {
                              border: isDarkMode
                                ? 'border-orange-500/35 bg-orange-950/20 hover:border-orange-500/50'
                                : 'border-orange-200 bg-orange-50/80 hover:border-orange-300',
                              tagBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                              IconComponent: ChefHat,
                              iconColor: 'text-orange-400',
                              tagText: 'Kitchen Pass',
                              primaryActionText: 'View KDS →',
                              primaryActionTab: 'kds'
                            }
                          : {
                              border: isDarkMode
                                ? 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300',
                              tagBg: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
                              IconComponent: AlertTriangle,
                              iconColor: 'text-amber-400',
                              tagText: 'System Alert',
                              primaryActionText: 'View Details →',
                              primaryActionTab: 'overview'
                            };

                    const IconComp = theme.IconComponent;

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-2xl border transition-all ${theme.border}`}
                      >
                        {/* Card Header: Type Pill + Table Badge + Elapsed Time + Dismiss */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${theme.tagBg}`}>
                              <IconComp className={`w-3 h-3 ${theme.iconColor}`} />
                              <span>{theme.tagText}</span>
                            </span>

                            {alert.table && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                isDarkMode
                                  ? 'bg-slate-900 border-slate-700 text-amber-300'
                                  : 'bg-white border-slate-200 text-amber-600'
                              }`}>
                                <UtensilsCrossed className="w-2.5 h-2.5" />
                                <span>Table #{alert.table}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{alert.time || 'Active now'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissAlert(alert.id);
                              }}
                              className={`p-1 rounded-lg transition cursor-pointer ${
                                isDarkMode
                                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                              }`}
                              title="Dismiss alert"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Title & Detail */}
                        <p className={`font-bold text-xs mt-1 leading-snug ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {alert.title}
                        </p>
                        {alert.detail && (
                          <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {alert.detail}
                          </p>
                        )}

                        {/* Action Buttons: Jump to Table & Primary Action */}
                        <div className={`flex items-center gap-2 mt-2.5 pt-2 border-t ${
                          isDarkMode ? 'border-slate-800/80' : 'border-slate-200/80'
                        }`}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              onSelectTab(theme.primaryActionTab);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                          >
                            <span>{theme.primaryActionText}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              onSelectTab('tables');
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                              isDarkMode
                                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60'
                                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <span>Jump to Table →</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Operations Footer */}
              <div className={`p-2.5 px-4 border-t flex items-center justify-between text-[11px] shrink-0 ${
                isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Live Telemetry Feed</span>
                </div>
                <div className="flex items-center gap-3 font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onSelectTab('reports');
                    }}
                    className="text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    Customer Reports →
                  </button>
                </div>
              </div>
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
              <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Admin</span>
              <span className={`text-[9px] font-semibold leading-none mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manager</span>
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-2 z-50 animate-scaleUp ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className={`px-3 py-2 border-b mb-1 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Master Admin</p>
                <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Authenticated Manager</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Sign out of the admin panel?')) {
                    setIsProfileOpen(false);
                    handleLockLogout();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
