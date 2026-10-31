import React from 'react';
import { useQuery } from '../../db/telegramDb';
import { api } from '../../convexApi';
import { appUrl } from '../../utils/appUrls';
import {
  LayoutDashboard,
  Grid3X3,
  ShoppingBag,
  ChefHat,
  UtensilsCrossed,
  Film,
  QrCode,
  Users,
  MessageSquareWarning,
  ExternalLink,
  Sparkles
} from 'lucide-react';

/**
 * AdminSidebar Component
 *
 * Admin navigation. Fixed on desktop, slide-in drawer on phones/tablets
 * (controlled by `isMobileOpen`). Styling lives in admin.css (.admin-sidebar*).
 */
export default function AdminSidebar({
  activeTab = 'overview',
  onSelectTab = () => {},
  counts = {},
  isCollapsed = false,
  onToggleCollapse = () => {},
  isDarkMode = false,
  isMobileOpen = false
}) {
  const {
    activeOrders = 0,
    assistanceCount = 0,
    pendingReports = 0,
    readyPickups = 0,
    busyEmployees = 0,
    tableCount = 12
  } = counts;

  // Pending customer "call waiter" requests, live from the server
  const liveCalls = useQuery(api.waiter.getActiveCalls, {});
  const openCalls = Array.isArray(liveCalls) ? liveCalls.length : 0;

  // Normalized active tab
  const currentTab = activeTab === 'stats'
    ? 'overview'
    : ['employee', 'team', 'floor', 'waiter', 'roster'].includes(activeTab) ? 'employees' : activeTab;

  // Badge tones map to .admin-nav-badge--<tone> in admin.css
  const groups = [
    {
      title: 'Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tables', label: 'Floor & Tables', icon: Grid3X3, badge: `${tableCount}`, tone: 'primary' },
        { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: readyPickups > 0 ? `${readyPickups} ready` : null, tone: 'success', pulse: readyPickups > 0 },
        { id: 'kds', label: 'Kitchen Monitor', icon: ChefHat, badge: activeOrders > 0 ? activeOrders : null, tone: 'warning' }
      ]
    },
    {
      title: 'Catalog',
      items: [
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
        { id: 'reels', label: 'Reels', icon: Film },
        { id: 'qr', label: 'QR Codes', icon: QrCode }
      ]
    },
    {
      title: 'Team & feedback',
      items: [
        { id: 'employees', label: 'Staff', icon: Users, badge: openCalls > 0 ? `${openCalls} call${openCalls === 1 ? '' : 's'}` : null, tone: 'danger', pulse: openCalls > 0 },
        { id: 'reports', label: 'Reports & feedback', icon: MessageSquareWarning, badge: pendingReports > 0 ? pendingReports : null, tone: 'danger', pulse: pendingReports > 0, externalUrl: appUrl('employee', '?tab=reports') }
      ]
    }
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
  };

  return (
    <aside
      className={`admin-sidebar ${isDarkMode ? 'dark' : ''} ${isMobileOpen ? 'is-open' : ''} select-none`}
      aria-label="Admin navigation"
    >
      {/* Brand */}
      <button
        type="button"
        onClick={() => handleSelect('overview')}
        className="admin-sidebar-brand"
      >
        <span className="admin-sidebar-logo">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="flex flex-col min-w-0 text-left">
          <span className="admin-sidebar-brand-name">
            SmartDine <span className="admin-sidebar-role">Admin</span>
          </span>
          <span className="admin-sidebar-brand-sub">Operations suite</span>
        </span>
      </button>

      {/* Navigation groups */}
      <nav className="admin-sidebar-nav">
        {groups.map(group => (
          <div key={group.title} className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">{group.title}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div key={item.id} className="admin-nav-row group/item">
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`admin-nav-item ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className={`admin-nav-badge admin-nav-badge--${item.tone || 'neutral'} ${item.pulse ? 'animate-pulse' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`Open ${item.label} in a new window`}
                      aria-label={`Open ${item.label} in a new window`}
                      className="admin-nav-external"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: live status only */}
      <div className="admin-sidebar-footer">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--adm-success)' }} aria-hidden="true" />
        <span className="truncate">System online</span>
      </div>
    </aside>
  );
}
