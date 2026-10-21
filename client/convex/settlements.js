import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function isNonEmptyId(value) {
  return (typeof value === "string" || typeof value === "number") && String(value).trim() !== "" && String(value).length <= 64;
}

// Record a table bill settlement.
export const create = mutation({
  args: { settlement: v.any() },
  handler: async (ctx, { settlement }) => {
    const body = settlement && typeof settlement === "object" ? settlement : {};

    const billNumber = cleanText(body.billNumber, 40);
    if (!billNumber) throw new ConvexError("billNumber is required");

    const tableNumber = Number(body.tableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      throw new ConvexError("tableNumber must be a positive integer");
    }

    if (!Array.isArray(body.orderIds) || body.orderIds.length === 0 || !body.orderIds.every(isNonEmptyId)) {
      throw new ConvexError("orderIds must be a non-empty array of order ids");
    }

    const total = Number(body.total);
    if (!Number.isFinite(total) || total < 0) {
      throw new ConvexError("total must be a number of zero or more");
    }

    const paymentMethod = cleanText(body.paymentMethod, 40);
    if (!paymentMethod) throw new ConvexError("paymentMethod is required");

    const paidAtDate = new Date(body.paidAt);
    if (!body.paidAt || Number.isNaN(paidAtDate.getTime())) {
      throw new ConvexError("paidAt must be a valid date");
    }

    const now = Date.now();
    const id = `settle-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const docId = await ctx.db.insert("billSettlements", {
      id,
      billNumber,
      tableNumber,
      orderIds: body.orderIds.map(String),
      total,
      paymentMethod,
      paidAt: paidAtDate.toISOString(),
      createdAt: now,
    });
    return await ctx.db.get(docId);
  },
});
