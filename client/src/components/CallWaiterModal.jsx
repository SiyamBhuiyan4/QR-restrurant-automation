import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  WifiOff,
  Sparkles,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useMutation } from 'convex/react';
import { api } from '../convexApi';
import { sendWaiterCallToTelegramChannel } from '../services/telegramClient';

// Quick one-tap preset reasons specified in system requirements
export const PRESET_REASONS = [
  {
    id: 'water',
    label: '💧 Water Refill',
    short: 'Water Refill',
    icon: '💧',
    desc: 'Drinking water & clean glasses'
  },
  {
    id: 'napkins',
    label: '🧻 Napkins / Tissue',
    short: 'Napkins / Tissue',
    icon: '🧻',
    desc: 'Extra paper napkins or wipes'
  },
  {
    id: 'cutlery',
    label: '🍴 Cutlery / Plates',
    short: 'Cutlery / Plates',
    icon: '🍴',
    desc: 'Extra spoons, forks, or sharing plates'
  },
  {
    id: 'bill',
    label: '💳 Request Bill / Check',
    short: 'Request Bill / Check',
    icon: '💳',
    desc: 'Ready to pay by card or cash'
  },
  {
    id: 'staff',
    label: '🙋 Staff Assistance',
    short: 'Staff Assistance',
    icon: '🙋',
    desc: 'Speak directly with your waiter'
  }
];

export default function CallWaiterModal({
  isOpen = false,
  onClose,
  tableNumber: propTableNumber,
  onSuccess
}) {
  // Resolve table number from prop, URL search param, or local storage
  const [tableNumber, setTableNumber] = useState('');
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dismissCountdown, setDismissCountdown] = useState(4);

  // Convex Cloud mutation
  let createConvexCall = null;
  try {
    createConvexCall = useMutation(api.waiter.createCall);
  } catch (_) {}

  // Optional socket helper
  let socketHelpers = null;
  try {
    socketHelpers = useSocket();
  } catch {
    socketHelpers = null;
  }

  // Detect table number on open
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setIsOfflineQueued(false);
      setErrorMessage('');
      setDismissCountdown(4);

      let foundTable = propTableNumber;
      if (!foundTable && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        foundTable = urlParams.get('table') || urlParams.get('t');
      }
      if (!foundTable && typeof localStorage !== 'undefined') {
        foundTable =
          localStorage.getItem('smartdine_table') ||
          localStorage.getItem('tableNumber') ||
          localStorage.getItem('table');
      }

      setTableNumber(foundTable ? String(foundTable) : '1');
    }
  }, [isOpen, propTableNumber]);

  // Handle countdown timer after confirmation
  useEffect(() => {
    let timer;
    if (isConfirmed && isOpen) {
      if (dismissCountdown > 0) {
        timer = setTimeout(() => {
          setDismissCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        handleDismiss();
      }
    }
    return () => clearTimeout(timer);
  }, [isConfirmed, dismissCountdown, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    setIsConfirmed(false);
    setIsOfflineQueued(false);
    setErrorMessage('');
    if (onClose) onClose();
  };

  const handleSubmit = async (overrideReason) => {
    const targetReason = overrideReason || selectedReason;
    const finalTable = Number(tableNumber) || 1;

    // Reason formatted with optional custom notes
    const formattedReason = customMessage.trim()
      ? `${targetReason.label} — "${customMessage.trim()}"`
      : targetReason.label;

    const payload = {
      table_number: finalTable,
      tableNumber: finalTable,
      table: finalTable,
      reason: formattedReason,
      type: targetReason.short,
      custom_message: customMessage.trim(),
      message: customMessage.trim(),
      timestamp: Date.now()
    };

    setIsSubmitting(true);
    setErrorMessage('');

    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    try {
      if (!isDeviceOnline) {
        throw new Error('Device is offline');
      }

      // 1. Submit to Convex Cloud if available
      let convexSuccess = false;
      if (createConvexCall) {
        try {
          await createConvexCall({ tableNumber: finalTable, reason: formattedReason });
          convexSuccess = true;
        } catch (_) {}
      }

      // 2. Submit to local API endpoint as fallback or companion
      try {
        await fetch('/api/waiter/call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        if (!convexSuccess) throw err;
      }

      // Also trigger socket emit if connected as immediate fail-safe
      if (socketHelpers?.socket?.connected) {
        socketHelpers.emit('waiter:call', payload);
      }

      setIsConfirmed(true);
      setIsOfflineQueued(false);
      sendWaiterCallToTelegramChannel(finalTable, formattedReason).catch(() => {});
      if (onSuccess) onSuccess({ tableNumber: finalTable, reason: formattedReason });
    } catch (err) {
      console.warn('[CallWaiterModal] Network call failed, attempting offline queue:', err.message);

      // Save to IndexedDB if available
      let queuedLocally = false;
      try {
        const { enqueueWaiterCall } = await import('../db/indexedDb.js');
        if (typeof enqueueWaiterCall === 'function') {
          await enqueueWaiterCall({
            tableNumber: finalTable,
            table_number: finalTable,
            reason: formattedReason,
            notes: customMessage.trim(),
            queuedAt: Date.now()
          });
          queuedLocally = true;
        }
      } catch (idbErr) {
        console.warn('[CallWaiterModal] IndexedDB enqueue fallback to localStorage:', idbErr);
      }

      // Fallback localStorage queue
      if (!queuedLocally && typeof localStorage !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem('smartdine_pending_waiter_calls') || '[]');
          stored.push({
            id: 'local_' + Date.now(),
            tableNumber: finalTable,
            reason: formattedReason,
            timestamp: Date.now()
          });
          localStorage.setItem('smartdine_pending_waiter_calls', JSON.stringify(stored));
        } catch {
          // ignore
        }
      }

      // Show offline confirmation
      setIsOfflineQueued(true);
      setIsConfirmed(true);
      if (onSuccess) onSuccess({ tableNumber: finalTable, reason: formattedReason, offline: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden transform transition-all animate-scaleUp text-neutral-900"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-5 text-white relative">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <BellRing className="w-6 h-6 text-white animate-wiggle" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Call Waiter</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-100 font-medium">
                <span className="bg-white/25 px-2 py-0.5 rounded-full font-bold text-white">
                  Table {tableNumber || '?'}
                </span>
                <span>&bull; Instant Floor Bell</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* CONFIRMED STATE */}
          {isConfirmed ? (
            <div className="text-center py-4 space-y-4 animate-scaleUp">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-neutral-900">
                  Waiter Alerted!
                </h3>
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  Staff has been notified for Table {tableNumber}.
                </p>
                <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs text-neutral-600 inline-block max-w-xs text-left">
                  <span className="font-semibold text-neutral-800">Requested:</span>{' '}
                  <span className="font-medium text-amber-600">
                    {selectedReason.label}
                  </span>
                  {customMessage.trim() && (
                    <p className="mt-1 italic text-neutral-500">
                      "{customMessage.trim()}"
                    </p>
                  )}
                </div>
              </div>

              {isOfflineQueued && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2 text-left">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Offline Mode: Alert has been saved locally and will auto-sync the moment Wi-Fi reconnects!
                  </span>
                </div>
              )}

              <p className="text-xs text-neutral-400">
                Floor staff will be at your table in a moment. Auto-closing in {dismissCountdown}s...
              </p>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition active:scale-98 shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            /* SELECTION STATE */
            <div className="space-y-4">
              {/* Optional Table Number Confirmation */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Your Table Number
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-neutral-400">Table #</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-14 text-center font-bold text-base py-1 px-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-neutral-50"
                  />
                </div>
              </div>

              {/* Preset Reason Choices */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Select Reason (One-Tap)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_REASONS.map((preset) => {
                    const isSelected = selectedReason.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedReason(preset)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-98 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-neutral-50 hover:bg-neutral-100/80 text-neutral-800 border-neutral-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl leading-none">{preset.icon}</span>
                          <div>
                            <p className="font-bold text-sm leading-snug">
                              {preset.short}
                            </p>
                            <p
                              className={`text-[11px] ${
                                isSelected ? 'text-amber-100' : 'text-neutral-500'
                              }`}
                            >
                              {preset.desc}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-white text-amber-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-neutral-400">
                            Select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Custom Message Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Custom Request Note (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g., Warm water, extra spice, split bill..."
                  className="w-full py-2.5 px-3.5 text-xs sm:text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-neutral-50 placeholder:text-neutral-400 transition"
                />
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !tableNumber}
                  className="flex-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs sm:text-sm transition active:scale-98 shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ringing Waiter...</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-4 h-4" />
                      <span>Alert Waiter Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
