import { useState, useEffect, useCallback, useContext } from 'react';
import { NetworkContext } from '../context/NetworkContext.jsx';
import { getPendingCounts } from '../db/indexedDb.js';

/**
 * Custom hook for monitoring offline status and pending orders queue.
 * Returns: { isOnline, pendingCount, syncNow, isSyncing }
 */
export function useOfflineQueue() {
  const context = useContext(NetworkContext);

  // If inside NetworkProvider, delegate to centralized context
  if (context) {
    return {
      isOnline: context.isOnline,
      pendingCount: context.pendingCount,
      syncNow: context.syncPendingData,
      isSyncing: context.isSyncing,
      // Additional convenience helpers
      pendingOrdersCount: context.pendingOrdersCount,
      pendingWaiterCallsCount: context.pendingWaiterCallsCount,
      lastSyncTime: context.lastSyncTime,
      refreshCounts: context.refreshPendingCounts,
      submitOrder: context.submitOrder,
      submitWaiterCall: context.submitWaiterCall
    };
  }

  // Fallback: Standalone hook behavior if used outside NetworkProvider
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getPendingCounts();
      setPendingCount(counts.total);
    } catch (e) {
      console.warn('[useOfflineQueue] Error reading pending count:', e);
    }
  }, []);

  useEffect(() => {
    refreshCounts();

    const onOnline = () => {
      setIsOnline(true);
      refreshCounts();
    };
    const onOffline = () => {
      setIsOnline(false);
      refreshCounts();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshCounts]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    await refreshCounts();
    setIsSyncing(false);
  }, [refreshCounts]);

  return {
    isOnline,
    pendingCount,
    syncNow,
    isSyncing,
    refreshCounts
  };
}

export default useOfflineQueue;
