import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  MessageSquareWarning,
  ChefHat,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Activity,
  Flame,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio,
  Store,
  Compass
} from 'lucide-react';

/**
 * AdminSidebar Component
 * 
 * High-end SaaS navigation sidebar for the SmartDine Admin Dashboard.
 * 
 * Props:
 * - activeTab: 'overview' | 'tables' | 'employees' | 'reports' | 'menu' | 'qr'
 * - onSelectTab: (tabId: string) => void
 * - counts: { activeOrders, assistanceCount, pendingReports, readyPickups, busyEmployees }
 * - isCollapsed: boolean
 * - onToggleCollapse: () => void
 */
export default function AdminSidebar({
  activeTab = 'overview',
  onSelectTab = () => {},
  counts = {},
  isCollapsed = false,
  onToggleCollapse = () => {}
}) {
  const {
    activeOrders = 0,
    assistanceCount = 0,
    pendingReports = 0,
    readyPickups = 0,
    busyEmployees = 0
  } = counts;

  // Normalized active tab for compatibility (e.g., 'stats' -> 'overview')
  const currentTab = activeTab === 'stats' ? 'overview' : activeTab;

  // Primary navigation tabs (Core Operational Views)
  const primaryNavItems = [
    {
      id: 'overview',
      label: 'Overview & Analytics',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      pulseBadge: false
    },
    {
      id: 'tables',
      label: 'Live Tables & Kitchen',
      shortLabel: 'Floor & Kitchen',
      icon: UtensilsCrossed,
      badge: activeOrders > 0 ? activeOrders : null,
      pulseBadge: assistanceCount > 0,
      badgeType: assistanceCount > 0 ? 'warning' : 'primary'
    },
    {
      id: 'employees',
      // STRICT REQUIREMENT: "Employees", NEVER use "Waiter"!
      label: 'Employees Management',
      shortLabel: 'Employees',
      icon: Users,
      badge: busyEmployees > 0 ? busyEmployees : null,
      pulseBadge: false,
      badgeType: 'neutral'
    },
    {
      id: 'reports',
      label: 'Customer Reports & Notes',
      shortLabel: 'Reports & Notes',
      icon: MessageSquareWarning,
      badge: pendingReports > 0 ? pendingReports : null,
      pulseBadge: pendingReports > 0,
      badgeType: 'danger'
    }
  ];

  // Secondary management tabs (System & Catalog)
  const secondaryNavItems = [
    {
      id: 'menu',
      label: 'Menu Management',
      shortLabel: 'Menu',
      icon: ChefHat,
      badge: null
    },
    {
      id: 'qr',
      label: 'QR Generator',
      shortLabel: 'QR Codes',
      icon: QrCode,
      badge: null
    }
  ];

  // Quick Switcher Links to other frontends/interfaces
  const quickLinks = [
    {
      label: 'Customer Menu',
      path: '/?table=1',
      icon: Compass,
      description: 'Live Guest Ordering'
    },
    {
      label: 'Kitchen KDS',
      path: '/kds',
      icon: ChefHat,
      description: 'Cook & Prep Station'
    },
    {
      // STRICT REQUIREMENT: STRICTLY "Employee Floor", NEVER use "Waiter" in UI text!
      label: 'Employee Floor',
      path: '/waiter',
      icon: Users,
      description: 'Floor Staff Service'
    }
  ];

  // Smooth navigation handler supporting smartdine:navigate custom event with window fallback
  const handleNavigate = (path, e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartdine:navigate', { detail: { path } }));
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', path);
      }
    }
  };

  return (
    <aside
      className={`admin-sidebar relative flex flex-col h-screen select-none bg-slate-900 border-r border-slate-800/90 text-slate-300 transition-all duration-300 ease-out z-40 ${
        isCollapsed ? 'w-20' : 'w-64 sm:w-72'
      }`}
      aria-label="Admin Navigation Sidebar"
    >
      {/* 1. BRANDING HEADER */}
      <div className="flex items-center justify-between h-18 px-4 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xs">
        <div
          onClick={() => onSelectTab('overview')}
          className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
          title="SmartDine Admin SaaS"
        >
          {/* Logo Icon Badge */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-100" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900" />
            </span>
          </div>

          {/* Brand Name & SaaS Badge */}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent truncate">
                  SmartDine
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  Admin SaaS
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium tracking-tight truncate">
                Restaurant Automation Suite
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Collapse sidebar (⌘B)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* When collapsed: Floating Expand Button */}
      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-slate-800/60">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. NAVIGATION SECTIONS (Scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* SECTION A: Core Operations */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Operations &amp; Floor
            </div>
          )}
          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center w-full px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/25 via-indigo-600/15 to-transparent text-white border-l-[3px] border-indigo-500 shadow-sm shadow-indigo-900/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-l-[3px] border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/40'
                          : 'text-slate-400 group-hover:text-slate-100 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {/* Collapsed dot pulse */}
                      {isCollapsed && item.pulseBadge && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <span className="truncate tracking-tight font-medium text-[13.5px]">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Badges for expanded mode */}
                  {!isCollapsed && (item.badge !== null || item.pulseBadge) && (
                    <div className="flex items-center gap-1.5 ml-2">
                      {item.pulseBadge && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                      )}
                      {item.badge !== null && (
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                            item.badgeType === 'danger'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : item.badgeType === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.badgeType === 'neutral'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-950 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                      {item.badge !== null && (
                        <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* SECTION B: Secondary Management & Tools */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              System &amp; Catalog
            </div>
          )}
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center w-full px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/25 via-indigo-600/15 to-transparent text-white border-l-[3px] border-indigo-500 shadow-sm shadow-indigo-900/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-l-[3px] border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/40'
                          : 'text-slate-400 group-hover:text-slate-100 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {!isCollapsed && (
                      <span className="truncate tracking-tight font-medium text-[13.5px]">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-950 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* SECTION C: Quick Switcher to Other Views */}
        <div className="pt-2 border-t border-slate-800/70">
          {!isCollapsed && (
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>App Interfaces</span>
              <span className="text-[9px] text-slate-600 font-normal">Direct Link</span>
            </div>
          )}
          <div className="space-y-1">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => handleNavigate(link.path, e)}
                  title={isCollapsed ? link.label : undefined}
                  className={`group relative flex items-center w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-indigo-300 flex items-center justify-center transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-slate-200 group-hover:text-white truncate">
                          {link.label}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {link.description}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-90 transition-opacity ml-1 shrink-0" />
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-950 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                      {link.label}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. FOOTER / SYSTEM STATUS PILL */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
        <div
          className={`flex items-center rounded-xl p-2.5 bg-slate-900/80 border border-slate-800 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title="System Engine: Live Sync Connected @ 60fps"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Connected Beacon */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  Connected
                  <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                    60fps
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate">
                  WebSocket &amp; Convex Synced
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 opacity-70" />
          )}
        </div>
      </div>
    </aside>
  );
}
