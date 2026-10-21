import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Admin PIN check. The PIN lives only in the Convex environment variable
 * ADMIN_MASTER_PIN. If it is not set, every attempt fails (fail closed).
 *
 * Convex actions have no client IP, so the limit is global: after
 * MAX_FAILED_ATTEMPTS failures inside WINDOW_MS, all checks return false
 * until the window expires.
 */
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const KEY = "global";

async function loadAttemptRow(ctx) {
  return await ctx.db
    .query("adminAttempts")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .first();
}

// Returns true when the global limit is currently reached.
export const beginAttempt = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await loadAttemptRow(ctx);
    if (!row) return false;
    if (Date.now() - row.windowStart >= WINDOW_MS) {
      await ctx.db.delete(row._id);
      return false;
    }
    return row.count >= MAX_FAILED_ATTEMPTS;
  },
});

export const recordFailure = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const row = await loadAttemptRow(ctx);
    if (!row || now - row.windowStart >= WINDOW_MS) {
      if (row) await ctx.db.delete(row._id);
      await ctx.db.insert("adminAttempts", { key: KEY, count: 1, windowStart: now });
      return;
    }
    await ctx.db.patch(row._id, { count: row.count + 1 });
  },
});

export const resetAttempts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await loadAttemptRow(ctx);
    if (row) await ctx.db.delete(row._id);
  },
});

export const verifyAdminPin = action({
  args: { pin: v.string() },
  handler: async (ctx, { pin }) => {
    const adminPin = String(process.env.ADMIN_MASTER_PIN ?? "").trim();
    if (!adminPin) return false;

    const blocked = await ctx.runMutation(internal.auth.beginAttempt, {});
    if (blocked) return false;

    const given = String(pin ?? "").trim();
    if (given && given === adminPin) {
      await ctx.runMutation(internal.auth.resetAttempts, {});
      return true;
    }

    await ctx.runMutation(internal.auth.recordFailure, {});
    return false;
  },
});
