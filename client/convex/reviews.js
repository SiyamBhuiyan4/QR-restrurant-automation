import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

/**
 * Get all reviews for a specific dish, sorted newest first
 */
export const getReviews = query({
  args: {
    dishId: v.string(),
  },
  handler: async (ctx, { dishId }) => {
    if (!dishId) return [];
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_dish", (q) => q.eq("dishId", dishId))
      .collect();

    // Sort newest first
    return reviews.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Add a new customer review for a dish
 */
export const addReview = mutation({
  args: {
    dishId: v.string(),
    author: v.string(),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("reviews", {
      dishId: args.dishId,
      author: args.author.trim() || "Verified Guest",
      rating: Math.min(5, Math.max(1, args.rating)),
      comment: args.comment.trim(),
      createdAt: Date.now(),
    });

    return reviewId;
  },
});
