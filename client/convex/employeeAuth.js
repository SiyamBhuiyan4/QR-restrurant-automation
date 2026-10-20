import { mutation, query } from "./_generated/server";
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
