/**
 * Telegram Channel Database & Alert Bridge
 * 
 * Uses your Telegram Channel as a free, persistent cloud database & real-time notification feed:
 * 1. Orders: Formatted receipts + items + chef notes + attached customer voice recordings (sendVoice)
 * 2. Media CDN: Stores food photos (sendPhoto) and kitchen reel videos (sendVideo) with permanent Telegram file links
 * 3. Waiter Bell: Real-time alerts directly into the channel for quick staff responses
 */

const fs = require('fs');
const path = require('path');

// Read config from environment variables or local fallback config
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''; // Channel ID (e.g. -1001234567890 or @ChannelUsername)

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Helper to make Telegram API requests without external heavy libraries
 */
async function callTelegramApi(method, payload = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
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
 * Upload a file (voice note, photo, or video) using multipart/form-data
 */
async function uploadFileToTelegram(method, filePath, formFields = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || CHAT_ID;
  if (!token || !chatId) {
    return { success: false, reason: 'missing_credentials' };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'file_not_found' };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);

    for (const [key, value] of Object.entries(formFields)) {
      formData.append(key, value);
    }

    // Determine parameter name based on method (e.g. 'voice', 'photo', 'video', 'document')
    let fileParam = 'document';
    if (method === 'sendVoice') fileParam = 'voice';
    else if (method === 'sendPhoto') fileParam = 'photo';
    else if (method === 'sendVideo') fileParam = 'video';

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append(fileParam, blob, fileName);

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!data.ok) {
      console.error(`[Telegram File Upload Error (${method})]:`, data.description || data);
      return { success: false, error: data.description };
    }

    return { success: true, result: data.result };
  } catch (err) {
    console.error(`[Telegram Upload Exception (${method})]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Post an incoming Order to your Telegram Channel
 * Includes formatted items, notes, total, and attaches voice recording if available.
 */
async function sendOrderToTelegram(order) {
  const chatId = process.env.TELEGRAM_CHAT_ID || CHAT_ID;
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = order.table_number || order.tableNumber || 'Unknown';
  const orderNum = order.order_number || order.orderNumber || order.id || `ORD-${Date.now().toString().slice(-4)}`;
  const total = order.total_amount !== undefined ? Number(order.total_amount).toFixed(2) : (order.total ? Number(order.total).toFixed(2) : '0.00');
  const items = Array.isArray(order.items) ? order.items : [];

  let itemsHtml = items.map((it, idx) => {
    const name = it.name || 'Dish';
    const qty = it.quantity || 1;
    const price = (Number(it.price || 0) * qty).toFixed(2);
    let line = `  ${idx + 1}. <b>${name}</b> × ${qty} ($${price})`;
    if (it.note) {
      line += `\n     <i>👉 Note: ${it.note}</i>`;
    }
    return line;
  }).join('\n');

  let text = `🍽️ <b>NEW ORDER RECEIVED!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${table}\n`;
  text += `🧾 <b>Order #:</b> <code>${orderNum}</code>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>Items:</b>\n${itemsHtml || '  (No item details)'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 <b>Total Amount:</b> $${total}\n`;

  if (order.general_note || order.generalNote) {
    text += `💬 <b>Chef Instruction:</b> <i>"${order.general_note || order.generalNote}"</i>\n`;
  }

  // 1. Send the primary text receipt
  const msgResult = await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });

  // 2. If order has a local voice note recording, upload it to the channel!
  if (order.voice_note_url || order.voiceNoteUrl) {
    const voiceRel = order.voice_note_url || order.voiceNoteUrl;
    if (voiceRel.startsWith('/uploads/voices/')) {
      const fullVoicePath = path.join(__dirname, '..', voiceRel.replace(/^\//, ''));
      if (fs.existsSync(fullVoicePath)) {
        await uploadFileToTelegram('sendVoice', fullVoicePath, {
          caption: `🎙️ <b>Voice Note for Table ${table}</b> (Order #${orderNum})`,
          parse_mode: 'HTML'
        });
      }
    }
  }

  return msgResult;
}

/**
 * Post Waiter Assistance Call to Telegram Channel
 */
async function sendWaiterCallToTelegram(call) {
  const chatId = process.env.TELEGRAM_CHAT_ID || CHAT_ID;
  if (!chatId) return { success: false, reason: 'missing_chat_id' };

  const table = call.table_number || call.tableNumber || 'Unknown';
  const reason = call.reason || 'General Assistance';

  let text = `🛎️ <b>WAITER CALL ALERT!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${table}\n`;
  text += `❓ <b>Request:</b> <b>${reason}</b>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Please attend to Table ${table} immediately.</i>`;

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

/**
 * Upload Food Photo or Kitchen Video to Telegram Channel
 * Returns Telegram File ID & Message details so Telegram serves as permanent CDN
 */
async function storeMediaInTelegram(filePath, caption = '') {
  const isVideo = filePath.endsWith('.mp4') || filePath.endsWith('.webm');
  const method = isVideo ? 'sendVideo' : 'sendPhoto';

  return await uploadFileToTelegram(method, filePath, {
    caption: caption || `📸 Dish Media (${path.basename(filePath)})`,
    parse_mode: 'HTML'
  });
}

module.exports = {
  callTelegramApi,
  uploadFileToTelegram,
  sendOrderToTelegram,
  sendWaiterCallToTelegram,
  storeMediaInTelegram
};
