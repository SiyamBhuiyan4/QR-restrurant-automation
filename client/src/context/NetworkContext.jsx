import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingOrders,
  removePendingOrder,
  updatePendingOrder,
  getPendingWaiterCalls,
  removePendingWaiterCall,
  updatePendingWaiterCall,
  enqueueTableNote,
  getTableNotes,
  getPendingTableNotes,
  updateTableNote,
  removeTableNote,
  getPendingCounts,
  enqueueOrder as idbEnqueueOrder,
  enqueueWaiterCall as idbEnqueueWaiterCall,
  cacheMenu,
  getCachedMenu
} from '../db/indexedDb.js';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { convex } from '../convexClient.js';
import { api } from '../convexApi';
import { uploadVoiceBlob } from '../utils/voiceUpload.js';

export const NetworkContext = createContext(null);

const PING_TIMEOUT_MS = 3500;

/**
 * Maps a queued/local order payload onto the orders:createOrder Convex args.
 * A voice Blob is uploaded to Convex file storage first; if that upload fails the error
 * propagates so the order stays in the offline queue and is retried with its Blob.
 */
async function submitOrderToConvex(p) {
  const items = (p.items || []).map((i) => ({
    name: String(i.name || i.title || 'Dish'),
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 1,
    note: (i.note || i.itemNote || '') || undefined
  }));
  const args = {
    tableNumber: Number(p.tableNumber || p.table_number || 1) || 1,
    items,
    totalAmount: Number(p.totalAmount) || 0,
    generalNote: p.generalNote || undefined
  };
  const blob = p.voiceBlob instanceof Blob ? p.voiceBlob : p.voiceNote instanceof Blob ? p.voiceNote : null;
  if (blob) {
    args.voiceStorageId = await uploadVoiceBlob(blob, (a) => convex.mutation(api.orders.generateUploadUrl, a));
  } else if (typeof p.voiceNote === 'string' && p.voiceNote) {
    args.voiceNoteUrl = p.voiceNote;
  }
  return convex.mutation(api.orders.createOrder, args);
}

/** Maps a waiter call (or table note) onto waiter:createCall; notes are folded into the reason. */
function submitWaiterCallToConvex({ tableNumber, reason, notes }) {
  const base = String(reason || 'waiter');
  const text = notes ? `${base} — "${notes}"` : base;
  return convex.mutation(api.waiter.createCall, {
    tableNumber: Number(tableNumber) || 1,
    reason: text
  });
}

/**
 * Web Audio pleasant chime for sync completion
 */
function playChime(type = 'success') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.1); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'offline') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(261.63, now + 0.12); // C4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    // AudioContext might be blocked until user interaction; safe to ignore
  }
}

export function NetworkProvider({ children }) {
  // Network connectivity state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionStatus, setConnectionStatus] = useState(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );

  // Offline queue state
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingWaiterCallsCount, setPendingWaiterCallsCount] = useState(0);
  const [pendingTableNotesCount, setPendingTableNotesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // In-app notifications/toasts
  const [toasts, setToasts] = useState([]);

  // Sync mutex lock ref to prevent concurrent sync loops
  const syncLockRef = useRef(false);

  /**
   * Add a floating toast notification
   */
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id,
      type: toast.type || 'info', // 'success', 'warning', 'error', 'info'
      title: toast.title || '',
      message: toast.message || '',
      timestamp: Date.now(),
      duration: toast.duration || 4500
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Refresh pending counts directly from IndexedDB
   */
  const refreshPendingCounts = useCallback(async () => {
    try {
      const counts = await getPendingCounts();
      setPendingOrdersCount(counts.ordersCount);
      setPendingWaiterCallsCount(counts.waiterCallsCount);
      setPendingTableNotesCount(counts.tableNotesCount || 0);
      return counts;
    } catch (err) {
      console.error('[NetworkContext] Failed to get pending counts:', err);
      return { ordersCount: 0, waiterCallsCount: 0, tableNotesCount: 0, total: 0 };
    }
  }, []);

  /**
   * Lightweight server connectivity ping
   */
  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setConnectionStatus('offline');
      return false;
    }

    try {
      let timer;
      // Lightweight Convex query as the reachability ping
      const ping = convex.query(api.menu.getCategories, {});
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Convex ping timed out')), PING_TIMEOUT_MS);
      });
      try {
        await Promise.race([ping, timeout]);
      } finally {
        clearTimeout(timer);
      }

      const reachable = true;
      setIsOnline(reachable);
      setConnectionStatus(reachable ? 'online' : 'offline');
      return reachable;
    } catch (err) {
      setIsOnline(false);
      setConnectionStatus('offline');
      return false;
    }
  }, []);

  /**
   * Sync all pending orders and waiter calls to the backend
   */
  const syncPendingData = useCallback(async () => {
    if (syncLockRef.current) {
      return; // Already running
    }

    syncLockRef.current = true;
    setIsSyncing(true);

    let syncedOrdersCount = 0;
    let syncedWaiterCount = 0;

    try {
      // 1. Sync Pending Orders
      const pendingOrders = await getPendingOrders();

      for (const order of pendingOrders) {
        try {
          await submitOrderToConvex(order);
          await removePendingOrder(order.localId);
          syncedOrdersCount++;
        } catch (fetchErr) {
          // Convex unreachable or rejected the order: keep it queued, stop and retry later
          console.warn('[NetworkContext] Order sync failed:', fetchErr);
          order.syncAttempts = (order.syncAttempts || 0) + 1;
          order.lastError = fetchErr?.message || 'Convex mutation failed';
          await updatePendingOrder(order);
          setIsOnline(false);
          setConnectionStatus('offline');
          break;
        }
      }

      // 2. Sync Pending Waiter Calls
      const pendingCalls = await getPendingWaiterCalls();

      for (const call of pendingCalls) {
        try {
          await submitWaiterCallToConvex({
            tableNumber: call.tableNumber || call.table_number || 1,
            reason: call.reason || 'waiter',
            notes: call.notes || call.message || ''
          });
          await removePendingWaiterCall(call.localId);
          syncedWaiterCount++;
        } catch (callErr) {
          console.warn('[NetworkContext] Waiter call sync failed:', callErr);
          call.syncAttempts = (call.syncAttempts || 0) + 1;
          call.lastError = callErr?.message || 'Convex mutation failed';
          await updatePendingWaiterCall(call);
          setIsOnline(false);
          setConnectionStatus('offline');
          break;
        }
      }

      // 3. Sync Pending Table Notes
      const pendingNotes = await getPendingTableNotes();
      let syncedNotesCount = 0;

      for (const note of pendingNotes) {
        try {
          await submitWaiterCallToConvex({
            tableNumber: note.tableNumber || 1,
            reason: note.category || 'Table Note',
            notes: note.note || note.complaintText || ''
          });
          await removeTableNote(note.localId);
          syncedNotesCount++;
        } catch (noteErr) {
          console.warn('[NetworkContext] Table note sync failed:', noteErr);
          note.syncAttempts = (note.syncAttempts || 0) + 1;
          note.lastError = noteErr?.message || 'Convex mutation failed';
          await updateTableNote(note);
          setIsOnline(false);
          setConnectionStatus('offline');
          break;
        }
      }

      // Update timestamp and refreshed counts
      setLastSyncTime(Date.now());
      await refreshPendingCounts();

      // Trigger user feedback notifications
      const totalSynced = syncedOrdersCount + syncedWaiterCount + syncedNotesCount;
      if (totalSynced > 0) {
        playChime('success');
        const parts = [];
        if (syncedOrdersCount > 0) parts.push(`${syncedOrdersCount} order(s)`);
        if (syncedWaiterCount > 0) parts.push(`${syncedWaiterCount} waiter call(s)`);
        if (syncedNotesCount > 0) parts.push(`${syncedNotesCount} note(s)`);
        addToast({
          type: 'success',
          title: 'Sync Complete!',
          message: `${parts.join(', ')} successfully delivered to restaurant server.`
        });
      }
    } catch (err) {
      console.error('[NetworkContext] Unexpected error during syncPendingData:', err);
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [addToast, refreshPendingCounts]);

  /**
   * Submit an order: tries immediate HTTP post if online;
   * otherwise safely queues into IndexedDB with instant confirmation.
   */
  const submitOrder = useCallback(
    async (orderPayload) => {
      // If we are currently online, try direct dispatch
      if (isOnline) {
        try {
          const data = await submitOrderToConvex(orderPayload);
          playChime('success');
          addToast({
            type: 'success',
            title: 'Order Sent to Kitchen!',
            message: `Table ${orderPayload.tableNumber || 1} order has been received.`
          });
          return { success: true, offline: false, data };
        } catch (networkErr) {
          console.warn('[NetworkContext] Online submit failed, falling back to offline queue:', networkErr);
          setIsOnline(false);
          setConnectionStatus('offline');
        }
      }

      // Fallback: Queue safely into IndexedDB
      try {
        const queuedRecord = await idbEnqueueOrder(orderPayload);
        await refreshPendingCounts();
        playChime('offline');
        addToast({
          type: 'warning',
          title: 'Saved to Offline Queue',
          message: 'Order saved locally on your device. It will automatically submit the moment connection resumes!'
        });
        return { success: true, offline: true, localId: queuedRecord.localId };
      } catch (idbErr) {
        console.error('[NetworkContext] Failed to queue order in IndexedDB:', idbErr);
        addToast({
          type: 'error',
          title: 'Order Error',
          message: 'Could not store order locally. Please inform your waiter.'
        });
        throw idbErr;
      }
    },
    [isOnline, addToast, refreshPendingCounts]
  );

  /**
   * Submit a waiter assistance call: tries immediate HTTP post if online;
   * otherwise safely queues into IndexedDB.
   */
  const submitWaiterCall = useCallback(
    async (callPayload) => {
      if (isOnline) {
        try {
          const data = await submitWaiterCallToConvex({
            tableNumber: callPayload.tableNumber || callPayload.table_number || 1,
            reason: callPayload.reason || 'waiter',
            notes: callPayload.notes || callPayload.message || ''
          });
          playChime('success');
          addToast({
            type: 'success',
            title: 'Waiter Notified',
            message: `Staff alerted for Table ${callPayload.tableNumber || 1}.`
          });
          return { success: true, offline: false, data };
        } catch (err) {
          setIsOnline(false);
          setConnectionStatus('offline');
        }
      }

      // Fallback: Queue offline
      try {
        const queuedRecord = await idbEnqueueWaiterCall(callPayload);
        await refreshPendingCounts();
        addToast({
          type: 'warning',
          title: 'Waiter Alert Queued',
          message: 'Offline mode: Staff will be alerted as soon as connection is restored.'
        });
        return { success: true, offline: true, localId: queuedRecord.localId };
      } catch (err) {
        console.error('[NetworkContext] Failed to queue waiter call:', err);
        throw err;
      }
    },
    [isOnline, addToast, refreshPendingCounts]
  );

  /**
   * Submit a table note: tries HTTP post if online;
   * otherwise safely queues into IndexedDB table_notes.
   */
  const submitTableNote = useCallback(
    async (notePayload) => {
      if (isOnline) {
        try {
          const data = await submitWaiterCallToConvex({
            tableNumber: notePayload.tableNumber || 1,
            reason: notePayload.category || 'Table Note',
            notes: notePayload.note || notePayload.complaintText || ''
          });
          playChime('success');
          addToast({
            type: 'success',
            title: 'Note Submitted',
            message: `Note for Table ${notePayload.tableNumber || 1} has been received.`
          });
          return { success: true, offline: false, data };
        } catch (err) {
          setIsOnline(false);
          setConnectionStatus('offline');
        }
      }

      // Offline fallback: Queue into IndexedDB table_notes
      try {
        const queuedRecord = await enqueueTableNote(notePayload);
        await refreshPendingCounts();
        playChime('offline');
        addToast({
          type: 'warning',
          title: 'Note Saved Offline',
          message: 'Saved locally on your device. Will auto-sync once connection is restored.'
        });
        return { success: true, offline: true, localId: queuedRecord.localId };
      } catch (err) {
        console.error('[NetworkContext] Failed to queue table note:', err);
        throw err;
      }
    },
    [isOnline, addToast, refreshPendingCounts]
  );

  /**
   * Safe fetchMenu helper that reads from API and updates IndexedDB cache,
   * or falls back to IndexedDB if offline
   */
  const fetchMenuWithCache = useCallback(async () => {
    try {
      const data = await convex.query(api.menu.getMenu, {});
      // Cache to IndexedDB in background
      cacheMenu(data).catch((e) => console.warn('[NetworkContext] cacheMenu failed:', e));
      return { data, fromCache: false };
    } catch (networkErr) {
      console.warn('[NetworkContext] fetchMenu failed, reading from IndexedDB:', networkErr);
    }

    // Read from IndexedDB cache
    const cached = await getCachedMenu();
    return { data: cached, fromCache: true };
  }, []);

  // 1. Initial counts & ping check
  useEffect(() => {
    refreshPendingCounts();
    checkConnectivity();
  }, [refreshPendingCounts, checkConnectivity]);

  // 2. Listen to browser 'online' and 'offline' events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[NetworkContext] Browser reported online event.');
      const verified = await checkConnectivity();
      if (verified) {
        addToast({
          type: 'info',
          title: 'Connection Restored',
          message: 'You are back online. Checking pending orders...',
          duration: 3000
        });
        syncPendingData();
      }
    };

    const handleOffline = () => {
      console.log('[NetworkContext] Browser reported offline event.');
      setIsOnline(false);
      setConnectionStatus('offline');
      playChime('offline');
      addToast({
        type: 'warning',
        title: 'Offline Mode Active',
        message: 'No internet connection. Orders will be saved locally and auto-synced once reconnected.',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity, syncPendingData, addToast]);

  // 3. Periodic heartbeat ping (every 18 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      const wasOnline = isOnline;
      const reachable = await checkConnectivity();

      // If we just reconnected, trigger auto-sync
      if (!wasOnline && reachable) {
        syncPendingData();
      }
    }, 18000);

    return () => clearInterval(interval);
  }, [isOnline, checkConnectivity, syncPendingData]);

  const totalPending = pendingOrdersCount + pendingWaiterCallsCount + pendingTableNotesCount;

  const value = {
    isOnline,
    connectionStatus,
    pendingOrdersCount,
    pendingWaiterCallsCount,
    pendingTableNotesCount,
    pendingCount: totalPending,
    isSyncing,
    lastSyncTime,
    syncPendingData,
    submitOrder,
    submitWaiterCall,
    submitTableNote,
    enqueueOrder: submitOrder, // Friendly alias
    enqueueWaiterCall: submitWaiterCall, // Friendly alias
    enqueueTableNote: submitTableNote, // Friendly alias
    getTableNotes,
    fetchMenuWithCache,
    refreshPendingCounts,
    checkConnectivity,
    addToast
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}

      {/* Global In-App Toast Notifications & Offline Indicator */}
      <div className="fixed bottom-2 sm:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {/* Offline Warning Banner (Always visible when offline or when orders are pending) */}
        {(!isOnline || totalPending > 0) && (
          <div
            className={`pointer-events-auto rounded-2xl px-3 py-2 sm:p-3.5 shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-up ${
              !isOnline
                ? 'bg-amber-500/95 text-white border-amber-400 shadow-amber-500/20'
                : 'bg-neutral-900/95 text-white border-neutral-700 shadow-black/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {!isOnline ? (
                  <WifiOff className="w-5 h-5 text-amber-200 shrink-0 animate-pulse" />
                ) : (
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div className="text-xs">
                  <p className="font-bold leading-tight">
                    {!isOnline ? 'Offline Mode Active' : `${totalPending} Queued for Kitchen`}
                  </p>
                  <p className="hidden sm:block opacity-90 text-[11px] truncate">
                    {!isOnline
                      ? totalPending > 0
                        ? `${totalPending} items stored locally`
                        : 'Orders safely save to device'
                      : 'Syncing automatically once confirmed'}
                  </p>
                </div>
              </div>

              {isOnline && totalPending > 0 && (
                <button
                  type="button"
                  onClick={() => syncPendingData()}
                  disabled={isSyncing}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-white text-neutral-900 font-bold text-xs hover:bg-neutral-100 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Toasts */}
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';

          let bg = 'bg-white text-neutral-900 border-neutral-200 shadow-lg';
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;

          if (isSuccess) {
            bg = 'bg-emerald-900/95 text-white border-emerald-700/80 shadow-emerald-900/20';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />;
          } else if (isWarning) {
            bg = 'bg-amber-900/95 text-white border-amber-700/80 shadow-amber-900/20';
            icon = <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />;
          } else if (isError) {
            bg = 'bg-rose-900/95 text-white border-rose-700/80 shadow-rose-900/20';
            icon = <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl p-3.5 shadow-xl border backdrop-blur-md flex items-start justify-between gap-3 transition-all duration-300 animate-slide-up ${bg}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {icon}
                <div className="text-xs">
                  {toast.title && <p className="font-bold leading-tight">{toast.title}</p>}
                  {toast.message && <p className="text-[11px] opacity-90 mt-0.5">{toast.message}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NetworkContext.Provider>
  );
}

/**
 * Hook to access NetworkContext
 */
export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
