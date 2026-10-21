import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { SocketProvider } from './context/SocketContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { CartProvider } from './context/CartContext';

// Views are loaded per role: each deployment (customer, staff, admin) only downloads its
// own screens, so guests don't load the admin panel or the PDF library. The PWA service
// worker precaches every chunk, so these still open offline.
const CustomerMenu = lazy(() => import('./pages/CustomerMenu'));
const EmployeeView = lazy(() => import('./pages/EmployeeView'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const QRBatchGenerator = lazy(() => import('./pages/QRBatchGenerator'));


const APP_ROLE = import.meta.env?.VITE_APP_ROLE || 'all';
const ROLE_VIEW = { admin: 'admin', employee: 'employee', waiter: 'waiter', customer: 'customer' };

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

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('smartdine:navigate', handleCustomNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('smartdine:navigate', handleCustomNavigate);
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
    // Each deployment serves one panel: VITE_APP_ROLE = admin | employee | waiter | customer
    if (APP_ROLE !== 'all') {
      return ROLE_VIEW[APP_ROLE] || 'customer';
    }
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

  // Render view directly and synchronously for 100% offline-first reliability
  const renderView = () => {
    switch (activeView) {
      case 'employee':
        return <EmployeeView />;
      case 'waiter':
        // Waiters and kitchen staff share one Staff app (the old waiter URL signs in here)
        return <EmployeeView />;
      case 'admin':
        return <AdminDashboard />;
      case 'qr':
        return (
          <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <QRBatchGenerator />
            </div>
          </div>
        );
      case 'customer':
      default:
        return <CustomerMenu />;
    }
  };

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
        <Suspense fallback={<div className="min-h-screen" style={{ background: '#0b0f19' }} aria-busy="true" />}>
          {renderView()}
        </Suspense>
      </div>


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
