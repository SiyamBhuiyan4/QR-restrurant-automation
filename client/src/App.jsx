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
    <div className="relative min-h-screen flex flex-col">
      
      {/* Active Screen View */}
      <div className="flex-1">
        {renderView()}
      </div>

      {/* =========================================================================
          QUICK ROLE-SWITCHING FLOATING DOCK (Hidden during print)
          Enables instant jump across Customer, KDS, Waiter, Admin, and QR codes
          ========================================================================= */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
        
        {/* Expanded Navigation Drawer */}
        {isDockOpen && (
          <div className="mb-2 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-neutral-200/90 w-64 pointer-events-auto transform transition-all animate-scaleUp">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                <Compass className="w-3.5 h-3.5 text-amber-500" />
                <span>Role Switcher</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDockOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-neutral-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-neutral-200/70 text-neutral-600'
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
          className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-900 text-white shadow-xl backdrop-blur-md border border-neutral-700 text-xs font-bold transition-all active:scale-95 cursor-pointer hover:shadow-neutral-900/30"
          title="Quick switch between Customer, Kitchen, Waiter, and Admin views"
        >
          <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span className="hidden sm:inline">Switch Role</span>
          {isDockOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </button>

      </div>

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
