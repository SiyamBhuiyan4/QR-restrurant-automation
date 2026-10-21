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
    // Who last moved the order through the kitchen (staff account), for the admin monitor
    handledById: v.optional(v.string()),
    handledByName: v.optional(v.string()),
    preparingAt: v.optional(v.number()),
    readyAt: v.optional(v.number()),
    servedAt: v.optional(v.number()),
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

  // Staff accounts created by the admin. Passwords are PBKDF2-SHA256 hashes.
  staffAccounts: defineTable({
    username: v.string(), // lowercase, unique
    name: v.string(),
    role: v.string(), // legacy: kitchen, waiter, manager; new accounts use "staff"
    title: v.optional(v.string()), // job title shown to others, e.g. "Head Chef"
    kitchenAccess: v.optional(v.boolean()), // can run the kitchen screen (unset: role kitchen/manager)
    station: v.string(), // e.g. "Grill", "Main Hall"
    assignedTables: v.array(v.number()),
    active: v.boolean(),
    passwordHash: v.string(),
    salt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
  }).index("by_username", ["username"]),

  staffSessions: defineTable({
    token: v.string(),
    accountId: v.id("staffAccounts"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_account", ["accountId"]),

  adminSessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // What staff did and what the admin assigned: shown on the admin monitor.
  staffActivity: defineTable({
    accountId: v.optional(v.id("staffAccounts")),
    actorName: v.string(),
    actorRole: v.string(),
    kind: v.string(), // login, logout, order_status, assignment, account
    orderId: v.optional(v.string()),
    orderNumber: v.optional(v.string()),
    tableNumber: v.optional(v.number()),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    note: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_account", ["accountId", "at"]),

  // Conversations. key = "staff:<accountId>" (admin <-> one staff member) or
  // "guest:<table>:<guestId>" (one guest's phone at a table <-> that table's staff + admin).
  chatThreads: defineTable({
    key: v.string(),
    kind: v.string(), // staff, guest
    accountId: v.optional(v.id("staffAccounts")),
    tableNumber: v.optional(v.number()),
    guestId: v.optional(v.string()),
    lastMessageAt: v.number(),
    lastText: v.string(),
    lastSenderType: v.string(), // admin, staff, guest
    lastIsAlert: v.boolean(),
    adminReadAt: v.number(),
    staffReadAt: v.number(),
    guestReadAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_last", ["lastMessageAt"])
    .index("by_account", ["accountId"])
    .index("by_table", ["tableNumber", "lastMessageAt"]),

  chatMessages: defineTable({
    threadKey: v.string(),
    senderType: v.string(), // admin, staff, guest
    senderId: v.optional(v.string()),
    senderName: v.string(),
    text: v.string(),
    isAlert: v.boolean(),
    createdAt: v.number(),
  }).index("by_thread", ["threadKey", "createdAt"]),

  // Telegram download paths for dish media (file_id -> file_path), refreshed hourly.
  telegramFiles: defineTable({
    fileId: v.string(),
    filePath: v.string(),
    fetchedAt: v.number(),
  }).index("by_file_id", ["fileId"]),

  // Global failed admin PIN attempts (single row, key = "global").
  adminAttempts: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});

