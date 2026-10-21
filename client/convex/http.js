import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { isValidFileId, resolveFilePath } from "./media";

const http = httpRouter();

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

/**
 * GET /telegram-media/<file_id>.<ext>
 * Streams a dish photo/video from the Telegram channel. The bot token stays on the server.
 * Range requests are passed through so videos can seek and start quickly.
 * The same file_id always means the same bytes, so browsers and CDNs may cache it forever.
 */
http.route({
  pathPrefix: "/telegram-media/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const name = decodeURIComponent(url.pathname.slice("/telegram-media/".length));
    const dot = name.lastIndexOf(".");
    const fileId = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
    if (!isValidFileId(fileId)) return new Response("Not found", { status: 404 });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return new Response("Media is not configured", { status: 503 });

    const range = request.headers.get("range");
    const fetchFile = async (filePath) =>
      fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, range ? { headers: { Range: range } } : undefined);

    let filePath = await resolveFilePath(ctx, fileId);
    if (!filePath) return new Response("Not found", { status: 404 });
    let upstream = await fetchFile(filePath);
    // Cached path expired: ask Telegram again once
    if (upstream.status === 404 || upstream.status === 400) {
      filePath = await resolveFilePath(ctx, fileId, { fresh: true });
      if (!filePath) return new Response("Not found", { status: 404 });
      upstream = await fetchFile(filePath);
    }
    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Media unavailable", { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": TYPES[ext] || upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
    });
    for (const h of ["content-length", "content-range"]) {
      const val = upstream.headers.get(h);
      if (val) headers.set(h, val);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }),
});

export default http;
