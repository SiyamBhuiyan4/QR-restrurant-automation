import React, { useState, useEffect, useRef } from 'react';
import { UtensilsCrossed, Bell, BellRing, WifiOff, CheckCircle2, ShoppingBag } from 'lucide-react';
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

  // Smart Roll-Back & Auto-Hiding Navbar Listener:
  // - When at the very top (scrollY <= 20): Always in natural visible position
  // - When scrolling DOWN into the menu (scrollY > 60): Rolls back up out of view (-translate-y-full)
  //   giving 100% of the screen height to the menu book!
  // - When scrolling UP ("jokhon e ektu norachora korbo"): Drops smoothly back down (translate-y-0)
  // - When cursor moves to the top edge (e.clientY <= 24): Reveals navbar for quick access
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;

    let frame = 0;
    let lastScrollY = Math.max(0, window.scrollY || 0);
    let isHidden = false;
    let isScrolled = false;

    const update = () => {
      frame = 0;
      const currentScrollY = Math.max(0, window.scrollY || 0);
      const scrollDiff = currentScrollY - lastScrollY;

      // Scrolled state for backdrop blur & border accent
      const nextScrolled = currentScrollY > 12;
      if (nextScrolled !== isScrolled) {
        isScrolled = nextScrolled;
        el.dataset.scrolled = nextScrolled ? 'true' : 'false';
      }

      // Roll-back / Auto-hide behavior
      if (currentScrollY <= 20) {
        // At the very top: always fully visible
        if (isHidden) {
          isHidden = false;
          el.dataset.hidden = 'false';
        }
      } else if (scrollDiff > 6 && currentScrollY > 60) {
        // Scrolling DOWN into the menu: roll back up and hide
        if (!isHidden) {
          isHidden = true;
          el.dataset.hidden = 'true';
        }
      } else if (scrollDiff < -4) {
        // Scrolling UP (even slightly): drop smoothly back down
        if (isHidden) {
          isHidden = false;
          el.dataset.hidden = 'false';
        }
      }

      lastScrollY = currentScrollY;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // If mouse moves to the very top edge of the viewport, reveal the navbar
    const onMouseMove = (e) => {
      if (e.clientY <= 24 && isHidden) {
        isHidden = false;
        el.dataset.hidden = 'false';
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
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
        data-hidden="false"
        className={`sticky top-0 z-40 w-full max-w-[100vw] overflow-hidden bg-[#06140e]/95 border-b border-[#d4af37]/25 shadow-none transition-[transform,box-shadow,background-color,border-color] duration-300 ease-in-out will-change-transform data-[hidden=true]:-translate-y-full data-[hidden=false]:translate-y-0 motion-reduce:transition-none data-[scrolled=true]:bg-[#06140e]/95 data-[scrolled=true]:border-[#d4af37]/40 data-[scrolled=true]:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 min-w-0">

            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-600/30 shrink-0 ring-1 ring-amber-400/50 transition-transform duration-300 hover:rotate-[-4deg] motion-reduce:transition-none">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base min-[400px]:text-lg sm:text-xl font-black tracking-tight text-white leading-none flex items-center gap-1 whitespace-nowrap">
                  World<span className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]">Plate</span>
                </span>
                <span className="hidden min-[400px]:block text-[11px] text-emerald-200/70 font-medium truncate mt-0.5">
                  Artisanal Global Dining
                </span>
              </div>
            </div>

            {/* Right: Table Badge, Call Waiter, Order Cart & Network Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

              {/* Only shown when the connection drops (orders are queued and sent later) */}
              {!isOnline && (
                <div
                  role="status"
                  aria-label="Offline"
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-semibold border bg-[#c8442b]/15 text-[#f5efe0] border-[#c8442b]/50"
                  title="You're offline. Orders are saved and sent when the connection is back."
                >
                  <WifiOff className="w-3.5 h-3.5 text-[#c8442b]" />
                  <span className="hidden sm:inline text-[11px] font-semibold tracking-tight">Offline</span>
                </div>
              )}

              {/* Table Badge: static label once a table is known (set via QR link) */}
              {tableNumber ? (
                <span
                  className="inline-flex items-center gap-1.5 h-11 px-2.5 sm:px-3 rounded-xl bg-emerald-950/70 text-slate-100 font-bold text-xs sm:text-sm border border-amber-500/35 select-none"
                  title={`Table ${tableNumber}`}
                >
                  <span className="text-base leading-none">🍽️</span>
                  <span className="whitespace-nowrap">Table {tableNumber}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onChangeTable}
                  className="inline-flex items-center gap-1.5 h-11 min-w-11 px-2.5 sm:px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 hover:border-amber-400/60 active:scale-95 text-slate-100 font-bold text-xs sm:text-sm border border-amber-500/35 transition-[background-color,border-color,transform] duration-200 cursor-pointer motion-reduce:transition-none motion-reduce:active:scale-100"
                  title="Set your table"
                >
                  <span className="text-base leading-none">🍽️</span>
                  <span className="whitespace-nowrap"><span className="hidden min-[420px]:inline">Set </span>Table</span>
                </button>
              )}

              {/* Cart Trigger Button (When items exist in cart) */}
              {cartItemCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-950 text-amber-300 border border-amber-500/45 shadow-md cursor-pointer hover:bg-emerald-900 active:scale-95 transition-all"
                  title="Open table order cart"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Order</span>
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </button>
              )}

              {/* Call Waiter Trigger Button */}
              <button
                type="button"
                onClick={() => setShowWaiterModal(true)}
                className={`relative inline-flex items-center justify-center gap-1.5 h-11 px-2.5 sm:px-3.5 rounded-xl font-black text-xs sm:text-sm transition-[transform,box-shadow,background-color] duration-200 active:scale-95 shadow-md cursor-pointer border motion-reduce:transition-none motion-reduce:active:scale-100 shrink-0 ${
                  waiterCalled
                    ? 'bg-emerald-700 text-white border-emerald-400/60 shadow-emerald-900/40 ring-2 ring-emerald-400/50'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 text-slate-950 font-black border-transparent shadow-amber-500/30 hover:shadow-amber-500/50 hover:brightness-105'
                }`}
                title="Call Waiter to your table"
              >
                {waiterCalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce motion-reduce:animate-none shrink-0" />
                    <span className="hidden sm:inline">Waiter Called!</span>
                    <span className="sm:hidden font-black">Called</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-slate-950 shrink-0" />
                    <span className="hidden sm:inline">Call Waiter</span>
                    <span className="sm:hidden font-black">Waiter</span>
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
