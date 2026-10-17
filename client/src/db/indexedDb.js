import { openDB } from 'idb';

const DB_NAME = 'smartdine_offline_db';
const DB_VERSION = 1;

let dbPromise = null;

/**
 * Initialize or get active IndexedDB instance
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function initDB() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 1. Menu Cache (keyPath: 'id')
        if (!db.objectStoreNames.contains('menu_cache')) {
          const menuStore = db.createObjectStore('menu_cache', { keyPath: 'id' });
          menuStore.createIndex('category', 'category', { unique: false });
          menuStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Pending Orders (keyPath: 'localId', autoIncrement: true)
        if (!db.objectStoreNames.contains('pending_orders')) {
          const orderStore = db.createObjectStore('pending_orders', {
            keyPath: 'localId',
            autoIncrement: true
          });
          orderStore.createIndex('localStatus', 'localStatus', { unique: false });
          orderStore.createIndex('queuedAt', 'queuedAt', { unique: false });
          orderStore.createIndex('tableNumber', 'tableNumber', { unique: false });
        }

        // 3. Pending Waiter Calls (keyPath: 'localId', autoIncrement: true)
        if (!db.objectStoreNames.contains('pending_waiter_calls')) {
          const callStore = db.createObjectStore('pending_waiter_calls', {
            keyPath: 'localId',
            autoIncrement: true
          });
          callStore.createIndex('localStatus', 'localStatus', { unique: false });
          callStore.createIndex('queuedAt', 'queuedAt', { unique: false });
          callStore.createIndex('tableNumber', 'tableNumber', { unique: false });
        }

        // 4. App Settings & Preferences (keyPath: 'key')
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' });
        }
      },
      blocked() {
        console.warn('[IndexedDB] Database upgrade blocked by another open connection.');
      },
      blocking() {
        console.warn('[IndexedDB] Database closing connection to allow upgrade elsewhere.');
      },
      terminated() {
        console.warn('[IndexedDB] Database connection unexpectedly terminated.');
        dbPromise = null;
      }
    });
  }

  return dbPromise;
}

// Alias for convenience
export const getDB = initDB;

/* ==========================================================================
   MENU CACHE HELPERS
   ========================================================================== */

/**
 * Cache menu categories or items into IndexedDB
 * @param {Array|Object} categories - Array of categories / items or menu payload
 * @returns {Promise<boolean>}
 */
export async function cacheMenu(categories) {
  try {
    const db = await initDB();
    if (!db) return false;

    const tx = db.transaction('menu_cache', 'readwrite');
    await tx.store.clear();

    // Store the exact raw payload structure under '__menu_meta__'
    await tx.store.put({
      id: '__menu_meta__',
      data: categories,
      updatedAt: Date.now()
    });

    // Also populate individual entries for item lookup
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat) continue;
        const entryId = cat.id !== undefined && cat.id !== null 
          ? cat.id 
          : (cat._id || cat.categoryId || `cat_${Math.random().toString(36).substring(2, 9)}`);
        
        await tx.store.put({
          ...cat,
          id: entryId,
          updatedAt: Date.now()
        });

        // If category contains an items array, store individual dishes as well
        if (Array.isArray(cat.items)) {
          for (const item of cat.items) {
            if (!item) continue;
            const itemId = item.id !== undefined && item.id !== null
              ? item.id
              : (item._id || `item_${Math.random().toString(36).substring(2, 9)}`);
            await tx.store.put({
              ...item,
              id: itemId,
              categoryName: cat.name || cat.title || item.category,
              updatedAt: Date.now()
            });
          }
        }
      }
    } else if (categories && typeof categories === 'object') {
      // If object has data or categories array
      const list = categories.categories || categories.data || categories.items;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (!item) continue;
          const entryId = item.id !== undefined && item.id !== null
            ? item.id
            : (item._id || `item_${Math.random().toString(36).substring(2, 9)}`);
          await tx.store.put({
            ...item,
            id: entryId,
            updatedAt: Date.now()
          });
        }
      }
    }

    await tx.done;
    return true;
  } catch (error) {
    console.error('[IndexedDB] cacheMenu error:', error);
    return false;
  }
}

/**
 * Retrieve cached menu from IndexedDB
 * @returns {Promise<Array|Object|null>}
 */
export async function getCachedMenu() {
  try {
    const db = await initDB();
    if (!db) return null;

    // First try returning the preserved full payload
    const meta = await db.get('menu_cache', '__menu_meta__');
    if (meta && meta.data) {
      return meta.data;
    }

    // Fallback: return all items (excluding meta record)
    const all = await db.getAll('menu_cache');
    const filtered = all.filter((entry) => entry.id !== '__menu_meta__');
    return filtered.length > 0 ? filtered : null;
  } catch (error) {
    console.error('[IndexedDB] getCachedMenu error:', error);
    return null;
  }
}

/* ==========================================================================
   PENDING ORDERS HELPERS (OFFLINE QUEUE)
   ========================================================================== */

/**
 * Enqueue an order placed while offline
 * @param {Object} orderPayload - Table, items, notes, voice note, etc.
 * @returns {Promise<Object>} The enqueued order record with localId
 */
export async function enqueueOrder(orderPayload) {
  try {
    const db = await initDB();
    if (!db) throw new Error('IndexedDB unavailable');

    const record = {
      ...orderPayload,
      localStatus: 'pending_sync',
      queuedAt: Date.now(),
      syncAttempts: 0,
      lastError: null
    };

    const localId = await db.add('pending_orders', record);
    return { ...record, localId };
  } catch (error) {
    console.error('[IndexedDB] enqueueOrder error:', error);
    throw error;
  }
}

/**
 * Retrieve all pending orders awaiting sync
 * @returns {Promise<Array>}
 */
export async function getPendingOrders() {
  try {
    const db = await initDB();
    if (!db) return [];

    const orders = await db.getAll('pending_orders');
    // Sort oldest first (FIFO queue)
    return orders.sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));
  } catch (error) {
    console.error('[IndexedDB] getPendingOrders error:', error);
    return [];
  }
}

/**
 * Update an existing pending order (e.g., bump attempts or store error)
 * @param {Object} order
 * @returns {Promise<boolean>}
 */
export async function updatePendingOrder(order) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.put('pending_orders', order);
    return true;
  } catch (error) {
    console.error('[IndexedDB] updatePendingOrder error:', error);
    return false;
  }
}

/**
 * Remove an order from the offline queue after successful server sync
 * @param {number|string} localId
 * @returns {Promise<boolean>}
 */
export async function removePendingOrder(localId) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.delete('pending_orders', localId);
    return true;
  } catch (error) {
    console.error(`[IndexedDB] removePendingOrder error (localId: ${localId}):`, error);
    return false;
  }
}

/**
 * Clear all pending orders
 * @returns {Promise<boolean>}
 */
export async function clearPendingOrders() {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.clear('pending_orders');
    return true;
  } catch (error) {
    console.error('[IndexedDB] clearPendingOrders error:', error);
    return false;
  }
}

/* ==========================================================================
   PENDING WAITER CALLS HELPERS (OFFLINE QUEUE)
   ========================================================================== */

/**
 * Enqueue a waiter assistance request placed while offline
 * @param {Object} callPayload - tableNumber, reason, notes, etc.
 * @returns {Promise<Object>} The enqueued call record with localId
 */
export async function enqueueWaiterCall(callPayload) {
  try {
    const db = await initDB();
    if (!db) throw new Error('IndexedDB unavailable');

    const record = {
      ...callPayload,
      localStatus: 'pending_sync',
      queuedAt: Date.now(),
      syncAttempts: 0,
      lastError: null
    };

    const localId = await db.add('pending_waiter_calls', record);
    return { ...record, localId };
  } catch (error) {
    console.error('[IndexedDB] enqueueWaiterCall error:', error);
    throw error;
  }
}

/**
 * Retrieve all pending waiter calls awaiting sync
 * @returns {Promise<Array>}
 */
export async function getPendingWaiterCalls() {
  try {
    const db = await initDB();
    if (!db) return [];

    const calls = await db.getAll('pending_waiter_calls');
    // Sort oldest first (FIFO queue)
    return calls.sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));
  } catch (error) {
    console.error('[IndexedDB] getPendingWaiterCalls error:', error);
    return [];
  }
}

/**
 * Update an existing pending waiter call
 * @param {Object} call
 * @returns {Promise<boolean>}
 */
export async function updatePendingWaiterCall(call) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.put('pending_waiter_calls', call);
    return true;
  } catch (error) {
    console.error('[IndexedDB] updatePendingWaiterCall error:', error);
    return false;
  }
}

/**
 * Remove a waiter call from offline queue after successful server sync
 * @param {number|string} localId
 * @returns {Promise<boolean>}
 */
export async function removePendingWaiterCall(localId) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.delete('pending_waiter_calls', localId);
    return true;
  } catch (error) {
    console.error(`[IndexedDB] removePendingWaiterCall error (localId: ${localId}):`, error);
    return false;
  }
}

/**
 * Clear all pending waiter calls
 * @returns {Promise<boolean>}
 */
export async function clearPendingWaiterCalls() {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.clear('pending_waiter_calls');
    return true;
  } catch (error) {
    console.error('[IndexedDB] clearPendingWaiterCalls error:', error);
    return false;
  }
}

/* ==========================================================================
   APP SETTINGS & PREFERENCES HELPERS
   ========================================================================== */

/**
 * Set an app setting or user preference
 * @param {string} key
 * @param {any} value
 * @returns {Promise<boolean>}
 */
export async function setAppSetting(key, value) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.put('app_settings', {
      key,
      value,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error(`[IndexedDB] setAppSetting error (key: ${key}):`, error);
    return false;
  }
}

/**
 * Get an app setting by key
 * @param {string} key
 * @param {any} defaultValue
 * @returns {Promise<any>}
 */
export async function getAppSetting(key, defaultValue = null) {
  try {
    const db = await initDB();
    if (!db) return defaultValue;

    const record = await db.get('app_settings', key);
    return record !== undefined ? record.value : defaultValue;
  } catch (error) {
    console.error(`[IndexedDB] getAppSetting error (key: ${key}):`, error);
    return defaultValue;
  }
}

/**
 * Get all app settings as a key-value dictionary
 * @returns {Promise<Object>}
 */
export async function getAllAppSettings() {
  try {
    const db = await initDB();
    if (!db) return {};

    const records = await db.getAll('app_settings');
    return records.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  } catch (error) {
    console.error('[IndexedDB] getAllAppSettings error:', error);
    return {};
  }
}

/**
 * Remove an app setting by key
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function removeAppSetting(key) {
  try {
    const db = await initDB();
    if (!db) return false;

    await db.delete('app_settings', key);
    return true;
  } catch (error) {
    console.error(`[IndexedDB] removeAppSetting error (key: ${key}):`, error);
    return false;
  }
}

/* ==========================================================================
   QUEUE STATS & CLEAR ALL
   ========================================================================== */

/**
 * Get total counts of pending offline items
 * @returns {Promise<{ ordersCount: number, waiterCallsCount: number, total: number }>}
 */
export async function getPendingCounts() {
  try {
    const db = await initDB();
    if (!db) return { ordersCount: 0, waiterCallsCount: 0, total: 0 };

    const [ordersCount, waiterCallsCount] = await Promise.all([
      db.count('pending_orders'),
      db.count('pending_waiter_calls')
    ]);

    return {
      ordersCount,
      waiterCallsCount,
      total: ordersCount + waiterCallsCount
    };
  } catch (error) {
    console.error('[IndexedDB] getPendingCounts error:', error);
    return { ordersCount: 0, waiterCallsCount: 0, total: 0 };
  }
}

/**
 * Clear all offline data (menu cache, pending items, settings)
 * Useful for debugging, testing, or reset
 * @returns {Promise<boolean>}
 */
export async function clearAllOfflineData() {
  try {
    const db = await initDB();
    if (!db) return false;

    const tx = db.transaction(
      ['menu_cache', 'pending_orders', 'pending_waiter_calls', 'app_settings'],
      'readwrite'
    );
    await Promise.all([
      tx.objectStore('menu_cache').clear(),
      tx.objectStore('pending_orders').clear(),
      tx.objectStore('pending_waiter_calls').clear(),
      tx.objectStore('app_settings').clear(),
      tx.done
    ]);

    return true;
  } catch (error) {
    console.error('[IndexedDB] clearAllOfflineData error:', error);
    return false;
  }
}
