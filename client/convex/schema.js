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

  adminAuth: defineTable({
    passwordHash: v.string(),
    salt: v.string(),
    failedLogins: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  adminSessions: defineTable({
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_tokenHash", ["tokenHash"]),

  employees: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    role: v.string(),
    name: v.string(),
    active: v.boolean(),
    failedLogins: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_username", ["username"]),

  employeeSessions: defineTable({
    employeeId: v.id("employees"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_employee", ["employeeId"]),

  reviews: defineTable({
    dishId: v.string(), // dish identifier or slug
    author: v.string(),
    rating: v.number(), // 1 to 5
    comment: v.string(),
    createdAt: v.number(),
  })
    .index("by_dish", ["dishId"])
    .index("by_created_at", ["createdAt"]),
});

