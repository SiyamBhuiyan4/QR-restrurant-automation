import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrders = query({
  args: {
    status: v.optional(v.string()),
    tableNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let ordersQuery = ctx.db.query("orders");

    if (args.status) {
      ordersQuery = ordersQuery.withIndex("by_status", (q) => q.eq("status", args.status));
    } else {
      ordersQuery = ordersQuery.withIndex("by_created_at");
    }

    const orders = await ordersQuery.order("desc").take(50);

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
    orderId: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, { orderId, status }) => {
    await ctx.db.patch(orderId, {
      status,
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
