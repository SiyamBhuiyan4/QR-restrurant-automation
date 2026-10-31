import { action, internalMutation, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";

/**
 * Dish photos and videos live in a Telegram channel, not in Convex storage.
 *
 * Upload: the browser puts the file in Convex storage, mirrorToTelegram sends it to the
 * channel, keeps only Telegram's file_id, deletes the Convex copy (so it doesn't count
 * against storage) and returns a permanent link on this deployment:
 *     https://<deployment>.convex.site/telegram-media/<file_id>.jpg|.mp4
 * Serving: that link is the HTTP route in http.js. It looks up the file on Telegram with
 * the bot token (server-side only) and streams it, so the token never reaches a browser
 * and the link never expires (Telegram's own file links last about an hour).
 */

// Telegram bots can only download files up to 20 MB, so larger files could not be served back.
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const FILE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
// Telegram file paths are valid for at least an hour; refresh a little before that.
const PATH_TTL_MS = 50 * 60 * 1000;

export function isValidFileId(id) {
  return typeof id === "string" && FILE_ID_RE.test(id);
}

export const mirrorToTelegram = action({
  args: { storageId: v.string(), kind: v.union(v.literal("photo"), v.literal("video")) },
  handler: async (ctx, { storageId, kind }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new Error("Telegram is not configured on the server.");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Uploaded file not found");
    if (blob.size > MAX_MEDIA_BYTES) {
      await ctx.storage.delete(storageId);
      throw new Error("File is larger than 20 MB. Please upload a smaller or compressed file.");
    }

    const form = new FormData();
    form.append("chat_id", chatId);
    // Videos go up as documents-friendly video; photos as photo (Telegram re-encodes to JPEG)
    const field = kind === "video" ? "video" : "photo";
    form.append(field, blob, kind === "video" ? "dish.mp4" : "dish.jpg");
    if (kind === "video") form.append("supports_streaming", "true");

    const send = await fetch(`https://api.telegram.org/bot${token}/${kind === "video" ? "sendVideo" : "sendPhoto"}`, {
      method: "POST",
      body: form,
    });
    const sent = await send.json();
    if (!sent.ok) throw new Error(sent.description || "Telegram upload failed");

    const msg = sent.result;
    const fileId = kind === "video"
      ? (msg.video?.file_id || msg.document?.file_id)
      : msg.photo?.[msg.photo.length - 1]?.file_id;
    if (!isValidFileId(fileId)) throw new Error("Telegram did not return a file id");

    // The channel now holds the file; drop the temporary Convex copy
    await ctx.storage.delete(storageId);

    const site = process.env.CONVEX_SITE_URL;
    return `${site}/telegram-media/${fileId}.${kind === "video" ? "mp4" : "jpg"}`;
  },
});

// --- file_path cache used by the /telegram-media route ---------------------------------

export const cachedPath = internalQuery({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) => {
    const row = await ctx.db
      .query("telegramFiles")
      .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
      .first();
    if (!row || Date.now() - row.fetchedAt > PATH_TTL_MS) return null;
    return row.filePath;
  },
});

export const savePath = internalMutation({
  args: { fileId: v.string(), filePath: v.string() },
  handler: async (ctx, { fileId, filePath }) => {
    const row = await ctx.db
      .query("telegramFiles")
      .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
      .first();
    if (row) await ctx.db.patch(row._id, { filePath, fetchedAt: Date.now() });
    else await ctx.db.insert("telegramFiles", { fileId, filePath, fetchedAt: Date.now() });
  },
});

// Look up (or refresh) Telegram's download path for a file_id. Returns null if unknown.
export async function resolveFilePath(ctx, fileId, { fresh = false } = {}) {
  if (!fresh) {
    const cached = await ctx.runQuery(internal.media.cachedPath, { fileId });
    if (cached) return cached;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const info = await (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`)).json();
  if (!info.ok || !info.result?.file_path) return null;
  await ctx.runMutation(internal.media.savePath, { fileId, filePath: info.result.file_path });
  return info.result.file_path;
}
