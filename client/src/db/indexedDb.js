import { openDB } from 'idb';

const DB_NAME = 'smartdine_offline_db';
const DB_VERSION = 2; // Upgraded to v2 to introduce table_notes store and indices

let dbPromise = null;

/* ==========================================================================
   FALLBACK STORAGE KEYS & IN-MEMORY FAILSAFE
   ========================================================================== */

const FALLBACK_KEYS = {
  MENU_META: 'smartdine_fallback_menu_meta',
  PENDING_ORDERS: 'smartdine_fallback_pending_orders',
  PENDING_WAITER_CALLS: 'smartdine_fallback_pending_waiter_calls',
  TABLE_NOTES: 'smartdine_fallback_table_notes',
  APP_SETTINGS: 'smartdine_fallback_app_settings'
};

// Infallible in-memory cache if both IndexedDB and localStorage are blocked or full
const memoryStore = {
  menu_cache: new Map(),
  pending_orders: [],
  pending_waiter_calls: [],
  table_notes: [],
  app_settings: new Map()
};

/* ==========================================================================
   STORAGE QUOTA & ERROR DETECTION UTILITIES
   ========================================================================== */

/**
 * Determine if an error is a Storage Quota Exceeded error
 * @param {any} error
 * @returns {boolean}
 */
export function isQuotaExceededError(error) {
  if (!error) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 || // DOMException.QUOTA_EXCEEDED_ERR
    error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED legacy code
    (typeof error.message === 'string' && error.message.toLowerCase().includes('quota'))
  );
}

/**
 * Retrieve storage estimate (usage vs quota)
 * @returns {Promise<{ usage: number, quota: number, percentUsed: number, isConstrained: boolean }>}
 */
export async function getStorageEstimate() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      const remainingBytes = quota - usage;
      // Constrained if > 85% used or less than 5MB free space remains
      const isConstrained = percentUsed > 85 || (quota > 0 && remainingBytes < 5 * 1024 * 1024);
      return { usage, quota, percentUsed, isConstrained };
    } catch (e) {
      console.warn('[IndexedDB] Storage estimate query failed:', e);
    }
  }
  return { usage: 0, quota: 0, percentUsed: 0, isConstrained: false };
}

/**
 * Check if browser storage quota is constrained
 * @returns {Promise<boolean>}
 */
export async function isStorageQuotaConstrained() {
  const estimate = await getStorageEstimate();
  return estimate.isConstrained;
}

/**
 * Safely read a JSON list from localStorage
 * @param {string} key
 * @returns {Array}
 */
function readFallbackList(key) {
  if (typeof localStorage === 'undefined') {
    return memoryStore[key] || [];
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`[IndexedDB Fallback] Failed reading ${key} from localStorage:`, err);
    return memoryStore[key] || [];
  }
}

/**
 * Safely write a JSON list to localStorage with quota protection and memory fallback
 * @param {string} key
 * @param {Array} list
 */
function writeFallbackList(key, list) {
  // Always update memory store as immediate mirror
  memoryStore[key] = [...list];

  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(`[IndexedDB Fallback] localStorage quota exceeded on ${key}. Attempting emergency eviction...`);
      try {
        // Evict non-essential cached menu metadata to free up space for critical orders/notes
        localStorage.removeItem(FALLBACK_KEYS.MENU_META);
        // Strip heavy binary/base64 audio fields if present in pending list
        const sanitizedList = list.map((item) => {
          if (item && item.voiceBlob) {
            const { voiceBlob, ...rest } = item;
            return { ...rest, voiceNote: '[Voice audio omitted due to storage quota constraint]' };
          }
          if (item && typeof item.voiceNote === 'string' && item.voiceNote.length > 500) {
            return { ...item, voiceNote: '[Voice audio omitted due to storage quota constraint]' };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(sanitizedList));
        return;
      } catch (retryErr) {
        console.error(`[IndexedDB Fallback] Emergency eviction failed for ${key}. Retaining in memory only:`, retryErr);
      }
    } else {
      console.warn(`[IndexedDB Fallback] writeFallbackList error for ${key}:`, err);
    }
  }
}

/**
 * Attempt to prune bulky non-critical entries from IndexedDB when quota is exceeded
 * @param {import('idb').IDBPDatabase} db
 */
async function pruneCacheOnQuotaExceeded(db) {
  try {
    console.warn('[IndexedDB] Storage quota constrained. Pruning menu_cache dish entries to reclaim quota...');
    if (db.objectStoreNames.contains('menu_cache')) {
      const tx = db.transaction('menu_cache', 'readwrite');
      const all = await tx.store.getAll();
      for (const entry of all) {
        // Keep the master payload metadata if possible, but evict individual item copies
        if (entry.id !== '__menu_meta__') {
          await tx.store.delete(entry.id).catch(() => {});
        }
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('[IndexedDB] Cache pruning failed:', err);
  }
}

/* ==========================================================================
   CORE DATABASE INITIALIZATION
   ========================================================================== */

/**
 * Initialize or get active IndexedDB instance
 * @returns {Promise<import('idb').IDBPDatabase|null>}
 */
export async function initDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
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

        // 4. Table Notes (keyPath: 'localId', autoIncrement: true)
        if (!db.objectStoreNames.contains('table_notes')) {
          const notesStore = db.createObjectStore('table_notes', {
            keyPath: 'localId',
            autoIncrement: true
          });
          notesStore.createIndex('tableNumber', 'tableNumber', { unique: false });
          notesStore.createIndex('localStatus', 'localStatus', { unique: false });
          notesStore.createIndex('status', 'status', { unique: false });
          notesStore.createIndex('queuedAt', 'queuedAt', { unique: false });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 5. App Settings & Preferences (keyPath: 'key')
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
    }).catch((err) => {
      console.warn('[IndexedDB] openDB connection failed, falling back to storage:', err);
      dbPromise = null;
      return null;
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
 * Cache menu categories or items into IndexedDB with fallback to localStorage
 * @param {Array|Object} categories - Array of categories / items or menu payload
 * @returns {Promise<boolean>}
 */
export async function cacheMenu(categories) {
  if (!categories) return false;

  try {
    const db = await initDB();
    if (db) {
      try {
        const tx = db.transaction('menu_cache', 'readwrite');
        await tx.store.clear();

        // Store the exact raw payload structure under '__menu_meta__'
        await tx.store.put({
          id: '__menu_meta__',
          data: categories,
          updatedAt: Date.now()
        });

        // Also populate individual entries for quick lookup
        if (Array.isArray(categories)) {
          for (const cat of categories) {
            if (!cat) continue;
            const entryId =
              cat.id !== undefined && cat.id !== null
                ? cat.id
                : (cat._id || cat.categoryId || `cat_${Math.random().toString(36).substring(2, 9)}`);

            await tx.store.put({
              ...cat,
              id: entryId,
              updatedAt: Date.now()
            });

            if (Array.isArray(cat.items)) {
              for (const item of cat.items) {
                if (!item) continue;
                const itemId =
                  item.id !== undefined && item.id !== null
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
          const list = categories.categories || categories.data || categories.items;
          if (Array.isArray(list)) {
            for (const item of list) {
              if (!item) continue;
              const entryId =
                item.id !== undefined && item.id !== null
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
      } catch (txErr) {
        if (isQuotaExceededError(txErr)) {
          console.warn('[IndexedDB] cacheMenu hit storage quota limit. Pruning and retrying meta-only cache...');
          await pruneCacheOnQuotaExceeded(db);
          // Try writing only the lightweight meta entry
          try {
            await db.put('menu_cache', {
              id: '__menu_meta__',
              data: categories,
              updatedAt: Date.now()
            });
            return true;
          } catch (_) {
            // Proceed to fallback storage
          }
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] cacheMenu failed, using storage fallback:', error);
  }

  // Fallback: Mirror to localStorage or memory store
  try {
    memoryStore.menu_cache.set('__menu_meta__', categories);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          FALLBACK_KEYS.MENU_META,
          JSON.stringify({ data: categories, updatedAt: Date.now() })
        );
      } catch (lsErr) {
        if (isQuotaExceededError(lsErr)) {
          console.warn('[IndexedDB Fallback] localStorage quota reached for menu cache; kept in memory.');
        }
      }
    }
    return true;
  } catch (fallbackErr) {
    console.error('[IndexedDB] All menu caching strategies failed:', fallbackErr);
    return false;
  }
}

/**
 * Retrieve cached menu from IndexedDB or fallback storage
 * @returns {Promise<Array|Object|null>}
 */
export async function getCachedMenu() {
  try {
    const db = await initDB();
    if (db) {
      const meta = await db.get('menu_cache', '__menu_meta__');
      if (meta && meta.data) {
        return meta.data;
      }

      const all = await db.getAll('menu_cache');
      const filtered = all.filter((entry) => entry.id !== '__menu_meta__');
      if (filtered.length > 0) return filtered;
    }
  } catch (error) {
    console.warn('[IndexedDB] getCachedMenu read error, checking fallback:', error);
  }

  // Fallback 1: localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FALLBACK_KEYS.MENU_META);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) return parsed.data;
      }
    } catch (_) {}
  }

  // Fallback 2: in-memory store
  if (memoryStore.menu_cache.has('__menu_meta__')) {
    return memoryStore.menu_cache.get('__menu_meta__');
  }

  return null;
}

/**
 * Clear cached menu from IndexedDB and fallbacks
 * @returns {Promise<boolean>}
 */
export async function clearMenuCache() {
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('menu_cache')) {
      await db.clear('menu_cache');
    }
  } catch (e) {
    console.warn('[IndexedDB] clearMenuCache error:', e);
  }

  memoryStore.menu_cache.clear();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(FALLBACK_KEYS.MENU_META);
    } catch (_) {}
  }
  return true;
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
  const record = {
    ...orderPayload,
    localStatus: 'pending_sync',
    queuedAt: orderPayload.queuedAt || Date.now(),
    syncAttempts: 0,
    lastError: null
  };

  try {
    const db = await initDB();
    if (db) {
      try {
        const localId = await db.add('pending_orders', record);
        return { ...record, localId };
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueOrder. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('pending_orders', record);
            return { ...record, localId };
          } catch (retryErr) {
            console.warn('[IndexedDB] Retry failed, delegating order to fallback storage:', retryErr);
          }
        } else {
          throw addErr;
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] enqueueOrder primary DB failed, saving to fallback:', error);
  }

  // Fallback: Queue in localStorage / memoryStore
  const fallbackId = `local_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fallbackRecord = { ...record, localId: fallbackId, isFallbackStorage: true };
  const existing = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  existing.push(fallbackRecord);
  writeFallbackList(FALLBACK_KEYS.PENDING_ORDERS, existing);

  return fallbackRecord;
}

/**
 * Retrieve all pending orders awaiting sync (IndexedDB + fallback storage)
 * @returns {Promise<Array>}
 */
export async function getPendingOrders() {
  const combined = [];
  const seenIds = new Set();

  try {
    const db = await initDB();
    if (db) {
      const orders = await db.getAll('pending_orders');
      for (const ord of orders) {
        combined.push(ord);
        if (ord.localId) seenIds.add(String(ord.localId));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingOrders DB read failed:', error);
  }

  // Include fallback items that are not yet in IDB
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  for (const fallbackOrd of fallbackOrders) {
    if (fallbackOrd && fallbackOrd.localId && !seenIds.has(String(fallbackOrd.localId))) {
      combined.push(fallbackOrd);
      seenIds.add(String(fallbackOrd.localId));
    }
  }

  // Sort oldest first (FIFO queue)
  return combined.sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));
}

/**
 * Update an existing pending order (e.g., bump attempts or store error)
 * @param {Object} order
 * @returns {Promise<boolean>}
 */
export async function updatePendingOrder(order) {
  if (!order || order.localId === undefined) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && typeof order.localId === 'number') {
      await db.put('pending_orders', order);
      updatedInIDB = true;
    }
  } catch (error) {
    console.warn('[IndexedDB] updatePendingOrder error:', error);
  }

  // Update in fallback store as well
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  const matchIndex = fallbackOrders.findIndex(
    (item) => String(item.localId) === String(order.localId)
  );

  if (matchIndex >= 0) {
    fallbackOrders[matchIndex] = { ...fallbackOrders[matchIndex], ...order };
    writeFallbackList(FALLBACK_KEYS.PENDING_ORDERS, fallbackOrders);
    return true;
  }

  return updatedInIDB;
}

/**
 * Remove an order from the offline queue after successful server sync
 * @param {number|string} localId
 * @returns {Promise<boolean>}
 */
export async function removePendingOrder(localId) {
  let removed = false;

  try {
    const db = await initDB();
    if (db) {
      // If localId is a number or can be parsed to IDB key
      const key = typeof localId === 'number' ? localId : Number(localId);
      if (!Number.isNaN(key)) {
        await db.delete('pending_orders', key);
        removed = true;
      }
      // Also attempt string key deletion if applicable
      await db.delete('pending_orders', localId).catch(() => {});
    }
  } catch (error) {
    console.warn(`[IndexedDB] removePendingOrder error (localId: ${localId}):`, error);
  }

  // Remove from fallback store
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  const filtered = fallbackOrders.filter((item) => String(item.localId) !== String(localId));
  if (filtered.length !== fallbackOrders.length) {
    writeFallbackList(FALLBACK_KEYS.PENDING_ORDERS, filtered);
    removed = true;
  }

  return removed;
}

/**
 * Clear all pending orders from IndexedDB and fallback
 * @returns {Promise<boolean>}
 */
export async function clearPendingOrders() {
  try {
    const db = await initDB();
    if (db) {
      await db.clear('pending_orders');
    }
  } catch (error) {
    console.warn('[IndexedDB] clearPendingOrders error:', error);
  }

  writeFallbackList(FALLBACK_KEYS.PENDING_ORDERS, []);
  return true;
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
  const record = {
    ...callPayload,
    localStatus: 'pending_sync',
    queuedAt: callPayload.queuedAt || Date.now(),
    syncAttempts: 0,
    lastError: null
  };

  try {
    const db = await initDB();
    if (db) {
      try {
        const localId = await db.add('pending_waiter_calls', record);
        return { ...record, localId };
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueWaiterCall. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('pending_waiter_calls', record);
            return { ...record, localId };
          } catch (retryErr) {
            console.warn('[IndexedDB] Retry failed, falling back to storage:', retryErr);
          }
        } else {
          throw addErr;
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] enqueueWaiterCall primary DB failed, saving to fallback:', error);
  }

  // Fallback: Queue in localStorage / memoryStore
  const fallbackId = `local_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fallbackRecord = { ...record, localId: fallbackId, isFallbackStorage: true };
  const existing = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  existing.push(fallbackRecord);
  writeFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS, existing);

  return fallbackRecord;
}

/**
 * Retrieve all pending waiter calls awaiting sync
 * @returns {Promise<Array>}
 */
export async function getPendingWaiterCalls() {
  const combined = [];
  const seenIds = new Set();

  try {
    const db = await initDB();
    if (db) {
      const calls = await db.getAll('pending_waiter_calls');
      for (const call of calls) {
        combined.push(call);
        if (call.localId) seenIds.add(String(call.localId));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingWaiterCalls DB read failed:', error);
  }

  // Include fallback items
  const fallbackCalls = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  for (const fallbackCall of fallbackCalls) {
    if (fallbackCall && fallbackCall.localId && !seenIds.has(String(fallbackCall.localId))) {
      combined.push(fallbackCall);
      seenIds.add(String(fallbackCall.localId));
    }
  }

  return combined.sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));
}

/**
 * Update an existing pending waiter call
 * @param {Object} call
 * @returns {Promise<boolean>}
 */
export async function updatePendingWaiterCall(call) {
  if (!call || call.localId === undefined) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && typeof call.localId === 'number') {
      await db.put('pending_waiter_calls', call);
      updatedInIDB = true;
    }
  } catch (error) {
    console.warn('[IndexedDB] updatePendingWaiterCall error:', error);
  }

  const fallbackCalls = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  const matchIndex = fallbackCalls.findIndex(
    (item) => String(item.localId) === String(call.localId)
  );

  if (matchIndex >= 0) {
    fallbackCalls[matchIndex] = { ...fallbackCalls[matchIndex], ...call };
    writeFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS, fallbackCalls);
    return true;
  }

  return updatedInIDB;
}

/**
 * Remove a waiter call from offline queue after successful server sync
 * @param {number|string} localId
 * @returns {Promise<boolean>}
 */
export async function removePendingWaiterCall(localId) {
  let removed = false;

  try {
    const db = await initDB();
    if (db) {
      const key = typeof localId === 'number' ? localId : Number(localId);
      if (!Number.isNaN(key)) {
        await db.delete('pending_waiter_calls', key);
        removed = true;
      }
      await db.delete('pending_waiter_calls', localId).catch(() => {});
    }
  } catch (error) {
    console.warn(`[IndexedDB] removePendingWaiterCall error (localId: ${localId}):`, error);
  }

  const fallbackCalls = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  const filtered = fallbackCalls.filter((item) => String(item.localId) !== String(localId));
  if (filtered.length !== fallbackCalls.length) {
    writeFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS, filtered);
    removed = true;
  }

  return removed;
}

/**
 * Clear all pending waiter calls
 * @returns {Promise<boolean>}
 */
export async function clearPendingWaiterCalls() {
  try {
    const db = await initDB();
    if (db) {
      await db.clear('pending_waiter_calls');
    }
  } catch (error) {
    console.warn('[IndexedDB] clearPendingWaiterCalls error:', error);
  }

  writeFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS, []);
  return true;
}

/* ==========================================================================
   TABLE NOTES HELPERS (OFFLINE CACHING & QUEUE)
   ========================================================================== */

/**
 * Enqueue or save a table note / customer report while offline
 * Supports customer requests, food issues, special prep instructions, and staff table notes.
 * @param {Object} notePayload - tableNumber, note, customerName, category, severity, etc.
 * @returns {Promise<Object>} The enqueued note record with localId
 */
export async function enqueueTableNote(notePayload) {
  const tableNum = Number(notePayload.tableNumber) || notePayload.tableNumber || 1;
  const noteText =
    notePayload.note ||
    notePayload.notes ||
    notePayload.complaintText ||
    notePayload.message ||
    '';

  const record = {
    tableNumber: tableNum,
    tableName: notePayload.tableName || `Table ${tableNum}`,
    customerName: notePayload.customerName || 'Guest',
    note: noteText,
    complaintText: noteText,
    category: notePayload.category || 'General',
    severity: notePayload.severity || 'medium', // 'low', 'medium', 'high', 'critical'
    status: notePayload.status || 'new', // 'new', 'in_progress', 'resolved'
    assignedEmployeeId: notePayload.assignedEmployeeId || null,
    assignedEmployeeName: notePayload.assignedEmployeeName || null,
    resolutionNote: notePayload.resolutionNote || null,
    localStatus: notePayload.localStatus || 'pending_sync',
    queuedAt: notePayload.queuedAt || Date.now(),
    createdAt: notePayload.createdAt || Date.now(),
    syncAttempts: 0,
    lastError: null,
    ...notePayload
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      try {
        const localId = await db.add('table_notes', record);
        return { ...record, localId };
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueTableNote. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('table_notes', record);
            return { ...record, localId };
          } catch (retryErr) {
            console.warn('[IndexedDB] Retry failed, falling back to storage:', retryErr);
          }
        } else {
          throw addErr;
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] enqueueTableNote primary DB failed, saving to fallback:', error);
  }

  // Fallback: Queue in localStorage / memoryStore
  const fallbackId = `local_note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fallbackRecord = { ...record, localId: fallbackId, isFallbackStorage: true };
  const existing = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  existing.push(fallbackRecord);
  writeFallbackList(FALLBACK_KEYS.TABLE_NOTES, existing);

  return fallbackRecord;
}

// Friendly alias
export const saveTableNote = enqueueTableNote;

/**
 * Retrieve all table notes, with optional filtering
 * @param {Object} [filter] - Optional filter: { tableNumber, status, localStatus }
 * @returns {Promise<Array>}
 */
export async function getTableNotes(filter = {}) {
  const combined = [];
  const seenIds = new Set();

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      let notes = [];
      if (filter.tableNumber !== undefined && filter.tableNumber !== null) {
        try {
          const index = db.transaction('table_notes').store.index('tableNumber');
          notes = await index.getAll(Number(filter.tableNumber));
        } catch (_) {
          notes = await db.getAll('table_notes');
        }
      } else {
        notes = await db.getAll('table_notes');
      }

      for (const note of notes) {
        combined.push(note);
        if (note.localId) seenIds.add(String(note.localId));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getTableNotes DB read error:', error);
  }

  // Include fallback items
  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  for (const fallbackNote of fallbackNotes) {
    if (fallbackNote && fallbackNote.localId && !seenIds.has(String(fallbackNote.localId))) {
      combined.push(fallbackNote);
      seenIds.add(String(fallbackNote.localId));
    }
  }

  // Apply filters
  let result = combined;
  if (filter.tableNumber !== undefined && filter.tableNumber !== null) {
    result = result.filter(
      (n) => Number(n.tableNumber) === Number(filter.tableNumber)
    );
  }
  if (filter.status) {
    result = result.filter((n) => n.status === filter.status);
  }
  if (filter.localStatus) {
    result = result.filter((n) => n.localStatus === filter.localStatus);
  }

  return result.sort((a, b) => (b.createdAt || b.queuedAt || 0) - (a.createdAt || a.queuedAt || 0));
}

/**
 * Retrieve table notes for a specific table
 * @param {number|string} tableNumber
 * @returns {Promise<Array>}
 */
export async function getTableNotesByTable(tableNumber) {
  return getTableNotes({ tableNumber });
}

/**
 * Retrieve table notes awaiting synchronization
 * @returns {Promise<Array>}
 */
export async function getPendingTableNotes() {
  return getTableNotes({ localStatus: 'pending_sync' });
}

/**
 * Update an existing table note (e.g. resolve issue, assign staff, update error)
 * @param {Object} note
 * @returns {Promise<boolean>}
 */
export async function updateTableNote(note) {
  if (!note || note.localId === undefined) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes') && typeof note.localId === 'number') {
      await db.put('table_notes', note);
      updatedInIDB = true;
    }
  } catch (error) {
    console.warn('[IndexedDB] updateTableNote error:', error);
  }

  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  const matchIndex = fallbackNotes.findIndex(
    (item) => String(item.localId) === String(note.localId)
  );

  if (matchIndex >= 0) {
    fallbackNotes[matchIndex] = { ...fallbackNotes[matchIndex], ...note };
    writeFallbackList(FALLBACK_KEYS.TABLE_NOTES, fallbackNotes);
    return true;
  }

  return updatedInIDB;
}

/**
 * Remove a table note after resolution or sync
 * @param {number|string} localId
 * @returns {Promise<boolean>}
 */
export async function removeTableNote(localId) {
  let removed = false;

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      const key = typeof localId === 'number' ? localId : Number(localId);
      if (!Number.isNaN(key)) {
        await db.delete('table_notes', key);
        removed = true;
      }
      await db.delete('table_notes', localId).catch(() => {});
    }
  } catch (error) {
    console.warn(`[IndexedDB] removeTableNote error (localId: ${localId}):`, error);
  }

  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  const filtered = fallbackNotes.filter((item) => String(item.localId) !== String(localId));
  if (filtered.length !== fallbackNotes.length) {
    writeFallbackList(FALLBACK_KEYS.TABLE_NOTES, filtered);
    removed = true;
  }

  return removed;
}

/**
 * Clear all table notes
 * @returns {Promise<boolean>}
 */
export async function clearTableNotes() {
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      await db.clear('table_notes');
    }
  } catch (error) {
    console.warn('[IndexedDB] clearTableNotes error:', error);
  }

  writeFallbackList(FALLBACK_KEYS.TABLE_NOTES, []);
  return true;
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
  if (!key) return false;

  const record = {
    key,
    value,
    updatedAt: Date.now()
  };

  try {
    const db = await initDB();
    if (db) {
      await db.put('app_settings', record);
      return true;
    }
  } catch (error) {
    console.warn(`[IndexedDB] setAppSetting primary DB failed (key: ${key}):`, error);
  }

  // Fallback: localStorage & memory store
  memoryStore.app_settings.set(key, value);
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = readFallbackList(FALLBACK_KEYS.APP_SETTINGS);
      const dict = Array.isArray(existing)
        ? existing.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
        : existing || {};
      dict[key] = value;
      localStorage.setItem(FALLBACK_KEYS.APP_SETTINGS, JSON.stringify(dict));
      return true;
    } catch (_) {}
  }

  return true;
}

/**
 * Get an app setting by key
 * @param {string} key
 * @param {any} defaultValue
 * @returns {Promise<any>}
 */
export async function getAppSetting(key, defaultValue = null) {
  if (!key) return defaultValue;

  try {
    const db = await initDB();
    if (db) {
      const record = await db.get('app_settings', key);
      if (record !== undefined && record.value !== undefined) {
        return record.value;
      }
    }
  } catch (error) {
    console.warn(`[IndexedDB] getAppSetting error (key: ${key}):`, error);
  }

  // Fallback 1: localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FALLBACK_KEYS.APP_SETTINGS);
      if (raw) {
        const dict = JSON.parse(raw);
        if (dict && dict[key] !== undefined) {
          return dict[key];
        }
      }
    } catch (_) {}
  }

  // Fallback 2: memoryStore
  if (memoryStore.app_settings.has(key)) {
    return memoryStore.app_settings.get(key);
  }

  return defaultValue;
}

/**
 * Get all app settings as a key-value dictionary
 * @returns {Promise<Object>}
 */
export async function getAllAppSettings() {
  const result = {};

  try {
    const db = await initDB();
    if (db) {
      const records = await db.getAll('app_settings');
      for (const curr of records) {
        result[curr.key] = curr.value;
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getAllAppSettings error:', error);
  }

  // Merge fallback settings
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FALLBACK_KEYS.APP_SETTINGS);
      if (raw) {
        const dict = JSON.parse(raw);
        Object.assign(result, dict);
      }
    } catch (_) {}
  }

  for (const [k, v] of memoryStore.app_settings.entries()) {
    if (result[k] === undefined) {
      result[k] = v;
    }
  }

  return result;
}

/**
 * Remove an app setting by key
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function removeAppSetting(key) {
  if (!key) return false;

  try {
    const db = await initDB();
    if (db) {
      await db.delete('app_settings', key);
    }
  } catch (error) {
    console.warn(`[IndexedDB] removeAppSetting error (key: ${key}):`, error);
  }

  memoryStore.app_settings.delete(key);
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FALLBACK_KEYS.APP_SETTINGS);
      if (raw) {
        const dict = JSON.parse(raw);
        delete dict[key];
        localStorage.setItem(FALLBACK_KEYS.APP_SETTINGS, JSON.stringify(dict));
      }
    } catch (_) {}
  }

  return true;
}

/* ==========================================================================
   QUEUE STATS & CLEAR ALL
   ========================================================================== */

/**
 * Get total counts of pending offline items (orders, waiter calls, and table notes)
 * @returns {Promise<{ ordersCount: number, waiterCallsCount: number, tableNotesCount: number, total: number }>}
 */
export async function getPendingCounts() {
  let ordersCount = 0;
  let waiterCallsCount = 0;
  let tableNotesCount = 0;

  try {
    const db = await initDB();
    if (db) {
      const [ordCount, callCount, noteCount] = await Promise.all([
        db.count('pending_orders').catch(() => 0),
        db.count('pending_waiter_calls').catch(() => 0),
        db.objectStoreNames.contains('table_notes')
          ? db.count('table_notes').catch(() => 0)
          : 0
      ]);
      ordersCount = ordCount;
      waiterCallsCount = callCount;
      tableNotesCount = noteCount;
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingCounts DB count error:', error);
  }

  // Include fallback counts
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS).length;
  const fallbackWaiters = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS).length;
  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES).length;

  const totalOrders = ordersCount + fallbackOrders;
  const totalWaiters = waiterCallsCount + fallbackWaiters;
  const totalNotes = tableNotesCount + fallbackNotes;

  return {
    ordersCount: totalOrders,
    waiterCallsCount: totalWaiters,
    tableNotesCount: totalNotes,
    total: totalOrders + totalWaiters + totalNotes
  };
}

/**
 * Clear all offline data (menu cache, pending items, table notes, settings)
 * Useful for debugging, testing, or reset
 * @returns {Promise<boolean>}
 */
export async function clearAllOfflineData() {
  try {
    const db = await initDB();
    if (db) {
      const storeNames = ['menu_cache', 'pending_orders', 'pending_waiter_calls', 'app_settings'];
      if (db.objectStoreNames.contains('table_notes')) {
        storeNames.push('table_notes');
      }

      const tx = db.transaction(storeNames, 'readwrite');
      await Promise.all([
        ...storeNames.map((s) => tx.objectStore(s).clear()),
        tx.done
      ]);
    }
  } catch (error) {
    console.warn('[IndexedDB] clearAllOfflineData IDB error:', error);
  }

  // Clear memory stores
  memoryStore.menu_cache.clear();
  memoryStore.pending_orders = [];
  memoryStore.pending_waiter_calls = [];
  memoryStore.table_notes = [];
  memoryStore.app_settings.clear();

  // Clear localStorage fallbacks
  if (typeof localStorage !== 'undefined') {
    Object.values(FALLBACK_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    });
  }

  return true;
}

/* ==========================================================================
   DEFAULT EXPORT
   ========================================================================== */

export default {
  initDB,
  getDB,
  cacheMenu,
  getCachedMenu,
  clearMenuCache,
  enqueueOrder,
  getPendingOrders,
  updatePendingOrder,
  removePendingOrder,
  clearPendingOrders,
  enqueueWaiterCall,
  getPendingWaiterCalls,
  updatePendingWaiterCall,
  removePendingWaiterCall,
  clearPendingWaiterCalls,
  enqueueTableNote,
  saveTableNote,
  getTableNotes,
  getTableNotesByTable,
  getPendingTableNotes,
  updateTableNote,
  removeTableNote,
  clearTableNotes,
  setAppSetting,
  getAppSetting,
  getAllAppSettings,
  removeAppSetting,
  getPendingCounts,
  clearAllOfflineData,
  isQuotaExceededError,
  getStorageEstimate,
  isStorageQuotaConstrained
};
