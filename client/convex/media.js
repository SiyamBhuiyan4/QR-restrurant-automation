import { action } from "./_generated/server";
import { v } from "convex/values";

// Mirrors a dish photo or video (already in Convex storage) to the Telegram media channel
// and returns a Telegram CDN URL. The bot token lives in Convex env, never in the browser.
export const mirrorToTelegram = action({
  args: { storageId: v.string(), kind: v.union(v.literal("photo"), v.literal("video")) },
  handler: async (ctx, { storageId, kind }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) throw new Error("Telegram is not configured on the server.");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Uploaded file not found");

    const form = new FormData();
    form.append("chat_id", chatId);
    const field = kind === "video" ? "video" : "photo";
    form.append(field, blob, kind === "video" ? "profile.mp4" : "photo.jpg");

    const send = await fetch(`https://api.telegram.org/bot${token}/${kind === "video" ? "sendVideo" : "sendPhoto"}`, {
      method: "POST",
      body: form,
    });
    const sent = await send.json();
    if (!sent.ok) throw new Error(sent.description || "Telegram upload failed");

    const msg = sent.result;
    const fileId = kind === "video" ? msg.video?.file_id : msg.photo[msg.photo.length - 1].file_id;
    const info = await (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)).json();
    if (!info.ok) throw new Error(info.description || "Could not read Telegram file");
    return `https://api.telegram.org/file/bot${token}/${info.result.file_path}`;
  },
});
