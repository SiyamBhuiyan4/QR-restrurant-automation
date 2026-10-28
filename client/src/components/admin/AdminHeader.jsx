import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Users,
  Activity,
  Send,
  RefreshCw,
  Database,
  ExternalLink,
  Check
} from 'lucide-react';
import { checkTelegramHealth, sendTelegramTestPing } from '../../services/telegramClient';

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
  const [isTgModalOpen, setIsTgModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchWrapRef = useRef(null);

  // Real-time Telegram CDN & Cloud DB Telemetry State (Autonomous - No hard DB dependency)
  const [tgStatus, setTgStatus] = useState({
    connected: false,
    status: 'checking', // 'checking' | 'online' | 'degraded' | 'offline'
    latency: null,
    channelTitle: 'Restaurant Media',
    channelUsername: null,
    chatId: '-1004253971473',
    inviteLink: 'https://t.me/+s9umkM1wWnNmZTk1',
    botUsername: 'restaurant_media_bot',
    checkedAt: null,
    error: null
  });
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [testSignalStatus, setTestSignalStatus] = useState({ state: 'idle', message: '' });
  const tgModalRef = useRef(null);

  const runPingTest = useCallback(async (isManual = false) => {
    if (isManual) setIsTestingPing(true);
    try {
      const result = await checkTelegramHealth();
      setTgStatus((prev) => ({
        ...prev,
        connected: Boolean(result.connected),
        status: result.status,
        latency: result.latency,
        channelTitle: result.channelTitle || prev.channelTitle,
        channelUsername: result.channelUsername || prev.channelUsername,
        chatId: result.chatId || prev.chatId,
        inviteLink: result.inviteLink || prev.inviteLink,
        botUsername: result.botUsername || prev.botUsername,
        checkedAt: result.checkedAt || new Date().toISOString(),
        error: result.error || null
      }));
    } catch (err) {
      setTgStatus((prev) => ({
        ...prev,
        connected: false,
        status: 'offline',
        latency: null,
        error: err?.message || 'Failed to ping Telegram CDN',
        checkedAt: new Date().toISOString()
      }));
    } finally {
      if (isManual) setIsTestingPing(false);
    }
  }, []);

  const handleSendTestSignal = async () => {
    setTestSignalStatus({ state: 'sending', message: 'Broadcasting test ping to @Restaurant Media...' });
    try {
      const res = await sendTelegramTestPing();
      if (res.success) {
        setTestSignalStatus({
          state: 'success',
          message: 'Signal acknowledged! Test packet posted to @Restaurant Media channel.'
        });
        runPingTest(false);
      } else {
        setTestSignalStatus({
          state: 'error',
          message: res.error || 'Failed to dispatch test signal to Telegram.'
        });
      }
    } catch (err) {
      setTestSignalStatus({
        state: 'error',
        message: err?.message || 'Communication error with Telegram Bot API.'
      });
    }
    setTimeout(() => {
      setTestSignalStatus((prev) => (prev.state === 'success' ? { state: 'idle', message: '' } : prev));
    }, 4500);
  };

  // Standalone health telemetry loop (Auto-ping every 45s, paused when tab is inactive)
  useEffect(() => {
    const timer = setTimeout(() => {
      runPingTest(false);
    }, 350);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        runPingTest(false);
      }
    }, 45000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [runPingTest]);

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
      sessionStorage.removeItem('smartdine_admin_token');
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
      title: 'Kitchen Monitor',
      breadcrumb: 'Kitchen',
      description: 'What the kitchen is cooking, who is on duty and what they are doing'
    },
    team: {
      title: 'Team & Access',
      breadcrumb: 'Team',
      description: 'Staff sign-ins, roles, stations and table assignments'
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
      title: 'Staff',
      breadcrumb: 'Staff',
      description: 'Sign-ins, kitchen access, table coverage and who is doing what'
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
        setIsTgModalOpen(false);
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
      if (tgModalRef.current && !tgModalRef.current.contains(e.target)) {
        setIsTgModalOpen(false);
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
        {/* Real-time Telegram CDN & Cloud DB Telemetry Indicator */}
        <div ref={tgModalRef} className="relative">
          <button
            type="button"
            onClick={() => setIsTgModalOpen((prev) => !prev)}
            aria-label="Telegram Cloud DB and CDN Telemetry Status"
            aria-expanded={isTgModalOpen}
            title={`Telegram Cloud DB (@Restaurant Media) • ${
              tgStatus.status === 'online'
                ? `Online (${tgStatus.latency != null ? `${tgStatus.latency}ms` : 'Healthy'})`
                : tgStatus.status === 'checking'
                ? 'Pinging health...'
                : 'Offline'
            }`}
            className={`admin-tg-telemetry-btn ${
              tgStatus.status === 'online'
                ? 'is-online'
                : tgStatus.status === 'checking'
                ? 'is-checking'
                : 'is-offline'
            }`}
          >
            {/* Live pulsating telemetry dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {tgStatus.status === 'online' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  tgStatus.status === 'online'
                    ? 'bg-emerald-500'
                    : tgStatus.status === 'checking'
                    ? 'bg-sky-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
            </span>

            {/* Text badge with responsive fallback */}
            <span className="hidden xl:inline whitespace-nowrap">
              Telegram Cloud DB <span className="opacity-80 font-normal">(@Restaurant Media)</span>
            </span>
            <span className="hidden min-[680px]:inline xl:hidden whitespace-nowrap">
              TG Cloud DB
            </span>

            {/* Live health ping indicator */}
            <span className="admin-tg-telemetry-ping">
              <Activity className="w-2.5 h-2.5 opacity-70 shrink-0" />
              <span>
                {tgStatus.status === 'checking'
                  ? 'ping...'
                  : tgStatus.latency != null
                  ? `${tgStatus.latency}ms`
                  : tgStatus.status === 'online'
                  ? 'LIVE'
                  : 'OFFLINE'}
              </span>
            </span>
          </button>

          {/* Telemetry Diagnostics & Channel Details Popover */}
          {isTgModalOpen && (
            <div
              className="admin-profile-menu animate-scaleUp"
              style={{
                width: '360px',
                maxWidth: '92vw',
                padding: '14px',
                right: 0
              }}
              role="dialog"
              aria-label="Telegram Cloud DB Telemetry Details"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight text-[var(--adm-text)] flex items-center gap-1.5">
                      Telegram Cloud DB
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
                        CDN
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--adm-text-muted)]">
                      High-speed photo/video storage &amp; snapshot pipeline
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTgModalOpen(false)}
                  className="admin-icon-btn"
                  style={{ width: '26px', height: '26px' }}
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Real-time Ping Latency Status Banner */}
              <div
                className="p-2.5 rounded-xl mb-3 flex items-center justify-between gap-2"
                style={{
                  background:
                    tgStatus.status === 'online'
                      ? 'rgba(16, 185, 129, 0.08)'
                      : tgStatus.status === 'checking'
                      ? 'rgba(14, 165, 233, 0.08)'
                      : 'rgba(244, 63, 94, 0.08)',
                  border: `1px solid ${
                    tgStatus.status === 'online'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : tgStatus.status === 'checking'
                      ? 'rgba(14, 165, 233, 0.25)'
                      : 'rgba(244, 63, 94, 0.25)'
                  }`
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {tgStatus.status === 'online' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        tgStatus.status === 'online'
                          ? 'bg-emerald-500'
                          : tgStatus.status === 'checking'
                          ? 'bg-sky-500 animate-pulse'
                          : 'bg-rose-500'
                      }`}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-none text-[var(--adm-text)] truncate">
                      {tgStatus.status === 'online'
                        ? 'Operational & Connected'
                        : tgStatus.status === 'checking'
                        ? 'Testing Health...'
                        : 'Offline / Reconnecting'}
                    </div>
                    <div className="text-[10px] text-[var(--adm-text-muted)] mt-1 truncate">
                      {tgStatus.checkedAt
                        ? `Last checked: ${new Date(tgStatus.checkedAt).toLocaleTimeString()}`
                        : 'Awaiting initial check'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {tgStatus.latency != null ? `${tgStatus.latency}ms` : '—'}
                  </span>
                  <div className="text-[10px] font-semibold text-[var(--adm-text-muted)]">
                    {tgStatus.latency != null && tgStatus.latency < 250
                      ? '⚡ Optimal'
                      : tgStatus.latency != null
                      ? '✨ Normal'
                      : 'No ping'}
                  </div>
                </div>
              </div>

              {/* Channel & Storage Specifications */}
              <div
                className="p-2.5 rounded-xl text-xs space-y-1.5 mb-3"
                style={{
                  background: 'var(--adm-surface-2, rgba(0,0,0,0.02))',
                  border: '1px solid var(--adm-border, rgba(0,0,0,0.08))'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--adm-text-muted)] font-medium">Channel:</span>
                  <span className="font-bold text-[var(--adm-text)] truncate max-w-[200px]">
                    {tgStatus.channelTitle || 'Restaurant Media'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--adm-text-muted)] font-medium">Chat ID:</span>
                  <span className="font-mono text-[11px] text-[var(--adm-text)]">
                    {tgStatus.chatId || '-1004253971473'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--adm-text-muted)] font-medium">Storage Bot:</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    @{tgStatus.botUsername || 'restaurant_media_bot'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--adm-text-muted)] font-medium">Architecture:</span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Standalone CDN
                  </span>
                </div>
              </div>

              {/* Decoupled Resilience Notice */}
              <div
                className="p-2 rounded-lg text-[10px] leading-snug mb-3 flex items-start gap-1.5"
                style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: 'var(--adm-text-muted)'
                }}
              >
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>Independent Storage:</strong> Telegram CDN operates directly with zero hard dependency on external cloud database status. Dish media and snapshots remain accessible during any database outage.
                </span>
              </div>

              {/* Test Signal Banner */}
              {testSignalStatus.state !== 'idle' && (
                <div
                  className="p-2 rounded-lg text-[11px] font-semibold mb-3 flex items-center gap-1.5"
                  style={{
                    background:
                      testSignalStatus.state === 'success'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : testSignalStatus.state === 'sending'
                        ? 'rgba(14, 165, 233, 0.12)'
                        : 'rgba(244, 63, 94, 0.12)',
                    color:
                      testSignalStatus.state === 'success'
                        ? '#047857'
                        : testSignalStatus.state === 'sending'
                        ? '#0369a1'
                        : '#be123c',
                    border: '1px solid currentColor'
                  }}
                >
                  {testSignalStatus.state === 'sending' ? (
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  ) : testSignalStatus.state === 'success' ? (
                    <Check className="w-3 h-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                  )}
                  <span className="leading-tight">{testSignalStatus.message}</span>
                </div>
              )}

              {/* Diagnostic Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isTestingPing}
                  onClick={() => runPingTest(true)}
                  className="admin-notif-action is-primary flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ height: '32px', fontSize: '11px' }}
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingPing ? 'animate-spin' : ''}`} />
                  <span>{isTestingPing ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  disabled={testSignalStatus.state === 'sending'}
                  onClick={handleSendTestSignal}
                  className="admin-notif-action flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ height: '32px', fontSize: '11px' }}
                >
                  <Send className="w-3 h-3" />
                  <span>Send Test Ping</span>
                </button>
              </div>

              {/* View Channel Link */}
              {tgStatus.inviteLink && (
                <div className="mt-2.5 text-center">
                  <a
                    href={tgStatus.inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>View @Restaurant Media Channel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

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
