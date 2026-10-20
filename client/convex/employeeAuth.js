import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const ITERATIONS = 100000;
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

const enc = new TextEncoder();

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(saltHex), iterations: ITERATIONS },
    key,
    256
  );
  return toHex(bits);
}

async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export async function hashPassword(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, passwordHash: await pbkdf2(password, salt) };
}

export async function verifyPassword(password, salt, passwordHash) {
  return (await pbkdf2(password, salt)) === passwordHash;
}

export async function requireEmployee(ctx, token) {
  if (!token) throw new Error("UNAUTHORIZED");
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("employeeSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) throw new Error("UNAUTHORIZED");
  const employee = await ctx.db.get(session.employeeId);
  if (!employee || !employee.active) throw new Error("UNAUTHORIZED");
  return employee;
}

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }) => {
    const u = username.trim().toLowerCase();
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_username", (q) => q.eq("username", u))
      .unique();
    const now = Date.now();
    if (!employee || !employee.active) throw new Error("INVALID_CREDENTIALS");
    if (employee.lockedUntil && employee.lockedUntil > now) throw new Error("LOCKED");

    const ok = await verifyPassword(password, employee.salt, employee.passwordHash);
    if (!ok) {
      const fails = (employee.failedLogins ?? 0) + 1;
      await ctx.db.patch(employee._id, {
        failedLogins: fails,
        lockedUntil: fails >= MAX_FAILS ? now + LOCK_MS : undefined,
      });
      throw new Error("INVALID_CREDENTIALS");
    }

    await ctx.db.patch(employee._id, { failedLogins: 0, lockedUntil: undefined });
    const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
    await ctx.db.insert("employeeSessions", {
      employeeId: employee._id,
      tokenHash: await sha256Hex(token),
      createdAt: now,
      expiresAt: now + SESSION_MS,
    });
    return {
      token,
      employee: { id: employee._id, name: employee.name, role: employee.role, username: employee.username },
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("employeeSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    try {
      const e = await requireEmployee(ctx, token);
      return { id: e._id, name: e.name, role: e.role, username: e.username };
    } catch {
      return null;
    }
  },
});

export async function requireAdmin(ctx, token) {
  if (!token) throw new Error("UNAUTHORIZED");
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) throw new Error("UNAUTHORIZED");
  return true;
}

export const adminLogin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const row = await ctx.db.query("adminAuth").first();
    const now = Date.now();
    if (!row) throw new Error("INVALID_CREDENTIALS");
    if (row.lockedUntil && row.lockedUntil > now) throw new Error("LOCKED");
    const ok = await verifyPassword(pin, row.salt, row.passwordHash);
    if (!ok) {
      const fails = (row.failedLogins ?? 0) + 1;
      await ctx.db.patch(row._id, {
        failedLogins: fails,
        lockedUntil: fails >= MAX_FAILS ? now + LOCK_MS : undefined,
      });
      throw new Error("INVALID_CREDENTIALS");
    }
    await ctx.db.patch(row._id, { failedLogins: 0, lockedUntil: undefined });
    const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
    await ctx.db.insert("adminSessions", {
      tokenHash: await sha256Hex(token),
      createdAt: now,
      expiresAt: now + SESSION_MS,
    });
    return { token };
  },
});

export const adminLogout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});

export const setAdminPin = internalMutation({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    if (pin.length < 6) throw new Error("INVALID_INPUT");
    const { salt, passwordHash } = await hashPassword(pin);
    const row = await ctx.db.query("adminAuth").first();
    const data = { passwordHash, salt, failedLogins: 0, lockedUntil: undefined, updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("adminAuth", data);
    return null;
  },
});

export const createEmployee = mutation({
  args: {
    adminToken: v.string(),
    username: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, { adminToken, username, password, name, role }) => {
    await requireAdmin(ctx, adminToken);
    const u = username.trim().toLowerCase();
    if (!u || password.length < 6) throw new Error("INVALID_INPUT");
    const exists = await ctx.db
      .query("employees")
      .withIndex("by_username", (q) => q.eq("username", u))
      .unique();
    if (exists) throw new Error("USERNAME_TAKEN");
    const { salt, passwordHash } = await hashPassword(password);
    return await ctx.db.insert("employees", {
      username: u,
      passwordHash,
      salt,
      role,
      name: name.trim(),
      active: true,
      failedLogins: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateEmployee = mutation({
  args: {
    adminToken: v.string(),
    employeeId: v.id("employees"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { adminToken, employeeId, name, role }) => {
    await requireAdmin(ctx, adminToken);
    const patch = {};
    if (name !== undefined) patch.name = name.trim();
    if (role !== undefined) patch.role = role;
    await ctx.db.patch(employeeId, patch);
    return null;
  },
});

export const deactivateEmployee = mutation({
  args: { adminToken: v.string(), employeeId: v.id("employees") },
  handler: async (ctx, { adminToken, employeeId }) => {
    await requireAdmin(ctx, adminToken);
    await ctx.db.patch(employeeId, { active: false });
    const sessions = await ctx.db
      .query("employeeSessions")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return null;
  },
});

export const resetEmployeePassword = mutation({
  args: {
    adminToken: v.string(),
    employeeId: v.id("employees"),
    newPassword: v.string(),
  },
  handler: async (ctx, { adminToken, employeeId, newPassword }) => {
    await requireAdmin(ctx, adminToken);
    if (newPassword.length < 6) throw new Error("INVALID_INPUT");
    const { salt, passwordHash } = await hashPassword(newPassword);
    await ctx.db.patch(employeeId, {
      salt,
      passwordHash,
      failedLogins: 0,
      lockedUntil: undefined,
    });
    const sessions = await ctx.db
      .query("employeeSessions")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return null;
  },
});
