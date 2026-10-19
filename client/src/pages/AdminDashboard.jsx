import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import { resolveServerUrl, useSocket } from '../context/SocketContext';
import { useRestaurant } from '../context/RestaurantContext';
import { getPendingOrders, getPendingWaiterCalls } from '../db/indexedDb.js';

// Admin Architecture Components
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import OverviewModule from '../components/admin/OverviewModule';
import LiveTablesModule from '../components/admin/LiveTablesModule';
import LiveOrdersModule from '../components/admin/LiveOrdersModule';
import EmployeesModule from '../components/admin/EmployeesModule';
import CustomerReportsModule from '../components/admin/CustomerReportsModule';
import AdminLoginGate from '../components/admin/AdminLoginGate';

// System Standalone Consoles (Directly Embedded into Master Admin)
import KitchenDisplay from './KitchenDisplay';
import WaiterPanel from './WaiterPanel';
import EmployeeView from './EmployeeView';
import MenuManager from '../components/MenuManager';
import QRBatchGenerator from './QRBatchGenerator';
import { ExternalLink } from 'lucide-react';

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
 *   6. Customer Menu Simulator (Live Embedded Diner View & River Background)
 *   7. Menu Management (Dishes, Prices, Categories & 86 Toggles)
 *   8. Table QR Code Generator (Batch Generator & Printing)
 *   9. Employees Management Hub (Table Allocation, Shift Activity & Responsiveness)
 *   10. Customer Reports & Notes (Direct-to-Admin Notes, Staff Dispatching & Audit Log)
 */
export default function AdminDashboard({ className = '' }) {
  // Session Authentication State (strictly gated by Master PIN '808080')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('smartdine_admin_auth') === 'true';
    }
    return false;
  });

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_admin_auth');
    }
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
        'floor',
        'menu',
        'qr',
        'employees',
        'reports',
        'employee'
      ];
      if (tabParam === 'stats') return 'overview';
      if (tabParam === 'kitchen') return 'kds';
      if (tabParam === 'waiter') return 'floor';
      if (tabParam === 'roster') return 'employees';
      if (validTabs.includes(tabParam)) return tabParam;
    }
    return 'overview';
  });

  // Dark/Light Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartdine_admin_theme');
      if (saved) return saved === 'dark';
    }
    return true; // Noir / Dark Slate as default
  });

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartdine_admin_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  // Ensure html, body, and all outer viewport elements have background #0b0f19
  useEffect(() => {
    document.documentElement.classList.add('admin-active');
    document.body.classList.add('admin-active');
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#0b0f19';
    document.body.style.backgroundColor = '#0b0f19';

    return () => {
      document.documentElement.classList.remove('admin-active');
      document.body.classList.remove('admin-active');
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, []);

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
    resolveAssistanceCall
  } = useRestaurant();

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
    if (normalizedTab === 'waiter') normalizedTab = 'floor';
    if (normalizedTab === 'roster') normalizedTab = 'employees';
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
        'floor',
        'menu',
        'qr',
        'employees',
        'reports',
        'employee'
      ];
      if (tabParam === 'stats') {
        setActiveTab('overview');
      } else if (tabParam === 'kitchen') {
        setActiveTab('kds');
      } else if (tabParam === 'waiter') {
        setActiveTab('floor');
      } else if (tabParam === 'roster') {
        setActiveTab('employees');
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

  // Fetch live stats from server/DB
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    const serverUrl = resolveServerUrl();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const [statsRes, ordersRes] = await Promise.allSettled([
        fetch(`${serverUrl}/api/stats`, { signal: controller.signal }),
        fetch(`${serverUrl}/api/orders?limit=30`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const s = await statsRes.value.json();
        setServerStats(s);
      }
      setIsOfflineMode(false);
    } catch (err) {
      setIsOfflineMode(true);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData(true);
    }
  }, [fetchDashboardData, isAuthenticated]);

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
  }, [liveOrders, updateConvexStatus]);

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
  const handleNavigateToTables = useCallback((tableNumber) => {
    setActiveTab('tables');
  }, []);

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

  // Gate dashboard behind Master Admin Password ('808080')
  if (!isAuthenticated) {
    return <AdminLoginGate onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div
      className={`admin-root dark text-slate-100 ${className}`}
      style={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        overflowX: 'hidden',
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
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
          marginLeft: '260px',
          width: 'calc(100% - 260px)',
          minWidth: 0,
          backgroundColor: '#0b0f19',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        {/* Sticky Header Bar */}
        <AdminHeader
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
        />

        {/* Scrollable Dynamic Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto" style={{ backgroundColor: '#0b0f19' }}>
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
                orders={liveOrders}
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
                orders={liveOrders}
                onAdvanceStage={handleAdvanceOrderStage}
              />
            </div>
          )}

          {/* TAB: EMPLOYEE VIEW (FULL UNIFIED HUB) */}
          {activeTab === 'employee' && (
            <div className="animate-fadeIn rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
              <EmployeeView />
            </div>
          )}

          {/* TAB 4: EMPLOYEE & KITCHEN HUB (KDS) */}
          {activeTab === 'kds' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold text-slate-200">Employee &amp; Kitchen Hub</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Direct Embedded Cook Station (4-View Model)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('employees')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                  >
                    Switch to Staff Roster →
                  </button>
                  <a
                    href="/employee?tab=kitchen"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold transition"
                  >
                    <span>Launch /employee</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-black">
                <KitchenDisplay isEmbedded={true} />
              </div>
            </div>
          )}

          {/* TAB 5: ON-FIELD WAITER CONSOLE */}
          {activeTab === 'floor' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span className="font-bold text-slate-200">On-Field Waiter Console</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Direct Embedded Floor Staff Station (4-View Model)</span>
                </div>
                <a
                  href="/waiter"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold transition"
                >
                  <span>Launch /waiter</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                <WaiterPanel />
              </div>
            </div>
          )}

          {/* TAB 6: MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="animate-fadeIn">
              <MenuManager />
            </div>
          )}

          {/* TAB 8: TABLE QR GENERATOR */}
          {activeTab === 'qr' && (
            <div className="animate-fadeIn">
              <QRBatchGenerator tableCount={tableCount} tables={tables} />
            </div>
          )}

          {/* TAB 9: EMPLOYEES & STAFF ROSTER HUB */}
          {activeTab === 'employees' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="font-bold text-slate-200">Employee Roster &amp; Shifts</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Duty Allocation &amp; Shift Management (Employee Hub)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('kds')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                  >
                    Switch to Kitchen KDS →
                  </button>
                  <a
                    href="/employee?tab=roster"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold transition"
                  >
                    <span>Launch /employee</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <EmployeesModule
                employees={employees}
                tables={tables}
                tableCount={tableCount}
                onAssignTable={assignTableToEmployee}
                onReassignAllTables={reassignAllTables}
                onSetEmployeeStatus={setEmployeeStatus}
                onAutoBalance={autoBalanceTables}
              />
            </div>
          )}

          {/* TAB 10: CUSTOMER REPORTS & NOTES */}
          {activeTab === 'reports' && (
            <div className="animate-fadeIn">
              <CustomerReportsModule />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
