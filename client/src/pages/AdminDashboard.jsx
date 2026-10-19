import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convexApi';
import MenuManager from '../components/MenuManager';
import QRBatchGenerator from './QRBatchGenerator';
import { resolveServerUrl, useSocket } from '../context/SocketContext';
import { getPendingOrders, getPendingWaiterCalls } from '../db/indexedDb';

// High-End Modern SaaS Admin Components
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import OverviewModule from '../components/admin/OverviewModule';
import LiveTablesModule from '../components/admin/LiveTablesModule';
import EmployeesModule from '../components/admin/EmployeesModule';
import CustomerReportsModule from '../components/admin/CustomerReportsModule';

// Central State & Mock Data Architecture
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
 * Redesigned Restaurant Admin Dashboard
 * 
 * Clean SaaS Architecture:
 * - Fixed Left Sidebar Navigation (AdminSidebar)
 * - Top Header Bar with Live Pulse, Search, and Urgent Alerts (AdminHeader)
 * - Dynamic Main Area with 4 Core Operational Modules:
 *   1. Overview & Revenue Analytics (Module A: Side Calendar, KPIs, Chart, Active Running Orders)
 *   2. Live Tables & Kitchen Orders (Module B: 12-Table Grid, 4-Stage Kitchen Flow, Card Actions)
 *   3. Employees Management (Module C: Strictly "Employees", Table Assignment, Live Activity, Call Routing)
 *   4. Customer Reports & Notes (Module D: Direct-to-Admin Notes, Dispatch Staff, Reassign, Resolve)
 *   Plus Secondary Views: 'menu' (MenuManager) and 'qr' (QRBatchGenerator)
 */
export default function AdminDashboard({ className = '' }) {
  // Navigation tabs: 'overview' | 'tables' | 'employees' | 'reports' | 'menu' | 'qr'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (['overview', 'tables', 'employees', 'reports', 'menu', 'qr'].includes(tabParam)) {
        return tabParam;
      }
      if (tabParam === 'stats') {
        return 'overview';
      }
    }
    return 'overview';
  });

  // Dark/Light Mode Theme Toggle (Default dark mode true for SaaS elegance, false for Soft Slate #f8fafc)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartdine_admin_theme');
      if (saved) return saved === 'dark';
    }
    return false; // Soft Slate #f8fafc as requested by default
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

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // CENTRAL OPERATIONAL STATE (Pre-populated rich data + working interactive handlers)
  // ---------------------------------------------------------------------------
  const [tables, setTables] = useState(() => defaultTables);
  const [employees, setEmployees] = useState(() => defaultEmployees);
  const [liveOrders, setLiveOrders] = useState(() => defaultLiveOrders);
  const [customerNotes, setCustomerNotes] = useState(() => defaultCustomerNotes);

  // Live Server Stats & Connectivity
  const [serverStats, setServerStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const socketContext = useSocket ? useSocket() : null;

  // Sync tab with URL search parameter
  const handleSelectTab = (tabId) => {
    const normalizedTab = tabId === 'stats' ? 'overview' : tabId;
    setActiveTab(normalizedTab);
    setIsMobileSidebarOpen(false);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', normalizedTab);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Convex real-time mutations (if connected to Convex)
  let updateConvexStatus = null;
  let resolveConvexCall = null;
  try {
    updateConvexStatus = useMutation(api.orders.updateOrderStatus);
    resolveConvexCall = useMutation(api.waiter.resolveCall);
  } catch (_) {}

  // Fetch live stats and sync from server if available
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
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // ---------------------------------------------------------------------------
  // INTERACTIVE STATE HANDLERS (Cross-Module Operations)
  // ---------------------------------------------------------------------------

  // Advance Kitchen Order Flow (Placed -> Preparing -> Ready Pickup -> Served)
  const handleAdvanceOrderStage = useCallback((orderId, nextStage) => {
    setLiveOrders(prev => {
      const updated = prev.map(o => {
        if (o.id === orderId) {
          return { ...o, kitchenFlowStage: nextStage };
        }
        return o;
      });
      return updated;
    });

    // Automatically update the table's visual status
    const targetOrder = liveOrders.find(o => o.id === orderId);
    if (targetOrder) {
      const tableNum = targetOrder.tableNumber;
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

    // Attempt backend sync
    if (updateConvexStatus) {
      try {
        updateConvexStatus({ orderId: String(orderId), status: nextStage });
      } catch (_) {}
    }
  }, [liveOrders, updateConvexStatus]);

  // Update Table Status directly
  const handleUpdateTableStatus = useCallback((tableId, newStatus) => {
    setTables(prev => prev.map(t => (t.id === tableId || t.tableNumber === tableId ? { ...t, status: newStatus } : t)));
  }, []);

  // Reassign Table to a specific Employee
  const handleReassignTable = useCallback((tableId, employeeId) => {
    const numTableId = Number(tableId);
    const numEmpId = Number(employeeId);

    setTables(prev => prev.map(t => {
      if (t.id === numTableId || t.tableNumber === numTableId) {
        return { ...t, assignedEmployeeId: numEmpId };
      }
      return t;
    }));

    setEmployees(prev => prev.map(emp => {
      if (emp.id === numEmpId) {
        const assigned = new Set(emp.assignedTableIds || []);
        assigned.add(numTableId);
        return { ...emp, assignedTableIds: Array.from(assigned) };
      } else {
        return {
          ...emp,
          assignedTableIds: (emp.assignedTableIds || []).filter(id => id !== numTableId)
        };
      }
    }));
  }, []);

  // Resolve Customer Report / Table Issue
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

    // Find table and clear assistance badge if resolved
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

  // 1-Click jump from Active Order strip or widgets to Live Tables
  const handleNavigateToTables = useCallback((tableNumber) => {
    setActiveTab('tables');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED COUNTS & NOTIFICATIONS
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
    return employees.filter(e => e.status === 'busy').length;
  }, [employees]);

  // Urgent alerts list for notification bell dropdown
  const urgentAlerts = useMemo(() => {
    const alerts = [];
    
    // Critical customer notes
    customerNotes.filter(n => n.status === ISSUE_STATUS.NEW && n.severity === 'critical').forEach(n => {
      alerts.push({
        id: `note-${n.id}`,
        title: `Table #${n.tableNumber} Critical Note`,
        type: 'report',
        table: n.tableNumber,
        time: 'Just now',
        detail: n.complaintText
      });
    });

    // Kitchen ready orders waiting for pickup
    liveOrders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).forEach(o => {
      alerts.push({
        id: `ready-${o.id}`,
        title: `Table #${o.tableNumber} Food Ready`,
        type: 'kitchen',
        table: o.tableNumber,
        time: `${o.timeElapsedMinutes || 2}m elapsed`,
        detail: `Plated in kitchen • Server dispatch pending`
      });
    });

    return alerts;
  }, [customerNotes, liveOrders]);

  return (
    <div
      className={`admin-root min-h-screen flex transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
      } ${className}`}
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      {/* =======================================================================
          1. LEFT FIXED SIDEBAR NAVIGATION
          ======================================================================= */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        counts={{
          activeOrders: activeOrdersCount,
          assistanceCount: assistanceCount,
          pendingReports: pendingReportsCount,
          readyPickups: readyPickupsCount,
          busyEmployees: busyEmployeesCount
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* =======================================================================
          2. MAIN CONTENT AREA & TOP HEADER
          ======================================================================= */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Sticky Top Header Bar */}
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
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
          {/* TAB 1: MODULE A - OVERVIEW & REVENUE ANALYTICS */}
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

          {/* TAB 2: MODULE B - LIVE TABLES & KITCHEN ORDERS */}
          {activeTab === 'tables' && (
            <div className="animate-fadeIn">
              <LiveTablesModule
                tables={tables}
                employees={employees}
                orders={liveOrders}
                customerNotes={customerNotes}
                onUpdateTableStatus={handleUpdateTableStatus}
                onAdvanceOrderStage={handleAdvanceOrderStage}
                onResetTable={(tableNum) => {
                  setTables(prev => prev.map(t => (t.tableNumber === tableNum ? { ...t, status: TABLE_STATUS.AVAILABLE, currentOrderId: null } : t)));
                }}
                onSelectReportsTab={() => handleSelectTab('reports')}
              />
            </div>
          )}

          {/* TAB 3: MODULE C - EMPLOYEES MANAGEMENT (Strictly "Employees") */}
          {activeTab === 'employees' && (
            <div className="animate-fadeIn">
              <EmployeesModule />
            </div>
          )}

          {/* TAB 4: MODULE D - CUSTOMER REPORTS & ADMIN NOTES */}
          {activeTab === 'reports' && (
            <div className="animate-fadeIn">
              <CustomerReportsModule />
            </div>
          )}

          {/* TAB 5: SECONDARY - MENU MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="animate-fadeIn bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <MenuManager />
            </div>
          )}

          {/* TAB 6: SECONDARY - QR BATCH GENERATOR */}
          {activeTab === 'qr' && (
            <div className="animate-fadeIn bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <QRBatchGenerator />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
