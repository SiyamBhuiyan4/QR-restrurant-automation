import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { SocketProvider } from './context/SocketContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { CartProvider } from './context/CartContext';

// Lazy-loaded Views for Clean Code-Splitting
const CustomerMenu = React.lazy(() => import('./pages/CustomerMenu'));
const EmployeeView = React.lazy(() => import('./pages/EmployeeView'));
const WaiterPanel = React.lazy(() => import('./pages/WaiterPanel'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const QRBatchGenerator = React.lazy(() => import('./pages/QRBatchGenerator'));

// Icons
import { 
  UtensilsCrossed, 
  ChefHat, 
  ConciergeBell, 
  ShieldCheck, 
  ChevronUp, 
  ChevronDown, 
  Compass,
  X
} from 'lucide-react';

/**
 * Custom Error Boundary to capture any unexpected render errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SmartDine] Uncaught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred in this view.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition"
            >
              Go to Customer Menu
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('smartdine_active_order');
                  sessionStorage.clear();
                } catch (_) {}
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold transition"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * AppRouter: URL Path-based router switching seamlessly between 4 distinct views:
 * - Customer View ('/', '/menu', or '/?table=X')
 * - Employee View ('/employee', with '/kds' redirecting/mapping to it)
 * - On-Field / Waiter View ('/waiter')
 * - Admin Portal ('/admin')
 */
function AppRouter() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase();
    }
    return '/';
  });

  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hide the role dock while any overlay (food detail, cart drawer, table/success modal)
  // is open. Those overlays are rendered by pages, so we detect them from the DOM.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const OVERLAY_SELECTOR = '[role="dialog"][aria-modal="true"], .fixed.inset-0.z-50';
    const check = () => {
      setIsModalOpen(!!document.querySelector(OVERLAY_SELECTOR));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Synchronize on browser history popstate (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };

    const handleCustomNavigate = (e) => {
      if (e.detail?.path) {
        navigate(e.detail.path);
      }
    };

    const handleToggleDock = () => {
      setIsDockOpen(prev => !prev);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('smartdine:navigate', handleCustomNavigate);
    window.addEventListener('smartdine:toggle-role-dock', handleToggleDock);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('smartdine:navigate', handleCustomNavigate);
      window.removeEventListener('smartdine:toggle-role-dock', handleToggleDock);
    };
  }, []);

  // Internal smooth navigation helper
  const navigate = useCallback((targetPath) => {
    if (typeof window !== 'undefined') {
      const url = new URL(targetPath, window.location.origin);
      if (url.pathname.toLowerCase() === '/kds') {
        url.pathname = '/employee';
      }
      window.history.pushState({}, '', url.toString());
      setCurrentPath(url.pathname.toLowerCase());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Determine current active view based on pathname (4 distinct views)
  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';

  // Handle automatic redirect from legacy /kds or /kitchen route to /employee?tab=kitchen
  useEffect(() => {
    if (normalizedPath === '/kds' || normalizedPath === '/kitchen') {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      if (!params.get('tab')) params.set('tab', 'kitchen');
      const target = `/employee?${params.toString()}`;
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', target);
      }
      setCurrentPath('/employee');
    }
  }, [normalizedPath]);

  const activeView = useMemo(() => {
    if (
      normalizedPath === '/employee' ||
      normalizedPath.startsWith('/employee/') ||
      normalizedPath === '/kds' ||
      normalizedPath === '/kitchen' ||
      normalizedPath === '/staff'
    ) {
      return 'employee';
    }
    if (
      normalizedPath === '/waiter' ||
      normalizedPath.startsWith('/waiter/') ||
      normalizedPath === '/onfield' ||
      normalizedPath === '/floor'
    ) {
      return 'waiter';
    }
    if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
      return 'admin';
    }
    if (normalizedPath === '/qr') return 'qr';
    return 'customer';
  }, [normalizedPath]);

  // Render view with clean Suspense code-splitting fallback
  const renderView = () => {
    let content = null;
    switch (activeView) {
      case 'employee':
        content = <EmployeeView />;
        break;
      case 'waiter':
        content = <WaiterPanel />;
        break;
      case 'admin':
        content = <AdminDashboard />;
        break;
      case 'qr':
        content = (
          <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <QRBatchGenerator />
            </div>
          </div>
        );
        break;
      case 'customer':
      default:
        content = <CustomerMenu />;
        break;
    }

    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-6 text-amber-400">
            <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold animate-pulse">
              Loading View...
            </div>
          </div>
        }
      >
        {content}
      </React.Suspense>
    );
  };

  // 4 Primary Application Views in Quick Role Switcher
  const navItems = [
    { id: 'customer', label: 'Customer View', path: '/?table=1', icon: UtensilsCrossed, badge: 'Diner' },
    { id: 'employee', label: 'Employee View (Kitchen & Staff)', path: '/employee', icon: ChefHat, badge: 'Staff' },
    { id: 'waiter', label: 'On-Field / Waiter View', path: '/waiter', icon: ConciergeBell, badge: 'Floor' },
    { id: 'admin', label: 'Admin Portal', path: '/admin', icon: ShieldCheck, badge: 'Manager' },
  ];

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={activeView === 'admin' || activeView === 'employee' ? { backgroundColor: '#0b0f19' } : undefined}
    >

      {/* Global ambient background: fixed, CSS-only, behind non-customer views (except admin/employee) */}
      {activeView !== 'customer' && activeView !== 'admin' && activeView !== 'employee' && (
        <div className="app-ambient" aria-hidden="true">
          <div className="app-ambient__blob app-ambient__blob--a" />
          <div className="app-ambient__blob app-ambient__blob--b" />
          <div className="app-ambient__blob app-ambient__blob--c" />
        </div>
      )}

      {/* Active Screen View */}
      <div
        className="flex-1"
        style={activeView === 'admin' ? { backgroundColor: '#0b0f19' } : undefined}
      >
        {renderView()}
      </div>

      {/* QUICK ROLE-SWITCHING FLOATING DOCK (Hidden on Waiter Mobile View) */}
      {(activeView === 'admin' || activeView === 'employee') && (
        <div
          id="smartdine-global-role-switcher"
          className={`no-print fixed bottom-6 right-6 z-50 ${isModalOpen ? 'hidden' : 'flex'} flex-col items-end pointer-events-none`}
        >
          {/* Expanded Navigation Drawer */}
          {isDockOpen && (
            <div className="mb-2 bg-[#131926]/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-[#2A384C] w-64 pointer-events-auto transform transition-all animate-scaleUp">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E293B]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F59E0B]">
                  <Compass className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Role Switcher</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDockOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setIsDockOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                        isActive
                          ? 'bg-[#1E293B] text-white border-[#F59E0B]/60 shadow-sm'
                          : 'bg-[#0B0F19]/50 hover:bg-[#1E293B]/60 text-slate-300 border-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F59E0B]' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isActive ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#0B0F19] text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Toggle Pill: Outline "🧭 Switch Role ⌃" Button */}
          <button
            type="button"
            onClick={() => setIsDockOpen(prev => !prev)}
            className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#131926]/95 hover:bg-[#1E293B] text-slate-200 shadow-2xl backdrop-blur-md border border-[#2A384C] hover:border-[#F59E0B]/60 text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer"
            title="Quick switch between Customer, Employee, Waiter, and Admin views"
          >
            <Compass className="w-4 h-4 text-[#F59E0B] animate-spin-slow" />
            <span className="hidden sm:inline text-slate-200">Switch Role</span>
            {isDockOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NetworkProvider>
        <SocketProvider>
          <RestaurantProvider>
            <CartProvider>
              <AppRouter />
            </CartProvider>
          </RestaurantProvider>
        </SocketProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
