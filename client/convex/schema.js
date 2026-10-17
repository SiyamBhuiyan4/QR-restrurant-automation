import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }).index("by_slug", ["slug"]),

  menuItems: defineTable({
    categoryId: v.optional(v.id("categories")),
    categorySlug: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    imageUrl: v.string(),
    isVeg: v.boolean(),
    isSpicy: v.boolean(),
    isAvailable: v.boolean(),
  })
    .index("by_category", ["categorySlug"])
    .index("by_availability", ["isAvailable"]),

  orders: defineTable({
    orderNumber: v.string(),
    tableNumber: v.number(),
    status: v.string(), // pending, preparing, ready, served, cancelled
    totalAmount: v.number(),
    voiceStorageId: v.optional(v.string()),
    voiceNoteUrl: v.optional(v.string()),
    generalNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_table", ["tableNumber"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.optional(v.id("menuItems")),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    note: v.optional(v.string()),
  }).index("by_order", ["orderId"]),

  waiterCalls: defineTable({
    tableNumber: v.number(),
    reason: v.string(),
    status: v.string(), // pending, resolved
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
