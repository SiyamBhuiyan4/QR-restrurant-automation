/**
 * Runs the app's existing Convex functions (convex/*.js) on the server, against the Telegram
 * snapshot database instead of Convex's cloud.
 *
 * run(path, args): path is "module:function" (e.g. "menu:getMenu"), as the browser sends it.
 *  - query:    reads the newest snapshot (re-checked at most every QUERY_FRESH_MS)
 *  - mutation: runs on a fresh copy, saves if anything changed; if another save got in first
 *              the whole mutation is redone on the newer data
 *  - action:   runs with ctx.runQuery / ctx.runMutation, each its own transaction
 * Only public functions can be called from the browser; internal ones only via ctx.run*.
 */
import { getFunctionName } from 'convex/server';
import { Database } from './database.js';
import { loadSnapshot, withWriteLock } from './store.js';

import * as auth from '../convex/auth.js';
import * as chat from '../convex/chat.js';
import * as corrections from '../convex/corrections.js';
import * as files from '../convex/files.js';
import * as media from '../convex/media.js';
import * as menu from '../convex/menu.js';
import * as orders from '../convex/orders.js';
import * as reels from '../convex/reels.js';
import * as reviews from '../convex/reviews.js';
import * as seed from '../convex/seed.js';
import * as settlements from '../convex/settlements.js';
import * as staff from '../convex/staff.js';
import * as stats from '../convex/stats.js';
import * as team from '../convex/team.js';
import * as waiter from '../convex/waiter.js';

const MODULES = { auth, chat, corrections, files, media, menu, orders, reels, reviews, seed, settlements, staff, stats, team, waiter };
const QUERY_FRESH_MS = 1500;

export class FunctionError extends Error {
  constructor(message, { status = 400, data } = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function lookup(path) {
  const [mod, name] = String(path || '').split(':');
  const fn = MODULES[mod]?.[name];
  if (!fn || typeof fn._handler !== 'function') throw new FunctionError(`Unknown function ${path}`, { status: 404 });
  return fn;
}
const kindOf = (fn) => (fn.isQuery ? 'query' : fn.isMutation ? 'mutation' : fn.isAction ? 'action' : 'unknown');
const nameOf = (ref) => (typeof ref === 'string' ? ref : getFunctionName(ref));

// Files were in Convex storage; that's gone (media lives on Telegram), so these are no-ops
const storage = {
  getUrl: async () => null,
  get: async () => null,
  delete: async () => {},
  generateUploadUrl: async () => {
    throw new FunctionError('File uploads go to Telegram now', { status: 400 });
  }
};

// Short-lived copy of the newest snapshot for queries (many screens poll at once)
let latest = null; // { snapshot, version, at }
async function readLatest() {
  if (latest && Date.now() - latest.at < QUERY_FRESH_MS) return latest;
  const { snapshot, version } = await loadSnapshot();
  latest = { snapshot, version, at: Date.now() };
  return latest;
}

function makeCtx(db) {
  const ctx = {
    db,
    storage,
    auth: { getUserIdentity: async () => null },
    // Inside a query / mutation, nested calls share the same data and transaction
    runQuery: (ref, args = {}) => lookup(nameOf(ref))._handler(ctx, args),
    runMutation: (ref, args = {}) => lookup(nameOf(ref))._handler(ctx, args)
  };
  return ctx;
}

async function runQuery(fn, args) {
  const { snapshot } = await readLatest();
  const db = new Database(structuredClone(snapshot));
  return fn._handler(makeCtx(db), args);
}

async function runMutation(fn, args) {
  // Dry run on the newest data first: a mutation that changes nothing needs no lock
  latest = null;
  const { snapshot } = await readLatest();
  const dry = new Database(structuredClone(snapshot));
  const dryResult = await fn._handler(makeCtx(dry), args);
  if (!dry.dirty) return dryResult;

  // It writes: run it for real under the write lock, on the newest data
  let result;
  await withWriteLock(async (fresh) => {
    const db = new Database(fresh);
    result = await fn._handler(makeCtx(db), args);
    return db.dirty;
  });
  latest = null;
  return result;
}

async function runAction(fn, args) {
  const ctx = {
    storage,
    auth: { getUserIdentity: async () => null },
    runQuery: (ref, a = {}) => runQuery(lookup(nameOf(ref)), a),
    runMutation: (ref, a = {}) => runMutation(lookup(nameOf(ref)), a),
    runAction: (ref, a = {}) => runAction(lookup(nameOf(ref)), a)
  };
  return fn._handler(ctx, args);
}

/** Run a public function by "module:name" with JSON args. */
export async function run(path, args = {}) {
  const fn = lookup(path);
  if (!fn.isPublic) throw new FunctionError(`${path} is not public`, { status: 403 });
  const kind = kindOf(fn);
  if (kind === 'query') return runQuery(fn, args);
  if (kind === 'mutation') return runMutation(fn, args);
  if (kind === 'action') return runAction(fn, args);
  throw new FunctionError(`Unsupported function type for ${path}`, { status: 400 });
}
