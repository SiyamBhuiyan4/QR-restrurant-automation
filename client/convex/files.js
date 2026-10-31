import { mutation } from "./_generated/server.js";
import { v } from "convex/values";

// Public URL for a file uploaded to Convex storage (dish photos and videos)
export const getFileUrl = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Uploaded file not found");
    return url;
  },
});
