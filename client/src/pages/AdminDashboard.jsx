import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '../db/telegramDb';
import { api } from '../convexApi';
import { convex } from '../convexClient.js';
import { useSocket } from '../context/SocketContext';
import { useRestaurant } from '../context/RestaurantContext';
import { getPendingOrders, getPendingWaiterCalls } from '../db/indexedDb.js';

// Admin Architecture Components
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import OverviewModule from '../components/admin/OverviewModule';
import LiveTablesModule from '../components/admin/LiveTablesModule';
import LiveOrdersModule from '../components/admin/LiveOrdersModule';
import CustomerReportsModule from '../components/admin/CustomerReportsModule';
import AdminLoginGate from '../components/admin/AdminLoginGate';
import { getAdminToken, adminLogout } from '../utils/teamSession';
import useAdminShortcuts from '../hooks/useAdminShortcuts';

// System Standalone Consoles (Directly Embedded into Master Admin)
import KitchenMonitorModule from '../components/admin/KitchenMonitorModule';
import StaffManagementModule from '../components/admin/StaffManagementModule';
import MenuManager from '../components/MenuManager';
import ReelsManager from '../components/admin/ReelsManager';
import QRBatchGenerator from './QRBatchGenerator';
import { ExternalLink } from 'lucide-react';
import { settleTableOrders } from '../components/admin/BillReceipt';

// State Architecture & Realistic Mock Datasets
import {
  getInitialAdminState,
  calculateMetricsForDateRange,
  mockTables as defaultTables,
  mockEmployees as defaultEmployees,
  mockLiveOrders as defaultLiveOrders,
  mockCustomerNotes as defaultCustomerNotes,
  TABLE_STATUS,
  KITCHEN_STAGE,
  ISSUE_STATUS
} from '../data/adminMockData';

import '../styles/admin.css';
import '../styles/admin-ui.css';
import useAdminTheme from '../hooks/useAdminTheme';
import { appUrl } from '../utils/appUrls';
import StaffMessenger from '../components/admin/StaffMessenger';

/**
 * Unified Master Restaurant Admin Dashboard
 * 
 * SaaS Architecture:
 * - High-performance Flexbox Shell: Fixed Left Sidebar + Scrollable Viewport
 * - Top Header: Section Breadcrumbs, ⌘K Global Search, Live Pulse, Urgent Alert Drawer
 * - Complete Access to Every Platform Component:
 *   1. Overview & Revenue Analytics (Module A: Side Calendar, KPIs, Revenue Chart)
 *   2. Live Tables & Floor Grid (Module B: 12-Table layout, 4-Stage Kitchen Flow)
 *   3. Live Orders Pipeline (Live Tickets, Customer Audio Notes, Status Advancement)
 *   4. Kitchen KDS Console (Direct Embedded Cook Station)
 *   5. Floor Staff Console (Direct Embedded Assistance Panel)
 *   6. Customer Menu Simulator (Live Embedded Diner View)
 *   7. Menu Management (Dishes, Prices, Categories & 86 Toggles)
 *   8. Table QR Code Generator (Batch Generator & Printing)
 *   9. Employees Management Hub (Table Allocation, Shift Activity & Responsiveness)
 *   10. Customer Reports & Notes (Direct-to-Admin Notes, Staff Dispatching & Audit Log)
 */
export default function AdminDashboard({ className = '' }) {
  // Session Authentication State (gated by the server-verified Master PIN)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      // Needs the server session token too (older sessions without one sign in again)
      return sessionStorage.getItem('smartdine_admin_auth') === 'true' && !!getAdminToken();
    }
    return false;
  });

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_admin_auth');
    }
    adminLogout();
    setIsAuthenticated(false);
  }, []);

  // Navigation tab state (supports URL search param '?tab=...')
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs = [
        'overview',
        'tables',
        'orders',
        'kds',
        'menu',
        'reels',
        'qr',
        'employees',
        'reports'
      ];
      if (tabParam === 'stats') return 'overview';
      if (tabParam === 'kitchen') return 'kds';
      // Staff, team and waiter console are one Staff page now
      if (['waiter', 'floor', 'team', 'roster', 'employee'].includes(tabParam)) return 'employees';
      if (validTabs.includes(tabParam)) return tabParam;
    }
    return 'overview';
  });

  // Dark/Light Theme: saved choice (localStorage) or OS preference. See hooks/useAdminTheme.js
  const { theme: adminTheme, isDark: isDarkMode, toggleTheme: handleToggleDarkMode } = useAdminTheme();

  // Ensure admin-active is set on documentElement and body, and cleanup on unmount
  useEffect(() => {
    document.documentElement.classList.add('admin-active');
    document.body.classList.add('admin-active');
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;

    return () => {
      document.documentElement.classList.remove('admin-active');
      document.body.classList.remove('admin-active');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  // Synchronize Dark / Light Mode with documentElement, body, and colors
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    document.documentElement.style.backgroundColor = isDarkMode ? '#0b1120' : '#f5f6f8';
    document.body.style.backgroundColor = isDarkMode ? '#0b1120' : '#f5f6f8';
  }, [isDarkMode]);

  // Sidebar Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Central Operational State from RestaurantContext
  const {
    tableCount,
    tables,
    employees,
    assistanceCalls,
    setTableCount,
    addTable,
    removeTable,
    setTables,
    setEmployees,
    assignTableToEmployee,
    reassignAllTables,
    setEmployeeStatus,
    autoBalanceTables,
    resolveAssistanceCall,
    recordActivity
  } = useRestaurant();

  // Dynamic live floor table capacity (strictly keeps QR generator and staff roster in sync with floor matrix)
  const effectiveLiveTableCount = useMemo(() => {
    const fromTables = Array.isArray(tables) && tables.length > 0 
      ? Math.max(tables.length, tables.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0)) 
      : 0;
    return Math.max(fromTables, tableCount || 0, 12);
  }, [tables, tableCount]);

  const [liveOrders, setLiveOrders] = useState(() => defaultLiveOrders);
  const [customerNotes, setCustomerNotes] = useState(() => defaultCustomerNotes);

  // Live Server Telemetry State
  const [serverStats, setServerStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const socketContext = useSocket ? useSocket() : null;

  // Sync tab selection with browser history
  const handleSelectTab = (tabId) => {
    let normalizedTab = tabId === 'stats' ? 'overview' : tabId;
    if (normalizedTab === 'kitchen') normalizedTab = 'kds';
    if (['waiter', 'floor', 'team', 'roster', 'employee'].includes(normalizedTab)) normalizedTab = 'employees';
    setActiveTab(normalizedTab);
    setIsMobileSidebarOpen(false);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', normalizedTab);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Synchronize activeTab on browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs = [
        'overview',
        'tables',
        'orders',
        'kds',
        'menu',
        'reels',
        'qr',
        'employees',
        'reports'
      ];
      if (['employee', 'waiter', 'floor', 'team', 'roster'].includes(tabParam)) {
        setActiveTab('employees');
      } else if (tabParam === 'stats') {
        setActiveTab('overview');
      } else if (tabParam === 'kitchen') {
        setActiveTab('kds');
      } else if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else {
        setActiveTab('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Real-time Convex mutations
  let updateConvexStatus = null;
  let resolveConvexCall = null;
  try {
    updateConvexStatus = useMutation(api.orders.updateOrderStatus);
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Live restaurant stats (Convex subscription) and a manual refresh that re-reads them
  let liveStats = undefined;
  try {
    liveStats = useQuery(api.stats.getStats, {});
  } catch (_) {}

  useEffect(() => {
    if (liveStats) {
      setServerStats(liveStats);
      setIsOfflineMode(false);
    }
  }, [liveStats]);

  // Re-read stats from Convex (refresh button)
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);

    try {
      const s = await convex.query(api.stats.getStats, {});
      setServerStats(s);
      setIsOfflineMode(false);
    } catch (err) {
      setIsOfflineMode(true);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ACTION HANDLERS
  // ---------------------------------------------------------------------------

  // Advance Kitchen Order Flow (Placed -> Preparing -> Ready Pickup -> Served)
  const handleAdvanceOrderStage = useCallback((orderId, nextStage) => {
    setLiveOrders(prev => {
      return prev.map(o => (o.id === orderId ? { ...o, kitchenFlowStage: nextStage } : o));
    });

    const target = liveOrders.find(o => o.id === orderId);
    if (target) {
      const tableNum = target.tableNumber;
      setTables(prev => prev.map(t => {
        if (t.tableNumber === tableNum) {
          if (nextStage === KITCHEN_STAGE.READY_PICKUP) {
            return { ...t, status: TABLE_STATUS.READY_IN_KITCHEN };
          }
          if (nextStage === KITCHEN_STAGE.SERVED) {
            return { ...t, status: TABLE_STATUS.AVAILABLE };
          }
          if (nextStage === KITCHEN_STAGE.PREPARING) {
            return { ...t, status: TABLE_STATUS.ORDER_RUNNING };
          }
        }
        return t;
      }));
    }

    if (updateConvexStatus) {
      try {
        updateConvexStatus({ orderId: String(orderId), status: nextStage });
      } catch (_) {}
    }

    if (recordActivity) {
      recordActivity({
        actorType: 'admin',
        actorId: 'admin',
        actorName: 'Head Desk / Admin',
        actorRole: 'Admin',
        actorStaffId: 'ADMIN',
        actionType: 'STAGE_ADVANCE',
        description: `Admin advanced Order #${String(orderId).slice(-4)} to "${String(nextStage).toUpperCase()}"`,
        target: `Order #${String(orderId).slice(-4)}`,
        details: `Stage set to ${nextStage}`
      });
    }
  }, [liveOrders, updateConvexStatus, recordActivity]);

  // Settle & close table: completes its orders in shared state and on the server, and records the payment
  const handleSettleTableOrders = useCallback(async (bill, paymentMethod) => {
    const ids = bill.orderIds.map(String);
    const billOrders = liveOrders.filter(o => ids.includes(String(o.id)));
    await settleTableOrders({ bill, paymentMethod, orders: billOrders });

    const paidAt = new Date().toISOString();
    setLiveOrders(prev => prev.map(o => (
      ids.includes(String(o.id))
        ? { ...o, completed: true, kitchenFlowStage: KITCHEN_STAGE.SERVED, paymentMethod, paidAt, billNumber: bill.billNumber, billTotal: bill.total }
        : o
    )));
    setTables(prev => prev.map(t => (
      t.tableNumber === bill.tableNumber ? { ...t, status: TABLE_STATUS.AVAILABLE, currentOrderId: null } : t
    )));

    if (updateConvexStatus) {
      billOrders.forEach((o) => {
        try {
          updateConvexStatus({ orderId: String(o.id), status: 'completed' });
        } catch (_) {}
      });
    }

    if (recordActivity) {
      recordActivity({
        actorType: 'admin',
        actorId: 'admin',
        actorName: 'Head Desk / Admin',
        actorRole: 'Admin',
        actorStaffId: 'ADMIN',
        actionType: 'TABLE_SETTLED',
        description: `Settled Table ${bill.tableNumber} (${bill.billNumber}) by ${paymentMethod} for $${bill.total.toFixed(2)}`,
        target: `Table ${bill.tableNumber}`,
        details: `Bill ${bill.billNumber}, ${ids.length} order(s), payment ${paymentMethod}`
      });
    }
  }, [liveOrders, updateConvexStatus, recordActivity]);

  // Boards show open orders only; settled orders stay in liveOrders for the overview and reports
  const activeOrders = useMemo(() => liveOrders.filter(o => !o.completed), [liveOrders]);

  // Update Table Status
  const handleUpdateTableStatus = useCallback((tableId, newStatus) => {
    setTables(prev => prev.map(t => (t.id === tableId || t.tableNumber === tableId ? { ...t, status: newStatus } : t)));
  }, []);

  // Resolve Customer Report
  const handleResolveIssue = useCallback((noteId, resolutionNote) => {
    setCustomerNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          status: ISSUE_STATUS.RESOLVED,
          resolutionNote: resolutionNote || 'Resolved by Manager'
        };
      }
      return n;
    }));

    const note = customerNotes.find(n => n.id === noteId);
    if (note) {
      setTables(prev => prev.map(t => {
        if (t.tableNumber === note.tableNumber && t.status === TABLE_STATUS.NEED_ASSISTANCE) {
          return { ...t, status: TABLE_STATUS.AVAILABLE };
        }
        return t;
      }));
    }
  }, [customerNotes]);

  // Jump to table from any widget
  // Alert acknowledge: waiter calls are resolved for real; other alerts open the screen that handles them
  const handleResolveAlert = useCallback((alert) => {
    if (alert?.type === 'assistance') {
      resolveAssistanceCall(String(alert.id).replace(/^call-/, ''));
    } else {
      handleSelectTab(alert?.type === 'report' ? 'reports' : 'overview');
    }
  }, [resolveAssistanceCall]);

  const handleNavigateToTables = useCallback((tableNumber) => {
    setActiveTab('tables');
  }, []);

  // ---------------------------------------------------------------------------
  // GLOBAL SEARCH INDEX (tables, orders, staff) + KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
  const searchItems = useMemo(() => {
    const items = [];
    (tables || []).forEach((t) => {
      items.push({
        id: `table-${t.tableNumber}`,
        type: 'table',
        label: t.name || `Table ${t.tableNumber}`,
        sub: `Table #${t.tableNumber}${t.status ? ` · ${String(t.status).replace(/_/g, ' ')}` : ''}`,
        keywords: `table ${t.tableNumber}`,
        target: 'tables'
      });
    });
    (liveOrders || []).forEach((o) => {
      items.push({
        id: `order-${o.id}`,
        type: 'order',
        label: o.orderNumber || `Order ${o.id}`,
        sub: [o.customerName, o.tableNumber ? `Table #${o.tableNumber}` : null].filter(Boolean).join(' · '),
        keywords: `order ${o.orderNumber || ''} ${o.customerName || ''} ${o.tableNumber || ''}`,
        target: 'orders'
      });
    });
    (employees || []).forEach((e) => {
      items.push({
        id: `staff-${e.id || e.name}`,
        type: 'staff',
        label: e.name || 'Staff',
        sub: e.role || 'Staff',
        keywords: `staff ${e.name || ''} ${e.role || ''}`,
        target: 'employees'
      });
    });
    return items;
  }, [tables, liveOrders, employees]);

  const handleSearchSelect = (item) => {
    if (!item) return;
    setSearchQuery('');
    handleSelectTab(item.target);
  };

  useAdminShortcuts({
    enabled: true,
    onFocusSearch: () => document.querySelector('.admin-header-input')?.focus(),
    chords: {
      o: () => handleSelectTab('overview'),
      t: () => handleSelectTab('tables'),
      r: () => handleSelectTab('orders'),
      k: () => handleSelectTab('kds'),
      w: () => handleSelectTab('employees'),
      s: () => handleSelectTab('employees'),
      m: () => handleSelectTab('menu'),
      q: () => handleSelectTab('qr'),
      c: () => handleSelectTab('reports')
    }
  });

  // ---------------------------------------------------------------------------
  // DERIVED COUNTS
  // ---------------------------------------------------------------------------
  const activeOrdersCount = useMemo(() => {
    return liveOrders.filter(o => o.kitchenFlowStage !== KITCHEN_STAGE.SERVED).length;
  }, [liveOrders]);

  const assistanceCount = useMemo(() => {
    return tables.filter(t => t.status === TABLE_STATUS.NEED_ASSISTANCE).length;
  }, [tables]);

  const pendingReportsCount = useMemo(() => {
    return customerNotes.filter(n => n.status !== ISSUE_STATUS.RESOLVED).length;
  }, [customerNotes]);

  const readyPickupsCount = useMemo(() => {
    return liveOrders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).length;
  }, [liveOrders]);

  const busyEmployeesCount = useMemo(() => {
    return employees.filter(e => e.status === 'busy' || e.status === 'Busy').length;
  }, [employees]);

  // Urgent alerts for bell drawer
  const urgentAlerts = useMemo(() => {
    const list = [];

    // Live Customer Assistance Calls routed to assigned employee
    (assistanceCalls || []).filter(c => c.status === 'pending').forEach(c => {
      const tblNum = c.tableNumber || c.table_number || c.table;
      list.push({
        id: `call-${c.id}`,
        title: `Table #${tblNum} Requested Assistance`,
        type: 'assistance',
        table: tblNum,
        time: 'Active now',
        detail: `Routed to assigned employee: ${c.assignedEmployeeName || 'Floor Specialist'} • Reason: ${c.reason || 'Assistance'}`
      });
    });

    customerNotes.filter(n => n.status === ISSUE_STATUS.NEW && n.severity === 'critical').forEach(n => {
      list.push({
        id: `note-${n.id}`,
        title: `Table #${n.tableNumber} Critical Issue`,
        type: 'report',
        table: n.tableNumber,
        time: 'Just now',
        detail: n.complaintText
      });
    });

    liveOrders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).forEach(o => {
      list.push({
        id: `ready-${o.id}`,
        title: `Table #${o.tableNumber} Food Ready`,
        type: 'kitchen',
        table: o.tableNumber,
        time: `${o.timeElapsedMinutes || 3}m elapsed`,
        detail: 'Plated at kitchen pass • Server alert pending'
      });
    });
    return list;
  }, [assistanceCalls, customerNotes, liveOrders]);

  // Gate dashboard behind Master Admin Password (verified on server)
  if (!isAuthenticated) {
    return <AdminLoginGate onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div
      className={`admin-root admin-shell ${isDarkMode ? 'dark text-slate-100' : 'text-slate-900'} ${className}`}
      data-theme={adminTheme}
      style={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: 'var(--adm-bg)',
        color: 'var(--adm-text)',
        overflowX: 'hidden',
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        transition: 'background-color 0.2s ease, color 0.2s ease'
      }}
    >
      {/* =======================================================================
          1. MASTER SAAS SIDEBAR
          ======================================================================= */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        counts={{
          activeOrders: activeOrdersCount,
          assistanceCount: assistanceCount,
          pendingReports: pendingReportsCount,
          readyPickups: readyPickupsCount,
          busyEmployees: busyEmployeesCount,
          tableCount: tableCount
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isDarkMode={isDarkMode}
        isMobileOpen={isMobileSidebarOpen}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* =======================================================================
          2. MASTER CONTENT VIEWPORT (Header + Content)
          ======================================================================= */}
      <div
        className="admin-viewport flex-1 min-w-0"
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: 'var(--adm-bg)',
          color: 'var(--adm-text)',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'background-color 0.2s ease, color 0.2s ease'
        }}
      >
        {/* Sticky Header Bar */}
        <AdminHeader
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchItems={searchItems}
          onSearchSelect={handleSearchSelect}
          reportsCount={pendingReportsCount}
          urgentAlerts={urgentAlerts}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onRefresh={() => fetchDashboardData(false)}
          isRefreshing={isRefreshing}
          onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          tableCount={tableCount}
          onAddTable={addTable}
          onRemoveTable={removeTable}
          onSetTableCount={setTableCount}
          onLogout={handleLogout}
          onResolveAlert={handleResolveAlert}
        />

        {/* Scrollable Dynamic Workspace */}
        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto"
          style={{
            backgroundColor: 'var(--adm-bg)',
            color: 'var(--adm-text)',
            transition: 'background-color 0.2s ease, color 0.2s ease'
          }}
        >
          {/* TAB 1: OVERVIEW & REVENUE ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="animate-fadeIn">
              <OverviewModule
                orders={liveOrders}
                stats={serverStats}
                onNavigateToTables={handleNavigateToTables}
                onExportReport={() => {}}
              />
            </div>
          )}

          {/* TAB 2: LIVE TABLES & FLOOR */}
          {activeTab === 'tables' && (
            <div className="animate-fadeIn">
              <LiveTablesModule
                tables={tables}
                employees={employees}
                orders={activeOrders}
                onSettleTable={handleSettleTableOrders}
                customerNotes={customerNotes}
                tableCount={tableCount}
                onTableCountChange={setTableCount}
                onAddTable={addTable}
                onRemoveTable={removeTable}
                onAutoBalanceTables={autoBalanceTables}
                onAssignEmployee={assignTableToEmployee}
                onUpdateTableStatus={handleUpdateTableStatus}
                onAdvanceOrderStage={handleAdvanceOrderStage}
                onResetTable={(tableNum) => {
                  // Guests at that table have to scan the QR again to order
                  convex.mutation(api.sessions.adminCloseTable, { adminToken: getAdminToken(), tableNumber: Number(tableNum) }).catch(() => {});
                  setTables(prev => prev.map(t => (t.tableNumber === tableNum ? { ...t, status: TABLE_STATUS.AVAILABLE, currentOrderId: null } : t)));
                }}
                onSelectReportsTab={() => handleSelectTab('reports')}
                onUpdateTables={setTables}
              />
            </div>
          )}

          {/* TAB 3: LIVE ORDERS PIPELINE */}
          {activeTab === 'orders' && (
            <div className="animate-fadeIn">
              <LiveOrdersModule
                orders={activeOrders}
                onAdvanceStage={handleAdvanceOrderStage}
              />
            </div>
          )}

          {/* TAB 4: KITCHEN MONITOR (view only; staff run the kitchen from their own sign-in) */}
          {activeTab === 'kds' && (
            <div className="animate-fadeIn">
              <KitchenMonitorModule onManageTeam={() => handleSelectTab('employees')} />
            </div>
          )}

          {/* TAB 6: MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="animate-fadeIn">
              <MenuManager />
            </div>
          )}

          {/* TAB 7: REELS (dish reels summary + stand-alone fun reels) */}
          {activeTab === 'reels' && (
            <div className="animate-fadeIn">
              <ReelsManager onOpenMenu={() => handleSelectTab('menu')} />
            </div>
          )}

          {/* TAB 8: TABLE QR GENERATOR */}
          {activeTab === 'qr' && (
            <div className="animate-fadeIn">
              <QRBatchGenerator tableCount={effectiveLiveTableCount} tables={tables} />
            </div>
          )}

          {/* TAB 9: STAFF (accounts, kitchen access, table coverage, who is doing what) */}
          {activeTab === 'employees' && (
            <div className="animate-fadeIn">
              <StaffManagementModule tableCount={effectiveLiveTableCount} />
            </div>
          )}

          {/* TAB 10: CUSTOMER REPORTS & NOTES */}
          {activeTab === 'reports' && (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between gap-3 mb-3 px-1">
                <span className="text-xs text-slate-400 font-medium">
                  Direct customer reports synchronized in real-time with Staff Operations Console
                </span>
                <a
                  href={appUrl('employee', '?tab=reports')}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                  title="Open Customer Requests in Employee Hub"
                >
                  <span>Open in Employee Hub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <CustomerReportsModule />
            </div>
          )}
        </main>
      </div>

      {/* Staff message bubble + split view (only after admin sign-in) */}
      <StaffMessenger />
    </div>
  );
}
