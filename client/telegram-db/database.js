/**
 * In-memory stand-in for Convex's `ctx.db`, over a plain snapshot object
 * ({ tables: { [table]: Doc[] } }). Lets the existing functions in convex/ run unchanged
 * against data kept in Telegram (see store.js).
 *
 * Supported: get, insert, patch, replace, delete, normalizeId, and
 * query(table).withIndex(name, q => q.eq(...).gt(...)...).filter(q => ...).order('asc'|'desc')
 *   .collect() / .first() / .unique() / .take(n) / async iteration.
 * Index order follows Convex: by the index fields, then _creationTime.
 */
import { randomBytes } from 'node:crypto';
import schema from '../convex/schema.js';

// table -> { indexName -> [fields] }
const INDEXES = {};
for (const [table, def] of Object.entries(schema.tables || {})) {
  INDEXES[table] = {};
  for (const ix of def[' indexes']?.() || def.indexes || []) INDEXES[table][ix.indexDescriptor] = ix.fields;
}

// Ids carry their table, so get(id) and normalizeId work without a table argument
const ID_SEP = '~';
const newId = (table) => `${table}${ID_SEP}${randomBytes(9).toString('base64url')}`;
const tableOfId = (id) => (typeof id === 'string' && id.includes(ID_SEP) ? id.slice(0, id.indexOf(ID_SEP)) : null);

// Convex value order: undefined < null < numbers < booleans < strings < objects
function rank(v) {
  if (v === undefined) return 0;
  if (v === null) return 1;
  if (typeof v === 'number' || typeof v === 'bigint') return 2;
  if (typeof v === 'boolean') return 3;
  if (typeof v === 'string') return 4;
  return 5;
}
function compare(a, b) {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (a === b) return 0;
  if (ra === 5) return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;
  return a < b ? -1 : 1;
}
const equal = (a, b) => compare(a, b) === 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// Range builder for withIndex(name, q => q.eq('a', 1).gte('b', 2)...)
function rangeBuilder() {
  const conds = [];
  const b = {};
  for (const op of ['eq', 'gt', 'gte', 'lt', 'lte']) {
    b[op] = (field, value) => {
      conds.push({ op, field, value });
      return b;
    };
  }
  b._conds = conds;
  return b;
}
function matchesRange(doc, conds) {
  return conds.every(({ op, field, value }) => {
    const c = compare(doc[field], value);
    if (op === 'eq') return c === 0;
    if (op === 'gt') return c > 0;
    if (op === 'gte') return c >= 0;
    if (op === 'lt') return c < 0;
    return c <= 0;
  });
}

// Filter builder for .filter(q => q.and(q.eq(q.field('x'), 1), ...)); expressions are functions of a doc
const val = (x) => (typeof x === 'function' && x.isExpr ? x : Object.assign(() => x, { isExpr: true }));
const expr = (fn) => Object.assign(fn, { isExpr: true });
const filterBuilder = {
  field: (name) => expr((doc) => name.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc)),
  eq: (a, b) => expr((d) => equal(val(a)(d), val(b)(d))),
  neq: (a, b) => expr((d) => !equal(val(a)(d), val(b)(d))),
  gt: (a, b) => expr((d) => compare(val(a)(d), val(b)(d)) > 0),
  gte: (a, b) => expr((d) => compare(val(a)(d), val(b)(d)) >= 0),
  lt: (a, b) => expr((d) => compare(val(a)(d), val(b)(d)) < 0),
  lte: (a, b) => expr((d) => compare(val(a)(d), val(b)(d)) <= 0),
  and: (...xs) => expr((d) => xs.every((x) => val(x)(d))),
  or: (...xs) => expr((d) => xs.some((x) => val(x)(d))),
  not: (x) => expr((d) => !val(x)(d)),
  add: (a, b) => expr((d) => val(a)(d) + val(b)(d)),
  sub: (a, b) => expr((d) => val(a)(d) - val(b)(d)),
  mul: (a, b) => expr((d) => val(a)(d) * val(b)(d)),
  div: (a, b) => expr((d) => val(a)(d) / val(b)(d)),
  mod: (a, b) => expr((d) => val(a)(d) % val(b)(d)),
  neg: (a) => expr((d) => -val(a)(d))
};

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.fields = [];
    this.conds = [];
    this.filters = [];
    this.direction = 'asc';
  }
  withIndex(name, range) {
    const fields = name === 'by_creation_time' ? [] : INDEXES[this.table]?.[name];
    if (!fields) throw new Error(`Unknown index ${this.table}.${name}`);
    this.fields = fields;
    if (range) this.conds = range(rangeBuilder())._conds;
    return this;
  }
  filter(fn) {
    this.filters.push(val(fn(filterBuilder)));
    return this;
  }
  order(direction) {
    this.direction = direction === 'desc' ? 'desc' : 'asc';
    return this;
  }
  _run() {
    const keys = [...this.fields, '_creationTime'];
    const rows = this.db._rows(this.table)
      .filter((d) => matchesRange(d, this.conds) && this.filters.every((f) => f(d)))
      .sort((a, b) => {
        for (const k of keys) {
          const c = compare(a[k], b[k]);
          if (c) return c;
        }
        return 0;
      });
    if (this.direction === 'desc') rows.reverse();
    return rows.map(clone);
  }
  async collect() {
    return this._run();
  }
  async take(n) {
    return this._run().slice(0, n);
  }
  async first() {
    return this._run()[0] ?? null;
  }
  async unique() {
    const rows = this._run();
    if (rows.length > 1) throw new Error(`unique() found ${rows.length} documents in ${this.table}`);
    return rows[0] ?? null;
  }
  async paginate({ numItems = 50, cursor = null } = {}) {
    const rows = this._run();
    const start = cursor ? Number(cursor) : 0;
    const page = rows.slice(start, start + numItems);
    const end = start + page.length;
    return { page, isDone: end >= rows.length, continueCursor: String(end) };
  }
  [Symbol.asyncIterator]() {
    const rows = this._run();
    let i = 0;
    return { next: async () => (i < rows.length ? { value: rows[i++], done: false } : { value: undefined, done: true }) };
  }
}

export class Database {
  /** snapshot: { tables: { [table]: Doc[] } } (modified in place) */
  constructor(snapshot) {
    this.snapshot = snapshot;
    if (!this.snapshot.tables) this.snapshot.tables = {};
    this.dirty = false;
    this.lastTime = 0;
  }
  _rows(table) {
    if (!this.snapshot.tables[table]) this.snapshot.tables[table] = [];
    return this.snapshot.tables[table];
  }
  _find(id) {
    const table = tableOfId(id);
    if (!table) return null;
    const rows = this._rows(table);
    const i = rows.findIndex((d) => d._id === id);
    return i === -1 ? null : { rows, i };
  }
  query(table) {
    return new Query(this, table);
  }
  normalizeId(table, id) {
    return tableOfId(id) === table && this._find(id) ? id : null;
  }
  async get(id) {
    const hit = this._find(id);
    return hit ? clone(hit.rows[hit.i]) : null;
  }
  async insert(table, value) {
    // Unique, increasing creation times (ms with a fraction, like Convex)
    let t = Date.now();
    if (t <= this.lastTime) t = this.lastTime + 0.001;
    this.lastTime = t;
    const doc = { ...clone(value), _id: newId(table), _creationTime: t };
    for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k];
    this._rows(table).push(doc);
    this.dirty = true;
    return doc._id;
  }
  async patch(id, fields) {
    const hit = this._find(id);
    if (!hit) throw new Error(`patch: document ${id} not found`);
    const doc = hit.rows[hit.i];
    for (const [k, v] of Object.entries(fields || {})) {
      if (k === '_id' || k === '_creationTime') continue;
      if (v === undefined) delete doc[k];
      else doc[k] = clone(v);
    }
    this.dirty = true;
  }
  async replace(id, value) {
    const hit = this._find(id);
    if (!hit) throw new Error(`replace: document ${id} not found`);
    const old = hit.rows[hit.i];
    const doc = { ...clone(value), _id: old._id, _creationTime: old._creationTime };
    for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k];
    hit.rows[hit.i] = doc;
    this.dirty = true;
  }
  async delete(id) {
    const hit = this._find(id);
    if (!hit) return;
    hit.rows.splice(hit.i, 1);
    this.dirty = true;
  }
}
