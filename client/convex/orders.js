import { query, mutation } from "./_generated/server.js";
import { v, ConvexError } from "convex/values";

const ORDER_STATUSES = ["pending", "preparing", "ready", "served", "completed", "cancelled"];

// Express /api/orders GET: `status` may be a comma list, `table` (alias tableNumber) filters
// by table, `limit` defaults to 50 (max 500).
export const getOrders = query({
  args: {
    status: v.optional(v.string()), // single or comma-separated list, e.g. "pending,preparing"
    tableNumber: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 500));
    const statuses = args.status
      ? args.status.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    let builder;
    if (args.tableNumber !== undefined) {
      builder = ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableNumber", args.tableNumber))
        .order("desc");
    } else {
      builder = ctx.db.query("orders").withIndex("by_created_at").order("desc");
    }
    if (statuses.length > 0) {
      builder = builder.filter((q) =>
        q.or(...statuses.map((s) => q.eq(q.field("status"), s)))
      );
    }
    const orders = await builder.take(limit);

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        let voiceUrl = order.voiceNoteUrl;
        if (!voiceUrl && order.voiceStorageId) {
          voiceUrl = await ctx.storage.getUrl(order.voiceStorageId);
        }

        return {
          ...order,
          items,
          voiceNoteUrl: voiceUrl || order.voiceNoteUrl,
        };
      })
    );

    return ordersWithItems;
  },
});

export const getOrderById = query({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, { orderId }) => {
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return null;
    }
    const cleanId = orderId.trim();
    let order = null;

    // 1. Check by orderNumber first (e.g. ORD-T1-1234 or SD-1234)
    order = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("orderNumber"), cleanId))
      .first();

    // 2. If not found by orderNumber, check if it matches a Convex _id
    if (!order) {
      try {
        order = await ctx.db.get(cleanId);
      } catch (_) {
        order = null;
      }
    }

    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    let voiceUrl = order.voiceNoteUrl;
    if (!voiceUrl && order.voiceStorageId) {
      voiceUrl = await ctx.storage.getUrl(order.voiceStorageId);
    }

    return {
      ...order,
      items,
      voiceNoteUrl: voiceUrl || order.voiceNoteUrl,
    };
  },
});


export const createOrder = mutation({
  args: {
    tableNumber: v.number(),
    items: v.array(
      v.object({
        menuItemId: v.optional(v.string()),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        note: v.optional(v.string()),
      })
    ),
    voiceStorageId: v.optional(v.string()),
    voiceNoteUrl: v.optional(v.string()),
    generalNote: v.optional(v.string()),
    totalAmount: v.optional(v.number()), // computed from items when omitted (Express behaviour)
  },
  handler: async (ctx, args) => {
    if (!args.tableNumber || args.tableNumber <= 0 || !Number.isFinite(args.tableNumber)) {
      throw new ConvexError("Valid table number is required");
    }
    if (!Array.isArray(args.items) || args.items.length === 0) {
      throw new ConvexError("Order must contain at least one item");
    }

    const items = args.items.map((it) => ({
      menuItemId: it.menuItemId ? ctx.db.normalizeId("menuItems", it.menuItemId) ?? undefined : undefined,
      name: it.name || "Menu Item",
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      note: it.note || undefined,
    }));

    let totalAmount = args.totalAmount;
    if (totalAmount === undefined || totalAmount === null) {
      totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    }
    totalAmount = Math.round(Number(totalAmount) * 100) / 100;

    const now = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-T${args.tableNumber}-${rand}`;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      tableNumber: args.tableNumber,
      status: "pending",
      totalAmount,
      voiceStorageId: args.voiceStorageId,
      voiceNoteUrl: args.voiceNoteUrl,
      generalNote: args.generalNote?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of items) {
      await ctx.db.insert("orderItems", {
        orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note,
      });
    }

    return { orderId, orderNumber, success: true };
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { orderId, status }) => {
    if (!status || typeof status !== "string") {
      throw new ConvexError("Status is required");
    }
    const normalizedStatus = status.trim().toLowerCase();
    if (!ORDER_STATUSES.includes(normalizedStatus)) {
      throw new ConvexError(`Invalid status '${status}'. Must be one of: ${ORDER_STATUSES.join(", ")}`);
    }

    let target = null;
    // 1. Try finding by Convex ID directly
    try {
      target = await ctx.db.get(orderId);
    } catch (_) {}

    // 2. Try finding by orderNumber (e.g. ORD-T1-1234)
    if (!target) {
      target = await ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("orderNumber"), orderId))
        .first();
    }

    if (!target) {
      throw new ConvexError("Order not found");
    }

    await ctx.db.patch(target._id, {
      status: normalizedStatus,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

