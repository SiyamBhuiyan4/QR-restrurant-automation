import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingOrders,
  removePendingOrder,
  updatePendingOrder,
  getPendingWaiterCalls,
  removePendingWaiterCall,
  updatePendingWaiterCall,
  getPendingCounts,
  enqueueOrder as idbEnqueueOrder,
  enqueueWaiterCall as idbEnqueueWaiterCall,
  cacheMenu,
  getCachedMenu
} from '../db/indexedDb.js';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';

export const NetworkContext = createContext(null);

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
      return counts;
    } catch (err) {
      console.error('[NetworkContext] Failed to get pending counts:', err);
      return { ordersCount: 0, waiterCallsCount: 0, total: 0 };
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      // Ping lightweight route with cache-busting timestamp
      const res = await fetch(`/api/menu?_ping=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);

      const reachable = res.ok || res.status < 500;
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
          let response;

          // Prepare payload: support both multipart FormData (with audio Blob) and standard JSON
          const hasVoiceBlob =
            order.voiceBlob instanceof Blob ||
            (order.voiceNote && typeof order.voiceNote === 'object' && order.voiceNote instanceof Blob);

          if (hasVoiceBlob) {
            const formData = new FormData();
            formData.append('tableNumber', String(order.tableNumber || order.table_number || '1'));
            formData.append('items', JSON.stringify(order.items || []));
            if (order.generalNote) formData.append('generalNote', order.generalNote);
            if (order.customerName) formData.append('customerName', order.customerName);
            if (order.totalAmount) formData.append('totalAmount', String(order.totalAmount));
            formData.append('offlineQueuedAt', String(order.queuedAt || Date.now()));

            const blob = order.voiceBlob || order.voiceNote;
            formData.append('voiceNote', blob, 'voicenote.webm');

            response = await fetch('/api/orders', {
              method: 'POST',
              body: formData
            });
          } else {
            const payload = {
              tableNumber: order.tableNumber || order.table_number || 1,
              items: order.items || [],
              generalNote: order.generalNote || '',
              customerName: order.customerName || '',
              totalAmount: order.totalAmount || 0,
              voiceNote: typeof order.voiceNote === 'string' ? order.voiceNote : undefined,
              offlineQueuedAt: order.queuedAt || Date.now()
            };

            response = await fetch('/api/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify(payload)
            });
          }

          if (response && (response.ok || response.status === 200 || response.status === 201)) {
            await removePendingOrder(order.localId);
            syncedOrdersCount++;
          } else {
            // Server error: bump attempts and stop to prevent spamming
            order.syncAttempts = (order.syncAttempts || 0) + 1;
            order.lastError = `Server returned HTTP ${response ? response.status : 'error'}`;
            await updatePendingOrder(order);
            console.warn(`[NetworkContext] Order sync deferred (HTTP ${response ? response.status : 'ERR'})`);
            break; // Stop syncing queue until next retry
          }
        } catch (fetchErr) {
          console.warn('[NetworkContext] Order sync network error:', fetchErr);
          // Network failed mid-sync: stop and mark offline
          setIsOnline(false);
          setConnectionStatus('offline');
          break;
        }
      }

      // 2. Sync Pending Waiter Calls
      const pendingCalls = await getPendingWaiterCalls();

      for (const call of pendingCalls) {
        try {
          const response = await fetch('/api/waiter/call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              tableNumber: call.tableNumber || call.table_number || 1,
              reason: call.reason || 'waiter',
              notes: call.notes || call.message || '',
              queuedAt: call.queuedAt || Date.now()
            })
          });

          if (response.ok || response.status === 200 || response.status === 201) {
            await removePendingWaiterCall(call.localId);
            syncedWaiterCount++;
          } else {
            call.syncAttempts = (call.syncAttempts || 0) + 1;
            call.lastError = `Server returned HTTP ${response.status}`;
            await updatePendingWaiterCall(call);
            break;
          }
        } catch (callErr) {
          console.warn('[NetworkContext] Waiter call sync network error:', callErr);
          setIsOnline(false);
          setConnectionStatus('offline');
          break;
        }
      }

      // Update timestamp and refreshed counts
      setLastSyncTime(Date.now());
      await refreshPendingCounts();

      // Trigger user feedback notifications
      const totalSynced = syncedOrdersCount + syncedWaiterCount;
      if (totalSynced > 0) {
        playChime('success');
        addToast({
          type: 'success',
          title: 'Sync Complete!',
          message: `${syncedOrdersCount > 0 ? `${syncedOrdersCount} order(s)` : ''}${
            syncedOrdersCount > 0 && syncedWaiterCount > 0 ? ' and ' : ''
          }${syncedWaiterCount > 0 ? `${syncedWaiterCount} waiter call(s)` : ''} successfully sent to kitchen.`
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
          const hasVoiceBlob =
            orderPayload.voiceBlob instanceof Blob ||
            (orderPayload.voiceNote &&
              typeof orderPayload.voiceNote === 'object' &&
              orderPayload.voiceNote instanceof Blob);

          let res;
          if (hasVoiceBlob) {
            const formData = new FormData();
            formData.append('tableNumber', String(orderPayload.tableNumber || orderPayload.table_number || '1'));
            formData.append('items', JSON.stringify(orderPayload.items || []));
            if (orderPayload.generalNote) formData.append('generalNote', orderPayload.generalNote);
            if (orderPayload.customerName) formData.append('customerName', orderPayload.customerName);
            if (orderPayload.totalAmount) formData.append('totalAmount', String(orderPayload.totalAmount));

            const blob = orderPayload.voiceBlob || orderPayload.voiceNote;
            formData.append('voiceNote', blob, 'voicenote.webm');

            res = await fetch('/api/orders', {
              method: 'POST',
              body: formData
            });
          } else {
            res = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(orderPayload)
            });
          }

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            playChime('success');
            addToast({
              type: 'success',
              title: 'Order Sent to Kitchen!',
              message: `Table ${orderPayload.tableNumber || 1} order has been received.`
            });
            return { success: true, offline: false, data };
          }
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
          const res = await fetch('/api/waiter/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(callPayload)
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            playChime('success');
            addToast({
              type: 'success',
              title: 'Waiter Notified',
              message: `Staff alerted for Table ${callPayload.tableNumber || 1}.`
            });
            return { success: true, offline: false, data };
          }
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
   * Safe fetchMenu helper that reads from API and updates IndexedDB cache,
   * or falls back to IndexedDB if offline
   */
  const fetchMenuWithCache = useCallback(async () => {
    try {
      const res = await fetch('/api/menu', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const payload = await res.json();
        const data = payload.data || payload;
        // Cache to IndexedDB in background
        cacheMenu(data).catch((e) => console.warn('[NetworkContext] cacheMenu failed:', e));
        return { data, fromCache: false };
      }
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

  const totalPending = pendingOrdersCount + pendingWaiterCallsCount;

  const value = {
    isOnline,
    connectionStatus,
    pendingOrdersCount,
    pendingWaiterCallsCount,
    pendingCount: totalPending,
    isSyncing,
    lastSyncTime,
    syncPendingData,
    submitOrder,
    submitWaiterCall,
    enqueueOrder: submitOrder, // Friendly alias
    enqueueWaiterCall: submitWaiterCall, // Friendly alias
    fetchMenuWithCache,
    refreshPendingCounts,
    checkConnectivity,
    addToast
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}

      {/* Global In-App Toast Notifications & Offline Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {/* Offline Warning Banner (Always visible when offline or when orders are pending) */}
        {(!isOnline || totalPending > 0) && (
          <div
            className={`pointer-events-auto rounded-2xl p-3.5 shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-up ${
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
                  <p className="opacity-90 text-[11px] truncate">
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
