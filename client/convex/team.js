import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";

/**
 * Team accounts, logins and the admin monitor.
 *
 * - Admin signs in with the master PIN (ADMIN_MASTER_PIN) and gets a session token.
 *   Every admin function below takes that token.
 * - The admin creates staff accounts (username + password) and assigns each one a
 *   role (kitchen, waiter, manager), a station and tables.
 * - Staff sign in with their own username/password. Kitchen status changes go
 *   through staffSetOrderStatus so the admin can see who did what.
 *
 * Passwords are hashed with PBKDF2-SHA256 inside actions (actions have real
 * randomness for salts and tokens).
 */

const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;
const STAFF_SESSION_MS = 16 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;
const ROLES = ["staff", "kitchen", "waiter", "manager"];
const ORDER_STATUSES = ["pending", "preparing", "ready", "served", "completed", "cancelled"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteCount) {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return toHex(bits);
}

// Constant-time compare for equal-length hex strings
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cleanUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validateUsername(username) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new ConvexError("Username must be 3-32 characters: letters, numbers, dot, dash or underscore");
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    throw new ConvexError("Password must be 6-128 characters");
  }
}

function describeAccess(kitchen, tables) {
  const parts = [];
  if (kitchen) parts.push("kitchen");
  if (tables && tables.length) parts.push(`tables ${tables.join(", ")}`);
  return parts.length ? ` — ${parts.join(" + ")}` : "";
}

function cleanTables(tables) {
  if (!Array.isArray(tables)) return [];
  return [...new Set(tables.map((t) => Number(t)).filter((t) => Number.isInteger(t) && t > 0 && t < 1000))].sort((a, b) => a - b);
}

// Kitchen access: the explicit flag, or the older kitchen/manager roles
export function hasKitchenAccess(acc) {
  if (!acc) return false;
  if (typeof acc.kitchenAccess === "boolean") return acc.kitchenAccess;
  return acc.role === "kitchen" || acc.role === "manager";
}

// Account without the password fields, plus a computed online flag
function publicAccount(acc, now = Date.now()) {
  if (!acc) return null;
  return {
    _id: acc._id,
    username: acc.username,
    name: acc.name,
    role: acc.role,
    title: acc.title || "",
    kitchenAccess: hasKitchenAccess(acc),
    station: acc.station,
    assignedTables: acc.assignedTables,
    active: acc.active,
    createdAt: acc.createdAt,
    lastLoginAt: acc.lastLoginAt ?? null,
    lastSeenAt: acc.lastSeenAt ?? null,
    online: !!acc.lastSeenAt && now - acc.lastSeenAt < ONLINE_WINDOW_MS,
  };
}

export async function requireAdmin(ctx, adminToken) {
  const token = String(adminToken ?? "");
  if (!token) throw new ConvexError("Admin sign-in required");
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Admin session expired. Sign in again.");
  }
  return session;
}

// For queries: a bad token returns false instead of throwing (useQuery would crash the page)
async function isAdmin(ctx, adminToken) {
  try {
    await requireAdmin(ctx, adminToken);
    return true;
  } catch (_) {
    return false;
  }
}

async function loadStaffSession(ctx, staffToken) {
  const token = String(staffToken ?? "");
  if (!token) return null;
  const session = await ctx.db
    .query("staffSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;
  const account = await ctx.db.get(session.accountId);
  if (!account || !account.active) return null;
  return { session, account };
}

// One table, one person: give `tables` to `accountId` and take them off everyone else.
// Returns [{ name, tables }] for the people who lost tables (for the activity feed).
async function claimTables(ctx, accountId, tables) {
  if (!tables.length) return [];
  const others = await ctx.db.query("staffAccounts").collect();
  const moved = [];
  for (const other of others) {
    if (String(other._id) === String(accountId)) continue;
    const lost = other.assignedTables.filter((t) => tables.includes(t));
    if (!lost.length) continue;
    await ctx.db.patch(other._id, {
      assignedTables: other.assignedTables.filter((t) => !tables.includes(t)),
      updatedAt: Date.now(),
    });
    moved.push({ name: other.name, tables: lost });
  }
  return moved;
}

function describeMoves(moved) {
  return moved.map((m) => `Table${m.tables.length > 1 ? "s" : ""} ${m.tables.join(", ")} taken from ${m.name}`).join("; ");
}

async function logActivity(ctx, entry) {
  await ctx.db.insert("staffActivity", { ...entry, at: Date.now() });
}

async function findOrder(ctx, orderId) {
  let target = null;
  try {
    target = await ctx.db.get(orderId);
  } catch (_) {}
  if (!target) {
    target = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("orderNumber"), orderId))
      .first();
  }
  return target;
}

// ---------------------------------------------------------------------------
// Admin sign-in
// ---------------------------------------------------------------------------

export const createAdminSession = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const now = Date.now();
    await ctx.db.insert("adminSessions", { token, createdAt: now, expiresAt: now + ADMIN_SESSION_MS });
  },
});

// Same PIN rules as auth.verifyAdminPin (global attempt limit), but returns a session token.
export const adminLogin = action({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const adminPin = String(process.env.ADMIN_MASTER_PIN ?? "").trim();
    if (!adminPin) return null;

    const blocked = await ctx.runMutation(internal.auth.beginAttempt, {});
    if (blocked) return null;

    const given = String(pin ?? "").trim();
    if (!given || given !== adminPin) {
      await ctx.runMutation(internal.auth.recordFailure, {});
      return null;
    }

    await ctx.runMutation(internal.auth.resetAttempts, {});
    const token = randomHex(32);
    await ctx.runMutation(internal.team.createAdminSession, { token });
    return { token, expiresAt: Date.now() + ADMIN_SESSION_MS };
  },
});

export const adminSessionValid = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    return await isAdmin(ctx, adminToken);
  },
});

export const adminLogout = mutation({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", String(adminToken ?? "")))
      .first();
    if (session) await ctx.db.delete(session._id);
    return true;
  },
});

// ---------------------------------------------------------------------------
// Admin: staff accounts and assignments
// ---------------------------------------------------------------------------

export const checkAdmin = internalQuery({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    await requireAdmin(ctx, adminToken);
    return true;
  },
});

export const listAccounts = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    if (!(await isAdmin(ctx, adminToken))) return { unauthorized: true, accounts: [] };
    const now = Date.now();
    const accounts = await ctx.db.query("staffAccounts").collect();
    const list = accounts
      .map((a) => publicAccount(a, now))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { unauthorized: false, accounts: list };
  },
});

export const insertAccount = internalMutation({
  args: {
    username: v.string(),
    name: v.string(),
    role: v.string(),
    title: v.string(),
    kitchenAccess: v.boolean(),
    station: v.string(),
    assignedTables: v.array(v.number()),
    passwordHash: v.string(),
    salt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("staffAccounts")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existing) throw new ConvexError(`Username "${args.username}" is already taken`);
    const now = Date.now();
    const id = await ctx.db.insert("staffAccounts", {
      ...args,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    const moved = await claimTables(ctx, id, args.assignedTables);
    await logActivity(ctx, {
      accountId: id,
      actorName: "Admin",
      actorRole: "admin",
      kind: "account",
      note: `Created account for ${args.name} (${args.username})${describeAccess(args.kitchenAccess, args.assignedTables)}${moved.length ? ` (${describeMoves(moved)})` : ""}`,
    });
    return id;
  },
});

export const createAccount = action({
  args: {
    adminToken: v.string(),
    name: v.string(),
    username: v.string(),
    password: v.string(),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
    kitchenAccess: v.optional(v.boolean()),
    station: v.optional(v.string()),
    assignedTables: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.team.checkAdmin, { adminToken: args.adminToken });

    const name = String(args.name ?? "").trim().slice(0, 80);
    if (!name) throw new ConvexError("Name is required");
    const username = cleanUsername(args.username);
    validateUsername(username);
    validatePassword(args.password);
    const role = String(args.role ?? "staff").toLowerCase();
    if (!ROLES.includes(role)) throw new ConvexError(`Role must be one of: ${ROLES.join(", ")}`);

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);
    return await ctx.runMutation(internal.team.insertAccount, {
      username,
      name,
      role,
      title: String(args.title ?? "").trim().slice(0, 60),
      kitchenAccess: args.kitchenAccess === true,
      station: String(args.station ?? "").trim().slice(0, 60),
      assignedTables: cleanTables(args.assignedTables),
      passwordHash,
      salt,
    });
  },
});

export const updateAccount = mutation({
  args: {
    adminToken: v.string(),
    accountId: v.id("staffAccounts"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
    kitchenAccess: v.optional(v.boolean()),
    station: v.optional(v.string()),
    assignedTables: v.optional(v.array(v.number())),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { adminToken, accountId, ...changes }) => {
    await requireAdmin(ctx, adminToken);
    const account = await ctx.db.get(accountId);
    if (!account) throw new ConvexError("Account not found");

    const patch = {};
    const notes = [];
    if (changes.name !== undefined) {
      const name = changes.name.trim().slice(0, 80);
      if (!name) throw new ConvexError("Name is required");
      if (name !== account.name) { patch.name = name; notes.push(`name → ${name}`); }
    }
    if (changes.role !== undefined) {
      const role = changes.role.toLowerCase();
      if (!ROLES.includes(role)) throw new ConvexError(`Role must be one of: ${ROLES.join(", ")}`);
      if (role !== account.role) { patch.role = role; notes.push(`role → ${role}`); }
    }
    if (changes.title !== undefined) {
      const title = changes.title.trim().slice(0, 60);
      if (title !== (account.title || "")) { patch.title = title; notes.push(`title → ${title || 'none'}`); }
    }
    if (changes.kitchenAccess !== undefined && changes.kitchenAccess !== hasKitchenAccess(account)) {
      patch.kitchenAccess = changes.kitchenAccess;
      notes.push(changes.kitchenAccess ? 'kitchen access given' : 'kitchen access removed');
    }
    if (changes.station !== undefined) {
      const station = changes.station.trim().slice(0, 60);
      if (station !== account.station) { patch.station = station; notes.push(`station → ${station || 'none'}`); }
    }
    if (changes.assignedTables !== undefined) {
      const tables = cleanTables(changes.assignedTables);
      if (tables.join(",") !== account.assignedTables.join(",")) {
        patch.assignedTables = tables;
        notes.push(`tables → ${tables.length ? tables.join(", ") : 'none'}`);
      }
    }
    if (changes.active !== undefined && changes.active !== account.active) {
      patch.active = changes.active;
      notes.push(changes.active ? 'account enabled' : 'account disabled');
    }
    if (Object.keys(patch).length === 0) return publicAccount(account);

    await ctx.db.patch(accountId, { ...patch, updatedAt: Date.now() });
    if (patch.assignedTables) {
      const moved = await claimTables(ctx, accountId, patch.assignedTables);
      if (moved.length) notes.push(describeMoves(moved));
    }

    // Disabling an account signs it out everywhere
    if (patch.active === false) {
      const sessions = await ctx.db
        .query("staffSessions")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);
    }

    await logActivity(ctx, {
      accountId,
      actorName: "Admin",
      actorRole: "admin",
      kind: "assignment",
      note: `${patch.name || account.name}: ${notes.join(", ")}`,
    });
    return publicAccount(await ctx.db.get(accountId));
  },
});

export const storePassword = internalMutation({
  args: { accountId: v.id("staffAccounts"), passwordHash: v.string(), salt: v.string() },
  handler: async (ctx, { accountId, passwordHash, salt }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new ConvexError("Account not found");
    await ctx.db.patch(accountId, { passwordHash, salt, updatedAt: Date.now() });
    // A new password signs the account out of every device
    const sessions = await ctx.db
      .query("staffSessions")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await logActivity(ctx, {
      accountId,
      actorName: "Admin",
      actorRole: "admin",
      kind: "account",
      note: `Password reset for ${account.name}`,
    });
  },
});

export const resetPassword = action({
  args: { adminToken: v.string(), accountId: v.id("staffAccounts"), password: v.string() },
  handler: async (ctx, { adminToken, accountId, password }) => {
    await ctx.runQuery(internal.team.checkAdmin, { adminToken });
    validatePassword(password);
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    await ctx.runMutation(internal.team.storePassword, { accountId, passwordHash, salt });
    return true;
  },
});

export const deleteAccount = mutation({
  args: { adminToken: v.string(), accountId: v.id("staffAccounts") },
  handler: async (ctx, { adminToken, accountId }) => {
    await requireAdmin(ctx, adminToken);
    const account = await ctx.db.get(accountId);
    if (!account) return true;
    const sessions = await ctx.db
      .query("staffSessions")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await ctx.db.delete(accountId);
    await logActivity(ctx, {
      actorName: "Admin",
      actorRole: "admin",
      kind: "account",
      note: `Deleted account ${account.name} (${account.username})`,
    });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Admin: live monitor (who is online, what they are doing, recent activity)
// ---------------------------------------------------------------------------

export const monitor = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    if (!(await isAdmin(ctx, adminToken))) return { unauthorized: true, team: [], activity: [], now: Date.now() };
    const now = Date.now();
    const accounts = await ctx.db.query("staffAccounts").collect();

    // Orders currently in the kitchen flow, with who is handling them
    const active = [];
    for (const status of ["pending", "preparing", "ready"]) {
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(200);
      active.push(...rows);
    }

    const team = accounts
      .map((acc) => {
        const id = String(acc._id);
        const handling = active
          .filter((o) => o.handledById === id && o.status !== "pending")
          .map((o) => ({ orderNumber: o.orderNumber, tableNumber: o.tableNumber, status: o.status }));
        return { ...publicAccount(acc, now), handling };
      })
      .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));

    const activity = await ctx.db
      .query("staffActivity")
      .withIndex("by_at")
      .order("desc")
      .take(60);

    return { unauthorized: false, team, activity, now };
  },
});

// ---------------------------------------------------------------------------
// Staff sign-in and session
// ---------------------------------------------------------------------------

export const findAccountForLogin = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("staffAccounts")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
  },
});

export const createStaffSession = internalMutation({
  args: { accountId: v.id("staffAccounts"), token: v.string() },
  handler: async (ctx, { accountId, token }) => {
    const now = Date.now();
    await ctx.db.insert("staffSessions", { token, accountId, createdAt: now, expiresAt: now + STAFF_SESSION_MS });
    const account = await ctx.db.get(accountId);
    await ctx.db.patch(accountId, { lastLoginAt: now, lastSeenAt: now });
    await logActivity(ctx, {
      accountId,
      actorName: account.name,
      actorRole: account.role,
      kind: "login",
      note: `${account.name} signed in`,
    });
  },
});

export const staffLogin = action({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }) => {
    const account = await ctx.runQuery(internal.team.findAccountForLogin, { username: cleanUsername(username) });
    // Same error for unknown user and wrong password
    const fail = { ok: false, error: "Invalid username or password" };
    if (!account || typeof password !== "string" || !password) return fail;
    const hash = await hashPassword(password, account.salt);
    if (!safeEqual(hash, account.passwordHash)) return fail;
    if (!account.active) return { ok: false, error: "This account is disabled. Ask the admin." };

    const token = randomHex(32);
    await ctx.runMutation(internal.team.createStaffSession, { accountId: account._id, token });
    return { ok: true, token, account: publicAccount(account) };
  },
});

export const staffMe = query({
  args: { staffToken: v.string() },
  handler: async (ctx, { staffToken }) => {
    const found = await loadStaffSession(ctx, staffToken);
    return found ? publicAccount(found.account) : null;
  },
});

export const staffHeartbeat = mutation({
  args: { staffToken: v.string() },
  handler: async (ctx, { staffToken }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) return false;
    await ctx.db.patch(found.account._id, { lastSeenAt: Date.now() });
    return true;
  },
});

export const staffLogout = mutation({
  args: { staffToken: v.string() },
  handler: async (ctx, { staffToken }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) return true;
    await ctx.db.delete(found.session._id);
    await ctx.db.patch(found.account._id, { lastSeenAt: undefined });
    await logActivity(ctx, {
      accountId: found.account._id,
      actorName: found.account.name,
      actorRole: found.account.role,
      kind: "logout",
      note: `${found.account.name} signed out`,
    });
    return true;
  },
});

// Kitchen and waiter actions on orders, recorded against the signed-in staff account.
// Kitchen and manager accounts can move an order to any status; waiters can only mark served.
export const staffSetOrderStatus = mutation({
  args: { staffToken: v.string(), orderId: v.string(), status: v.string() },
  handler: async (ctx, { staffToken, orderId, status }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) throw new ConvexError("Session expired. Sign in again.");
    const { account } = found;

    const next = String(status ?? "").trim().toLowerCase();
    if (!ORDER_STATUSES.includes(next)) throw new ConvexError(`Invalid status '${status}'`);
    const order = await findOrder(ctx, orderId);
    if (!order) throw new ConvexError("Order not found");

    // Kitchen access: any kitchen step. Table staff: serve orders on their own tables.
    const ownsTable = account.assignedTables.includes(order.tableNumber);
    if (!hasKitchenAccess(account)) {
      if (!ownsTable) throw new ConvexError("This order is not on one of your tables");
      if (next !== "served") throw new ConvexError("Only kitchen staff can change this step");
    }

    const now = Date.now();
    const patch = {
      status: next,
      updatedAt: now,
      handledById: String(account._id),
      handledByName: account.name,
    };
    if (next === "preparing") patch.preparingAt = now;
    if (next === "ready") patch.readyAt = now;
    if (next === "served") patch.servedAt = now;
    await ctx.db.patch(order._id, patch);
    await ctx.db.patch(account._id, { lastSeenAt: now });

    await logActivity(ctx, {
      accountId: account._id,
      actorName: account.name,
      actorRole: account.role,
      kind: "order_status",
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      fromStatus: order.status,
      toStatus: next,
    });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Admin stepping in on an order (recorded as Admin on the activity feed)
// ---------------------------------------------------------------------------

export const adminSetOrderStatus = mutation({
  args: { adminToken: v.string(), orderId: v.string(), status: v.string() },
  handler: async (ctx, { adminToken, orderId, status }) => {
    await requireAdmin(ctx, adminToken);
    const next = String(status ?? "").trim().toLowerCase();
    if (!ORDER_STATUSES.includes(next)) throw new ConvexError(`Invalid status '${status}'`);
    const order = await findOrder(ctx, orderId);
    if (!order) throw new ConvexError("Order not found");
    const now = Date.now();
    const patch = { status: next, updatedAt: now, handledById: "admin", handledByName: "Admin" };
    if (next === "preparing") patch.preparingAt = now;
    if (next === "ready") patch.readyAt = now;
    if (next === "served") patch.servedAt = now;
    await ctx.db.patch(order._id, patch);
    await logActivity(ctx, {
      actorName: "Admin",
      actorRole: "admin",
      kind: "order_status",
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      fromStatus: order.status,
      toStatus: next,
    });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Staff: their tables (orders and waiter calls) when the admin assigned tables
// ---------------------------------------------------------------------------

export const staffTables = query({
  args: { staffToken: v.string() },
  handler: async (ctx, { staffToken }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) return null;
    const tables = found.account.assignedTables;
    const since = Date.now() - 12 * 60 * 60 * 1000;
    const result = [];
    for (const tableNumber of tables) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableNumber", tableNumber))
        .order("desc")
        .take(30);
      const open = orders.filter(
        (o) => ["pending", "preparing", "ready"].includes(o.status) || (o.status === "served" && (o.servedAt ?? o.updatedAt) > since)
      );
      const withItems = [];
      for (const o of open) {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect();
        withItems.push({ ...o, items: items.map((i) => ({ name: i.name, quantity: i.quantity, note: i.note })) });
      }
      const calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_table", (q) => q.eq("tableNumber", tableNumber))
        .order("desc")
        .take(20);
      result.push({
        tableNumber,
        orders: withItems,
        calls: calls.filter((c) => c.status === "pending"),
      });
    }
    return result;
  },
});

export const staffResolveCall = mutation({
  args: { staffToken: v.string(), callId: v.id("waiterCalls") },
  handler: async (ctx, { staffToken, callId }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) throw new ConvexError("Session expired. Sign in again.");
    const call = await ctx.db.get(callId);
    if (!call) throw new ConvexError("Call not found");
    if (!found.account.assignedTables.includes(call.tableNumber)) {
      throw new ConvexError("This call is not on one of your tables");
    }
    const now = Date.now();
    await ctx.db.patch(callId, { status: "resolved", resolvedAt: now });
    await ctx.db.patch(found.account._id, { lastSeenAt: now });
    await logActivity(ctx, {
      accountId: found.account._id,
      actorName: found.account.name,
      actorRole: "staff",
      kind: "call",
      tableNumber: call.tableNumber,
      note: `${found.account.name} answered Table ${call.tableNumber}: ${call.reason}`,
    });
    return true;
  },
});

// Who covers each table (first names only). Public: used for display on floor views.
export const tableCoverage = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("staffAccounts").collect();
    const map = {};
    for (const acc of accounts) {
      if (!acc.active) continue;
      for (const t of acc.assignedTables) {
        (map[t] = map[t] || []).push(acc.name.split(" ")[0]);
      }
    }
    return map;
  },
});

// Maintenance (CLI / dashboard only): remove activity rows that mention a name (test cleanup).
export const purgeActivityMatching = internalMutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const rows = await ctx.db.query("staffActivity").collect();
    let n = 0;
    for (const r of rows) {
      if ((r.note || "").includes(text) || r.actorName.includes(text)) { await ctx.db.delete(r._id); n++; }
    }
    return n;
  },
});

// One-time cleanup: where a table is on several accounts, keep it on the most recently updated one.
export const dedupeTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = (await ctx.db.query("staffAccounts").collect()).sort((a, b) => b.updatedAt - a.updatedAt);
    const taken = new Set();
    const changes = [];
    for (const acc of accounts) {
      const keep = acc.assignedTables.filter((t) => !taken.has(t));
      keep.forEach((t) => taken.add(t));
      if (keep.length !== acc.assignedTables.length) {
        const removed = acc.assignedTables.filter((t) => !keep.includes(t));
        await ctx.db.patch(acc._id, { assignedTables: keep });
        changes.push({ name: acc.name, removed });
      }
    }
    return changes;
  },
});

// ---------------------------------------------------------------------------
// Admin: activity history (Staff page). Newest first, paged with `before`.
// ---------------------------------------------------------------------------

export const history = query({
  args: {
    adminToken: v.string(),
    accountId: v.optional(v.string()),
    kinds: v.optional(v.array(v.string())),
    before: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { adminToken, accountId, kinds, before, limit }) => {
    if (!(await isAdmin(ctx, adminToken))) return { unauthorized: true, items: [], hasMore: false };
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const cutoff = Number.isFinite(before) ? before : Date.now() + 1;
    const wantKinds = Array.isArray(kinds) && kinds.length ? new Set(kinds) : null;

    let q;
    const accId = accountId ? ctx.db.normalizeId("staffAccounts", accountId) : null;
    if (accId) {
      q = ctx.db.query("staffActivity").withIndex("by_account", (x) => x.eq("accountId", accId).lt("at", cutoff)).order("desc");
    } else {
      q = ctx.db.query("staffActivity").withIndex("by_at", (x) => x.lt("at", cutoff)).order("desc");
    }

    // Scan in pages until we have enough matching rows (kinds filter is applied in memory)
    const items = [];
    let scanned = 0;
    for await (const row of q) {
      scanned++;
      if (!wantKinds || wantKinds.has(row.kind)) items.push(row);
      if (items.length > take || scanned > 2000) break;
    }
    const hasMore = items.length > take;
    return { unauthorized: false, items: items.slice(0, take), hasMore };
  },
});
