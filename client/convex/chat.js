import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { hasKitchenAccess } from "./team";

/**
 * One message system for the whole restaurant.
 *
 * Threads:
 *   staff:<accountId>          admin <-> one staff member (alerts go here too)
 *   guest:<table>:<guestId>    one guest's phone at a table <-> that table's staff + admin
 *   table:<table>              staff/admin writing to a whole table ("#5" in the message search);
 *                              every guest phone at that table sees these (last 6 hours)
 *
 * The guest never learns who answers ("Management"). Staff with tables see their tables'
 * guest threads; kitchen-only staff only have their admin thread. The admin sees everything.
 * An alert is a message with isAlert = true (admin -> staff only).
 */

const MAX_TEXT = 500;
const TABLE_WINDOW_MS = 6 * 60 * 60 * 1000; // guests see table-wide messages from the last 6 hours

function baseFor(parsed) {
  if (parsed.kind === "table") return { kind: "table", tableNumber: parsed.tableNumber };
  return { kind: "guest", tableNumber: parsed.tableNumber, guestId: parsed.guestId };
}
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function cleanText(text) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) throw new ConvexError("Message is empty");
  if (t.length > MAX_TEXT) throw new ConvexError(`Message must be ${MAX_TEXT} characters or fewer`);
  return t;
}

function cleanGuestId(guestId) {
  const id = String(guestId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{12,64}$/.test(id)) throw new ConvexError("Invalid guest id");
  return id;
}

function cleanTable(tableNumber) {
  const n = Number(tableNumber);
  if (!Number.isInteger(n) || n <= 0 || n >= 1000) throw new ConvexError("Invalid table number");
  return n;
}

async function adminOk(ctx, adminToken) {
  const token = String(adminToken ?? "");
  if (!token) return false;
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  return !!session && session.expiresAt > Date.now();
}

async function requireAdmin(ctx, adminToken) {
  if (!(await adminOk(ctx, adminToken))) throw new ConvexError("Admin session expired. Sign in again.");
}

async function staffFromToken(ctx, staffToken) {
  const token = String(staffToken ?? "");
  if (!token) return null;
  const session = await ctx.db
    .query("staffSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;
  const account = await ctx.db.get(session.accountId);
  if (!account || !account.active) return null;
  return account;
}

async function getThread(ctx, key) {
  return await ctx.db
    .query("chatThreads")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
}

function parseKey(key) {
  const k = String(key ?? "");
  let m = k.match(/^staff:(.+)$/);
  if (m) return { kind: "staff", accountId: m[1] };
  m = k.match(/^table:(\d+)$/);
  if (m) {
    const tableNumber = Number(m[1]);
    if (!Number.isInteger(tableNumber) || tableNumber <= 0 || tableNumber >= 1000) throw new ConvexError("Invalid table number");
    return { kind: "table", tableNumber };
  }
  m = k.match(/^guest:(\d+):([A-Za-z0-9_-]{12,64})$/);
  if (m) return { kind: "guest", tableNumber: Number(m[1]), guestId: m[2] };
  throw new ConvexError("Unknown conversation");
}

// Can this staff account read/write this thread?
function staffCanUse(account, parsed) {
  if (parsed.kind === "staff") return parsed.accountId === String(account._id);
  return account.assignedTables.includes(parsed.tableNumber);
}

async function postMessage(ctx, key, base, msg) {
  const now = Date.now();
  await ctx.db.insert("chatMessages", { threadKey: key, ...msg, createdAt: now });
  const thread = await getThread(ctx, key);
  const readField = msg.senderType === "admin" ? "adminReadAt" : msg.senderType === "staff" ? "staffReadAt" : "guestReadAt";
  const summary = {
    lastMessageAt: now,
    lastText: msg.text.slice(0, 140),
    lastSenderType: msg.senderType,
    lastIsAlert: msg.isAlert,
    [readField]: now,
  };
  if (thread) {
    await ctx.db.patch(thread._id, summary);
  } else {
    await ctx.db.insert("chatThreads", {
      key,
      adminReadAt: 0,
      staffReadAt: 0,
      guestReadAt: 0,
      ...base,
      ...summary,
    });
  }
}

async function listMessages(ctx, key, limit = 200) {
  const rows = await ctx.db
    .query("chatMessages")
    .withIndex("by_thread", (q) => q.eq("threadKey", key))
    .order("desc")
    .take(limit);
  return rows.reverse().map((m) => ({
    _id: m._id,
    senderType: m.senderType,
    senderName: m.senderName,
    text: m.text,
    isAlert: m.isAlert,
    createdAt: m.createdAt,
  }));
}

// Unread for a reader = newest message is newer than their read mark and not their own
function unreadFor(thread, side) {
  const readAt = side === "admin" ? thread.adminReadAt : side === "staff" ? thread.staffReadAt : thread.guestReadAt;
  return thread.lastMessageAt > readAt && thread.lastSenderType !== side;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// Every staff member (even with no messages yet) plus every guest conversation.
export const adminInbox = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    if (!(await adminOk(ctx, adminToken))) return { unauthorized: true, staff: [], guests: [] };
    const now = Date.now();
    const accounts = await ctx.db.query("staffAccounts").collect();
    const threads = await ctx.db.query("chatThreads").withIndex("by_last").order("desc").take(300);
    const byKey = new Map(threads.map((t) => [t.key, t]));

    const staff = accounts
      .map((acc) => {
        const key = `staff:${acc._id}`;
        const t = byKey.get(key);
        return {
          key,
          accountId: acc._id,
          name: acc.name,
          title: acc.title || "",
          kitchenAccess: hasKitchenAccess(acc),
          assignedTables: acc.assignedTables,
          active: acc.active,
          online: !!acc.lastSeenAt && now - acc.lastSeenAt < ONLINE_WINDOW_MS,
          lastMessageAt: t?.lastMessageAt ?? 0,
          lastText: t?.lastText ?? "",
          lastIsAlert: t?.lastIsAlert ?? false,
          lastSenderType: t?.lastSenderType ?? "",
          unread: t ? unreadFor(t, "admin") : false,
          staffRead: t ? t.staffReadAt >= t.lastMessageAt : true,
        };
      })
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt || a.name.localeCompare(b.name));

    // Who covers each table, for the guest list
    const cover = {};
    for (const acc of accounts) {
      if (!acc.active) continue;
      for (const t of acc.assignedTables) (cover[t] = cover[t] || []).push(acc.name);
    }

    const guests = threads
      .filter((t) => (t.kind === "guest" || t.kind === "table") && t.lastMessageAt > 0)
      .map((t) => ({
        key: t.key,
        kind: t.kind,
        tableNumber: t.tableNumber,
        coveredBy: cover[t.tableNumber] || [],
        lastMessageAt: t.lastMessageAt,
        lastText: t.lastText,
        lastSenderType: t.lastSenderType,
        unread: unreadFor(t, "admin"),
      }));

    return { unauthorized: false, staff, guests };
  },
});

export const adminMessages = query({
  args: { adminToken: v.string(), key: v.string() },
  handler: async (ctx, { adminToken, key }) => {
    if (!(await adminOk(ctx, adminToken))) return null;
    parseKey(key);
    const thread = await getThread(ctx, key);
    return {
      messages: await listMessages(ctx, key),
      // For admin-sent messages: has the staff member / guest opened the thread since?
      otherReadAt: thread ? (thread.kind === "staff" ? thread.staffReadAt : Math.max(thread.staffReadAt, thread.guestReadAt)) : 0,
    };
  },
});

export const adminSend = mutation({
  args: { adminToken: v.string(), key: v.string(), text: v.string(), isAlert: v.optional(v.boolean()) },
  handler: async (ctx, { adminToken, key, text, isAlert }) => {
    await requireAdmin(ctx, adminToken);
    const body = cleanText(text);
    const parsed = parseKey(key);
    let base;
    if (parsed.kind === "staff") {
      const accountId = ctx.db.normalizeId("staffAccounts", parsed.accountId);
      const account = accountId ? await ctx.db.get(accountId) : null;
      if (!account) throw new ConvexError("Staff member not found");
      base = { kind: "staff", accountId: account._id };
    } else {
      base = baseFor(parsed);
    }
    const alert = isAlert === true && parsed.kind === "staff";
    await postMessage(ctx, key, base, { senderType: "admin", senderId: "admin", senderName: "Admin", text: body, isAlert: alert });
    if (alert) {
      const account = await ctx.db.get(base.accountId);
      await ctx.db.insert("staffActivity", {
        accountId: account._id,
        actorName: "Admin",
        actorRole: "admin",
        kind: "alert",
        note: `Alert to ${account.name}: ${body.slice(0, 80)}`,
        at: Date.now(),
      });
    }
    return true;
  },
});

export const adminMarkRead = mutation({
  args: { adminToken: v.string(), key: v.string() },
  handler: async (ctx, { adminToken, key }) => {
    await requireAdmin(ctx, adminToken);
    const thread = await getThread(ctx, key);
    if (thread) await ctx.db.patch(thread._id, { adminReadAt: Date.now() });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

// The staff member's admin thread, plus guest threads for their tables.
export const staffInbox = query({
  args: { staffToken: v.string() },
  handler: async (ctx, { staffToken }) => {
    const account = await staffFromToken(ctx, staffToken);
    if (!account) return null;
    const adminKey = `staff:${account._id}`;
    const adminThread = await getThread(ctx, adminKey);

    const guests = [];
    for (const tableNumber of account.assignedTables) {
      const rows = await ctx.db
        .query("chatThreads")
        .withIndex("by_table", (q) => q.eq("tableNumber", tableNumber))
        .order("desc")
        .take(20);
      for (const t of rows) {
        if (!(t.lastMessageAt > 0)) continue;
        guests.push({
          key: t.key,
          kind: t.kind,
          tableNumber,
          lastMessageAt: t.lastMessageAt,
          lastText: t.lastText,
          lastSenderType: t.lastSenderType,
          unread: unreadFor(t, "staff"),
        });
      }
    }
    guests.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return {
      admin: {
        key: adminKey,
        lastMessageAt: adminThread?.lastMessageAt ?? 0,
        lastText: adminThread?.lastText ?? "",
        lastIsAlert: adminThread?.lastIsAlert ?? false,
        unread: adminThread ? unreadFor(adminThread, "staff") : false,
      },
      guests,
      assignedTables: account.assignedTables,
      canChatGuests: account.assignedTables.length > 0,
    };
  },
});

export const staffMessages = query({
  args: { staffToken: v.string(), key: v.string() },
  handler: async (ctx, { staffToken, key }) => {
    const account = await staffFromToken(ctx, staffToken);
    if (!account) return null;
    const parsed = parseKey(key);
    if (!staffCanUse(account, parsed)) return null;
    return { messages: await listMessages(ctx, key) };
  },
});

export const staffSend = mutation({
  args: { staffToken: v.string(), key: v.string(), text: v.string() },
  handler: async (ctx, { staffToken, key, text }) => {
    const account = await staffFromToken(ctx, staffToken);
    if (!account) throw new ConvexError("Session expired. Sign in again.");
    const body = cleanText(text);
    const parsed = parseKey(key);
    if (!staffCanUse(account, parsed)) throw new ConvexError("You can't message this conversation");
    const base = parsed.kind === "staff"
      ? { kind: "staff", accountId: account._id }
      : baseFor(parsed);
    await postMessage(ctx, key, base, {
      senderType: "staff",
      senderId: String(account._id),
      senderName: account.name,
      text: body,
      isAlert: false,
    });
    await ctx.db.patch(account._id, { lastSeenAt: Date.now() });
    return true;
  },
});

export const staffMarkRead = mutation({
  args: { staffToken: v.string(), key: v.string() },
  handler: async (ctx, { staffToken, key }) => {
    const account = await staffFromToken(ctx, staffToken);
    if (!account) return false;
    if (!staffCanUse(account, parseKey(key))) return false;
    const thread = await getThread(ctx, key);
    if (thread) await ctx.db.patch(thread._id, { staffReadAt: Date.now() });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Guest (customer phone). guestId is a random id kept on the phone, so a guest
// only ever sees their own conversation. Replies show as "Management".
// ---------------------------------------------------------------------------

export const guestMessages = query({
  args: { tableNumber: v.number(), guestId: v.string() },
  handler: async (ctx, { tableNumber, guestId }) => {
    const table = cleanTable(tableNumber);
    const key = `guest:${table}:${cleanGuestId(guestId)}`;
    const thread = await getThread(ctx, key);
    const own = await listMessages(ctx, key, 100);

    // Table-wide messages from staff/admin in the last few hours
    const since = Date.now() - TABLE_WINDOW_MS;
    const tableRows = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadKey", `table:${table}`).gt("createdAt", since))
      .take(50);

    const messages = [...own, ...tableRows]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((m) => ({
        _id: m._id,
        fromGuest: m.senderType === "guest",
        text: m.text,
        createdAt: m.createdAt,
      }));

    const readAt = thread?.guestReadAt ?? 0;
    const lastReply = [...messages].reverse().find((m) => !m.fromGuest);
    return {
      messages,
      unread: !!lastReply && lastReply.createdAt > readAt,
    };
  },
});

export const guestSend = mutation({
  args: { tableNumber: v.number(), guestId: v.string(), text: v.string() },
  handler: async (ctx, { tableNumber, guestId, text }) => {
    const table = cleanTable(tableNumber);
    const gid = cleanGuestId(guestId);
    const body = cleanText(text);
    const key = `guest:${table}:${gid}`;

    // Light flood guard: at most 10 messages per minute per guest
    const recent = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadKey", key).gt("createdAt", Date.now() - 60000))
      .take(11);
    if (recent.filter((m) => m.senderType === "guest").length >= 10) {
      throw new ConvexError("Please wait a moment before sending more messages");
    }

    await postMessage(ctx, key, { kind: "guest", tableNumber: table, guestId: gid }, {
      senderType: "guest",
      senderName: `Table ${table} guest`,
      text: body,
      isAlert: false,
    });
    return true;
  },
});

export const guestMarkRead = mutation({
  args: { tableNumber: v.number(), guestId: v.string() },
  handler: async (ctx, { tableNumber, guestId }) => {
    const table = cleanTable(tableNumber);
    const gid = cleanGuestId(guestId);
    const key = `guest:${table}:${gid}`;
    const thread = await getThread(ctx, key);
    const now = Date.now();
    if (thread) {
      await ctx.db.patch(thread._id, { guestReadAt: now });
    } else {
      // Empty placeholder (lastMessageAt 0, hidden from inboxes) that remembers what the guest has read
      await ctx.db.insert("chatThreads", {
        key, kind: "guest", tableNumber: table, guestId: gid,
        lastMessageAt: 0, lastText: "", lastSenderType: "", lastIsAlert: false,
        adminReadAt: 0, staffReadAt: 0, guestReadAt: now,
      });
    }
    return true;
  },
});

// Maintenance (CLI / dashboard only): remove one conversation and its messages.
export const purgeThread = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const msgs = await ctx.db.query("chatMessages").withIndex("by_thread", (q) => q.eq("threadKey", key)).collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    const thread = await getThread(ctx, key);
    if (thread) await ctx.db.delete(thread._id);
    return msgs.length;
  },
});
