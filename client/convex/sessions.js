import { query, mutation } from "./_generated/server.js";
import { v, ConvexError } from "convex/values";
import { requireAdmin, loadStaffSession } from "./team.js";
import { isLive, findSessionByToken, findLiveSessionForTable, closeTableSessions } from "./sessionHelpers.js";

const MAX_TABLE = 999;

function validTable(n) {
  return Number.isInteger(n) && n > 0 && n <= MAX_TABLE;
}

// A guest scanned a table QR. Joins the table's open session (everyone at a table shares it)
// or starts a new one; returns the token the phone keeps and sends with its orders.
export const open = mutation({
  args: { tableNumber: v.number(), token: v.optional(v.string()) },
  handler: async (ctx, { tableNumber, token }) => {
    if (!validTable(tableNumber)) throw new ConvexError("Valid table number is required");
    const mine = token ? await findSessionByToken(ctx, token) : null;
    if (mine && isLive(mine) && mine.tableNumber === tableNumber) {
      return { token: mine.token, tableNumber, openedAt: mine.openedAt };
    }
    const existing = await findLiveSessionForTable(ctx, tableNumber);
    if (existing) return { token: existing.token, tableNumber, openedAt: existing.openedAt };

    const fresh = `ts_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
    const openedAt = Date.now();
    await ctx.db.insert("tableSessions", { tableNumber, token: fresh, openedAt });
    return { token: fresh, tableNumber, openedAt };
  },
});

// Is this phone's table still open? Polled by the menu; never throws.
export const check = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await findSessionByToken(ctx, token);
    return { valid: isLive(session), tableNumber: session ? session.tableNumber : null };
  },
});

// Admin: clear a table (guests leave; the next guest must scan again)
export const adminCloseTable = mutation({
  args: { adminToken: v.string(), tableNumber: v.number() },
  handler: async (ctx, { adminToken, tableNumber }) => {
    await requireAdmin(ctx, adminToken);
    if (!validTable(tableNumber)) throw new ConvexError("Valid table number is required");
    return await closeTableSessions(ctx, tableNumber, "cleared by admin");
  },
});

// Staff: clear one of their own tables
export const staffCloseTable = mutation({
  args: { staffToken: v.string(), tableNumber: v.number() },
  handler: async (ctx, { staffToken, tableNumber }) => {
    const found = await loadStaffSession(ctx, staffToken);
    if (!found) throw new ConvexError("Session expired. Sign in again.");
    if (!found.account.assignedTables.includes(tableNumber)) {
      throw new ConvexError("This is not one of your tables");
    }
    return await closeTableSessions(ctx, tableNumber, `cleared by ${found.account.name}`);
  },
});
