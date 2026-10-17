import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrders = query({
  args: {
    status: v.optional(v.string()),
    tableNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.tableNumber !== undefined) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_table", (q) => q.eq("tableNumber", args.tableNumber))
        .order("desc")
        .take(50);
      if (args.status) {
        orders = orders.filter((o) => o.status === args.status);
      }
    } else if (args.status) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(50);
    } else {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_created_at")
        .order("desc")
        .take(50);
    }

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
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-T${args.tableNumber}-${rand}`;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      tableNumber: args.tableNumber,
      status: "pending",
      totalAmount: args.totalAmount,
      voiceStorageId: args.voiceStorageId,
      voiceNoteUrl: args.voiceNoteUrl,
      generalNote: args.generalNote,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
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
    // 1. Try finding by Convex ID directly
    try {
      const existing = await ctx.db.get(orderId);
      if (existing) {
        await ctx.db.patch(existing._id, {
          status,
          updatedAt: Date.now(),
        });
        return true;
      }
    } catch (_) {}

    // 2. Try finding by orderNumber (e.g. ORD-T1-1234 or SD-1234)
    const byOrderNum = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("orderNumber"), orderId))
      .first();

    if (byOrderNum) {
      await ctx.db.patch(byOrderNum._id, {
        status,
        updatedAt: Date.now(),
      });
      return true;
    }

    return false;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

