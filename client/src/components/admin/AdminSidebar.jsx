import React from 'react';
import {
  LayoutDashboard,
  Grid3X3,
  ShoppingBag,
  ChefHat,
  ConciergeBell,
  Smartphone,
  UtensilsCrossed,
  QrCode,
  Users,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Radio,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';

/**
 * AdminSidebar Component
 * 
 * Master SaaS Navigation Sidebar giving the Admin direct, unified access
 * to every single system component across the restaurant platform.
 */
export default function AdminSidebar({
  activeTab = 'overview',
  onSelectTab = () => {},
  counts = {},
  isCollapsed = false,
  onToggleCollapse = () => {},
  isDarkMode = false
}) {
  const {
    activeOrders = 0,
    assistanceCount = 0,
    pendingReports = 0,
    readyPickups = 0,
    busyEmployees = 0
  } = counts;

  // Normalized active tab
  const currentTab = activeTab === 'stats' ? 'overview' : activeTab;

  // 1. OPERATIONS & ANALYTICS
  const operationsNav = [
    {
      id: 'overview',
      label: 'Overview & Revenue',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'tables',
      label: 'Live Tables & Floor',
      shortLabel: 'Tables',
      icon: Grid3X3,
      badge: activeOrders > 0 ? activeOrders : null,
      badgeColor: 'primary'
    },
    {
      id: 'orders',
      label: 'Live Orders Pipeline',
      shortLabel: 'Orders',
      icon: ShoppingBag,
      badge: readyPickups > 0 ? `${readyPickups} Ready` : null,
      badgeColor: 'emerald',
      pulse: readyPickups > 0
    }
  ];

  // 2. LIVE FLOOR CONSOLES (Embedded Direct Access)
  const consolesNav = [
    {
      id: 'kds',
      label: 'Kitchen KDS Console',
      shortLabel: 'Kitchen',
      icon: ChefHat,
      badge: activeOrders > 0 ? activeOrders : null,
      badgeColor: 'amber',
      externalUrl: '/kds'
    },
    {
      id: 'floor',
      label: 'Floor Staff Console',
      shortLabel: 'Floor',
      icon: ConciergeBell,
      badge: assistanceCount > 0 ? assistanceCount : null,
      badgeColor: 'rose',
      pulse: assistanceCount > 0,
      externalUrl: '/waiter'
    },
    {
      id: 'customer',
      label: 'Customer Menu Simulator',
      shortLabel: 'Diner Menu',
      icon: Smartphone,
      badge: 'Live',
      badgeColor: 'indigo',
      externalUrl: '/?table=1'
    }
  ];

  // 3. CATALOG & TOOLS
  const catalogNav = [
    {
      id: 'menu',
      label: 'Menu Management',
      shortLabel: 'Menu',
      icon: UtensilsCrossed,
      badge: null
    },
    {
      id: 'qr',
      label: 'Table QR Generator',
      shortLabel: 'QR Codes',
      icon: QrCode,
      badge: null
    }
  ];

  // 4. STAFF & SERVICE INTELLIGENCE
  const staffNav = [
    {
      id: 'employees',
      label: 'Employees Hub',
      shortLabel: 'Employees',
      icon: Users,
      badge: busyEmployees > 0 ? `${busyEmployees} busy` : null,
      badgeColor: 'neutral'
    },
    {
      id: 'reports',
      label: 'Customer Reports & Notes',
      shortLabel: 'Reports',
      icon: MessageSquareWarning,
      badge: pendingReports > 0 ? pendingReports : null,
      badgeColor: 'rose',
      pulse: pendingReports > 0
    }
  ];

  const renderNavGroup = (title, items) => (
    <div className="space-y-1">
      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <div key={item.id} className="relative group/item flex items-center">
            <button
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 outline-none cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover/item:text-indigo-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    item.badgeColor === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : item.badgeColor === 'amber'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : item.badgeColor === 'rose'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      : item.badgeColor === 'indigo'
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                      : 'bg-slate-800 text-slate-300'
                  } ${item.pulse ? 'animate-pulse' : ''}`}
                >
                  {item.badge}
                </span>
              )}
            </button>

            {/* Quick Popout in New Tab */}
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noreferrer"
                title={`Open ${item.label} in new window`}
                className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-400 hover:text-indigo-400 transition-opacity ml-1 rounded-lg"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <aside
      className="admin-sidebar select-none border-r border-slate-800 text-slate-200"
      style={{
        width: '260px',
        minWidth: '260px',
        maxWidth: '260px',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 40,
        backgroundColor: '#0b0f19',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. BRAND HEADER */}
      <div
        className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0"
        style={{ backgroundColor: '#0b0f19' }}
      >
        <div
          onClick={() => onSelectTab('overview')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white">SmartDine</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Admin
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate">Master Operations Suite</span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION GROUPS (Scrollable) */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800"
        style={{ paddingBottom: '80px' }}
      >
        {renderNavGroup('Operations', operationsNav)}
        {renderNavGroup('Live Consoles', consolesNav)}
        {renderNavGroup('Catalog & QR', catalogNav)}
        {renderNavGroup('Team & Feedback', staffNav)}
      </div>

      {/* 3. FOOTER STATUS BAR */}
      <div
        className="p-3 border-t border-slate-800 text-[11px] font-semibold flex items-center justify-between shrink-0"
        style={{ backgroundColor: '#0b0f19', color: '#94a3b8' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>System Online • 60 FPS</span>
        </div>
        <span className="text-[10px] font-bold text-indigo-400">v2.4 SaaS</span>
      </div>
    </aside>
  );
}
