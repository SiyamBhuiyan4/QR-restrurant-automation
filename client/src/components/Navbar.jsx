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
        className={`sticky top-0 z-40 w-full max-w-[100vw] overflow-hidden bg-[#06140e]/70 backdrop-blur-2xl saturate-150 border-b border-[#d4af37]/20 shadow-none transition-[box-shadow,background-color,border-color] duration-300 ease-out motion-reduce:transition-none data-[scrolled=true]:bg-[#06140e]/90 data-[scrolled=true]:border-[#d4af37]/35 data-[scrolled=true]:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 min-w-0">

            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#f0d27a] flex items-center justify-center text-[#06140e] shadow-md shadow-[#d4af37]/30 shrink-0 ring-1 ring-[#f0d27a]/60 transition-transform duration-300 hover:rotate-[-4deg] motion-reduce:transition-none">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base min-[400px]:text-lg sm:text-xl font-black tracking-tight text-[#f5efe0] leading-none flex items-center gap-1 whitespace-nowrap">
                  World<span className="text-[#d4af37] drop-shadow-[0_0_8px_rgba(212,175,55,0.45)]">Plate</span>
                </span>
                <span className="hidden min-[400px]:block text-[11px] text-[#f5efe0]/60 font-medium truncate mt-0.5">
                  Artisanal Global Dining
                </span>
              </div>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#0f3d2a]/50 border border-[#d4af37]/15 p-1 rounded-full text-xs font-semibold backdrop-blur-md">
              <a
                href="#menu-hero"
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#f0d27a] text-[#06140e] font-bold shadow-sm shadow-[#d4af37]/30 transition-all duration-200"
              >
                Home
              </a>
              {[
                ['#menu-content-root', 'Menu'],
                ['#special-section', 'Specials'],
                ['#reviews-section', 'Reviews'],
                ['#chefs-section', 'Chefs'],
                ['#footer-section', 'Contact']
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="px-3.5 py-1.5 rounded-full text-[#f5efe0]/75 hover:text-[#f0d27a] hover:bg-[#1f6b4a]/45 transition-all duration-200"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Right: Table Badge, Call Waiter & Network Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

              {/* Network Status Badge (text hidden on very small phones; dot/icon + aria stay) */}
              <div
                role="status"
                aria-label={isOnline ? 'Online' : 'Offline Mode'}
                className={`max-[399px]:hidden inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold border transition-colors duration-300 ${
                  isOnline
                    ? 'bg-[#0f3d2a]/80 text-[#f0d27a] border-[#d4af37]/35'
                    : 'bg-[#c8442b]/15 text-[#f5efe0] border-[#c8442b]/50 animate-pulse motion-reduce:animate-none'
                }`}
                title={isOnline ? 'System is online and connected' : 'Operating in offline local-first mode'}
              >
                {isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 hidden sm:inline" />
                    <span className="hidden sm:inline text-[11px] font-semibold tracking-tight">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[#c8442b]" />
                    <span className="hidden sm:inline text-[11px] font-semibold tracking-tight">Offline Mode</span>
                  </>
                )}
              </div>

              {/* Table Badge: static label once a table is known (set via QR link) */}
              {tableNumber ? (
                <span
                  className="inline-flex items-center gap-1.5 h-11 px-2.5 sm:px-3 rounded-xl bg-[#0f3d2a]/70 text-[#f5efe0] font-bold text-xs sm:text-sm border border-[#d4af37]/30 select-none"
                  title={`Table ${tableNumber}`}
                >
                  <span className="text-base leading-none">🍽️</span>
                  <span className="whitespace-nowrap">Table {tableNumber}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onChangeTable}
                  className="inline-flex items-center gap-1.5 h-11 min-w-11 px-2.5 sm:px-3 rounded-xl bg-[#0f3d2a]/70 hover:bg-[#1f6b4a]/60 hover:border-[#d4af37]/60 active:scale-95 text-[#f5efe0] font-bold text-xs sm:text-sm border border-[#d4af37]/30 transition-[background-color,border-color,transform] duration-200 cursor-pointer motion-reduce:transition-none motion-reduce:active:scale-100"
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
                    ? 'bg-[#1f6b4a] text-[#f5efe0] border-[#d4af37]/60 shadow-[#1f6b4a]/40 ring-2 ring-[#d4af37]/50'
                    : 'bg-gradient-to-r from-[#d4af37] to-[#f0d27a] text-[#06140e] border-transparent shadow-[#d4af37]/30 hover:shadow-[#d4af37]/50'
                }`}
                title="Call waiter to your table"
              >
                {waiterCalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#f0d27a] animate-bounce motion-reduce:animate-none" />
                    <span className="hidden sm:inline">Waiter Called!</span>
                    <span className="sm:hidden">Called</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-[#06140e]" />
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
