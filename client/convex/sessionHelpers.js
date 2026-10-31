// Table sessions: a table is open for ordering from the moment a guest scans its QR until
// staff settle the bill or clear the table. MAX_MS closes one that staff forgot about.
export const SESSION_MAX_MS = 12 * 60 * 60 * 1000;

export function isLive(session, now = Date.now()) {
  return !!session && session.closedAt === undefined && now - session.openedAt < SESSION_MAX_MS;
}

export async function findSessionByToken(ctx, token) {
  const value = String(token ?? "");
  if (!value) return null;
  return await ctx.db
    .query("tableSessions")
    .withIndex("by_token", (q) => q.eq("token", value))
    .first();
}

export async function findLiveSessionForTable(ctx, tableNumber) {
  const sessions = await ctx.db
    .query("tableSessions")
    .withIndex("by_table", (q) => q.eq("tableNumber", tableNumber))
    .order("desc")
    .take(10);
  return sessions.find((s) => isLive(s)) ?? null;
}

// Closes every open session on the table; returns how many were open
export async function closeTableSessions(ctx, tableNumber, reason) {
  const sessions = await ctx.db
    .query("tableSessions")
    .withIndex("by_table", (q) => q.eq("tableNumber", tableNumber))
    .order("desc")
    .take(20);
  let closed = 0;
  const now = Date.now();
  for (const s of sessions) {
    if (s.closedAt === undefined) {
      await ctx.db.patch(s._id, { closedAt: now, closedReason: reason });
      closed++;
    }
  }
  return closed;
}
