import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

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

// Pending calls only, newest first (Express GET /api/waiter/calls).
export const getActiveCalls = query({
  args: {},
  handler: async (ctx) => {
    const calls = await ctx.db
      .query("waiterCalls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    return calls;
  },
});

// Express POST /api/waiter/call. `reason` defaults to "waiter" (Express default).
// assignedEmployee* / routingDetail are echoed back in `data` only, not stored (same as Express).
export const createCall = mutation({
  args: {
    tableNumber: v.number(),
    reason: v.optional(v.string()),
    assignedEmployeeId: v.optional(v.string()),
    assignedEmployeeName: v.optional(v.string()),
    assignedEmployeeRole: v.optional(v.string()),
    routingDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.tableNumber || args.tableNumber <= 0 || !Number.isFinite(args.tableNumber)) {
      throw new ConvexError("Valid table number is required");
    }
    const reason = (args.reason ?? "waiter").trim() || "waiter";
    const createdAt = Date.now();

    const callId = await ctx.db.insert("waiterCalls", {
      tableNumber: args.tableNumber,
      reason,
      status: "pending",
      createdAt,
    });

    const assignedEmployeeName = args.assignedEmployeeName ?? null;
    const routingDetail =
      args.routingDetail ??
      (assignedEmployeeName
        ? `Table #${args.tableNumber} requested assistance -> Routed to assigned employee: ${assignedEmployeeName}`
        : null);

    return {
      callId,
      success: true,
      data: {
        _id: callId,
        tableNumber: args.tableNumber,
        reason,
        status: "pending",
        createdAt,
        assignedEmployeeId: args.assignedEmployeeId ?? null,
        assignedEmployeeName,
        assignedEmployeeRole: args.assignedEmployeeRole ?? null,
        routingDetail,
      },
    };
  },
});

// Express PATCH /api/waiter/calls/:id/resolve. Throws "Waiter call not found" like Express 404.
export const resolveCall = mutation({
  args: {
    callId: v.string(),
  },
  handler: async (ctx, { callId }) => {
    let existing = null;
    try {
      existing = await ctx.db.get(callId);
    } catch (_) {}

    if (!existing) {
      throw new ConvexError("Waiter call not found");
    }

    await ctx.db.patch(existing._id, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
    return true;
  },
});

