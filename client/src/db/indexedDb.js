import { openDB } from 'idb';

const DB_NAME = 'smartdine_offline_db';
const DB_VERSION = 3; // Upgraded to v3 to introduce menu, orders, telegramFiles, assistanceCalls, reports, syncQueue

let dbPromise = null;

/* ==========================================================================
   FALLBACK STORAGE KEYS & IN-MEMORY FAILSAFE
   ========================================================================== */

export const FALLBACK_KEYS = {
  MENU_META: 'smartdine_fallback_menu_meta',
  MENU_ITEMS: 'smartdine_fallback_menu_items',
  ORDERS: 'smartdine_fallback_orders',
  PENDING_ORDERS: 'smartdine_fallback_pending_orders',
  PENDING_WAITER_CALLS: 'smartdine_fallback_pending_waiter_calls',
  TABLE_NOTES: 'smartdine_fallback_table_notes',
  APP_SETTINGS: 'smartdine_fallback_app_settings',
  TELEGRAM_FILES: 'smartdine_fallback_telegram_files',
  ASSISTANCE_CALLS: 'smartdine_fallback_assistance_calls',
  REPORTS: 'smartdine_fallback_reports',
  SYNC_QUEUE: 'smartdine_fallback_sync_queue'
};

// Infallible in-memory cache if both IndexedDB and localStorage are blocked or full
export const memoryStore = {
  menu: new Map(),
  menu_cache: new Map(),
  orders: new Map(),
  pending_orders: [],
  pending_waiter_calls: [],
  table_notes: [],
  app_settings: new Map(),
  telegramFiles: new Map(),
  assistanceCalls: new Map(),
  reports: new Map(),
  syncQueue: []
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
 * Safely read a JSON list or object from localStorage
 * @param {string} key
 * @returns {Array}
 */
function readFallbackList(key) {
  if (typeof localStorage === 'undefined') {
    return Array.isArray(memoryStore[key]) ? memoryStore[key] : [];
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`[IndexedDB Fallback] Failed reading ${key} from localStorage:`, err);
    return Array.isArray(memoryStore[key]) ? memoryStore[key] : [];
  }
}

/**
 * Safely write a JSON list to localStorage with quota protection and memory fallback
 * @param {string} key
 * @param {Array} list
 */
function writeFallbackList(key, list) {
  // Always update memory store as immediate mirror
  if (Array.isArray(memoryStore[key])) {
    memoryStore[key] = [...list];
  }

  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(`[IndexedDB Fallback] localStorage quota exceeded on ${key}. Attempting emergency eviction...`);
      try {
        // Evict non-essential cached menu metadata to free up space for critical orders/notes
        localStorage.removeItem(FALLBACK_KEYS.MENU_META);
        localStorage.removeItem(FALLBACK_KEYS.TELEGRAM_FILES);
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
      } catch (retryErr) {
        console.error(`[IndexedDB Fallback] Emergency eviction failed for ${key}. Retaining in memory only:`, retryErr);
      }
    } else {
      console.warn(`[IndexedDB Fallback] writeFallbackList error for ${key}:`, err);
    }
  }
}

/**
 * Prune older Telegram files when storage is constrained (LRU policy)
 * @param {import('idb').IDBPDatabase} db
 * @param {number} maxKeep - Number of most recent files to keep
 */
export async function pruneTelegramFilesCache(db, maxKeep = 10) {
  try {
    if (!db || !db.objectStoreNames.contains('telegramFiles')) return;
    const tx = db.transaction('telegramFiles', 'readwrite');
    const all = await tx.store.getAll();
    if (all.length > maxKeep) {
      all.sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0));
      const toDelete = all.slice(maxKeep);
      for (const entry of toDelete) {
        if (entry && entry.fileId) {
          await tx.store.delete(entry.fileId).catch(() => {});
        }
      }
    }
    await tx.done;
  } catch (err) {
    console.warn('[IndexedDB] pruneTelegramFilesCache failed:', err);
  }
}

/**
 * Attempt to prune bulky non-critical entries from IndexedDB when quota is exceeded
 * @param {import('idb').IDBPDatabase} db
 */
async function pruneCacheOnQuotaExceeded(db) {
  try {
    console.warn('[IndexedDB] Storage quota constrained. Pruning cached files and menu dishes to reclaim quota...');
    // 1. Prune telegram cached files
    if (db.objectStoreNames.contains('telegramFiles')) {
      await pruneTelegramFilesCache(db, 5);
    }

    // 2. Prune menu_cache dish entries
    if (db.objectStoreNames.contains('menu_cache')) {
      const tx = db.transaction('menu_cache', 'readwrite');
      const all = await tx.store.getAll();
      for (const entry of all) {
        if (entry.id !== '__menu_meta__') {
          await tx.store.delete(entry.id).catch(() => {});
        }
      }
      await tx.done;
    }

    // 3. Prune menu store individual items while keeping master record
    if (db.objectStoreNames.contains('menu')) {
      const tx = db.transaction('menu', 'readwrite');
      const all = await tx.store.getAll();
      for (const entry of all) {
        if (entry.id !== '__menu_all__') {
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
 * Ensures object stores: menu, orders, telegramFiles, assistanceCalls, reports, syncQueue
 * alongside backwards compatible stores: menu_cache, pending_orders, pending_waiter_calls, table_notes, app_settings
 * @returns {Promise<import('idb').IDBPDatabase|null>}
 */
export async function initDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // --- 1. Menu Cache (Backwards compatibility) ---
        if (!db.objectStoreNames.contains('menu_cache')) {
          const s = db.createObjectStore('menu_cache', { keyPath: 'id' });
          s.createIndex('category', 'category', { unique: false });
          s.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // --- 2. Pending Orders (Backwards compatibility) ---
        if (!db.objectStoreNames.contains('pending_orders')) {
          const s = db.createObjectStore('pending_orders', {
            keyPath: 'localId',
            autoIncrement: true
          });
          s.createIndex('localStatus', 'localStatus', { unique: false });
          s.createIndex('queuedAt', 'queuedAt', { unique: false });
          s.createIndex('tableNumber', 'tableNumber', { unique: false });
        }

        // --- 3. Pending Waiter Calls (Backwards compatibility) ---
        if (!db.objectStoreNames.contains('pending_waiter_calls')) {
          const s = db.createObjectStore('pending_waiter_calls', {
            keyPath: 'localId',
            autoIncrement: true
          });
          s.createIndex('localStatus', 'localStatus', { unique: false });
          s.createIndex('queuedAt', 'queuedAt', { unique: false });
          s.createIndex('tableNumber', 'tableNumber', { unique: false });
        }

        // --- 4. Table Notes (Backwards compatibility) ---
        if (!db.objectStoreNames.contains('table_notes')) {
          const s = db.createObjectStore('table_notes', {
            keyPath: 'localId',
            autoIncrement: true
          });
          s.createIndex('tableNumber', 'tableNumber', { unique: false });
          s.createIndex('localStatus', 'localStatus', { unique: false });
          s.createIndex('status', 'status', { unique: false });
          s.createIndex('queuedAt', 'queuedAt', { unique: false });
          s.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // --- 5. App Settings & Preferences ---
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' });
        }

        // ======================================================================
        // CORE STORES (Requirement 1)
        // ======================================================================

        // 1. Menu Store (keyPath: 'id')
        if (!db.objectStoreNames.contains('menu')) {
          const menuStore = db.createObjectStore('menu', { keyPath: 'id' });
          menuStore.createIndex('category', 'category', { unique: false });
          menuStore.createIndex('name', 'name', { unique: false });
          menuStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Orders Store (keyPath: 'id')
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('tableNumber', 'tableNumber', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
          ordersStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          ordersStore.createIndex('localStatus', 'localStatus', { unique: false });
        }

        // 3. Telegram Files Store (keyPath: 'fileId')
        if (!db.objectStoreNames.contains('telegramFiles')) {
          const tgStore = db.createObjectStore('telegramFiles', { keyPath: 'fileId' });
          tgStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          tgStore.createIndex('contentType', 'contentType', { unique: false });
        }

        // 4. Assistance Calls Store (keyPath: 'id')
        if (!db.objectStoreNames.contains('assistanceCalls')) {
          const callsStore = db.createObjectStore('assistanceCalls', { keyPath: 'id' });
          callsStore.createIndex('tableNumber', 'tableNumber', { unique: false });
          callsStore.createIndex('status', 'status', { unique: false });
          callsStore.createIndex('createdAt', 'createdAt', { unique: false });
          callsStore.createIndex('queuedAt', 'queuedAt', { unique: false });
        }

        // 5. Reports Store (keyPath: 'id')
        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('tableNumber', 'tableNumber', { unique: false });
          reportsStore.createIndex('status', 'status', { unique: false });
          reportsStore.createIndex('severity', 'severity', { unique: false });
          reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 6. Sync Queue Store (keyPath: 'id', autoIncrement: true)
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
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
   MENU HELPERS (Requirement 2: saveMenuToIdb & getMenuFromIdb)
   ========================================================================== */

/**
 * Save menu items or categories to IndexedDB with quota resilience and storage fallback
 * @param {Array|Object} items - Array of dish items or full menu structure
 * @returns {Promise<boolean>}
 */
export async function saveMenuToIdb(items) {
  if (!items) return false;

  // Mirror to existing cacheMenu for full backwards compatibility
  try {
    await cacheMenu(items);
  } catch (err) {
    console.warn('[IndexedDB] cacheMenu mirror warning in saveMenuToIdb:', err);
  }

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('menu')) {
      try {
        const tx = db.transaction('menu', 'readwrite');
        await tx.store.clear();

        // 1. Store master entry
        await tx.store.put({
          id: '__menu_all__',
          data: items,
          updatedAt: Date.now()
        });

        // 2. If items is an array, also store individual items with unique id
        if (Array.isArray(items)) {
          for (const item of items) {
            if (!item) continue;
            const itemId =
              item.id !== undefined && item.id !== null
                ? String(item.id)
                : (item._id
                    ? String(item._id)
                    : `item_${Math.random().toString(36).substring(2, 9)}`);
            await tx.store.put({
              ...item,
              id: itemId,
              updatedAt: item.updatedAt || Date.now()
            });

            // If item has nested items (e.g. category with items array)
            if (Array.isArray(item.items)) {
              for (const subItem of item.items) {
                if (!subItem) continue;
                const subId =
                  subItem.id !== undefined && subItem.id !== null
                    ? String(subItem.id)
                    : (subItem._id
                        ? String(subItem._id)
                        : `sub_${Math.random().toString(36).substring(2, 9)}`);
                await tx.store.put({
                  ...subItem,
                  id: subId,
                  category: subItem.category || item.name || item.title,
                  updatedAt: subItem.updatedAt || Date.now()
                });
              }
            }
          }
        } else if (items && typeof items === 'object') {
          const list = items.dishes || items.items || items.categories || items.data;
          if (Array.isArray(list)) {
            for (const item of list) {
              if (!item) continue;
              const itemId =
                item.id !== undefined && item.id !== null
                  ? String(item.id)
                  : (item._id
                      ? String(item._id)
                      : `item_${Math.random().toString(36).substring(2, 9)}`);
              await tx.store.put({
                ...item,
                id: itemId,
                updatedAt: item.updatedAt || Date.now()
              });
            }
          }
        }

        await tx.done;
        return true;
      } catch (txErr) {
        if (isQuotaExceededError(txErr)) {
          console.warn('[IndexedDB] Quota exceeded in saveMenuToIdb. Pruning and retrying master-only write...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            await db.put('menu', {
              id: '__menu_all__',
              data: items,
              updatedAt: Date.now()
            });
            return true;
          } catch (_) {}
        } else {
          console.warn('[IndexedDB] Transaction failed in saveMenuToIdb:', txErr);
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] saveMenuToIdb primary DB failed, falling back:', error);
  }

  // Fallback to memory and localStorage
  memoryStore.menu.set('__menu_all__', items);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        FALLBACK_KEYS.MENU_ITEMS,
        JSON.stringify({ data: items, updatedAt: Date.now() })
      );
    } catch (lsErr) {
      if (isQuotaExceededError(lsErr)) {
        console.warn('[IndexedDB Fallback] localStorage quota reached for menu; stored in memory.');
      }
    }
  }
  return true;
}

/**
 * Retrieve menu items or categories from IndexedDB or storage fallbacks
 * @returns {Promise<Array|Object|null>}
 */
export async function getMenuFromIdb() {
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('menu')) {
      const master = await db.get('menu', '__menu_all__');
      if (master && master.data) {
        return master.data;
      }
      const all = await db.getAll('menu');
      const filtered = all.filter((entry) => entry.id !== '__menu_all__');
      if (filtered.length > 0) return filtered;
    }
  } catch (error) {
    console.warn('[IndexedDB] getMenuFromIdb DB read error, checking fallbacks:', error);
  }

  // Fallback: check menu_cache store
  try {
    const cached = await getCachedMenu();
    if (cached) return cached;
  } catch (_) {}

  // Fallback: localStorage MENU_ITEMS
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(FALLBACK_KEYS.MENU_ITEMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) return parsed.data;
      }
    } catch (_) {}
  }

  // Fallback: in-memory store
  if (memoryStore.menu.has('__menu_all__')) {
    return memoryStore.menu.get('__menu_all__');
  }

  return null;
}

/**
 * Cache menu categories or items into IndexedDB with fallback to localStorage (legacy compatibility)
 * @param {Array|Object} categories - Array of categories / items or menu payload
 * @returns {Promise<boolean>}
 */
export async function cacheMenu(categories) {
  if (!categories) return false;

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('menu_cache')) {
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
 * Retrieve cached menu from IndexedDB or fallback storage (legacy compatibility)
 * @returns {Promise<Array|Object|null>}
 */
export async function getCachedMenu() {
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('menu_cache')) {
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
    if (db) {
      if (db.objectStoreNames.contains('menu_cache')) {
        await db.clear('menu_cache').catch(() => {});
      }
      if (db.objectStoreNames.contains('menu')) {
        await db.clear('menu').catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[IndexedDB] clearMenuCache error:', e);
  }

  memoryStore.menu_cache.clear();
  memoryStore.menu.clear();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(FALLBACK_KEYS.MENU_META);
      localStorage.removeItem(FALLBACK_KEYS.MENU_ITEMS);
    } catch (_) {}
  }
  return true;
}

/* ==========================================================================
   ORDERS HELPERS (Requirement 2: saveOrderToIdb & getActiveOrdersFromIdb)
   ========================================================================== */

/**
 * Check whether an order record is active (in-progress, pending, cooking, etc.)
 * @param {Object} order
 * @returns {boolean}
 */
export function isOrderActive(order) {
  if (!order || order.completed === true) return false;
  const status = String(order.status || order.localStatus || 'pending').toLowerCase();
  return !['completed', 'cancelled', 'canceled', 'rejected', 'archived'].includes(status);
}

/**
 * Persist an order (or array of orders) to the IndexedDB orders store
 * Resilient to quota limits and falls back to memory and localStorage.
 * @param {Object|Array} order - Single order or array of orders
 * @returns {Promise<Object|Array>}
 */
export async function saveOrderToIdb(order) {
  if (!order) return null;

  const ordersToSave = Array.isArray(order) ? order : [order];
  const processedOrders = ordersToSave.map((ord) => {
    const id =
      ord.id !== undefined && ord.id !== null
        ? String(ord.id)
        : (ord._id
            ? String(ord._id)
            : (ord.orderId
                ? String(ord.orderId)
                : (ord.localId
                    ? String(ord.localId)
                    : `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)));
    return {
      ...ord,
      id,
      updatedAt: ord.updatedAt || Date.now(),
      createdAt: ord.createdAt || Date.now()
    };
  });

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('orders')) {
      try {
        const tx = db.transaction('orders', 'readwrite');
        for (const ord of processedOrders) {
          await tx.store.put(ord);
        }
        await tx.done;
      } catch (txErr) {
        if (isQuotaExceededError(txErr)) {
          console.warn('[IndexedDB] Quota exceeded on saveOrderToIdb. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const retryTx = db.transaction('orders', 'readwrite');
            for (const ord of processedOrders) {
              await retryTx.store.put(ord);
            }
            await retryTx.done;
          } catch (retryErr) {
            console.warn('[IndexedDB] saveOrderToIdb retry failed, falling back to storage:', retryErr);
          }
        } else {
          throw txErr;
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] saveOrderToIdb primary DB failed, saving to fallback:', error);
  }

  // Fallback: update memoryStore and localStorage
  for (const ord of processedOrders) {
    memoryStore.orders.set(ord.id, ord);
  }

  const existingFallbackOrders = readFallbackList(FALLBACK_KEYS.ORDERS);
  const fallbackMap = new Map(existingFallbackOrders.map((o) => [String(o.id), o]));
  for (const ord of processedOrders) {
    fallbackMap.set(String(ord.id), ord);
  }
  writeFallbackList(FALLBACK_KEYS.ORDERS, Array.from(fallbackMap.values()));

  return Array.isArray(order) ? processedOrders : processedOrders[0];
}

/**
 * Retrieve all active orders from IndexedDB (including pending_orders and fallback stores)
 * @returns {Promise<Array>}
 */
export async function getActiveOrdersFromIdb() {
  const combinedMap = new Map();

  // 1. Read from primary 'orders' store
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('orders')) {
      const allOrders = await db.getAll('orders');
      for (const ord of allOrders) {
        if (isOrderActive(ord)) {
          const key = String(ord.id || ord._id || ord.localId);
          combinedMap.set(key, ord);
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getActiveOrdersFromIdb DB read error:', error);
  }

  // 2. Read from 'pending_orders' store (offline-queued orders)
  try {
    const pending = await getPendingOrders();
    for (const ord of pending) {
      if (isOrderActive(ord)) {
        const key = String(ord.id || ord._id || ord.localId);
        if (!combinedMap.has(key)) {
          combinedMap.set(key, ord);
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getActiveOrdersFromIdb pending_orders read warning:', error);
  }

  // 3. Include fallback orders from localStorage
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.ORDERS);
  for (const ord of fallbackOrders) {
    if (isOrderActive(ord)) {
      const key = String(ord.id || ord._id || ord.localId);
      if (!combinedMap.has(key)) {
        combinedMap.set(key, ord);
      }
    }
  }

  // 4. Include memoryStore orders
  for (const [key, ord] of memoryStore.orders.entries()) {
    if (isOrderActive(ord) && !combinedMap.has(String(key))) {
      combinedMap.set(String(key), ord);
    }
  }

  const result = Array.from(combinedMap.values());
  // Sort newest first
  return result.sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
}

/**
 * Enqueue an order placed while offline (legacy pending_orders compatibility)
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
        const savedRecord = { ...record, localId, id: String(localId) };
        // Mirror to orders store as well
        if (db.objectStoreNames.contains('orders')) {
          await db.put('orders', savedRecord).catch(() => {});
        }
        return savedRecord;
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueOrder. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('pending_orders', record);
            return { ...record, localId, id: String(localId) };
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
  const fallbackRecord = { ...record, localId: fallbackId, id: fallbackId, isFallbackStorage: true };
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
    if (db && db.objectStoreNames.contains('pending_orders')) {
      const orders = await db.getAll('pending_orders');
      for (const ord of orders) {
        combined.push(ord);
        if (ord.localId) seenIds.add(String(ord.localId));
        if (ord.id) seenIds.add(String(ord.id));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingOrders DB read failed:', error);
  }

  // Include fallback items that are not yet in IDB
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  for (const fallbackOrd of fallbackOrders) {
    const idKey = String(fallbackOrd.localId || fallbackOrd.id);
    if (fallbackOrd && idKey && !seenIds.has(idKey)) {
      combined.push(fallbackOrd);
      seenIds.add(idKey);
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
  if (!order || (order.localId === undefined && order.id === undefined)) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('pending_orders')) {
      if (typeof order.localId === 'number') {
        await db.put('pending_orders', order);
        updatedInIDB = true;
      }
    }
    if (db && db.objectStoreNames.contains('orders') && order.id) {
      await db.put('orders', order).catch(() => {});
    }
  } catch (error) {
    console.warn('[IndexedDB] updatePendingOrder error:', error);
  }

  // Update in fallback store as well
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  const matchIndex = fallbackOrders.findIndex(
    (item) => String(item.localId || item.id) === String(order.localId || order.id)
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
    if (db && db.objectStoreNames.contains('pending_orders')) {
      const key = typeof localId === 'number' ? localId : Number(localId);
      if (!Number.isNaN(key)) {
        await db.delete('pending_orders', key);
        removed = true;
      }
      await db.delete('pending_orders', localId).catch(() => {});
    }
  } catch (error) {
    console.warn(`[IndexedDB] removePendingOrder error (localId: ${localId}):`, error);
  }

  // Remove from fallback store
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS);
  const filtered = fallbackOrders.filter(
    (item) => String(item.localId) !== String(localId) && String(item.id) !== String(localId)
  );
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
    if (db && db.objectStoreNames.contains('pending_orders')) {
      await db.clear('pending_orders');
    }
  } catch (error) {
    console.warn('[IndexedDB] clearPendingOrders error:', error);
  }

  writeFallbackList(FALLBACK_KEYS.PENDING_ORDERS, []);
  return true;
}

/* ==========================================================================
   TELEGRAM FILES HELPERS (Requirement 2: cacheTelegramFile & getCachedTelegramFile)
   ========================================================================== */

/**
 * Cache a Telegram file (photo, video, voice note, document) by its fileId in IndexedDB
 * Supports Blob, File, ArrayBuffer, base64 data URL, or remote URL string.
 * Resilient to quota limits and gracefully falls back to memory and localStorage.
 * @param {string} fileId - Telegram file identifier
 * @param {Blob|string|ArrayBuffer} blobOrUrl - Binary Blob or URL string
 * @param {Object} [metadata] - Optional additional details (contentType, size, filename)
 * @returns {Promise<boolean>}
 */
export async function cacheTelegramFile(fileId, blobOrUrl, metadata = {}) {
  if (!fileId || !blobOrUrl) return false;

  const idStr = String(fileId);

  const contentType =
    (blobOrUrl instanceof Blob ? blobOrUrl.type : null) ||
    metadata.contentType ||
    (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('data:')
      ? blobOrUrl.substring(5, blobOrUrl.indexOf(';'))
      : null);

  const size =
    (blobOrUrl instanceof Blob ? blobOrUrl.size : null) ||
    metadata.size ||
    (typeof blobOrUrl === 'string' ? blobOrUrl.length : null);

  const record = {
    fileId: idStr,
    data: blobOrUrl,
    contentType,
    size,
    cachedAt: Date.now(),
    ...metadata
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('telegramFiles')) {
      try {
        await db.put('telegramFiles', record);
        return true;
      } catch (putErr) {
        if (isQuotaExceededError(putErr)) {
          console.warn('[IndexedDB] Quota exceeded on cacheTelegramFile. Pruning older telegram files and retrying...');
          await pruneTelegramFilesCache(db, 5);
          try {
            await db.put('telegramFiles', record);
            return true;
          } catch (retryErr) {
            console.warn('[IndexedDB] Retry failed, falling back to memory/storage for telegram file:', retryErr);
          }
        } else {
          throw putErr;
        }
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] cacheTelegramFile primary DB failed, falling back:', error);
  }

  // In-memory fallback
  memoryStore.telegramFiles.set(idStr, record);

  // localStorage fallback: only strings or small data URLs to avoid filling quota
  if (typeof localStorage !== 'undefined') {
    try {
      if (typeof blobOrUrl === 'string' && blobOrUrl.length < 100000) {
        const existing = readFallbackList(FALLBACK_KEYS.TELEGRAM_FILES);
        const filtered = existing.filter((f) => f && f.fileId !== idStr);
        filtered.push({ fileId: idStr, data: blobOrUrl, cachedAt: Date.now() });
        writeFallbackList(FALLBACK_KEYS.TELEGRAM_FILES, filtered);
      }
    } catch (_) {}
  }

  return true;
}

/**
 * Retrieve cached Telegram file by fileId
 * @param {string} fileId
 * @returns {Promise<Blob|string|Object|null>} Returns the cached Blob or URL string, or null
 */
export async function getCachedTelegramFile(fileId) {
  if (!fileId) return null;
  const idStr = String(fileId);

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('telegramFiles')) {
      const record = await db.get('telegramFiles', idStr);
      if (record) {
        return record.data !== undefined ? record.data : record;
      }
    }
  } catch (error) {
    console.warn(`[IndexedDB] getCachedTelegramFile error (fileId: ${fileId}):`, error);
  }

  // Memory store fallback
  if (memoryStore.telegramFiles.has(idStr)) {
    const memRecord = memoryStore.telegramFiles.get(idStr);
    return memRecord.data !== undefined ? memRecord.data : memRecord;
  }

  // localStorage fallback
  const fallbackList = readFallbackList(FALLBACK_KEYS.TELEGRAM_FILES);
  const found = fallbackList.find((f) => f && f.fileId === idStr);
  if (found) {
    return found.data !== undefined ? found.data : found;
  }

  return null;
}

/**
 * Retrieve cached Telegram file full record with metadata
 * @param {string} fileId
 * @returns {Promise<Object|null>}
 */
export async function getCachedTelegramFileRecord(fileId) {
  if (!fileId) return null;
  const idStr = String(fileId);

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('telegramFiles')) {
      const record = await db.get('telegramFiles', idStr);
      if (record) return record;
    }
  } catch (_) {}

  if (memoryStore.telegramFiles.has(idStr)) {
    return memoryStore.telegramFiles.get(idStr);
  }

  const fallbackList = readFallbackList(FALLBACK_KEYS.TELEGRAM_FILES);
  const found = fallbackList.find((f) => f && f.fileId === idStr);
  return found || null;
}

/* ==========================================================================
   ASSISTANCE CALLS HELPERS
   ========================================================================== */

/**
 * Save an assistance call to IndexedDB
 * @param {Object} call
 * @returns {Promise<Object>}
 */
export async function saveAssistanceCallToIdb(call) {
  if (!call) return null;
  const id =
    call.id !== undefined && call.id !== null
      ? String(call.id)
      : (call._id
          ? String(call._id)
          : (call.callId
              ? String(call.callId)
              : (call.localId
                  ? String(call.localId)
                  : `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)));

  const record = {
    ...call,
    id,
    tableNumber: Number(call.tableNumber) || call.tableNumber || 1,
    status: call.status || 'pending',
    createdAt: call.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('assistanceCalls')) {
      try {
        await db.put('assistanceCalls', record);
        return record;
      } catch (err) {
        if (isQuotaExceededError(err)) {
          await pruneCacheOnQuotaExceeded(db);
          await db.put('assistanceCalls', record).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] saveAssistanceCallToIdb DB error:', err);
  }

  // Fallback
  memoryStore.assistanceCalls.set(id, record);
  const existing = readFallbackList(FALLBACK_KEYS.ASSISTANCE_CALLS);
  const updated = existing.filter((c) => c && c.id !== id);
  updated.push(record);
  writeFallbackList(FALLBACK_KEYS.ASSISTANCE_CALLS, updated);

  return record;
}

/**
 * Retrieve all assistance calls from IndexedDB & fallback
 * @param {Object} [filter]
 * @returns {Promise<Array>}
 */
export async function getAssistanceCallsFromIdb(filter = {}) {
  const combinedMap = new Map();

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('assistanceCalls')) {
      const all = await db.getAll('assistanceCalls');
      for (const item of all) {
        combinedMap.set(String(item.id), item);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] getAssistanceCallsFromIdb DB error:', err);
  }

  // Fallback
  const fallbackList = readFallbackList(FALLBACK_KEYS.ASSISTANCE_CALLS);
  for (const item of fallbackList) {
    if (item && item.id && !combinedMap.has(String(item.id))) {
      combinedMap.set(String(item.id), item);
    }
  }

  for (const [id, item] of memoryStore.assistanceCalls.entries()) {
    if (!combinedMap.has(String(id))) {
      combinedMap.set(String(id), item);
    }
  }

  let result = Array.from(combinedMap.values());
  if (filter.status) {
    result = result.filter((c) => c.status === filter.status);
  }
  if (filter.tableNumber !== undefined && filter.tableNumber !== null) {
    result = result.filter((c) => Number(c.tableNumber) === Number(filter.tableNumber));
  }

  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Enqueue a waiter assistance request placed while offline (legacy compatibility)
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
    if (db && db.objectStoreNames.contains('pending_waiter_calls')) {
      try {
        const localId = await db.add('pending_waiter_calls', record);
        const savedRecord = { ...record, localId, id: String(localId) };
        if (db.objectStoreNames.contains('assistanceCalls')) {
          await db.put('assistanceCalls', savedRecord).catch(() => {});
        }
        return savedRecord;
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueWaiterCall. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('pending_waiter_calls', record);
            return { ...record, localId, id: String(localId) };
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
  const fallbackRecord = { ...record, localId: fallbackId, id: fallbackId, isFallbackStorage: true };
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
    if (db && db.objectStoreNames.contains('pending_waiter_calls')) {
      const calls = await db.getAll('pending_waiter_calls');
      for (const call of calls) {
        combined.push(call);
        if (call.localId) seenIds.add(String(call.localId));
        if (call.id) seenIds.add(String(call.id));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingWaiterCalls DB read failed:', error);
  }

  // Include fallback items
  const fallbackCalls = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  for (const fallbackCall of fallbackCalls) {
    const idKey = String(fallbackCall.localId || fallbackCall.id);
    if (fallbackCall && idKey && !seenIds.has(idKey)) {
      combined.push(fallbackCall);
      seenIds.add(idKey);
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
  if (!call || (call.localId === undefined && call.id === undefined)) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('pending_waiter_calls')) {
      if (typeof call.localId === 'number') {
        await db.put('pending_waiter_calls', call);
        updatedInIDB = true;
      }
    }
    if (db && db.objectStoreNames.contains('assistanceCalls') && call.id) {
      await db.put('assistanceCalls', call).catch(() => {});
    }
  } catch (error) {
    console.warn('[IndexedDB] updatePendingWaiterCall error:', error);
  }

  const fallbackCalls = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS);
  const matchIndex = fallbackCalls.findIndex(
    (item) => String(item.localId || item.id) === String(call.localId || call.id)
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
    if (db && db.objectStoreNames.contains('pending_waiter_calls')) {
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
  const filtered = fallbackCalls.filter(
    (item) => String(item.localId) !== String(localId) && String(item.id) !== String(localId)
  );
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
    if (db && db.objectStoreNames.contains('pending_waiter_calls')) {
      await db.clear('pending_waiter_calls');
    }
  } catch (error) {
    console.warn('[IndexedDB] clearPendingWaiterCalls error:', error);
  }

  writeFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS, []);
  return true;
}

/* ==========================================================================
   REPORTS & TABLE NOTES HELPERS
   ========================================================================== */

/**
 * Save customer or staff report to IndexedDB
 * @param {Object} report
 * @returns {Promise<Object>}
 */
export async function saveReportToIdb(report) {
  if (!report) return null;
  const id =
    report.id !== undefined && report.id !== null
      ? String(report.id)
      : (report._id
          ? String(report._id)
          : (report.reportId
              ? String(report.reportId)
              : (report.localId
                  ? String(report.localId)
                  : `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)));

  const record = {
    ...report,
    id,
    tableNumber: Number(report.tableNumber) || report.tableNumber || 1,
    status: report.status || 'new',
    severity: report.severity || 'medium',
    createdAt: report.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('reports')) {
      try {
        await db.put('reports', record);
        return record;
      } catch (err) {
        if (isQuotaExceededError(err)) {
          await pruneCacheOnQuotaExceeded(db);
          await db.put('reports', record).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] saveReportToIdb DB error:', err);
  }

  // Fallback
  memoryStore.reports.set(id, record);
  const existing = readFallbackList(FALLBACK_KEYS.REPORTS);
  const updated = existing.filter((r) => r && r.id !== id);
  updated.push(record);
  writeFallbackList(FALLBACK_KEYS.REPORTS, updated);

  return record;
}

/**
 * Retrieve reports from IndexedDB & fallback
 * @param {Object} [filter]
 * @returns {Promise<Array>}
 */
export async function getReportsFromIdb(filter = {}) {
  const combinedMap = new Map();

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('reports')) {
      const all = await db.getAll('reports');
      for (const item of all) {
        combinedMap.set(String(item.id), item);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] getReportsFromIdb DB error:', err);
  }

  const fallbackList = readFallbackList(FALLBACK_KEYS.REPORTS);
  for (const item of fallbackList) {
    if (item && item.id && !combinedMap.has(String(item.id))) {
      combinedMap.set(String(item.id), item);
    }
  }

  for (const [id, item] of memoryStore.reports.entries()) {
    if (!combinedMap.has(String(id))) {
      combinedMap.set(String(id), item);
    }
  }

  let result = Array.from(combinedMap.values());
  if (filter.status) {
    result = result.filter((r) => r.status === filter.status);
  }
  if (filter.tableNumber !== undefined && filter.tableNumber !== null) {
    result = result.filter((r) => Number(r.tableNumber) === Number(filter.tableNumber));
  }
  if (filter.severity) {
    result = result.filter((r) => r.severity === filter.severity);
  }

  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Enqueue or save a table note / customer report while offline (legacy compatibility)
 * @param {Object} notePayload
 * @returns {Promise<Object>}
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
    ...notePayload,
    tableNumber: tableNum
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      try {
        const localId = await db.add('table_notes', record);
        const saved = { ...record, localId, id: String(localId) };
        if (db.objectStoreNames.contains('reports')) {
          await db.put('reports', saved).catch(() => {});
        }
        return saved;
      } catch (addErr) {
        if (isQuotaExceededError(addErr)) {
          console.warn('[IndexedDB] Quota exceeded on enqueueTableNote. Pruning cache and retrying...');
          await pruneCacheOnQuotaExceeded(db);
          try {
            const localId = await db.add('table_notes', record);
            return { ...record, localId, id: String(localId) };
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
  const fallbackRecord = { ...record, localId: fallbackId, id: fallbackId, isFallbackStorage: true };
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
        if (note.id) seenIds.add(String(note.id));
      }
    }
  } catch (error) {
    console.warn('[IndexedDB] getTableNotes DB read error:', error);
  }

  // Include fallback items
  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  for (const fallbackNote of fallbackNotes) {
    const idKey = String(fallbackNote.localId || fallbackNote.id);
    if (fallbackNote && idKey && !seenIds.has(idKey)) {
      combined.push(fallbackNote);
      seenIds.add(idKey);
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
 * Update an existing table note
 * @param {Object} note
 * @returns {Promise<boolean>}
 */
export async function updateTableNote(note) {
  if (!note || (note.localId === undefined && note.id === undefined)) return false;

  let updatedInIDB = false;
  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('table_notes')) {
      if (typeof note.localId === 'number') {
        await db.put('table_notes', note);
        updatedInIDB = true;
      }
    }
    if (db && db.objectStoreNames.contains('reports') && note.id) {
      await db.put('reports', note).catch(() => {});
    }
  } catch (error) {
    console.warn('[IndexedDB] updateTableNote error:', error);
  }

  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES);
  const matchIndex = fallbackNotes.findIndex(
    (item) => String(item.localId || item.id) === String(note.localId || note.id)
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
  const filtered = fallbackNotes.filter(
    (item) => String(item.localId) !== String(localId) && String(item.id) !== String(localId)
  );
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
   SYNC QUEUE HELPERS
   ========================================================================== */

/**
 * Add an operation or payload to syncQueue
 * @param {Object} syncItem - { type, payload, status, createdAt, attempts, ... }
 * @returns {Promise<Object>}
 */
export async function addToSyncQueue(syncItem) {
  if (!syncItem) return null;
  const record = {
    ...syncItem,
    status: syncItem.status || 'pending',
    attempts: syncItem.attempts || 0,
    createdAt: syncItem.createdAt || Date.now()
  };

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('syncQueue')) {
      try {
        const id = await db.add('syncQueue', record);
        return { ...record, id };
      } catch (err) {
        if (isQuotaExceededError(err)) {
          await pruneCacheOnQuotaExceeded(db);
          try {
            const id = await db.add('syncQueue', record);
            return { ...record, id };
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] addToSyncQueue DB error:', err);
  }

  // Fallback
  const fallbackId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fallbackRecord = { ...record, id: fallbackId, isFallback: true };
  const existing = readFallbackList(FALLBACK_KEYS.SYNC_QUEUE);
  existing.push(fallbackRecord);
  writeFallbackList(FALLBACK_KEYS.SYNC_QUEUE, existing);
  memoryStore.syncQueue.push(fallbackRecord);

  return fallbackRecord;
}

/**
 * Retrieve items in syncQueue
 * @param {string} [status] - Optional status filter, e.g. 'pending'
 * @returns {Promise<Array>}
 */
export async function getSyncQueueFromIdb(status = null) {
  const combinedMap = new Map();

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('syncQueue')) {
      const all = await db.getAll('syncQueue');
      for (const item of all) {
        combinedMap.set(String(item.id), item);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] getSyncQueueFromIdb DB error:', err);
  }

  const fallbackList = readFallbackList(FALLBACK_KEYS.SYNC_QUEUE);
  for (const item of fallbackList) {
    if (item && item.id && !combinedMap.has(String(item.id))) {
      combinedMap.set(String(item.id), item);
    }
  }

  for (const item of memoryStore.syncQueue) {
    if (item && item.id && !combinedMap.has(String(item.id))) {
      combinedMap.set(String(item.id), item);
    }
  }

  let result = Array.from(combinedMap.values());
  if (status) {
    result = result.filter((item) => item.status === status);
  }

  return result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

/**
 * Remove an item from syncQueue by id
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export async function removeFromSyncQueue(id) {
  if (id === undefined || id === null) return false;
  let removed = false;

  try {
    const db = await initDB();
    if (db && db.objectStoreNames.contains('syncQueue')) {
      const key = typeof id === 'number' ? id : Number(id);
      if (!Number.isNaN(key)) {
        await db.delete('syncQueue', key);
        removed = true;
      }
      await db.delete('syncQueue', id).catch(() => {});
    }
  } catch (err) {
    console.warn('[IndexedDB] removeFromSyncQueue DB error:', err);
  }

  const existing = readFallbackList(FALLBACK_KEYS.SYNC_QUEUE);
  const filtered = existing.filter((item) => String(item.id) !== String(id));
  if (filtered.length !== existing.length) {
    writeFallbackList(FALLBACK_KEYS.SYNC_QUEUE, filtered);
    removed = true;
  }

  memoryStore.syncQueue = memoryStore.syncQueue.filter((item) => String(item.id) !== String(id));

  return removed;
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
 * Get total counts of pending offline items (orders, waiter calls, notes, and syncQueue)
 * @returns {Promise<{ ordersCount: number, waiterCallsCount: number, tableNotesCount: number, syncQueueCount: number, total: number }>}
 */
export async function getPendingCounts() {
  let ordersCount = 0;
  let waiterCallsCount = 0;
  let tableNotesCount = 0;
  let syncQueueCount = 0;

  try {
    const db = await initDB();
    if (db) {
      const [ordCount, callCount, noteCount, syncCount] = await Promise.all([
        db.count('pending_orders').catch(() => 0),
        db.count('pending_waiter_calls').catch(() => 0),
        db.objectStoreNames.contains('table_notes')
          ? db.count('table_notes').catch(() => 0)
          : 0,
        db.objectStoreNames.contains('syncQueue')
          ? db.count('syncQueue').catch(() => 0)
          : 0
      ]);
      ordersCount = ordCount;
      waiterCallsCount = callCount;
      tableNotesCount = noteCount;
      syncQueueCount = syncCount;
    }
  } catch (error) {
    console.warn('[IndexedDB] getPendingCounts DB count error:', error);
  }

  // Include fallback counts
  const fallbackOrders = readFallbackList(FALLBACK_KEYS.PENDING_ORDERS).length;
  const fallbackWaiters = readFallbackList(FALLBACK_KEYS.PENDING_WAITER_CALLS).length;
  const fallbackNotes = readFallbackList(FALLBACK_KEYS.TABLE_NOTES).length;
  const fallbackSync = readFallbackList(FALLBACK_KEYS.SYNC_QUEUE).length;

  const totalOrders = ordersCount + fallbackOrders;
  const totalWaiters = waiterCallsCount + fallbackWaiters;
  const totalNotes = tableNotesCount + fallbackNotes;
  const totalSync = syncQueueCount + fallbackSync;

  return {
    ordersCount: totalOrders,
    waiterCallsCount: totalWaiters,
    tableNotesCount: totalNotes,
    syncQueueCount: totalSync,
    total: totalOrders + totalWaiters + totalNotes + totalSync
  };
}

/**
 * Clear all offline data across all stores (menu, orders, telegramFiles, assistanceCalls, reports, syncQueue, settings)
 * @returns {Promise<boolean>}
 */
export async function clearAllOfflineData() {
  try {
    const db = await initDB();
    if (db) {
      const storeNames = [
        'menu_cache',
        'pending_orders',
        'pending_waiter_calls',
        'app_settings',
        'table_notes',
        'menu',
        'orders',
        'telegramFiles',
        'assistanceCalls',
        'reports',
        'syncQueue'
      ].filter((s) => db.objectStoreNames.contains(s));

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
  memoryStore.menu.clear();
  memoryStore.menu_cache.clear();
  memoryStore.orders.clear();
  memoryStore.pending_orders = [];
  memoryStore.pending_waiter_calls = [];
  memoryStore.table_notes = [];
  memoryStore.app_settings.clear();
  memoryStore.telegramFiles.clear();
  memoryStore.assistanceCalls.clear();
  memoryStore.reports.clear();
  memoryStore.syncQueue = [];

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
  // Menu helpers
  saveMenuToIdb,
  getMenuFromIdb,
  cacheMenu,
  getCachedMenu,
  clearMenuCache,
  // Orders helpers
  saveOrderToIdb,
  getActiveOrdersFromIdb,
  isOrderActive,
  enqueueOrder,
  getPendingOrders,
  updatePendingOrder,
  removePendingOrder,
  clearPendingOrders,
  // Telegram Files helpers
  cacheTelegramFile,
  getCachedTelegramFile,
  getCachedTelegramFileRecord,
  pruneTelegramFilesCache,
  // Assistance Calls helpers
  saveAssistanceCallToIdb,
  getAssistanceCallsFromIdb,
  enqueueWaiterCall,
  getPendingWaiterCalls,
  updatePendingWaiterCall,
  removePendingWaiterCall,
  clearPendingWaiterCalls,
  // Reports & Table Notes helpers
  saveReportToIdb,
  getReportsFromIdb,
  enqueueTableNote,
  saveTableNote,
  getTableNotes,
  getTableNotesByTable,
  getPendingTableNotes,
  updateTableNote,
  removeTableNote,
  clearTableNotes,
  // Sync Queue helpers
  addToSyncQueue,
  getSyncQueueFromIdb,
  removeFromSyncQueue,
  // App Settings & Preferences
  setAppSetting,
  getAppSetting,
  getAllAppSettings,
  removeAppSetting,
  // Stats & Utilities
  getPendingCounts,
  clearAllOfflineData,
  isQuotaExceededError,
  getStorageEstimate,
  isStorageQuotaConstrained
};
