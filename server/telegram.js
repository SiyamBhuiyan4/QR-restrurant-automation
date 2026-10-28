/**
 * Telegram Channel Database, CDN Bridge & Alert System
 * 
 * Functions as a zero-external-database persistent cloud storage & notification feed:
 * 1. Orders: Formatted receipts + items + chef notes + attached customer voice recordings (sendVoice)
 * 2. Media CDN: Stores food photos (sendPhoto) and kitchen reel videos (sendVideo) with permanent Telegram file links
 * 3. Waiter Bell: Real-time alerts directly into the channel for quick staff responses & resolution tracking
 * 4. Snapshots: Menu state, daily sales summaries, and database backups stored persistently in Telegram channel
 * 5. Media Proxy: Streams dish media directly from Telegram CDN with Range header support for progressive video playback
 */

const fs = require('fs');
const path = require('path');

// Read config from environment variables or local fallback config
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8819171458:AAHd3_pjEj2tEYfuB1zgJkznnSqPsisB6p0';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1004253971473'; // Channel ID for @Restaurant Media

const TELEGRAM_API_BASE = 'https://api.telegram.org';

// In-memory cache for resolved Telegram file_paths (50 minutes TTL, matching Telegram file link lifespan)
const filePathCache = new Map();
const PATH_TTL_MS = 50 * 60 * 1000;

// Content types mapping
const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  json: 'application/json',
  pdf: 'application/pdf'
};

/**
 * Escapes characters with special meaning in Telegram HTML parse mode:
 * &, <, >, "
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Helper to get active Telegram credentials
 */
function getTelegramCredentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || CHAT_ID;
  return { token, chatId };
}

/**
 * Helper to make Telegram API requests without external heavy libraries
 */
async function callTelegramApi(method, payload = {}) {
  const { token } = getTelegramCredentials();
  if (!token) {
    console.warn('[Telegram DB] Skipped: TELEGRAM_BOT_TOKEN is not configured yet.');
    return { success: false, reason: 'missing_token' };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) {
      console.error(`[Telegram DB Error (${method})]:`, data.description || data);
      return { success: false, error: data.description };
    }

    return { success: true, result: data.result };
  } catch (err) {
    console.error(`[Telegram API Fetch Error (${method})]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Resolves Telegram's internal download file_path for a file_id (with in-memory cache)
 */
async function resolveTelegramFilePath(fileId, { fresh = false } = {}) {
  if (!fileId || typeof fileId !== 'string') return null;

  // Strip extension if provided (e.g. file_id.mp4 -> file_id)
  const cleanId = fileId.replace(/\.[a-zA-Z0-9]+$/, '').trim();
  if (!cleanId) return null;

  if (!fresh && filePathCache.has(cleanId)) {
    const entry = filePathCache.get(cleanId);
    if (Date.now() - entry.fetchedAt < PATH_TTL_MS) {
      return entry.filePath;
    }
  }

  const { token } = getTelegramCredentials();
  if (!token) return null;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(cleanId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      const filePath = data.result.file_path;
      filePathCache.set(cleanId, { filePath, fetchedAt: Date.now() });
      return filePath;
    }
  } catch (err) {
    console.error('[Telegram resolveFilePath Error]:', err.message);
  }
  return null;
}

/**
 * Upload a file (photo, video, voice note, document, or snapshot) using multipart/form-data.
 * Accepts:
 *  - string file path on disk
 *  - Buffer
 *  - Blob
 *  - Multer file object ({ path, buffer, originalname, mimetype })
 *  - Base64 data URI string
 */
async function uploadFileToTelegram(method, fileInput, formFields = {}) {
  const { token, chatId } = getTelegramCredentials();
  if (!token || !chatId) {
    return { success: false, reason: 'missing_credentials' };
  }

  let fileBuffer = null;
  let fileName = 'file.bin';
  let mimeType = 'application/octet-stream';

  try {
    if (typeof fileInput === 'string') {
      if (fileInput.startsWith('data:') && fileInput.includes(';base64,')) {
        // Base64 Data URI
        const matches = fileInput.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.split('/')[1] || 'bin';
          fileName = `upload-${Date.now()}.${ext}`;
        } else {
          return { success: false, reason: 'invalid_base64' };
        }
      } else if (fs.existsSync(fileInput)) {
        // Local file path
        fileBuffer = fs.readFileSync(fileInput);
        fileName = path.basename(fileInput);
        const ext = path.extname(fileInput).toLowerCase().replace('.', '');
        if (MIME_TYPES[ext]) mimeType = MIME_TYPES[ext];
      } else {
        return { success: false, reason: 'file_not_found', path: fileInput };
      }
    } else if (Buffer.isBuffer(fileInput)) {
      fileBuffer = fileInput;
      fileName = formFields.filename || `upload-${Date.now()}.bin`;
    } else if (fileInput && typeof fileInput === 'object') {
      // Check for Multer file structure
      if (fileInput.path && fs.existsSync(fileInput.path)) {
        fileBuffer = fs.readFileSync(fileInput.path);
        fileName = fileInput.originalname || path.basename(fileInput.path);
        mimeType = fileInput.mimetype || mimeType;
      } else if (fileInput.buffer && Buffer.isBuffer(fileInput.buffer)) {
        fileBuffer = fileInput.buffer;
        fileName = fileInput.originalname || `upload-${Date.now()}.bin`;
        mimeType = fileInput.mimetype || mimeType;
      }
    }

    if (!fileBuffer) {
      return { success: false, reason: 'no_buffer_resolved' };
    }

    // Determine parameter name based on method (e.g. 'voice', 'photo', 'video', 'document')
    let fileParam = 'document';
    if (method === 'sendVoice') fileParam = 'voice';
    else if (method === 'sendPhoto') fileParam = 'photo';
    else if (method === 'sendVideo') fileParam = 'video';
    else if (method === 'sendAudio') fileParam = 'audio';

    const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
    const formData = new FormData();
    formData.append('chat_id', chatId);

    for (const [key, value] of Object.entries(formFields)) {
      if (key !== 'filename') {
        formData.append(key, String(value));
      }
    }

    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append(fileParam, blob, fileName);

    let res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    let data = await res.json();

    // Fallback: If sendPhoto, sendVideo, or sendVoice fails due to codecs, formats, or processing, retry with sendDocument
    if (!data.ok && (method === 'sendVideo' || method === 'sendVoice' || method === 'sendPhoto')) {
      console.warn(`[Telegram Upload (${method}) failed: ${data.description}. Retrying with sendDocument fallback...]`);
      const fallbackUrl = `${TELEGRAM_API_BASE}/bot${token}/sendDocument`;
      const fallbackForm = new FormData();
      fallbackForm.append('chat_id', chatId);
      for (const [key, value] of Object.entries(formFields)) {
        if (key !== 'filename' && key !== 'supports_streaming') {
          fallbackForm.append(key, String(value));
        }
      }
      fallbackForm.append('document', blob, fileName);

      res = await fetch(fallbackUrl, {
        method: 'POST',
        body: fallbackForm
      });
      data = await res.json();
    }

    if (!data.ok) {
      console.error(`[Telegram File Upload Error (${method})]:`, data.description || data);
      return { success: false, error: data.description };
    }

    // Extract file_id from response
    const msg = data.result;
    let fileId = null;
    let mediaType = 'document';

    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      fileId = msg.photo[msg.photo.length - 1].file_id;
      mediaType = 'photo';
    } else if (msg.video?.file_id) {
      fileId = msg.video.file_id;
      mediaType = 'video';
    } else if (msg.voice?.file_id) {
      fileId = msg.voice.file_id;
      mediaType = 'voice';
    } else if (msg.audio?.file_id) {
      fileId = msg.audio.file_id;
      mediaType = 'audio';
    } else if (msg.document?.file_id) {
      fileId = msg.document.file_id;
      mediaType = 'document';
    }

    let filePath = null;
    let cdnUrl = null;
    let permanentUrl = null;

    if (fileId) {
      filePath = await resolveTelegramFilePath(fileId);
      if (filePath) {
        cdnUrl = `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
      }
      const dot = fileName.lastIndexOf('.');
      const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : (mediaType === 'video' ? 'mp4' : 'jpg');
      permanentUrl = `/telegram-media/${fileId}.${ext}`;
    }

    return {
      success: true,
      fileId,
      filePath,
      cdnUrl,
      permanentUrl,
      messageId: msg?.message_id,
      mediaType,
      result: msg
    };
  } catch (err) {
    console.error(`[Telegram Upload Exception (${method})]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Upload Food Photo or Kitchen Video to Telegram Channel
 * Returns Telegram File ID & Message details so Telegram serves as permanent CDN
 * 
 * @param {string|Buffer|object} fileInput - file path, buffer, or multer file
 * @param {string} caption - optional caption
 * @param {object} options - extra flags (e.g. dishName, dishId)
 */
async function storeMediaInTelegram(fileInput, caption = '', options = {}) {
  let fileName = options.filename || '';
  if (!fileName) {
    if (typeof fileInput === 'string') {
      fileName = path.basename(fileInput);
    } else if (fileInput && typeof fileInput === 'object') {
      fileName = fileInput.originalname || fileInput.filename || '';
    }
  }

  const isSvg = /\.svg$/i.test(fileName) || Boolean(fileInput?.mimetype && fileInput.mimetype.includes('svg'));

  const isVideo = /\.(mp4|webm|mov|m4v|mkv|3gp|avi|wmv)$/i.test(fileName) ||
    Boolean(fileInput?.mimetype && fileInput.mimetype.startsWith('video/'));

  const isAudio = /\.(ogg|opus|wav|mp3|m4a|aac)$/i.test(fileName) ||
    Boolean(fileInput?.mimetype && fileInput.mimetype.startsWith('audio/'));

  let method = 'sendPhoto';
  const formFields = {
    filename: fileName,
    caption: caption || `📸 Dish Media (${fileName || 'food-photo'})`,
    parse_mode: 'HTML'
  };

  if (isSvg) {
    method = 'sendDocument';
    if (!caption) formFields.caption = `📐 Vector Dish Graphic (${fileName || 'food-graphic.svg'})`;
  } else if (isVideo) {
    method = 'sendVideo';
    formFields.supports_streaming = 'true';
    if (!caption) formFields.caption = `🎥 Dish Video / 360° Reel (${fileName || 'food-video'})`;
  } else if (isAudio) {
    method = 'sendVoice';
    if (!caption) formFields.caption = `🎙️ Audio Note (${fileName || 'voice-note'})`;
  }

  return await uploadFileToTelegram(method, fileInput, formFields);
}

/**
 * Store System Snapshot (Menu State, SQLite DB Dump, Order Ledger, Daily Summary) in Telegram Channel
 * Telegram functions as a free, persistent, tamper-resistant snapshot ledger.
 * 
 * @param {object|string|Buffer} snapshotData - snapshot JSON object, array, or buffer
 * @param {object} options - { type: 'menu' | 'database' | 'orders' | 'state', filename, caption, metadata }
 */
async function storeSnapshotInTelegram(snapshotData, options = {}) {
  const type = options.type || 'system';
  const timestamp = new Date().toISOString();
  const filename = options.filename || `${type}-snapshot-${Date.now()}.json`;

  let buffer;
  let summarySize = '0 B';

  if (Buffer.isBuffer(snapshotData)) {
    buffer = snapshotData;
    summarySize = `${(buffer.length / 1024).toFixed(1)} KB`;
  } else if (typeof snapshotData === 'string') {
    if (fs.existsSync(snapshotData)) {
      // It's a file path
      buffer = fs.readFileSync(snapshotData);
      summarySize = `${(buffer.length / 1024).toFixed(1)} KB`;
    } else {
      buffer = Buffer.from(snapshotData, 'utf-8');
      summarySize = `${(buffer.length / 1024).toFixed(1)} KB`;
    }
  } else {
    // JavaScript Object or Array
    const jsonStr = JSON.stringify(snapshotData, null, 2);
    buffer = Buffer.from(jsonStr, 'utf-8');
    summarySize = `${(buffer.length / 1024).toFixed(1)} KB`;
  }

  const caption = options.caption || (
    `📦 <b>SYSTEM SNAPSHOT (${escapeHtml(type.toUpperCase())})</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷️ <b>Type:</b> <code>${escapeHtml(type)}</code>\n` +
    `⏱️ <b>Timestamp:</b> ${new Date().toLocaleString()}\n` +
    `📁 <b>File Size:</b> ${summarySize}\n` +
    (options.metadata ? `ℹ️ <b>Meta:</b> ${escapeHtml(JSON.stringify(options.metadata))}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Persistent snapshot backed up to Telegram Cloud.</i>`
  );

  const uploadRes = await uploadFileToTelegram('sendDocument', buffer, {
    filename,
    caption,
    parse_mode: 'HTML'
  });

  return {
    ...uploadRes,
    type,
    filename,
    timestamp
  };
}

/**
 * Sync entire menu catalog to Telegram Channel as a persistent cloud snapshot.
 * Reads categories & items and uploads both a snapshot document and a formatted summary message.
 * 
 * @param {object|null} customMenu - optional pre-built menu { categories, items }
 */
async function syncMenuToTelegram(customMenu = null) {
  let categories = [];
  let items = [];

  if (customMenu && Array.isArray(customMenu.categories) && Array.isArray(customMenu.items)) {
    categories = customMenu.categories;
    items = customMenu.items;
  } else {
    try {
      const db = require('./db');
      categories = db.getCategories() || [];
      items = db.getMenuItems() || [];
    } catch (dbErr) {
      console.warn('[Telegram syncMenuToTelegram] Could not read db directly:', dbErr.message);
    }
  }

  const activeItems = items.filter(it => it.is_available === undefined || Boolean(it.is_available));
  const mediaItems = items.filter(it => Boolean(it.image_url || it.making_video_url));

  const snapshotPayload = {
    version: '1.0',
    type: 'menu_sync',
    restaurant: 'SmartDine Restaurant',
    syncedAt: new Date().toISOString(),
    stats: {
      categoriesCount: categories.length,
      totalDishesCount: items.length,
      activeDishesCount: activeItems.length,
      mediaCount: mediaItems.length
    },
    categories,
    items
  };

  // 1. Upload snapshot JSON file to Telegram channel
  const snapshotRes = await storeSnapshotInTelegram(snapshotPayload, {
    type: 'menu',
    filename: `menu-catalog-snapshot-${Date.now()}.json`,
    caption: `📋 <b>MENU CATALOG BACKUP</b> (${new Date().toLocaleDateString()})\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📁 Categories: <b>${categories.length}</b> | Dishes: <b>${items.length}</b>\n` +
      `⏱️ Synced: ${new Date().toLocaleTimeString()}\n` +
      `<i>Zero-database Telegram cloud backup snapshot.</i>`
  });

  // 2. Post human-readable summary to the channel
  const { chatId } = getTelegramCredentials();
  let announcementText = `📋 <b>MENU SYNC COMPLETED</b>\n`;
  announcementText += `━━━━━━━━━━━━━━━━━━━━━\n`;
  announcementText += `📁 <b>Categories:</b> <b>${categories.length}</b>\n`;
  announcementText += `🍲 <b>Total Dishes:</b> <b>${items.length}</b>\n`;
  announcementText += `✅ <b>Active Dishes:</b> <b>${activeItems.length}</b>\n`;
  announcementText += `📸 <b>Dishes with Media:</b> <b>${mediaItems.length}</b>\n`;
  announcementText += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  announcementText += `━━━━━━━━━━━━━━━━━━━━━\n`;
  announcementText += `<i>Cloud catalog synchronization confirmed.</i>`;

  const msgRes = await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: announcementText,
    parse_mode: 'HTML'
  });

  return {
    success: true,
    snapshot: snapshotRes,
    messageId: msgRes?.result?.message_id,
    stats: snapshotPayload.stats,
    syncedAt: snapshotPayload.syncedAt
  };
}

/**
 * Post an incoming Order to your Telegram Channel
 * Includes formatted items, notes, total, and attaches voice recording if available.
 */
async function sendOrderToTelegram(order) {
  const { chatId } = getTelegramCredentials();
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = order.table_number || order.tableNumber || order.table || order.tableId || 'Unknown';
  const orderNum = order.order_number || order.orderNumber || order.orderId || order.id || `ORD-${Date.now().toString().slice(-4)}`;
  const total = order.total_amount !== undefined 
    ? Number(order.total_amount).toFixed(2) 
    : (order.total !== undefined ? Number(order.total).toFixed(2) : '0.00');

  let items = order.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];

  let itemsHtml = items.map((it, idx) => {
    const name = escapeHtml(it.name || it.dish_name || it.title || 'Dish');
    const qty = Number(it.quantity || it.qty || 1);
    const price = (Number(it.price || it.unit_price || 0) * qty).toFixed(2);
    let line = `  ${idx + 1}. <b>${name}</b> × ${qty} ($${price})`;
    const note = it.note || it.itemNote || it.notes;
    if (note) {
      line += `\n     <i>👉 Note: ${escapeHtml(note)}</i>`;
    }
    return line;
  }).join('\n');

  let text = `🍽️ <b>NEW ORDER RECEIVED!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🧾 <b>Order #:</b> <code>${escapeHtml(orderNum)}</code>\n`;
  if (order.customer_name || order.customerName) {
    text += `👤 <b>Customer:</b> ${escapeHtml(order.customer_name || order.customerName)}\n`;
  }
  if (order.payment_method || order.paymentMethod) {
    text += `💳 <b>Payment:</b> ${escapeHtml(order.payment_method || order.paymentMethod)}\n`;
  }
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>Items:</b>\n${itemsHtml || '  (No item details)'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 <b>Total Amount:</b> $${total}\n`;

  const note = order.general_note || order.generalNote || order.note || order.notes;
  if (note) {
    text += `💬 <b>Chef Instruction:</b> <i>"${escapeHtml(note)}"</i>\n`;
  }

  // 1. Send the primary text receipt
  const msgResult = await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });

  // 2. If order has a voice note recording, upload it to the channel!
  const voiceRel = order.voice_note_url || order.voiceNoteUrl || order.voice_note || order.voiceNote;
  if (voiceRel && typeof voiceRel === 'string') {
    try {
      if (voiceRel.startsWith('data:audio') || voiceRel.length > 500) {
        // Base64 voice note
        await uploadFileToTelegram('sendVoice', voiceRel, {
          caption: `🎙️ <b>Voice Note for Table ${escapeHtml(table)}</b> (Order #${escapeHtml(orderNum)})`,
          parse_mode: 'HTML'
        });
      } else if (voiceRel.startsWith('/uploads/voices/')) {
        const fullVoicePath = path.join(__dirname, '..', voiceRel.replace(/^\//, ''));
        if (fs.existsSync(fullVoicePath)) {
          await uploadFileToTelegram('sendVoice', fullVoicePath, {
            caption: `🎙️ <b>Voice Note for Table ${escapeHtml(table)}</b> (Order #${escapeHtml(orderNum)})`,
            parse_mode: 'HTML'
          });
        }
      } else if (fs.existsSync(voiceRel)) {
        await uploadFileToTelegram('sendVoice', voiceRel, {
          caption: `🎙️ <b>Voice Note for Table ${escapeHtml(table)}</b> (Order #${escapeHtml(orderNum)})`,
          parse_mode: 'HTML'
        });
      }
    } catch (voiceErr) {
      console.warn('[Telegram sendOrder voice note upload error]:', voiceErr.message);
    }
  }

  return msgResult;
}

/**
 * Post Order Status Update to Telegram Channel
 */
async function sendOrderStatusUpdateToTelegram(order, newStatus, extra = {}) {
  const { chatId } = getTelegramCredentials();
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = order.table_number || order.tableNumber || order.table || 'Unknown';
  const orderNum = order.order_number || order.orderNumber || order.id || 'N/A';
  const statusUpper = String(newStatus || order.status || 'UPDATED').toUpperCase();

  const statusIcons = {
    PENDING: '⏳',
    PREPARING: '🍳',
    READY: '🔔',
    SERVED: '🍽️',
    COMPLETED: '✅',
    CANCELLED: '❌'
  };
  const icon = statusIcons[statusUpper] || '🔄';

  let text = `${icon} <b>ORDER STATUS UPDATED!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🧾 <b>Order #:</b> <code>${escapeHtml(orderNum)}</code>\n`;
  text += `📊 <b>Status:</b> <b>${escapeHtml(statusUpper)}</b>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  if (extra.note) {
    text += `💬 <b>Note:</b> <i>"${escapeHtml(extra.note)}"</i>\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Post Waiter Assistance Call to Telegram Channel
 */
async function sendWaiterCallToTelegram(call) {
  const { chatId } = getTelegramCredentials();
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = call.table_number || call.tableNumber || call.table || call.tableId || 'Unknown';
  const reason = call.reason || call.type || call.request || 'General Assistance';
  const assigned = call.assignedEmployeeName || call.assigned_employee_name || call.assignedEmployee || null;

  let text = `🛎️ <b>EMPLOYEE ASSISTANCE ALERT!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  if (assigned) {
    text += `👤 <b>Assigned Employee:</b> <b>${escapeHtml(assigned)}</b>\n`;
  }
  text += `❓ <b>Request:</b> <b>${escapeHtml(reason)}</b>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>${assigned ? `Routed to assigned employee ${escapeHtml(assigned)}.` : `Please attend to Table ${escapeHtml(table)} immediately.`}</i>`;

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Post Waiter Assistance Resolution to Telegram Channel
 */
async function sendWaiterResolveToTelegram(call) {
  const { chatId } = getTelegramCredentials();
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = call.table_number || call.tableNumber || call.table || 'Unknown';
  const reason = call.reason || 'Assistance';

  let text = `✅ <b>WAITER CALL RESOLVED</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `❓ <b>Request:</b> ${escapeHtml(reason)}\n`;
  text += `⏱️ <b>Resolved At:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Assistance request closed.</i>`;

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Send Customer Feedback / Report / Complaint / Compliment to Telegram Channel
 */
async function sendCustomerReportToTelegram(report) {
  if (!report) return { success: false, reason: 'no_payload' };

  const { chatId } = getTelegramCredentials();
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = report.table || report.tableNumber || report.table_number || 'N/A';
  const reportId = report.id || `REP-${Date.now().toString().slice(-4)}`;
  const guest = report.customerName || report.guest || `Guest (Table #${table})`;
  const severity = String(report.severity || 'general').toLowerCase();
  const status = String(report.status || 'new').toLowerCase();
  const note = report.note || report.complaintText || report.feedback || report.text || 'No description provided';
  const category = report.category || report.type || 'Customer Request';
  const staff = report.staffName || (report.staffId ? `Staff ${report.staffId}` : 'Unassigned');

  let headerTitle = '📋 <b>CUSTOMER REPORT - SMARTDINE</b>';
  if (report.isReply || report.action === 'REPLY') {
    headerTitle = '💬 <b>REPORT REPLY / DIRECT MESSAGE</b>';
  } else if (status === 'resolved' || report.action === 'RESOLVED') {
    headerTitle = '✅ <b>CUSTOMER REPORT RESOLVED</b>';
  } else if (/compliment|praise|kudos|great|love/i.test(category + ' ' + note)) {
    headerTitle = '🌟 <b>CUSTOMER COMPLIMENT</b>';
  } else if (severity === 'critical' || /complaint|issue|bad|wrong|slow|spill|cold/i.test(category + ' ' + note)) {
    headerTitle = '🚨 <b>CUSTOMER ALERT / COMPLAINT</b>';
  }

  const severityIcon = severity === 'critical' ? '🔴 CRITICAL' : severity === 'moderate' ? '🟡 MODERATE' : '🟢 GENERAL';
  const statusIcon = status === 'resolved' ? '✅ RESOLVED' : status === 'in_progress' ? '⏳ IN REVIEW' : '🆕 NEW';

  let text = `${headerTitle}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table #${escapeHtml(table)}\n`;
  text += `🧾 <b>Report ID:</b> <code>${escapeHtml(reportId)}</code>\n`;
  text += `👤 <b>Guest:</b> ${escapeHtml(guest)}\n`;
  text += `🏷️ <b>Category:</b> ${escapeHtml(category)}\n`;
  text += `⚠️ <b>Severity:</b> ${severityIcon}\n`;
  text += `📊 <b>Status:</b> ${statusIcon}\n`;
  if (staff && staff !== 'Unassigned') {
    text += `🧑‍💼 <b>Staff Assigned:</b> ${escapeHtml(staff)}\n`;
  }
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📝 <b>Report / Feedback:</b>\n<i>"${escapeHtml(note)}"</i>\n`;

  if (report.resolutionNote && (status === 'resolved' || report.action === 'RESOLVED')) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏁 <b>Resolution:</b> <i>"${escapeHtml(report.resolutionNote)}"</i>\n`;
  }

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Stream media directly from Telegram CDN using the bot token on the server side.
 * Supports HTTP Range requests for seeking in videos.
 */
async function streamTelegramMedia(fileId, reqRange = null) {
  const { token } = getTelegramCredentials();
  if (!token) {
    return { ok: false, status: 503, error: 'Telegram Bot Token not configured' };
  }

  const dot = fileId.lastIndexOf('.');
  const cleanId = dot > 0 ? fileId.slice(0, dot) : fileId;
  const ext = dot > 0 ? fileId.slice(dot + 1).toLowerCase() : '';

  let filePath = await resolveTelegramFilePath(cleanId);
  if (!filePath) {
    return { ok: false, status: 404, error: 'File not found on Telegram' };
  }

  const fetchUpstream = async (p) => {
    const headers = {};
    if (reqRange) headers['Range'] = reqRange;
    return await fetch(`${TELEGRAM_API_BASE}/file/bot${token}/${p}`, { headers });
  };

  let upstream = await fetchUpstream(filePath);

  // If path expired, refresh path once
  if (upstream.status === 404 || upstream.status === 400) {
    filePath = await resolveTelegramFilePath(cleanId, { fresh: true });
    if (!filePath) {
      return { ok: false, status: 404, error: 'File not found on Telegram (path refresh failed)' };
    }
    upstream = await fetchUpstream(filePath);
  }

  if (!upstream.ok && upstream.status !== 206) {
    return { ok: false, status: 502, error: 'Upstream Telegram CDN error' };
  }

  const contentType = MIME_TYPES[ext] || upstream.headers.get('content-type') || 'application/octet-stream';
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*'
  };

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers['Content-Length'] = contentLength;

  const contentRange = upstream.headers.get('content-range');
  if (contentRange) headers['Content-Range'] = contentRange;

  return {
    ok: true,
    status: upstream.status,
    headers,
    body: upstream.body
  };
}

module.exports = {
  getTelegramCredentials,
  escapeHtml,
  callTelegramApi,
  resolveTelegramFilePath,
  uploadFileToTelegram,
  storeMediaInTelegram,
  storeSnapshotInTelegram,
  syncMenuToTelegram,
  sendOrderToTelegram,
  sendOrderStatusUpdateToTelegram,
  sendWaiterCallToTelegram,
  sendWaiterResolveToTelegram,
  sendCustomerReportToTelegram,
  streamTelegramMedia
};
