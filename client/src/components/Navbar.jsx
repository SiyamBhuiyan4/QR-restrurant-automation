import React, { useState, useEffect, useRef } from 'react';
import { UtensilsCrossed, Bell, BellRing, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import CallWaiterModal from './CallWaiterModal';

/**
 * Navbar Component for SmartDine Customer Menu
 * 
 * Features:
 * - Restaurant branding with modern icon
 * - Dynamic table badge with quick change trigger
 * - Call Waiter button with status feedback and quick request menu
 * - Real-time network status badge (Online / Offline Mode)
 */
export default function Navbar({
  tableNumber,
  isOnline: propIsOnline,
  onCallWaiter,
  onChangeTable,
  cartItemCount = 0,
  onOpenCart,
  className = ''
}) {
  // Network status state (uses prop if supplied, otherwise auto-detects)
  const [internalOnline, setInternalOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setInternalOnline(true);
    const handleOffline = () => setInternalOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOnline = propIsOnline !== undefined ? propIsOnline : internalOnline;

  // Scroll-aware shadow: a passive listener that only flips data-scrolled on the header
  // (no React re-render per scroll tick). Throttled to one update per animation frame.
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    let frame = 0;
    let scrolled = null;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 8;
      if (next !== scrolled) {
        scrolled = next;
        el.dataset.scrolled = next ? 'true' : 'false';
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Waiter call state
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [selectedReason, setSelectedReason] = useState('General Assistance');

  const waiterReasons = [
    { label: 'General Assistance', icon: '🙋' },
    { label: 'Request Water', icon: '💧' },
    { label: 'Bring the Bill', icon: '🧾' },
    { label: 'Need Cutlery / Napkins', icon: '🍴' },
    { label: 'Clean Table', icon: '🧼' }
  ];

  const handleTriggerCallWaiter = (reason) => {
    const reasonText = reason || selectedReason;
    if (onCallWaiter) {
      onCallWaiter(reasonText, tableNumber);
    }
    setWaiterCalled(true);
    setShowWaiterModal(false);

    // Auto reset the success state after 6 seconds
    setTimeout(() => {
      setWaiterCalled(false);
    }, 6000);
  };

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled="false"
        className={`sticky top-0 z-40 w-full max-w-[100vw] overflow-hidden bg-[#0a0a0c]/60 backdrop-blur-2xl saturate-150 border-b border-white/5 shadow-none transition-[box-shadow,background-color,border-color] duration-300 ease-out motion-reduce:transition-none data-[scrolled=true]:bg-[#0a0a0c]/85 data-[scrolled=true]:border-white/10 data-[scrolled=true]:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 min-w-0">

            {/* Left: Brand Identity (Screenshot 1: WorldPlate) */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5A26] to-[#FF7A45] flex items-center justify-center text-white shadow-md shadow-[#FF5A26]/40 shrink-0 ring-1 ring-[#FF7A45]/50 transition-transform duration-300 hover:rotate-[-4deg] motion-reduce:transition-none">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base min-[400px]:text-lg sm:text-xl font-black tracking-tight text-white leading-none flex items-center gap-1 whitespace-nowrap">
                  World<span className="text-[#FF5A26] flame-text-glow">Plate</span>
                </span>
                <span className="hidden min-[400px]:block text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                  Artisanal Global Dining
                </span>
              </div>
            </div>

            {/* Center: Desktop Navigation Bar from Screenshot 1 */}
            <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-full text-xs font-semibold backdrop-blur-md">
              <a
                href="#menu-hero"
                className="px-3.5 py-1.5 rounded-full bg-[#FF5A26] text-white font-bold shadow-sm shadow-[#FF5A26]/30 transition-all duration-200"
              >
                Home
              </a>
              <a
                href="#menu-content-root"
                className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Menu
              </a>
              <a
                href="#special-section"
                className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Specials
              </a>
              <a
                href="#reviews-section"
                className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Reviews
              </a>
              <a
                href="#chefs-section"
                className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Chefs
              </a>
              <a
                href="#footer-section"
                className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Contact
              </a>
            </nav>

            {/* Right: Table Badge, Call Waiter & Network Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

              {/* Network Status Badge (text hidden on very small phones; dot/icon + aria stay) */}
              <div
                role="status"
                aria-label={isOnline ? 'Online' : 'Offline Mode'}
                className={`inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold border transition-colors duration-300 ${
                  isOnline
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse motion-reduce:animate-none'
                }`}
                title={isOnline ? 'System is online and connected' : 'Operating in offline local-first mode'}
              >
                {isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 hidden sm:inline" />
                    <span className="hidden sm:inline text-[11px] font-semibold tracking-tight">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline text-[11px] font-semibold tracking-tight">Offline Mode</span>
                  </>
                )}
              </div>

              {/* Table Badge: static label once a table is known (set via QR link) */}
              {tableNumber ? (
                <span
                  className="inline-flex items-center gap-1.5 h-11 px-2.5 sm:px-3 rounded-xl bg-zinc-900/90 text-zinc-200 font-bold text-xs sm:text-sm border border-zinc-800 shadow-xs select-none"
                  title={`Table ${tableNumber}`}
                >
                  <span className="text-base leading-none">🍽️</span>
                  <span className="whitespace-nowrap">Table {tableNumber}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onChangeTable}
                  className="inline-flex items-center gap-1.5 h-11 min-w-11 px-2.5 sm:px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 hover:border-[#FF5A26]/40 active:scale-95 text-zinc-200 font-bold text-xs sm:text-sm border border-zinc-800 transition-[background-color,border-color,transform] duration-200 cursor-pointer shadow-xs motion-reduce:transition-none motion-reduce:active:scale-100"
                  title="Set your table"
                >
                  <span className="text-base leading-none">🍽️</span>
                  <span className="whitespace-nowrap">Set Table</span>
                </button>
              )}

              {/* Call Waiter Trigger Button */}
              <button
                type="button"
                onClick={() => setShowWaiterModal(true)}
                className={`relative inline-flex items-center justify-center gap-1.5 h-11 min-w-11 px-3 rounded-xl font-bold text-xs sm:text-sm transition-[transform,box-shadow,background-color] duration-200 active:scale-95 shadow-md cursor-pointer border motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  waiterCalled
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'flame-gradient-btn text-white border-transparent shadow-[#FF5A26]/30'
                }`}
                title="Call waiter to your table"
              >
                {waiterCalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce motion-reduce:animate-none" />
                    <span className="hidden sm:inline">Waiter Called!</span>
                    <span className="sm:hidden">Called</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-white" />
                    <span className="hidden sm:inline">Call Waiter</span>
                    <span className="sm:hidden">Waiter</span>
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* Call Waiter Modal */}
      <CallWaiterModal
        isOpen={showWaiterModal}
        onClose={() => setShowWaiterModal(false)}
        tableNumber={tableNumber}
        onSuccess={({ reason }) => {
          if (onCallWaiter) {
            onCallWaiter(reason, tableNumber);
          }
          setWaiterCalled(true);
          setTimeout(() => setWaiterCalled(false), 6000);
        }}
      />
    </>
  );
}
