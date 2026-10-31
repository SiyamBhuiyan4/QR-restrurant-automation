/**
 * Browser side of the Telegram database: a drop-in for the parts of `convex/react` the app
 * uses (useQuery, useMutation, useAction, and a client with .query / .mutation / .action).
 *
 * Every call goes to the /api/db server function (api/db.mjs), which runs the same function
 * from convex/ against the data kept in the Telegram channel.
 *
 * useQuery results refresh every POLL_MS while on screen, and right after any mutation or
 * action from this page, so screens stay in step without a live connection.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctionName } from 'convex/server';
import { ConvexError } from 'convex/values';

// Admin / staff sites are separate deployments, so they call the customer site's endpoint
const DB_URL = (import.meta.env?.VITE_DB_URL || 'https://qr-restaurant-automation.vercel.app/api/db').trim();
const POLL_MS = 4000;

const nameOf = (ref) => (typeof ref === 'string' ? ref : getFunctionName(ref));

async function call(ref, args = {}) {
  const res = await fetch(DB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: nameOf(ref), args: args ?? {} })
  });
  const body = await res.json().catch(() => null);
  if (body?.status === 'success') return body.value;
  if (body?.errorData !== undefined) throw new ConvexError(body.errorData);
  throw new Error(body?.errorMessage || `Database request failed (${res.status})`);
}

// ---- Shared query cache: one request per (function, args), shared by every screen using it ----
const entries = new Map(); // key -> { ref, args, value, error, listeners:Set, timer, inFlight }
const keyOf = (ref, args) => `${nameOf(ref)}|${JSON.stringify(args ?? {})}`;

function fetchEntry(key) {
  const e = entries.get(key);
  if (!e || e.inFlight) return;
  e.inFlight = call(e.ref, e.args)
    .then((value) => {
      e.value = value;
      e.error = undefined;
    })
    .catch((err) => {
      e.error = err;
    })
    .finally(() => {
      e.inFlight = null;
      e.listeners.forEach((l) => l());
    });
}

function subscribe(ref, args, listener) {
  const key = keyOf(ref, args);
  let e = entries.get(key);
  if (!e) {
    e = { ref, args, value: undefined, error: undefined, listeners: new Set(), timer: 0, inFlight: null };
    entries.set(key, e);
  }
  e.listeners.add(listener);
  if (!e.timer) {
    fetchEntry(key);
    e.timer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') fetchEntry(key);
    }, POLL_MS);
  }
  return () => {
    e.listeners.delete(listener);
    if (!e.listeners.size) {
      clearInterval(e.timer);
      e.timer = 0;
    }
  };
}

// After a change, refresh everything on screen
function refreshAll() {
  for (const [key, e] of entries) if (e.listeners.size) fetchEntry(key);
}

/** useQuery(api.x.y, args | 'skip'): undefined while loading, then the result (kept fresh). */
export function useQuery(ref, args) {
  const skip = args === 'skip';
  const key = skip ? null : keyOf(ref, args);
  const [, force] = useState(0);
  const argsRef = useRef(args);
  argsRef.current = args;

  useEffect(() => {
    if (!key) return undefined;
    return subscribe(ref, argsRef.current, () => force((n) => n + 1));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!key) return undefined;
  // A failed query reads as "still loading" (and retries on the next poll) instead of
  // crashing the whole screen
  const e = entries.get(key);
  if (e?.error && e.value === undefined) console.warn(`[db] ${nameOf(ref)} failed:`, e.error.message);
  return e?.value;
}

export function useMutation(ref) {
  const name = nameOf(ref);
  return useCallback(async (args) => {
    const value = await call(name, args);
    refreshAll();
    return value;
  }, [name]);
}

export const useAction = useMutation;

/** Stand-in for ConvexReactClient where code calls convex.query / .mutation / .action directly. */
export const dbClient = {
  query: (ref, args) => call(ref, args),
  mutation: async (ref, args) => {
    const value = await call(ref, args);
    refreshAll();
    return value;
  },
  action: async (ref, args) => {
    const value = await call(ref, args);
    refreshAll();
    return value;
  }
};

/** Kept so existing <ConvexProvider client={...}> markup keeps working. */
export function ConvexProvider({ children }) {
  return children;
}
