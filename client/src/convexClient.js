import { ConvexReactClient } from "convex/react";

/**
 * Validates whether a given string is a plausible absolute Convex URL.
 * Returns false for empty, unset, whitespace, or invalid protocol strings.
 */
function isValidConvexUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "none" || trimmed === "false") {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Creates a safe, fully compatible fallback Convex client that adheres
 * to the ConvexReactClient interface without requiring any external
 * network connection or backend deployment.
 */
export function createFallbackConvexClient() {
  const dummyWatch = {
    onUpdate: () => () => {},
    localQueryResult: () => undefined,
    journal: () => undefined,
  };

  const dummyPaginatedWatch = {
    ...dummyWatch,
    loadMore: async () => {},
    reset: () => {},
    status: "Exhausted",
  };

  const disconnectedState = {
    hasInflightRequests: false,
    isWebSocketConnected: false,
    timeOfOldestInflightRequest: null,
  };

  return {
    isFallback: true,
    url: "",
    watchQuery: () => dummyWatch,
    watchPaginatedQuery: () => dummyPaginatedWatch,
    mutation: async () => null,
    action: async () => null,
    query: async () => null,
    connectionState: () => disconnectedState,
    subscribeToConnectionState: (cb) => {
      if (typeof cb === "function") {
        try {
          cb(disconnectedState);
        } catch (_) {}
      }
      return () => {};
    },
    setAuth: () => {},
    clearAuth: () => {},
    setAdminAuth: () => {},
    prewarmQuery: () => {},
    close: async () => {},
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
    },
  };
}

/**
 * Wraps a promise with a timeout so operations do not hang indefinitely
 * when Convex is unreachable or offline.
 */
function withSafetyTimeout(promise, ms = 4000, label = "Convex operation") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms (unreachable)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// Zero-external database mode: Telegram CDN & Local-First persistence are the primary source of truth.
// Disabling external Convex connection to prevent plan limit crashes (error [CONVEX Q(corrections:listAll)]).
const rawConvexUrl = (import.meta.env?.VITE_CONVEX_URL || "").trim();
const forceEnableConvex = import.meta.env?.VITE_ENABLE_CONVEX === "true";
export const isConvexConfigured = forceEnableConvex && isValidConvexUrl(rawConvexUrl);

let clientInstance;

if (!isConvexConfigured) {
  // Safe fallback client: zero network calls, zero crashes, zero external database dependencies
  clientInstance = createFallbackConvexClient();
} else {
  try {
    const realClient = new ConvexReactClient(rawConvexUrl, {
      logger: false, // Suppress verbose console spam if unreachable
      unsavedChangesWarning: false,
    });

    // Wrap query/mutation/action with timeouts to fail cleanly when unreachable
    clientInstance = new Proxy(realClient, {
      get(target, prop, receiver) {
        if (prop === "query" || prop === "mutation" || prop === "action") {
          const orig = target[prop];
          if (typeof orig === "function") {
            return function (...args) {
              try {
                return withSafetyTimeout(orig.apply(target, args), 4000, `Convex ${String(prop)}`);
              } catch (err) {
                return Promise.reject(err);
              }
            };
          }
        }
        const val = Reflect.get(target, prop, receiver);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });
  } catch (err) {
    console.warn("[SmartDine] Convex initialization fallback:", err?.message || err);
    clientInstance = createFallbackConvexClient();
  }
}

export const convex = clientInstance;
