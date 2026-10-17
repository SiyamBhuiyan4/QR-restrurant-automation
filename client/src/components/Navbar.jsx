import React, { useState, useEffect } from 'react';
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
        className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs transition-colors ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-lg font-bold tracking-tight text-neutral-900 leading-none flex items-center gap-1.5">
                  SmartDine
                  <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                    Express
                  </span>
                </span>
                <span className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                  Fresh &amp; Local First
                </span>
              </div>
            </div>

            {/* Right: Table Badge, Call Waiter & Network Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Network Status Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                    : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                }`}
                title={isOnline ? 'System is online and connected' : 'Operating in offline local-first mode'}
              >
                {isOnline ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 hidden sm:inline" />
                    <span className="text-[11px] font-medium tracking-tight">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-medium tracking-tight">Offline Mode</span>
                  </>
                )}
              </div>

              {/* Table Badge */}
              <button
                type="button"
                onClick={onChangeTable}
                className="group inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 active:scale-95 text-neutral-800 font-semibold text-xs sm:text-sm border border-neutral-200/60 transition-all cursor-pointer shadow-2xs"
                title="Tap to change table"
              >
                <span className="text-base leading-none">🍽️</span>
                <span className="whitespace-nowrap">
                  {tableNumber ? `Table ${tableNumber}` : 'Set Table'}
                </span>
                {onChangeTable && (
                  <span className="text-[10px] text-neutral-400 group-hover:text-neutral-700 font-normal hidden sm:inline">
                    (Edit)
                  </span>
                )}
              </button>

              {/* Call Waiter Trigger Button */}
              <button
                type="button"
                onClick={() => setShowWaiterModal(true)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-95 shadow-xs cursor-pointer ${
                  waiterCalled
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
                title="Call waiter to your table"
              >
                {waiterCalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                    <span className="hidden sm:inline">Waiter Called!</span>
                    <span className="sm:hidden">Called</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-amber-400 animate-wiggle" />
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
