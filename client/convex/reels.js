import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./team";

// Stand-alone Reels: fun / behind-the-scenes clips the admin posts that are not tied to a
// dish, so the customer feed shows them without an Add to Order bar.

// Customer feed: active reels, newest first
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const reels = await ctx.db.query("reels").withIndex("by_created_at").order("desc").collect();
    return reels
      .filter((r) => r.isActive)
      .map(({ _id, title, caption, videoUrl, posterUrl, createdAt }) => ({
        _id,
        title,
        caption,
        videoUrl,
        posterUrl,
        createdAt,
      }));
  },
});

// Admin list (includes hidden reels). A bad token returns null instead of throwing.
export const listAdmin = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    try {
      await requireAdmin(ctx, adminToken);
    } catch (_) {
      return null;
    }
    return await ctx.db.query("reels").withIndex("by_created_at").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    adminToken: v.string(),
    title: v.string(),
    caption: v.optional(v.string()),
    videoUrl: v.string(),
    posterUrl: v.optional(v.string()),
    telegramFileId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { adminToken, ...args }) => {
    await requireAdmin(ctx, adminToken);
    const title = args.title.trim();
    const videoUrl = args.videoUrl.trim();
    if (!title) throw new ConvexError("Give the reel a title");
    if (!videoUrl) throw new ConvexError("Upload a video or paste a video link");
    return await ctx.db.insert("reels", {
      title,
      caption: (args.caption || "").trim(),
      videoUrl,
      posterUrl: args.posterUrl?.trim() || undefined,
      telegramFileId: args.telegramFileId || undefined,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    adminToken: v.string(),
    id: v.id("reels"),
    title: v.optional(v.string()),
    caption: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    posterUrl: v.optional(v.string()),
    telegramFileId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { adminToken, id, ...updates }) => {
    await requireAdmin(ctx, adminToken);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("Reel not found");
    const patch = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) patch[key] = typeof val === "string" ? val.trim() : val;
    }
    if (patch.title !== undefined && !patch.title) throw new ConvexError("Give the reel a title");
    if (patch.videoUrl !== undefined && !patch.videoUrl) throw new ConvexError("A reel needs a video");
    await ctx.db.patch(id, patch);
    return true;
  },
});

export const remove = mutation({
  args: { adminToken: v.string(), id: v.id("reels") },
  handler: async (ctx, { adminToken, id }) => {
    await requireAdmin(ctx, adminToken);
    await ctx.db.delete(id);
    return true;
  },
});
