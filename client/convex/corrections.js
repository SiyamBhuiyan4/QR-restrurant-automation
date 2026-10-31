import { query, mutation } from "./_generated/server.js";
import { v, ConvexError } from "convex/values";

const CORRECTION_TYPES = ["void", "discount", "void_request"];
const DISCOUNT_TYPES = ["percent", "fixed"];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function isNonEmptyId(value) {
  return (typeof value === "string" || typeof value === "number") && String(value).trim() !== "" && String(value).length <= 64;
}

function validateItemIndexes(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ok = value.every((n) => Number.isInteger(n) && n >= 0 && n < 1000);
  return ok ? [...new Set(value)] : null;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function findCorrection(ctx, id) {
  return await ctx.db
    .query("orderCorrections")
    .withIndex("by_correction_id", (q) => q.eq("id", String(id)))
    .first();
}

// All corrections, newest first.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("orderCorrections")
      .withIndex("by_created_at")
      .order("desc")
      .take(500);
  },
});

// Create a void, discount, or void request. Re-sending an existing id replaces it.
export const create = mutation({
  args: { correction: v.any() },
  handler: async (ctx, { correction }) => {
    const body = correction && typeof correction === "object" ? correction : {};
    const type = body.type;
    if (!CORRECTION_TYPES.includes(type)) {
      throw new ConvexError(`type must be one of: ${CORRECTION_TYPES.join(", ")}`);
    }
    if (!isNonEmptyId(body.orderId)) {
      throw new ConvexError("orderId is required");
    }
    const reason = cleanText(body.reason, 200);
    if (!reason) {
      throw new ConvexError("reason is required");
    }
    if (body.id !== undefined && (typeof body.id !== "string" || !ID_PATTERN.test(body.id))) {
      throw new ConvexError("id must be 1-64 characters: letters, digits, _ or -");
    }

    const now = Date.now();
    const id = body.id || generateId(type === "void_request" ? "vreq" : type);
    const tableNumber = body.tableNumber ?? null;
    const base = {
      id,
      type,
      orderId: String(body.orderId),
      orderLabel: cleanText(body.orderLabel, 120),
      tableNumber: typeof tableNumber === "number" || typeof tableNumber === "string" ? tableNumber : null,
      reason,
      note: cleanText(body.note, 500),
      actor: body.actor && typeof body.actor === "object" ? body.actor : null,
      createdAt: now,
      updatedAt: now,
    };

    let record;

    if (type === "discount") {
      const discountType = body.discountType;
      if (!DISCOUNT_TYPES.includes(discountType)) {
        throw new ConvexError("discountType must be percent or fixed");
      }
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        throw new ConvexError("value must be a number above zero");
      }
      if (discountType === "percent" && value > 100) {
        throw new ConvexError("percent discount cannot exceed 100");
      }
      record = {
        ...base,
        status: "applied",
        discountType,
        value,
        appliedBy: cleanText(body.appliedBy, 100) || null,
        appliedAt: now,
      };
    } else {
      const itemIndexes = validateItemIndexes(body.itemIndexes);
      if (!itemIndexes) {
        throw new ConvexError("itemIndexes must be a non-empty array of item positions");
      }
      const itemNames = Array.isArray(body.itemNames)
        ? body.itemNames.map((n) => cleanText(n, 120)).slice(0, 200)
        : [];
      record = {
        ...base,
        status: type === "void_request" ? "pending" : "applied",
        itemIndexes,
        itemNames,
        wholeOrder: body.wholeOrder === true,
        requestedBy: cleanText(body.requestedBy, 100) || null,
        requestedById: cleanText(body.requestedById, 100) || null,
        requestedAt: now,
      };
      if (type === "void") {
        record.appliedBy = cleanText(body.appliedBy, 100) || null;
        record.appliedAt = now;
      }
    }

    const existing = await findCorrection(ctx, id);
    if (existing) {
      // Same as the Express upsert: replace the payload, keep the original createdAt.
      await ctx.db.replace(existing._id, { ...record, createdAt: existing.createdAt });
      return await ctx.db.get(existing._id);
    }
    const docId = await ctx.db.insert("orderCorrections", record);
    return await ctx.db.get(docId);
  },
});

// Approve/reject a pending void request, or clear an applied discount.
export const patchStatus = mutation({
  args: {
    id: v.string(),
    status: v.string(),
    resolvedBy: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, resolvedBy }) => {
    const current = await findCorrection(ctx, id);
    if (!current) {
      throw new ConvexError("Correction not found");
    }
    const by = cleanText(resolvedBy, 100) || null;
    const now = Date.now();

    if (current.type === "void_request") {
      if (!["approved", "rejected"].includes(status)) {
        throw new ConvexError("status must be approved or rejected for a void request");
      }
      if (current.status !== "pending") {
        throw new ConvexError("Void request is no longer pending");
      }
      await ctx.db.patch(current._id, { status, resolvedBy: by, resolvedAt: now, updatedAt: now });
    } else if (current.type === "discount") {
      if (status !== "cleared") {
        throw new ConvexError("status must be cleared for a discount");
      }
      if (current.status !== "applied") {
        throw new ConvexError("Discount is already cleared");
      }
      await ctx.db.patch(current._id, { status: "cleared", clearedBy: by, clearedAt: now, updatedAt: now });
    } else {
      throw new ConvexError("Voids cannot be changed");
    }

    return await ctx.db.get(current._id);
  },
});
