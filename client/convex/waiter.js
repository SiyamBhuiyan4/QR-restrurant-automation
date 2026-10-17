import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCalls = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let callsQuery = ctx.db.query("waiterCalls");

    if (args.status) {
      callsQuery = callsQuery.withIndex("by_status", (q) => q.eq("status", args.status));
    } else {
      callsQuery = callsQuery.withIndex("by_created_at");
    }

    const calls = await callsQuery.order("desc").take(50);
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
    callId: v.id("waiterCalls"),
  },
  handler: async (ctx, { callId }) => {
    await ctx.db.patch(callId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
    return true;
  },
});
