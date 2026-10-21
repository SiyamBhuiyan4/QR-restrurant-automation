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
import { useRestaurant } from '../context/RestaurantContext';
import { useMutation } from 'convex/react';
import { api } from '../convexApi';
import { sendWaiterCallToTelegramChannel } from '../services/telegramClient';
import { enqueueWaiterCall } from '../db/indexedDb.js';

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
    label: '🙋 Employee Assistance',
    short: 'Employee Assistance',
    icon: '🙋',
    desc: 'Speak directly with your assigned employee'
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

  // Restaurant Context for dynamic table & employee routing
  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

  // Optional socket helper
  let socketHelpers = null;
  try {
    socketHelpers = useSocket();
  } catch {
    socketHelpers = null;
  }

  // Look up assigned employee for current table
  const assignedEmployee = restaurant?.getAssignedEmployeeForTable?.(tableNumber);

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

  // Mount flag so the modal eases in after first paint
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Keep mounted long enough for the fade/slide-out transition to play
  const [mounted, setMounted] = useState(isOpen);
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    const id = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

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

    const assignedEmp = restaurant?.getAssignedEmployeeForTable?.(finalTable) || assignedEmployee;

    const payload = {
      table_number: finalTable,
      tableNumber: finalTable,
      table: finalTable,
      reason: formattedReason,
      type: targetReason.short,
      custom_message: customMessage.trim(),
      message: customMessage.trim(),
      timestamp: Date.now(),
      assignedEmployeeId: assignedEmp ? assignedEmp.id : null,
      assignedEmployeeName: assignedEmp ? assignedEmp.name : 'Floor Specialist',
      assignedEmployeeRole: assignedEmp ? assignedEmp.role : 'Floor Specialist',
      routingDetail: `Table #${finalTable} requested assistance -> Routed to assigned employee: ${assignedEmp ? assignedEmp.name : 'Floor Specialist'}`
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

      // Convex is the only backend: if the call did not reach it, fall into the offline queue
      if (!convexSuccess) throw new Error('Waiter call could not be sent to Convex');

      // Also trigger socket emit if connected as immediate fail-safe
      if (socketHelpers?.socket?.connected) {
        socketHelpers.emit('waiter:call', payload);
      }

      // Register with Restaurant Context for dynamic state & targeted routing
      if (restaurant?.registerAssistanceCall) {
        restaurant.registerAssistanceCall(payload);
      }

      setIsConfirmed(true);
      setIsOfflineQueued(false);
      sendWaiterCallToTelegramChannel(finalTable, formattedReason).catch(() => {});
      if (onSuccess) onSuccess({ tableNumber: finalTable, reason: formattedReason });
    } catch (err) {
      console.warn('[CallWaiterModal] Network call failed, attempting offline queue:', err.message);

      // Save to IndexedDB (with automatic localStorage/memory fallback)
      let queuedLocally = false;
      try {
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

      // Register locally in Restaurant Context
      if (restaurant?.registerAssistanceCall) {
        restaurant.registerAssistanceCall(payload);
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
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-20 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`cw-modal w-full max-w-md max-h-[calc(92dvh-5rem)] sm:max-h-[92dvh] overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0f172a] rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/80 border border-emerald-500/30 sm:border-amber-500/40 text-slate-100 transform transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${entered ? 'translate-y-0 sm:scale-100 opacity-100' : 'translate-y-8 sm:translate-y-0 sm:scale-95 opacity-0'}`}
      >
        {/* Header Bar */}
        <div className="cw-header bg-[linear-gradient(135deg,#064e3b,#0f172a)] border-b border-emerald-500/30 p-5 text-white relative shadow-lg shadow-black/40">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-[#0b0f19]/70 hover:bg-[#0b0f19] border border-amber-500/40 flex items-center justify-center text-amber-300 hover:text-white transition-transform duration-150 active:scale-95 cursor-pointer disabled:opacity-50 motion-reduce:transform-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-inner">
              <BellRing className="w-6 h-6 text-amber-300 animate-wiggle motion-reduce:animate-none" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">Call Waiter</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300 font-medium flex-wrap">
                <span className="bg-[#0b0f19]/80 px-2.5 py-0.5 rounded-full font-bold text-amber-300 border border-amber-500/40">
                  Table {tableNumber || '?'}
                </span>
                {assignedEmployee ? (
                  <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold text-emerald-200 border border-emerald-500/40">
                    Assigned: {assignedEmployee.name}
                  </span>
                ) : (
                  <span className="text-slate-400">&bull; Instant Floor Assistance</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          {/* CONFIRMED STATE */}
          {isConfirmed ? (
            <div className="text-center py-4 space-y-4 animate-scaleUp motion-reduce:animate-none">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-[#0b0f19] text-emerald-400 border border-emerald-500/60 flex items-center justify-center shadow-lg shadow-black/40">
                <CheckCircle2 className="w-10 h-10 animate-bounce motion-reduce:animate-none" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">
                  Waiter Alerted!
                </h3>
                <p className="text-sm font-semibold text-emerald-300 mt-1">
                  {assignedEmployee ? (
                    <>Directly routed to your assigned waiter: <span className="font-bold text-white">{assignedEmployee.name}</span></>
                  ) : (
                    <>Floor waiter team has been notified for Table {tableNumber}.</>
                  )}
                </p>
                <div className="mt-3 p-3 bg-[#0b0f19]/80 rounded-2xl border border-emerald-500/30 text-xs text-slate-300 inline-block max-w-xs text-left">
                  <span className="font-semibold text-slate-400">Requested:</span>{' '}
                  <span className="font-bold text-amber-400">
                    {selectedReason.label}
                  </span>
                  {customMessage.trim() && (
                    <p className="mt-1 italic text-slate-400">
                      "{customMessage.trim()}"
                    </p>
                  )}
                </div>
              </div>

              {isOfflineQueued && (
                <div className="p-3 bg-[#c8442b]/15 rounded-2xl border border-[#c8442b]/50 text-xs text-white flex items-center gap-2 text-left">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>
                    Offline Mode: Alert has been saved locally and will auto-sync the moment Wi-Fi reconnects!
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Floor staff will be at your table in a moment. Auto-closing in {dismissCountdown}s...
              </p>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm transition-transform duration-150 active:scale-[0.98] shadow-md shadow-black/40 cursor-pointer motion-reduce:transform-none"
              >
                Done
              </button>
            </div>
          ) : (
            /* SELECTION STATE */
            <div className="space-y-4">
              {/* Optional Table Number Confirmation */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Your Table Number
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-400">Table #</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-20 min-h-11 text-center font-bold text-base py-2 px-2 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0b0f19] text-white"
                  />
                </div>
              </div>

              {/* Preset Reason Choices */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
                        className={`w-full min-h-[56px] flex items-center justify-between p-3 rounded-2xl border transition-[transform,background-color,box-shadow] duration-200 text-left cursor-pointer active:scale-[0.98] motion-reduce:transform-none ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-amber-400/60 border-transparent font-bold'
                            : 'bg-[#1e293b]/70 hover:bg-[#1e293b] text-slate-200 border-slate-700/80'
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
                                isSelected ? 'text-white/80' : 'text-slate-400'
                              }`}
                            >
                              {preset.desc}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-[#0b0f19] text-amber-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-emerald-400">
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Request Note (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="e.g., Warm water, extra spice, split bill..."
                  className="w-full min-h-11 py-2.5 px-3.5 text-base sm:text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0b0f19] text-white placeholder-slate-500 transition"
                />
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="p-3 bg-[#c8442b]/15 border border-[#c8442b]/40 rounded-xl flex items-center gap-2 text-[#f5efe0] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#e8745c]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isSubmitting}
                  className="flex-1 min-h-12 py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-sm font-bold transition-colors duration-150 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !tableNumber}
                  className="flex-[2] min-h-12 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 text-slate-950 font-black text-sm transition-transform duration-150 active:scale-[0.98] shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transform-none hover:brightness-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                      <span>Calling Assigned Employee...</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-4 h-4" />
                      <span>Call Employee Now</span>
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
