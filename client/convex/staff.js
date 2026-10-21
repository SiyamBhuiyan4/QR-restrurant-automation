import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const MAX_TEXT_LENGTH = 500;
const MAX_ID_LENGTH = 100;

function cleanId(value, max = MAX_ID_LENGTH) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

// Recipient's messages, newest first.
export const listForRecipient = query({
  args: {
    recipient: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { recipient, limit }) => {
    const toWaiterId = cleanId(recipient);
    if (!toWaiterId) {
      throw new ConvexError("recipient is required");
    }
    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);

    return await ctx.db
      .query("staffMessages")
      .withIndex("by_recipient", (q) => q.eq("toWaiterId", toWaiterId))
      .order("desc")
      .take(take);
  },
});

// Accepts the message object the client builds (id, toWaiterId, text, ...).
// Re-sending an existing id returns the stored message unchanged.
export const send = mutation({
  args: { message: v.any() },
  handler: async (ctx, { message }) => {
    const body = message && typeof message === "object" ? message : {};

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      throw new ConvexError("Message text is required");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new ConvexError(`Message must be ${MAX_TEXT_LENGTH} characters or fewer`);
    }

    const toWaiterId = cleanId(body.toWaiterId);
    if (!toWaiterId) {
      throw new ConvexError("Recipient (toWaiterId) is required");
    }

    const now = Date.now();
    const id = cleanId(body.id, 100) || `msg-${now}-${Math.random().toString(36).slice(2, 6)}`;

    const existing = await ctx.db
      .query("staffMessages")
      .withIndex("by_message_id", (q) => q.eq("id", id))
      .first();
    if (existing) {
      return existing;
    }

    const isAlert = body.isAlert === true || body.category === "alert";

    const docId = await ctx.db.insert("staffMessages", {
      id,
      from: cleanId(body.from, 30) || (body.fromEmployeeId ? "Employee" : "Admin"),
      fromName: cleanId(body.fromName, 80) || "Unknown",
      fromRole: cleanId(body.fromRole, 80),
      fromEmployeeId: cleanId(body.fromEmployeeId, 40),
      fromStaffId: cleanId(body.fromStaffId, 40),
      toWaiterId,
      toWaiterName: cleanId(body.toWaiterName, 80) || "Floor Specialist",
      text,
      timestamp: Number.isFinite(Number(body.timestamp)) ? Number(body.timestamp) : now,
      status: cleanId(body.status, 20) || "pending",
      urgent: body.urgent !== false,
      isAlert,
      category: isAlert ? "alert" : "normal",
      tableNumber: body.tableNumber ? Number(body.tableNumber) || null : null,
      replies: [],
      read: false,
    });

    return await ctx.db.get(docId);
  },
});

export const markRead = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const messageId = cleanId(id);
    if (!messageId) {
      throw new ConvexError("Invalid message ID");
    }
    const message = await ctx.db
      .query("staffMessages")
      .withIndex("by_message_id", (q) => q.eq("id", messageId))
      .first();
    if (!message) {
      throw new ConvexError("Message not found");
    }
    await ctx.db.patch(message._id, { read: true });
    return await ctx.db.get(message._id);
  },
});
