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
        className={`sticky top-0 z-40 w-full bg-[#0e0b1d]/90 backdrop-blur-xl border-b border-purple-500/25 shadow-lg shadow-black/40 transition-colors ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0 ring-1 ring-purple-400/40">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-lg font-black tracking-tight text-white leading-none flex items-center gap-1.5 purple-text-glow">
                  SmartDine
                  <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded">
                    Lounge
                  </span>
                </span>
                <span className="text-xs text-purple-200/70 font-medium truncate mt-0.5">
                  Artisanal Table Dining
                </span>
              </div>
            </div>

            {/* Right: Table Badge, Call Waiter & Network Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Network Status Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isOnline
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse'
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
                    <span className="text-[11px] font-semibold tracking-tight">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold tracking-tight">Offline Mode</span>
                  </>
                )}
              </div>

              {/* Table Badge */}
              <button
                type="button"
                onClick={onChangeTable}
                className="group inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 active:scale-95 text-purple-200 font-bold text-xs sm:text-sm border border-purple-500/30 transition-all cursor-pointer shadow-xs"
                title="Tap to change table"
              >
                <span className="text-base leading-none">🍽️</span>
                <span className="whitespace-nowrap">
                  {tableNumber ? `Table ${tableNumber}` : 'Set Table'}
                </span>
                {onChangeTable && (
                  <span className="text-[10px] text-purple-400/80 group-hover:text-purple-200 font-normal hidden sm:inline">
                    (Edit)
                  </span>
                )}
              </button>

              {/* Call Waiter Trigger Button */}
              <button
                type="button"
                onClick={() => setShowWaiterModal(true)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-md cursor-pointer border ${
                  waiterCalled
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/50 shadow-purple-600/30'
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
                    <BellRing className="w-4 h-4 text-purple-200" />
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
