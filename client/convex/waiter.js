import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCalls = query({
  args: {
    status: v.optional(v.string()),
    tableNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let calls;

    if (args.tableNumber !== undefined) {
      calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_table", (q) => q.eq("tableNumber", args.tableNumber))
        .order("desc")
        .take(50);
      if (args.status) {
        calls = calls.filter((c) => c.status === args.status);
      }
    } else if (args.status) {
      calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(50);
    } else {
      calls = await ctx.db
        .query("waiterCalls")
        .withIndex("by_created_at")
        .order("desc")
        .take(50);
    }

    return calls;
  },
});

export const createCall = mutation({
  args: {
    tableNumber: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const callId = await ctx.db.insert("waiterCalls", {
      tableNumber: args.tableNumber,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return { callId, success: true };
  },
});

export const resolveCall = mutation({
  args: {
    callId: v.string(),
  },
  handler: async (ctx, { callId }) => {
    try {
      const existing = await ctx.db.get(callId);
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "resolved",
          resolvedAt: Date.now(),
        });
        return true;
      }
    } catch (_) {}

    const match = await ctx.db
      .query("waiterCalls")
      .filter((q) => q.eq(q.field("_id"), callId))
      .first();

    if (match) {
      await ctx.db.patch(match._id, {
        status: "resolved",
        resolvedAt: Date.now(),
      });
      return true;
    }

    return false;
  },
});

