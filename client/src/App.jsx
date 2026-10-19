import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

// Pages
import CustomerMenu from './pages/CustomerMenu';
import KitchenDisplay from './pages/KitchenDisplay';
import WaiterPanel from './pages/WaiterPanel';
import AdminDashboard from './pages/AdminDashboard';
import QRBatchGenerator from './pages/QRBatchGenerator';

// Icons
import { 
  UtensilsCrossed, 
  ChefHat, 
  ConciergeBell, 
  ShieldCheck, 
  QrCode, 
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
 * AppRouter: URL Path-based router switching seamlessly between
 * - Customer Menu ('/', '/menu', or '/?table=X')
 * - Kitchen Display System ('/kds')
 * - Waiter Panel ('/waiter')
 * - Admin Dashboard ('/admin')
 * - QR Batch Generator ('/qr')
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
      window.history.pushState({}, '', url.toString());
      setCurrentPath(url.pathname.toLowerCase());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Determine current active view based on pathname
  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';

  const activeView = useMemo(() => {
    if (normalizedPath === '/kds') return 'kds';
    if (normalizedPath === '/waiter') return 'waiter';
    if (normalizedPath === '/admin') return 'admin';
    if (normalizedPath === '/qr') return 'qr';
    return 'customer';
  }, [normalizedPath]);

  // Render view
  const renderView = () => {
    switch (activeView) {
      case 'kds':
        return <KitchenDisplay />;
      case 'waiter':
        return <WaiterPanel />;
      case 'admin':
        return <AdminDashboard />;
      case 'qr':
        return (
          <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
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

  const navItems = [
    { id: 'customer', label: 'Customer Menu', path: '/?table=1', icon: UtensilsCrossed, badge: 'Diner' },
    { id: 'kds', label: 'Kitchen KDS', path: '/kds', icon: ChefHat, badge: 'Kitchen' },
    { id: 'waiter', label: 'Waiter Panel', path: '/waiter', icon: ConciergeBell, badge: 'Floor' },
    { id: 'admin', label: 'Admin Portal', path: '/admin', icon: ShieldCheck, badge: 'Manager' },
    { id: 'qr', label: 'Table QR Generator', path: '/qr', icon: QrCode, badge: 'Stickers' },
  ];

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={activeView === 'admin' ? { backgroundColor: '#0b0f19' } : undefined}
    >

      {/* Global ambient background: fixed, CSS-only, behind non-customer views (except admin) */}
      {activeView !== 'customer' && activeView !== 'admin' && (
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

      {/* QUICK ROLE-SWITCHING FLOATING DOCK (Only visible on Admin Dashboard) */}
      {activeView === 'admin' && (
        <div
          className={`no-print fixed bottom-5 right-6 z-50 ${isModalOpen ? 'hidden' : 'flex'} flex-col items-end pointer-events-none`}
          style={{ bottom: '20px', right: '24px' }}
        >

          {/* Expanded Navigation Drawer */}
          {isDockOpen && (
            <div className="mb-2 bg-[#06140e]/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-[#d4af37]/60 w-64 pointer-events-auto transform transition-all animate-scaleUp">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d4af37]/20">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f0d27a]">
                  <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Role Switcher</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDockOpen(false)}
                  className="text-[#f5efe0]/60 hover:text-[#f0d27a] p-1 rounded-lg"
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
                          ? 'bg-[#0f3d2a] text-[#f5efe0] border-[#d4af37]/70'
                          : 'bg-[#0f3d2a]/30 hover:bg-[#1f6b4a]/40 text-[#f5efe0]/85 border-[#1f6b4a]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f0d27a]' : 'text-[#d4af37]/80'}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                        isActive ? 'bg-[#d4af37]/20 text-[#f0d27a]' : 'bg-[#06140e] text-[#f5efe0]/60'
                      }`}>
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsDockOpen(prev => !prev)}
            className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#06140e]/90 hover:bg-[#0f3d2a]/90 text-[#f5efe0] shadow-xl shadow-black/40 backdrop-blur-md border border-[#d4af37] text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer"
            title="Quick switch between Customer, Kitchen, Waiter, and Admin views"
          >
            <Compass className="w-4 h-4 text-[#d4af37] animate-spin-slow" />
            <span className="hidden sm:inline text-[#f0d27a]">Switch Role</span>
            {isDockOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#d4af37]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#d4af37]" />
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
          <CartProvider>
            <AppRouter />
          </CartProvider>
        </SocketProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
