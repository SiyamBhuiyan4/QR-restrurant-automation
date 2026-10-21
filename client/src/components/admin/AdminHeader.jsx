import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BillSettingsModal } from './BillReceipt';
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
  Printer,
  Lock,
  Grid3X3,
  ShoppingBag,
  Users
} from 'lucide-react';

const SEARCH_TYPE_META = {
  table: { label: 'Table', Icon: Grid3X3 },
  order: { label: 'Order', Icon: ShoppingBag },
  staff: { label: 'Staff', Icon: Users }
};

const SEARCH_RESULT_LIMIT = 8;

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
  onLogout = null,
  onResolveAlert = null,
  searchItems = [],
  onSearchSelect = null
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBillSettingsOpen, setIsBillSettingsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchWrapRef = useRef(null);

  const searchResults = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    if (!q) return [];
    return (searchItems || [])
      .filter((item) => `${item.label} ${item.sub || ''} ${item.keywords || ''}`.toLowerCase().includes(q))
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [searchItems, searchQuery]);

  const showSearchResults = isSearchOpen && String(searchQuery || '').trim().length > 0;

  const selectSearchResult = (item) => {
    if (!item) return;
    onSearchSelect?.(item);
    setIsSearchOpen(false);
    setSearchIndex(0);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex((i) => (searchResults.length ? (i + 1) % searchResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex((i) => (searchResults.length ? (i - 1 + searchResults.length) % searchResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectSearchResult(searchResults[searchIndex]);
    }
  };

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
    // Alerts stay listed until the underlying data no longer has them (resolved via onResolveAlert)
    return alertList;
  }, [alertList]);

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

  // Acknowledge = real resolution when the parent provides onResolveAlert,
  // otherwise jump to the screen where the alert is handled.
  const handleAcknowledge = (alert, fallbackTab) => {
    setIsNotificationsOpen(false);
    if (typeof onResolveAlert === 'function') {
      onResolveAlert(alert);
    } else {
      onSelectTab(fallbackTab);
    }
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
        setIsSearchOpen(false);
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
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`admin-header ${isDarkMode ? 'dark' : ''}`}>
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
            className="admin-icon-btn lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: 'var(--adm-text-muted)' }}>
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" style={{ color: 'var(--adm-text-muted)', opacity: 0.7 }} />
            <span style={{ color: 'var(--adm-primary)' }} className="font-bold">
              {currentMeta.breadcrumb}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight whitespace-nowrap" style={{ color: 'var(--adm-text)' }}>
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* CENTER: Quick Search */}
      <div ref={searchWrapRef} className="admin-header-search relative hidden md:block">
        <Search className="admin-header-search-icon absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsSearchOpen(true);
            setSearchIndex(0);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search orders, tables, staff... (⌘K)"
          aria-label="Search orders, tables and staff"
          aria-expanded={showSearchResults}
          aria-controls="admin-global-search-results"
          autoComplete="off"
          className="admin-header-input w-full"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setSearchIndex(0);
            }}
            aria-label="Clear search"
            className="admin-icon-btn admin-header-search-clear absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {showSearchResults && (
          <div
            id="admin-global-search-results"
            role="listbox"
            className="admin-search-results"
          >
            {searchResults.length === 0 ? (
              <div className="admin-search-empty">No tables, orders or staff match "{searchQuery.trim()}"</div>
            ) : (
              searchResults.map((item, idx) => {
                const meta = SEARCH_TYPE_META[item.type] || SEARCH_TYPE_META.table;
                const Icon = meta.Icon;
                const isActive = idx === searchIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setSearchIndex(idx)}
                    onClick={() => selectSearchResult(item)}
                    className={`admin-search-result${isActive ? ' is-active' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="admin-search-result-main">
                      <span className="admin-search-result-label">{item.label}</span>
                      {item.sub && <span className="admin-search-result-sub">{item.sub}</span>}
                    </span>
                    <span className="admin-search-result-type">{meta.label}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dynamic Floor Tables Count Badge (Navigates to Live Tables) */}
        <button
          type="button"
          onClick={() => onSelectTab('tables')}
          className="admin-header-tables"
          title="Click to view and manage Live Tables"
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span className="hidden min-[480px]:inline">Tables</span>
          <span className="admin-header-tables-count">
            {tableCount}
          </span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="admin-icon-btn"
          aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Executive Notifications Bell Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className={`admin-icon-btn admin-bell relative ${isNotificationsOpen ? 'is-open' : ''} ${totalUnreadCount > 0 ? 'has-alerts' : ''}`}
            title="Executive Notification Center & System Alerts"
            aria-label="Executive Notification Center"
            aria-expanded={isNotificationsOpen}
          >
            <div className="relative">
              <Bell className="w-4 h-4" />

            </div>
            {totalUnreadCount > 0 && (
              <span className="admin-bell-count">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {/* Notifications popover: alerts stay listed until handled */}
          {isNotificationsOpen && (
            <div className="admin-notif animate-scaleUp" role="dialog" aria-label="Alerts">
              <div className="admin-notif-head">
                <div>
                  <h3 className="admin-notif-title">Alerts</h3>
                  <p className="admin-notif-sub">Waiter calls, customer reports and kitchen pass</p>
                </div>
                <span className={`admin-notif-status ${visibleAlerts.length > 0 ? 'is-urgent' : ''}`}>
                  {visibleAlerts.length > 0 ? `${visibleAlerts.length} open` : 'All clear'}
                </span>
              </div>

              <div className="admin-notif-tabs" role="tablist">
                {filterTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`admin-notif-tab ${activeFilter === tab.id ? 'is-active' : ''}`}
                  >
                    <span>{tab.label}</span>
                    <span className="admin-notif-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="admin-notif-list">
                {filteredAlerts.length === 0 ? (
                  <div className="admin-notif-empty">
                    <span className="admin-notif-empty-icon"><ShieldCheck className="w-5 h-5" /></span>
                    <p className="admin-notif-empty-title">Nothing needs attention</p>
                    <p className="admin-notif-empty-sub">No open waiter calls, reports or delayed tickets.</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => {
                    const isReport = alert.type === 'report' || alert.id?.startsWith('note-');
                    const isAssistance = alert.type === 'assistance' || alert.id?.startsWith('call-');
                    const isKitchen = alert.type === 'kitchen' || alert.id?.startsWith('ready-');

                    const tone = isReport ? 'report' : isAssistance ? 'call' : isKitchen ? 'kitchen' : 'system';
                    const IconComp = isReport ? MessageSquareWarning : isAssistance ? ConciergeBell : isKitchen ? ChefHat : AlertTriangle;
                    const tagText = isReport ? 'Customer report' : isAssistance ? 'Waiter call' : isKitchen ? 'Kitchen' : 'System';
                    const primaryText = isAssistance && typeof onResolveAlert === 'function'
                      ? 'Mark handled'
                      : isReport ? 'Open reports' : isAssistance ? 'Open floor' : isKitchen ? 'Open KDS' : 'View details';
                    const primaryTab = isReport ? 'reports' : isAssistance ? 'floor' : isKitchen ? 'kds' : 'overview';

                    return (
                      <div key={alert.id} className={`admin-notif-item is-${tone}`}>
                        <div className="admin-notif-item-head">
                          <span className="admin-notif-tag">
                            <IconComp className="w-3 h-3" />
                            <span>{tagText}</span>
                          </span>
                          {alert.table && <span className="admin-notif-table">Table #{alert.table}</span>}
                          <span className="admin-notif-time">
                            <Clock className="w-3 h-3" />
                            <span>{alert.time || 'Active now'}</span>
                          </span>
                        </div>
                        <p className="admin-notif-item-title">{alert.title}</p>
                        {alert.detail && <p className="admin-notif-item-detail">{alert.detail}</p>}
                        <div className="admin-notif-item-actions">
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(alert, primaryTab)}
                            className="admin-notif-action is-primary"
                          >
                            {primaryText}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              onSelectTab('tables');
                            }}
                            className="admin-notif-action"
                          >
                            Go to table
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="admin-notif-foot">
                <span className="admin-notif-foot-live"><span aria-hidden="true" />Live feed</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onSelectTab('reports');
                  }}
                  className="admin-notif-foot-link"
                >
                  All customer reports
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile menu: the only place to lock / sign out of the admin session */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="admin-profile-btn"
            aria-expanded={isProfileOpen}
            aria-label="Admin profile menu"
            title="Admin profile"
          >
            <span className="admin-profile-avatar">AD</span>
            <span className="hidden sm:flex flex-col text-left leading-none">
              <span className="admin-profile-name">Admin</span>
              <span className="admin-profile-role">Manager</span>
            </span>
          </button>

          {isProfileOpen && (
            <div className="admin-profile-menu animate-scaleUp">
              <div className="admin-profile-menu-head">
                <p className="admin-profile-menu-name">Master Admin</p>
                <p className="admin-profile-menu-sub">Signed in as manager</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsBillSettingsOpen(true);
                }}
                className="admin-profile-signout"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Receipt settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Sign out of the admin panel?')) {
                    setIsProfileOpen(false);
                    handleLockLogout();
                  }
                }}
                className="admin-profile-signout"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock &amp; sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <BillSettingsModal open={isBillSettingsOpen} onClose={() => setIsBillSettingsOpen(false)} />
    </header>
  );
}
