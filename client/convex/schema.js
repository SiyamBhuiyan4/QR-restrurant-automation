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
    images: v.optional(v.array(v.string())),
    makingVideoUrl: v.optional(v.string()),
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
    .index("by_created_at", ["createdAt"])
    .index("by_table", ["tableNumber"]),

  reviews: defineTable({
    dishId: v.string(), // dish identifier or slug
    author: v.string(),
    rating: v.number(), // 1 to 5
    comment: v.string(),
    createdAt: v.number(),
  })
    .index("by_dish", ["dishId"])
    .index("by_created_at", ["createdAt"]),

  // Staff-to-waiter messages. `id` is the client-generated message id.
  staffMessages: defineTable({
    id: v.string(),
    from: v.string(),
    fromName: v.string(),
    fromRole: v.string(),
    fromEmployeeId: v.string(),
    fromStaffId: v.string(),
    toWaiterId: v.string(),
    toWaiterName: v.string(),
    text: v.string(),
    timestamp: v.number(),
    status: v.string(),
    urgent: v.boolean(),
    isAlert: v.boolean(),
    category: v.string(), // normal, alert
    tableNumber: v.union(v.number(), v.null()),
    replies: v.array(v.any()),
    read: v.boolean(),
  })
    .index("by_message_id", ["id"])
    .index("by_recipient", ["toWaiterId", "timestamp"]),

  // Voids, discounts and void requests. `id` is the client-generated id.
  orderCorrections: defineTable({
    id: v.string(),
    type: v.string(), // void, discount, void_request
    status: v.string(), // applied, cleared, pending, approved, rejected
    orderId: v.string(),
    orderLabel: v.optional(v.string()),
    tableNumber: v.optional(v.union(v.number(), v.string(), v.null())),
    reason: v.string(),
    note: v.optional(v.string()),
    actor: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Items (void / void_request)
    itemIndexes: v.optional(v.array(v.number())),
    itemNames: v.optional(v.array(v.string())),
    wholeOrder: v.optional(v.boolean()),
    requestedBy: v.optional(v.union(v.string(), v.null())),
    requestedById: v.optional(v.union(v.string(), v.null())),
    requestedAt: v.optional(v.number()),
    // Discount
    discountType: v.optional(v.string()), // percent, fixed
    value: v.optional(v.number()),
    // Applied / resolved / cleared bookkeeping
    appliedBy: v.optional(v.union(v.string(), v.null())),
    appliedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.union(v.string(), v.null())),
    resolvedAt: v.optional(v.number()),
    clearedBy: v.optional(v.union(v.string(), v.null())),
    clearedAt: v.optional(v.number()),
  })
    .index("by_correction_id", ["id"])
    .index("by_order", ["orderId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  // Table bill settlements.
  billSettlements: defineTable({
    id: v.string(),
    billNumber: v.string(),
    tableNumber: v.number(),
    orderIds: v.array(v.string()),
    total: v.number(),
    paymentMethod: v.string(),
    paidAt: v.string(), // ISO 8601
    createdAt: v.number(),
  })
    .index("by_settlement_id", ["id"])
    .index("by_table", ["tableNumber", "createdAt"]),

  // Global failed admin PIN attempts (single row, key = "global").
  adminAttempts: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});

