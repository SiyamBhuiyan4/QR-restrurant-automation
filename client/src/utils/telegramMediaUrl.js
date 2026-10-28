/**
 * Telegram CDN Media Resolution & Transparent Offline Blob Caching Utility
 * 
 * Supports resolving:
 *  - Telegram Bot API fileId (e.g. 'BAACAgIAAxkBAAIC...')
 *  - Telegram relative file paths (e.g. 'photos/file_0.jpg', 'videos/file_1.mp4')
 *  - Telegram URLs ('https://api.telegram.org/...', 'https://t.me/c/...', 'telegram:<file_id>')
 *  - Convex Telegram proxy URLs ('/telegram-media/<file_id>.mp4')
 *  - Dish objects containing fileId, image_url, making_video_url, etc.
 * 
 * Features:
 *  - Multi-tier caching: In-Memory Map -> SessionStorage (TTL) -> Telegram Bot API getFile
 *  - In-flight request deduplication for concurrent getFile and blob fetches
 *  - Transparent Blob caching in CacheStorage & IndexedDB for offline viewing of
 *    food photos & 360° videos
 *  - Automatic offline fallback using locally cached Blobs & Object URLs
 */

import { getTelegramConfig, TELEGRAM_BOT_TOKEN } from '../services/telegramClient.js';

/* ==========================================================================
   CONSTANTS & CONFIGURATION
   ========================================================================== */

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const CACHE_STORAGE_NAME = 'smartdine-telegram-media-v1';
const IDB_NAME = 'smartdine_telegram_media_db';
const IDB_VERSION = 1;
const IDB_STORE = 'media_blobs';
const SESSION_CACHE_PREFIX = 'smartdine_tg_file_';

// Telegram Bot API file links expire in ~60 minutes. We refresh cached paths after 50 minutes.
const PATH_TTL_MS = 50 * 60 * 1000;

// Telegram file_id pattern: 10 to 200 base64-like alphanumeric chars with _ and -
const TELEGRAM_FILE_ID_REGEX = /^[A-Za-z0-9_-]{10,200}$/;

/* ==========================================================================
   IN-MEMORY CACHES & REGISTRIES
   ========================================================================== */

// Maps fileId -> { filePath, cdnUrl, timestamp }
const memoryFilePathCache = new Map();

// In-flight getFile Promises to deduplicate simultaneous requests
const inflightGetFile = new Map();

// In-flight Blob fetch Promises to deduplicate simultaneous downloads
const inflightBlobFetches = new Map();

// Registry of created Object URLs (maps cacheKey/url -> blobUrl) to prevent duplicate object URLs & memory leaks
const objectUrlRegistry = new Map();

/* ==========================================================================
   SESSION STORAGE CACHE (TTL SAFE)
   ========================================================================== */

function getSessionItem(key) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.timestamp) return null;
    if (Date.now() - entry.timestamp > PATH_TTL_MS) {
      sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      return null;
    }
    return entry;
  } catch (e) {
    return null;
  }
}

function setSessionItem(key, data) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const entry = {
      ...data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Session storage full or disabled in private browsing; ignore silently
  }
}

function removeSessionItem(key) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
  } catch (e) {}
}

/* ==========================================================================
   INDEXEDDB BLOB STORAGE (STANDALONE & FAILSAFE)
   ========================================================================== */

let idbPromise = null;

function openMediaDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const store = db.createObjectStore(IDB_STORE, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('mediaType', 'mediaType', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (err) => {
        console.warn('[TelegramMedia] IndexedDB open error:', err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[TelegramMedia] IndexedDB upgrade blocked by another connection');
      };
    } catch (e) {
      console.warn('[TelegramMedia] IndexedDB init failure:', e);
      resolve(null);
    }
  });

  return idbPromise;
}

/**
 * Retrieve a cached Blob from IndexedDB
 * @param {string} key 
 * @returns {Promise<Blob|null>}
 */
export async function getBlobFromIndexedDB(key) {
  if (!key) return null;
  const db = await openMediaDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.blob instanceof Blob) {
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Store a Blob in IndexedDB
 * @param {string} key 
 * @param {Blob} blob 
 * @param {string} [mediaType] 
 * @returns {Promise<boolean>}
 */
export async function putBlobToIndexedDB(key, blob, mediaType = 'unknown') {
  if (!key || !(blob instanceof Blob)) return false;
  const db = await openMediaDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const item = {
        key,
        blob,
        size: blob.size,
        mimeType: blob.type || 'application/octet-stream',
        mediaType,
        timestamp: Date.now()
      };
      const req = store.put(item);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);

      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Delete a Blob from IndexedDB
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
export async function deleteBlobFromIndexedDB(key) {
  if (!key) return false;
  const db = await openMediaDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/* ==========================================================================
   CACHESTORAGE (BROWSER CACHE API) HELPERS
   ========================================================================== */

/**
 * Check if the browser CacheStorage API is available
 */
function isCacheStorageAvailable() {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Retrieve a cached Blob from CacheStorage
 * @param {string} url 
 * @returns {Promise<Blob|null>}
 */
export async function getBlobFromCacheStorage(url) {
  if (!isCacheStorageAvailable() || !url) return null;
  try {
    const cache = await caches.open(CACHE_STORAGE_NAME);
    const response = await cache.match(url);
    if (response && response.ok) {
      return await response.blob();
    }
  } catch (err) {
    // Cache access error; ignore and fallback
  }
  return null;
}

/**
 * Store a Blob/Response in CacheStorage
 * @param {string} url 
 * @param {Blob|Response} blobOrResponse 
 * @returns {Promise<boolean>}
 */
export async function putBlobToCacheStorage(url, blobOrResponse) {
  if (!isCacheStorageAvailable() || !url || !blobOrResponse) return false;
  try {
    const cache = await caches.open(CACHE_STORAGE_NAME);
    let response;
    if (blobOrResponse instanceof Response) {
      response = blobOrResponse.clone();
    } else if (blobOrResponse instanceof Blob) {
      response = new Response(blobOrResponse, {
        headers: {
          'Content-Type': blobOrResponse.type || 'application/octet-stream',
          'Content-Length': String(blobOrResponse.size),
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } else {
      return false;
    }
    await cache.put(url, response);
    return true;
  } catch (err) {
    return false;
  }
}

/* ==========================================================================
   UNIFIED BLOB CACHE (CACHE STORAGE + INDEXEDDB)
   ========================================================================== */

/**
 * Retrieve a media Blob from any active local cache (CacheStorage > IndexedDB)
 * @param {string} keyOrUrl 
 * @returns {Promise<Blob|null>}
 */
export async function getCachedMediaBlob(keyOrUrl) {
  if (!keyOrUrl) return null;

  // 1. Try CacheStorage
  try {
    const cacheStorageBlob = await getBlobFromCacheStorage(keyOrUrl);
    if (cacheStorageBlob) return cacheStorageBlob;
  } catch (e) {}

  // 2. Try IndexedDB
  try {
    const idbBlob = await getBlobFromIndexedDB(keyOrUrl);
    if (idbBlob) return idbBlob;
  } catch (e) {}

  return null;
}

/**
 * Store a media Blob across both CacheStorage and IndexedDB for permanent offline access
 * @param {string} keyOrUrl 
 * @param {Blob} blob 
 * @param {string} [mediaType] 
 * @returns {Promise<boolean>}
 */
export async function cacheMediaBlob(keyOrUrl, blob, mediaType = 'unknown') {
  if (!keyOrUrl || !(blob instanceof Blob)) return false;

  const results = await Promise.allSettled([
    putBlobToCacheStorage(keyOrUrl, blob),
    putBlobToIndexedDB(keyOrUrl, blob, mediaType)
  ]);

  return results.some((r) => r.status === 'fulfilled' && r.value === true);
}

/**
 * Get or register a reusable Object URL for a given cache key and Blob
 * @param {string} key 
 * @param {Blob} blob 
 * @returns {string}
 */
export function getOrCreateObjectURL(key, blob) {
  if (!key || !(blob instanceof Blob)) return '';

  if (objectUrlRegistry.has(key)) {
    return objectUrlRegistry.get(key);
  }

  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objUrl = URL.createObjectURL(blob);
    objectUrlRegistry.set(key, objUrl);
    return objUrl;
  }

  return '';
}

/**
 * Revoke an Object URL to release memory and remove from registry
 * @param {string} urlOrKey 
 */
export function revokeMediaBlobUrl(urlOrKey) {
  if (!urlOrKey) return;

  // If passed an object URL directly
  for (const [key, objUrl] of objectUrlRegistry.entries()) {
    if (objUrl === urlOrKey || key === urlOrKey) {
      try {
        URL.revokeObjectURL(objUrl);
      } catch (e) {}
      objectUrlRegistry.delete(key);
    }
  }
}

/* ==========================================================================
   TELEGRAM DETECTION & EXTRACTION HELPERS
   ========================================================================== */

/**
 * Determine if a string, URL, or item represents Telegram CDN media.
 * Supports file_id tokens, relative file_paths, api.telegram.org URLs, and Telegram proxy routes.
 * 
 * @param {any} item 
 * @returns {boolean}
 */
export function isTelegramMedia(item) {
  if (!item) return false;

  // 1. Direct object inspection
  if (typeof item === 'object') {
    if (item.fileId || item.file_id) return true;
    const candidate = item.cdnUrl || item.url || item.src || item.image_url || item.making_video_url || item.video_url;
    if (candidate && candidate !== item) {
      return isTelegramMedia(candidate);
    }
    return false;
  }

  if (typeof item !== 'string') return false;

  const str = item.trim();
  if (!str) return false;

  // 2. Custom protocols & schemes
  if (str.startsWith('telegram:') || str.startsWith('tg://')) {
    return true;
  }

  // 3. Telegram API and CDN URLs
  if (str.includes('api.telegram.org')) {
    return true;
  }

  // 4. Telegram t.me link patterns
  if (/^https?:\/\/t\.me\//i.test(str)) {
    return true;
  }

  // 5. Convex telegram media proxy route
  if (str.includes('/telegram-media/')) {
    return true;
  }

  // 6. Relative Telegram Bot file paths (e.g. photos/file_0.jpg, videos/file_1.mp4, documents/..., voice/...)
  if (/^(?:photos|videos|documents|voice|animations|video_notes)\/file_[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/i.test(str)) {
    return true;
  }

  // 7. Raw Telegram file_id (alphanumeric string with _ and -, no slashes, length 10-200)
  // Ensure it's not a standard web URL, data URL, or local path
  if (!str.includes('/') && !str.includes(':') && !str.includes('.') && TELEGRAM_FILE_ID_REGEX.test(str)) {
    return true;
  }

  return false;
}

/**
 * Normalize and extract Telegram media attributes from an input item
 * 
 * @param {any} item 
 * @returns {{
 *   raw: any,
 *   type: 'file_id' | 'file_path' | 'cdn_url' | 'proxy_url' | 'other_url' | 'blob' | 'unknown',
 *   fileId: string|null,
 *   filePath: string|null,
 *   directUrl: string|null,
 *   blob: Blob|null
 * }}
 */
export function parseMediaItem(item) {
  if (!item) {
    return { raw: item, type: 'unknown', fileId: null, filePath: null, directUrl: null, blob: null };
  }

  // Blob or File object
  if (typeof Blob !== 'undefined' && item instanceof Blob) {
    return { raw: item, type: 'blob', fileId: null, filePath: null, directUrl: null, blob: item };
  }

  let str = '';
  if (typeof item === 'object') {
    if (item.fileId || item.file_id) {
      const fileId = String(item.fileId || item.file_id).trim();
      return { raw: item, type: 'file_id', fileId, filePath: null, directUrl: item.cdnUrl || null, blob: null };
    }
    str = (item.cdnUrl || item.making_video_url || item.image_url || item.video_url || item.url || item.src || '').trim();
  } else if (typeof item === 'string') {
    str = item.trim();
  }

  if (!str) {
    return { raw: item, type: 'unknown', fileId: null, filePath: null, directUrl: null, blob: null };
  }

  // Data or Blob URLs
  if (str.startsWith('data:') || str.startsWith('blob:')) {
    return { raw: item, type: 'other_url', fileId: null, filePath: null, directUrl: str, blob: null };
  }

  // Prefix telegram:<file_id> or tg://<file_id>
  if (str.startsWith('telegram:')) {
    const fileId = str.replace(/^telegram:/, '').trim();
    return { raw: item, type: 'file_id', fileId, filePath: null, directUrl: null, blob: null };
  }
  if (str.startsWith('tg://')) {
    const fileId = str.replace(/^tg:\/\//, '').trim();
    return { raw: item, type: 'file_id', fileId, filePath: null, directUrl: null, blob: null };
  }

  // Convex proxy route: /telegram-media/<file_id>.<ext>
  const proxyMatch = str.match(/\/telegram-media\/([A-Za-z0-9_-]+)(?:\.[a-z0-9]+)?/i);
  if (proxyMatch && proxyMatch[1]) {
    return { raw: item, type: 'proxy_url', fileId: proxyMatch[1], filePath: null, directUrl: str, blob: null };
  }

  // Telegram getFile URL: .../bot<token>/getFile?file_id=<file_id>
  if (str.includes('/getFile') && str.includes('file_id=')) {
    try {
      const urlObj = new URL(str, typeof window !== 'undefined' ? window.location.origin : 'https://api.telegram.org');
      const fid = urlObj.searchParams.get('file_id');
      if (fid) {
        return { raw: item, type: 'file_id', fileId: fid, filePath: null, directUrl: null, blob: null };
      }
    } catch (e) {}
  }

  // Direct Telegram CDN URL: .../file/bot<token>/<file_path>
  const cdnMatch = str.match(/\/file\/bot[^/]+\/(.+)$/);
  if (cdnMatch && cdnMatch[1]) {
    return { raw: item, type: 'cdn_url', fileId: null, filePath: cdnMatch[1], directUrl: str, blob: null };
  }

  // Relative Telegram file path (e.g. photos/file_0.jpg, videos/file_1.mp4)
  if (/^(?:photos|videos|documents|voice|animations|video_notes)\//i.test(str)) {
    return { raw: item, type: 'file_path', fileId: null, filePath: str, directUrl: null, blob: null };
  }

  // Raw Telegram file_id (no slashes, no dots, standard file_id regex)
  if (!str.includes('/') && !str.includes(':') && !str.includes('.') && TELEGRAM_FILE_ID_REGEX.test(str)) {
    return { raw: item, type: 'file_id', fileId: str, filePath: null, directUrl: null, blob: null };
  }

  // Standard Web URL (Cloudinary, S3, Unsplash, etc.)
  return { raw: item, type: 'other_url', fileId: null, filePath: null, directUrl: str, blob: null };
}

/* ==========================================================================
   TELEGRAM BOT API GETFILE RESOLVER
   ========================================================================== */

/**
 * Builds a direct Telegram CDN URL from a resolved relative file path
 * 
 * @param {string} filePath 
 * @param {string} [token] 
 * @returns {string}
 */
export function getTelegramFileUrl(filePath, token) {
  if (!filePath) return '';
  const activeToken = token || getTelegramConfig().token || TELEGRAM_BOT_TOKEN;
  const cleanPath = String(filePath).replace(/^\/+/, '');
  return `${TELEGRAM_API_BASE}/file/bot${activeToken}/${cleanPath}`;
}

/**
 * Queries the Telegram Bot API getFile endpoint to resolve a file_id to a file_path.
 * Utilizes in-memory and session caching with in-flight deduplication.
 * 
 * @param {string} fileId 
 * @param {object} [options]
 * @param {string} [options.token]
 * @param {boolean} [options.skipCache]
 * @returns {Promise<string|null>} Relative file_path (e.g. 'photos/file_0.jpg')
 */
export async function fetchTelegramFilePath(fileId, options = {}) {
  if (!fileId || typeof fileId !== 'string') return null;

  const { token, skipCache = false } = options;
  const activeToken = token || getTelegramConfig().token || TELEGRAM_BOT_TOKEN;

  if (!activeToken) {
    console.warn('[TelegramMedia] Cannot fetch file path: Telegram Bot Token is missing');
    return null;
  }

  const cacheKey = `fid_${fileId}`;

  // 1. Check in-memory cache
  if (!skipCache && memoryFilePathCache.has(cacheKey)) {
    const entry = memoryFilePathCache.get(cacheKey);
    if (Date.now() - entry.timestamp < PATH_TTL_MS) {
      return entry.filePath;
    }
    memoryFilePathCache.delete(cacheKey);
  }

  // 2. Check session storage cache
  if (!skipCache) {
    const sessionEntry = getSessionItem(cacheKey);
    if (sessionEntry && sessionEntry.filePath) {
      memoryFilePathCache.set(cacheKey, sessionEntry);
      return sessionEntry.filePath;
    }
  }

  // 3. Check in-flight requests to deduplicate concurrent calls
  if (inflightGetFile.has(cacheKey)) {
    return inflightGetFile.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const endpoint = `${TELEGRAM_API_BASE}/bot${activeToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!data || !data.ok || !data.result?.file_path) {
        console.warn(`[TelegramMedia] getFile failed for file_id ${fileId}:`, data?.description || 'Unknown error');
        return null;
      }

      const filePath = data.result.file_path;
      const cdnUrl = getTelegramFileUrl(filePath, activeToken);
      const cacheEntry = { filePath, cdnUrl, timestamp: Date.now() };

      // Save to memory & session storage
      memoryFilePathCache.set(cacheKey, cacheEntry);
      setSessionItem(cacheKey, cacheEntry);

      return filePath;
    } catch (err) {
      console.warn(`[TelegramMedia] Network error calling getFile for ${fileId}:`, err);
      return null;
    } finally {
      inflightGetFile.delete(cacheKey);
    }
  })();

  inflightGetFile.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/* ==========================================================================
   TRANSPARENT OFFLINE BLOB FETCH & CACHE HELPER
   ========================================================================== */

/**
 * Downloads a media URL as a Blob and stores it into both CacheStorage and IndexedDB.
 * Deduplicates concurrent downloads of the same URL.
 * 
 * @param {string} url 
 * @param {string} cacheKey 
 * @param {string} [mediaType] 
 * @returns {Promise<Blob|null>}
 */
async function fetchAndCacheBlob(url, cacheKey, mediaType = 'unknown') {
  if (!url) return null;

  // Deduplicate in-flight downloads
  if (inflightBlobFetches.has(url)) {
    return inflightBlobFetches.get(url);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }

      // Store clone in CacheStorage
      await putBlobToCacheStorage(url, res.clone()).catch(() => {});

      const blob = await res.blob();

      // Store in IndexedDB for robust offline persistence
      await putBlobToIndexedDB(cacheKey, blob, mediaType).catch(() => {});
      if (cacheKey !== url) {
        await putBlobToIndexedDB(url, blob, mediaType).catch(() => {});
      }

      return blob;
    } catch (err) {
      console.warn(`[TelegramMedia] Failed to fetch and cache blob from ${url}:`, err);
      return null;
    } finally {
      inflightBlobFetches.delete(url);
    }
  })();

  inflightBlobFetches.set(url, fetchPromise);
  return fetchPromise;
}

/* ==========================================================================
   PRIMARY EXPORT: RESOLVE MEDIA URL
   ========================================================================== */

/**
 * Robust Telegram CDN media resolution utility.
 * 
 * Given a Telegram fileId, relative Telegram file path, Telegram URL, or item object:
 *  1. Resolves it to a playable/displayable URL using Telegram Bot API getFile
 *     with multi-tier (Memory + SessionStorage) caching.
 *  2. Supports transparent Blob caching in IndexedDB / CacheStorage for offline
 *     viewing of food photos and 360° videos.
 *  3. Seamlessly returns cached Blob Object URLs when offline or when preferBlob is enabled.
 * 
 * @param {any} item - String URL/fileId, File/Blob, or object containing image/video metadata
 * @param {object} [options]
 * @param {boolean} [options.preferBlob=false] - Return a blob: URL backed by CacheStorage/IndexedDB
 * @param {boolean} [options.offlineOnly=false] - Only lookup existing local cache, do not hit network
 * @param {boolean} [options.skipCache=false] - Bypass memory and session storage
 * @param {string} [options.token] - Optional Telegram Bot token override
 * @param {'image' | 'video' | 'auto'} [options.kind='auto'] - Media hint
 * @returns {Promise<string>} Displayable URL (CDN URL or blob: URL) or empty string on failure
 */
export async function resolveMediaUrl(item, options = {}) {
  if (!item) return '';

  const {
    preferBlob = false,
    offlineOnly = false,
    skipCache = false,
    token,
    kind = 'auto'
  } = options;

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const shouldServeBlob = preferBlob || isOffline;

  // 1. Parse item
  const parsed = parseMediaItem(item);

  // If already a Blob or File object
  if (parsed.type === 'blob' && parsed.blob) {
    return getOrCreateObjectURL('blob_' + Math.random().toString(36).slice(2), parsed.blob);
  }

  // Cache key used for offline blob store
  const offlineCacheKey = parsed.fileId ? `tg_file_${parsed.fileId}` : (parsed.filePath || parsed.directUrl || String(item));

  // 2. Check local Blob cache (CacheStorage + IndexedDB) if offline or blob preferred
  if (shouldServeBlob || offlineOnly) {
    const cachedBlob = await getCachedMediaBlob(offlineCacheKey);
    if (cachedBlob) {
      return getOrCreateObjectURL(offlineCacheKey, cachedBlob);
    }

    if (parsed.directUrl && parsed.directUrl !== offlineCacheKey) {
      const directBlob = await getCachedMediaBlob(parsed.directUrl);
      if (directBlob) {
        return getOrCreateObjectURL(parsed.directUrl, directBlob);
      }
    }

    // If strictly offline-only and no cache exists, terminate here
    if (offlineOnly || isOffline) {
      return parsed.directUrl || '';
    }
  }

  // 3. Resolve to CDN URL based on media type
  let resolvedCdnUrl = '';

  if (parsed.type === 'file_id' && parsed.fileId) {
    const filePath = await fetchTelegramFilePath(parsed.fileId, { token, skipCache });
    if (filePath) {
      resolvedCdnUrl = getTelegramFileUrl(filePath, token);
    } else if (parsed.directUrl) {
      // Fallback to direct URL if fileId getFile failed
      resolvedCdnUrl = parsed.directUrl;
    }
  } else if (parsed.type === 'file_path' && parsed.filePath) {
    resolvedCdnUrl = getTelegramFileUrl(parsed.filePath, token);
  } else if (parsed.directUrl) {
    resolvedCdnUrl = parsed.directUrl;
  }

  if (!resolvedCdnUrl) {
    return '';
  }

  // 4. Transparent Blob caching for offline viewing
  if (shouldServeBlob) {
    const blob = await fetchAndCacheBlob(resolvedCdnUrl, offlineCacheKey, kind);
    if (blob) {
      return getOrCreateObjectURL(offlineCacheKey, blob);
    }
  }

  return resolvedCdnUrl;
}

/* ==========================================================================
   PRELOAD & BATCH CACHING FOR OFFLINE RESILIENCE
   ========================================================================== */

/**
 * Preload an array of Telegram media items into local CacheStorage & IndexedDB.
 * Allows instant offline viewing of high-res food photos and 360° videos.
 * 
 * @param {Array<any>} items - Array of URLs, fileIds, or dish objects
 * @param {object} [options]
 * @param {number} [options.concurrency=3] - Number of parallel media downloads
 * @param {function} [options.onProgress] - Callback (loaded, total, itemResult) => void
 * @param {string} [options.token] - Optional Telegram Bot token override
 * @returns {Promise<Array<{ item: any, resolvedUrl: string, blobUrl: string|null, success: boolean, error?: string }>>}
 */
export async function preloadTelegramMedia(items, options = {}) {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return [];

  const {
    concurrency = 3,
    onProgress,
    token
  } = options;

  const results = new Array(list.length);
  let currentIndex = 0;
  let loadedCount = 0;

  async function processWorker() {
    while (currentIndex < list.length) {
      const idx = currentIndex++;
      const item = list[idx];

      try {
        const resolvedUrl = await resolveMediaUrl(item, {
          preferBlob: true,
          token
        });

        const isSuccess = Boolean(resolvedUrl);
        const resultItem = {
          item,
          resolvedUrl,
          blobUrl: resolvedUrl.startsWith('blob:') ? resolvedUrl : null,
          success: isSuccess
        };

        results[idx] = resultItem;
      } catch (err) {
        results[idx] = {
          item,
          resolvedUrl: '',
          blobUrl: null,
          success: false,
          error: err?.message || 'Preload failed'
        };
      } finally {
        loadedCount++;
        if (typeof onProgress === 'function') {
          try {
            onProgress(loadedCount, list.length, results[idx]);
          } catch (e) {}
        }
      }
    }
  }

  const workerCount = Math.min(concurrency, list.length);
  const workers = Array.from({ length: workerCount }, () => processWorker());
  await Promise.all(workers);

  return results;
}

/* ==========================================================================
   CACHE MAINTENANCE & PURGING
   ========================================================================== */

/**
 * Clear in-memory, session, CacheStorage, and IndexedDB Telegram media caches
 * @returns {Promise<void>}
 */
export async function clearTelegramMediaCache() {
  // 1. In-memory
  memoryFilePathCache.clear();
  inflightGetFile.clear();
  inflightBlobFetches.clear();

  // Revoke object URLs
  for (const objUrl of objectUrlRegistry.values()) {
    try {
      URL.revokeObjectURL(objUrl);
    } catch (e) {}
  }
  objectUrlRegistry.clear();

  // 2. SessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {}
  }

  // 3. CacheStorage
  if (isCacheStorageAvailable()) {
    try {
      await caches.delete(CACHE_STORAGE_NAME);
    } catch (e) {}
  }

  // 4. IndexedDB
  const db = await openMediaDB();
  if (db) {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      await new Promise((resolve) => {
        const req = tx.objectStore(IDB_STORE).clear();
        req.onsuccess = resolve;
        req.onerror = resolve;
      });
    } catch (e) {}
  }
}

export default {
  resolveMediaUrl,
  isTelegramMedia,
  preloadTelegramMedia,
  fetchTelegramFilePath,
  getTelegramFileUrl,
  getCachedMediaBlob,
  cacheMediaBlob,
  revokeMediaBlobUrl,
  clearTelegramMediaCache
};
