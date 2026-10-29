import { telegramMediaUrl } from '../utils/mediaUrl.js';
import {
  createStaffCredential,
  hasStaffCredentialHash,
  stripPlainCredentials
} from '../utils/staffCredentials.js';

/**
 * Client-Side Telegram Channel Bridge, CDN Storage & Cloud Database Engine
 * 
 * Allows the browser PWA (on Vercel or local network) to post orders, bell alerts,
 * customer feedback, payment settlements, and correction audit logs.
 * Seamlessly hosts Food Photos, 360° Videos, Voice Notes, and Menu Database Snapshots
 * on Telegram CDN!
 */

export const TELEGRAM_BOT_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_BOT_TOKEN) 
  || '8819171458:AAHd3_pjEj2tEYfuB1zgJkznnSqPsisB6p0';
export const TELEGRAM_CHAT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_CHAT_ID) 
  || '-1004253971473';

/**
 * Retrieve active Telegram Bot Token and Chat ID (Env vars > LocalStorage > Defaults)
 */
export function getTelegramConfig() {
  const envToken = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_TELEGRAM_BOT_TOKEN : undefined;
  const envChatId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_TELEGRAM_CHAT_ID : undefined;

  const token = envToken 
    || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_token') : '') 
    || TELEGRAM_BOT_TOKEN;

  const chatId = envChatId 
    || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_chat_id') : '') 
    || TELEGRAM_CHAT_ID;

  return { token, chatId };
}

/**
 * Escape HTML characters to prevent breaking Telegram HTML parse_mode
 * 
 * @param {string|number} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert base64 data URI string to a standard Blob
 * 
 * @param {string} dataUrl 
 * @param {string} defaultMime 
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl, defaultMime = 'application/octet-stream') {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = (mimeMatch && mimeMatch[1]) || defaultMime;
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Reliably identifies if a URL string, path, or File/Blob object represents a video.
 * Handles MP4, WebM, QuickTime (.mov), M4V, MKV, 3GP, AVI, TS, streaming links, and Telegram CDN video paths.
 * 
 * @param {string|File|Blob|object} urlOrFile 
 * @returns {boolean}
 */
export function isVideoMedia(urlOrFile) {
  if (!urlOrFile) return false;

  // 1. File or Blob object
  if (typeof urlOrFile === 'object') {
    if (typeof urlOrFile.type === 'string' && urlOrFile.type.startsWith('video/')) {
      return true;
    }
    if (typeof urlOrFile.name === 'string' && /\.(mp4|webm|mov|m4v|mkv|3gp|avi|wmv|flv|ogv|ogg|ts|m3u8)$/i.test(urlOrFile.name)) {
      return true;
    }
    // Object wrapping URL or mediaType properties
    if (urlOrFile.mediaType === 'video') {
      return true;
    }
    const candidateUrl = urlOrFile.cdnUrl || urlOrFile.url || urlOrFile.src || urlOrFile.file_path || urlOrFile.image_url || urlOrFile.making_video_url;
    if (candidateUrl && typeof candidateUrl === 'string') {
      return isVideoMedia(candidateUrl);
    }
    return false;
  }

  // 2. String URL or path
  if (typeof urlOrFile === 'string') {
    const str = urlOrFile.trim();
    if (!str) return false;

    // Data URLs
    if (str.startsWith('data:video/')) return true;

    // Strip URL query params & fragments
    const cleanPath = str.split('?')[0].split('#')[0];

    // Standard video extensions
    if (/\.(mp4|webm|mov|m4v|mkv|3gp|avi|wmv|flv|ogv|ogg|ts|m3u8)$/i.test(cleanPath)) {
      return true;
    }

    // Video platforms / embed patterns
    if (/(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/|vimeo\.com\/|tiktok\.com\/|streamable\.com\/)/i.test(str)) {
      return true;
    }

    // Telegram Bot API video / animation paths (e.g. .../file/bot.../videos/file_12.mp4)
    if (/\/file\/bot[^/]+\/(?:videos|animations)\//i.test(str)) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Fetch fresh download links from Telegram CDN via getFile endpoint
 * 
 * @param {string|object} fileId - The Telegram file_id string or object with fileId
 * @param {object} [options] - Optional configurations
 * @returns {Promise<string>} Direct Telegram CDN download URL (also carries fileId, filePath, fileSize properties)
 */
export async function resolveTelegramFileUrl(fileId, options = {}) {
  const rawId = (typeof fileId === 'object' && fileId !== null)
    ? (fileId.fileId || fileId.file_id)
    : fileId;

  if (!rawId) {
    throw new Error('fileId is required to resolve Telegram file URL');
  }

  const { token } = getTelegramConfig();
  if (!token) {
    throw new Error('Telegram Bot Token not configured');
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(rawId)}`);
  const data = await res.json();
  if (!data.ok || !data.result?.file_path) {
    throw new Error(data.description || 'Failed to resolve file path from Telegram');
  }

  const cdnUrl = `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;

  if (options.fullInfo) {
    return {
      cdnUrl,
      fileId: rawId,
      filePath: data.result.file_path,
      fileSize: data.result.file_size
    };
  }

  return cdnUrl;
}

/**
 * Upload food photo to Telegram Channel and retrieve permanent CDN URL
 * 
 * @param {File|Blob|string} file - Image File, Blob, or base64 data URI
 * @returns {Promise<{ cdnUrl: string, fileId: string, messageId: number, mediaType: 'photo' }>}
 */
export async function uploadPhotoToTelegram(file) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID not configured');
  }

  let uploadBlob = file;
  if (typeof file === 'string' && file.startsWith('data:')) {
    uploadBlob = dataUrlToBlob(file, 'image/jpeg');
  }

  const fileName = (file && file.name) ? file.name : 'dish-photo.jpg';
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', `📸 Food Photo: ${fileName}`);
  formData.append('photo', uploadBlob, fileName);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || 'Failed to upload photo to Telegram');
  }

  const largestPhoto = Array.isArray(data.result?.photo) ? data.result.photo.slice(-1)[0] : null;
  const fileId = largestPhoto?.file_id;
  if (!fileId) {
    throw new Error('No photo file_id returned from Telegram');
  }

  // Permanent link (Telegram's own getFile links expire after about an hour)
  let cdnUrl = telegramMediaUrl(fileId, 'jpg');

  // Fallback to channel link if direct getFile failed
  if (!cdnUrl && data.result?.message_id) {
    const cleanChannelId = String(chatId).replace(/^-100/, '');
    cdnUrl = `https://t.me/c/${cleanChannelId}/${data.result.message_id}`;
  }

  return { 
    cdnUrl, 
    fileId, 
    messageId: data.result?.message_id,
    mediaType: 'photo',
    width: largestPhoto?.width || null,
    height: largestPhoto?.height || null,
    fileSize: largestPhoto?.file_size || null
  };
}

/**
 * Upload 360° product video or kitchen reel to Telegram Channel and retrieve permanent CDN URL.
 * Supports MP4, WebM, QuickTime (.mov), and mobile video formats.
 * Includes progressive streaming flag and fallback to sendDocument for broader codec support.
 * 
 * @param {File|Blob|string} file - Video File, Blob, or base64 data URI
 * @returns {Promise<{ cdnUrl: string, fileId: string, messageId: number, mediaType: 'video', duration: number|null, width: number|null, height: number|null }>}
 */
export async function uploadVideoToTelegram(file) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID not configured');
  }

  let uploadBlob = file;
  if (typeof file === 'string' && file.startsWith('data:')) {
    uploadBlob = dataUrlToBlob(file, 'video/mp4');
  }

  const fileName = (file && file.name) ? file.name : 'dish-360-video.mp4';
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', `🎥 360° Profile Video / Kitchen Reel: ${fileName}`);
  formData.append('video', uploadBlob, fileName);
  formData.append('supports_streaming', 'true');

  let res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    body: formData
  });
  let data = await res.json();

  // If sendVideo rejected the format (e.g. certain MOV / WebM codecs), fallback to sendDocument
  if (!data.ok) {
    console.warn('[TelegramClient] sendVideo failed, retrying with sendDocument fallback:', data.description);
    const docFormData = new FormData();
    docFormData.append('chat_id', chatId);
    docFormData.append('caption', `🎥 360° Profile Video / Kitchen Reel: ${fileName}`);
    docFormData.append('document', uploadBlob, fileName);

    res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: docFormData
    });
    data = await res.json();
  }

  if (!data.ok) {
    throw new Error(data.description || 'Failed to upload video to Telegram Channel');
  }

  const videoObj = data.result?.video || data.result?.animation || data.result?.document || null;
  const fileId = videoObj ? videoObj.file_id : null;
  // Permanent link (Telegram's own getFile links expire after about an hour)
  const videoExt = (String(fileName).match(/\.(mp4|mov|webm|m4v)$/i)?.[1] || 'mp4').toLowerCase().replace('m4v', 'mp4');
  let cdnUrl = fileId ? telegramMediaUrl(fileId, videoExt) : '';

  // Fallback to public t.me link if direct bot file path could not be resolved
  if (!cdnUrl && data.result?.message_id) {
    const cleanChannelId = String(chatId).replace(/^-100/, '');
    cdnUrl = `https://t.me/c/${cleanChannelId}/${data.result.message_id}`;
  }

  return { 
    cdnUrl,
    fileId,
    messageId: data.result?.message_id,
    mediaType: 'video',
    duration: videoObj?.duration || null,
    width: videoObj?.width || null,
    height: videoObj?.height || null
  };
}

/**
 * Unified Media Uploader for Telegram CDN
 * Automatically detects whether the selected file is an image or video (MP4, WebM, QuickTime .mov, M4V, etc.),
 * and routes to either uploadVideoToTelegram or uploadPhotoToTelegram.
 * 
 * @param {File|Blob|string} file 
 * @returns {Promise<{ cdnUrl: string, fileId: string, messageId: number, mediaType: 'photo' | 'video' }>}
 */
export async function uploadMediaToTelegram(file) {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const isVideo = isVideoMedia(file);

  if (isVideo) {
    const result = await uploadVideoToTelegram(file);
    return {
      ...result,
      mediaType: 'video'
    };
  } else {
    const result = await uploadPhotoToTelegram(file);
    return {
      ...result,
      mediaType: 'photo'
    };
  }
}

/**
 * Send voice note to Telegram Channel using Telegram sendVoice endpoint
 * 
 * @param {Blob|File|string} voiceBlob - Audio Blob, File, or base64 data URI
 * @param {object} [meta] - Metadata { tableNumber, orderNumber }
 * @returns {Promise<{ success: boolean, cdnUrl?: string, fileId?: string, messageId?: number, mediaType: 'voice', error?: string, reason?: string }>}
 */
export async function sendVoiceNoteToTelegram(voiceBlob, { tableNumber = 'N/A', orderNumber = '' } = {}) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  if (!voiceBlob) {
    return { success: false, error: 'No voice audio provided' };
  }

  let uploadBlob = voiceBlob;
  if (typeof voiceBlob === 'string' && voiceBlob.startsWith('data:')) {
    uploadBlob = dataUrlToBlob(voiceBlob, 'audio/ogg');
  }

  const tableStr = String(tableNumber || 'N/A');
  const orderStr = orderNumber ? `#${orderNumber}` : 'Pending';

  const getBlobExtension = (blob) => {
    const type = (blob?.type || '').toLowerCase();
    if (type.includes('webm')) return 'webm';
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('aac') || type.includes('m4a')) return 'm4a';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('wav')) return 'wav';
    return 'ogg';
  };

  const defaultExt = getBlobExtension(uploadBlob);
  const fileName = (voiceBlob && voiceBlob.name) 
    ? voiceBlob.name 
    : `voice_table_${tableStr.replace(/\s+/g, '_')}_${Date.now()}.${defaultExt}`;

  const caption = `🎙️ <b>VOICE NOTE / AUDIO INSTRUCTION</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Table:</b> Table ${escapeHtml(tableStr)}\n` +
    `🧾 <b>Order:</b> <code>${escapeHtml(orderStr)}</code>\n` +
    `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Customer recorded spoken kitchen instruction.</i>`;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');
  formData.append('voice', uploadBlob, fileName);

  try {
    let res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
      method: 'POST',
      body: formData
    });
    let data = await res.json();

    // If sendVoice was rejected by Telegram (e.g. webm/wav codec issue), fallback to sendAudio
    if (!data.ok) {
      console.warn('[TelegramClient] sendVoice failed, retrying with sendAudio fallback:', data.description);
      const audioFormData = new FormData();
      audioFormData.append('chat_id', chatId);
      audioFormData.append('caption', caption);
      audioFormData.append('parse_mode', 'HTML');
      audioFormData.append('audio', uploadBlob, fileName);

      res = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, {
        method: 'POST',
        body: audioFormData
      });
      data = await res.json();
    }

    // Second fallback to sendDocument for raw voice audio preservation
    if (!data.ok) {
      console.warn('[TelegramClient] sendAudio fallback rejected, retrying with sendDocument:', data.description);
      const docFormData = new FormData();
      docFormData.append('chat_id', chatId);
      docFormData.append('caption', caption);
      docFormData.append('parse_mode', 'HTML');
      docFormData.append('document', uploadBlob, fileName);

      res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: docFormData
      });
      data = await res.json();
    }

    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to send voice note' };
    }

    const voiceObj = data.result?.voice || data.result?.audio || data.result?.document;
    const fileId = voiceObj ? voiceObj.file_id : null;
    let cdnUrl = '';
    if (fileId) {
      try {
        cdnUrl = await resolveTelegramFileUrl(fileId);
      } catch (err) {
        console.warn('[TelegramClient] Failed to resolve voice CDN path:', err.message);
      }
    }

    if (!cdnUrl && data.result?.message_id) {
      const cleanChannelId = String(chatId).replace(/^-100/, '');
      cdnUrl = `https://t.me/c/${cleanChannelId}/${data.result.message_id}`;
    }

    return {
      success: true,
      fileId,
      cdnUrl,
      messageId: data.result?.message_id,
      duration: voiceObj?.duration || null,
      mediaType: 'voice',
      data: data.result
    };
  } catch (err) {
    console.warn('[Telegram sendVoice Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send an Order Notification to Telegram Channel with complete formatted receipt, itemized list, notes, and totals
 * 
 * @param {object} orderPayload - Complete order payload
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendOrderToTelegramChannel(orderPayload) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const table = orderPayload.tableNumber || orderPayload.table_number || 'Unknown';
  const orderId = orderPayload.orderId || orderPayload.orderNumber || `ORD-${Date.now().toString().slice(-4)}`;
  const subtotal = orderPayload.subtotal !== undefined ? Number(orderPayload.subtotal) : null;
  const tax = orderPayload.tax !== undefined ? Number(orderPayload.tax) : null;
  const discount = Number(orderPayload.discount || 0);
  const tip = Number(orderPayload.tip || 0);
  const total = orderPayload.total !== undefined 
    ? Number(orderPayload.total) 
    : (orderPayload.totalAmount !== undefined ? Number(orderPayload.totalAmount) : 0);
  const items = orderPayload.items || [];
  const customerName = orderPayload.customerName || orderPayload.dinerName || orderPayload.name || '';
  const customerPhone = orderPayload.phone || orderPayload.customerPhone || '';
  const serverName = orderPayload.serverName || orderPayload.waiter || orderPayload.waiterName || '';
  const paymentMethod = orderPayload.paymentMethod || orderPayload.payment_method || '';
  const paymentStatus = orderPayload.paymentStatus || orderPayload.status || '';
  const generalNote = orderPayload.generalNote || orderPayload.note || orderPayload.specialInstructions || '';
  const orderTime = orderPayload.createdAt 
    ? new Date(orderPayload.createdAt).toLocaleTimeString() 
    : new Date().toLocaleTimeString();
  const orderDate = orderPayload.createdAt 
    ? new Date(orderPayload.createdAt).toLocaleDateString() 
    : new Date().toLocaleDateString();

  let itemsText = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsText = items.map((it, i) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.price || 0);
      const lineTotal = (qty * price).toFixed(2);
      let line = `${i + 1}. <b>${escapeHtml(it.name || 'Dish')}</b> × ${qty} — <b>$${lineTotal}</b> ($${price.toFixed(2)} ea)`;
      
      if (it.options && typeof it.options === 'object') {
        const optEntries = Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(', ');
        if (optEntries) line += `\n   <i>↳ Options: ${escapeHtml(optEntries)}</i>`;
      }
      if (it.note || it.specialInstructions) {
        line += `\n   <i>↳ Note: ${escapeHtml(it.note || it.specialInstructions)}</i>`;
      }
      if (it.voiceNoteUrl) {
        line += `\n   <i>↳ 🎙️ <a href="${it.voiceNoteUrl}">Dish Audio Note</a></i>`;
      }
      return line;
    }).join('\n');
  } else {
    itemsText = '<i>(No itemized products)</i>';
  }

  let text = `🧾 <b>SMARTDINE — ORDER RECEIPT</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🆔 <b>Order ID:</b> <code>#${escapeHtml(orderId)}</code>\n`;
  text += `🕒 <b>Time:</b> ${orderTime} | ${orderDate}\n`;
  if (customerName) {
    text += `👤 <b>Customer:</b> ${escapeHtml(customerName)}${customerPhone ? ` (${escapeHtml(customerPhone)})` : ''}\n`;
  }
  if (serverName) {
    text += `🧑‍🍳 <b>Server / Waiter:</b> ${escapeHtml(serverName)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>ORDER ITEMS:</b>\n${itemsText}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 <b>BILL BREAKDOWN:</b>\n`;
  if (subtotal !== null) {
    text += `   Subtotal:     $${subtotal.toFixed(2)}\n`;
  }
  if (tax !== null) {
    text += `   Tax (Est.):   $${tax.toFixed(2)}\n`;
  }
  if (discount > 0) {
    text += `   Discount:    -$${discount.toFixed(2)}\n`;
  }
  if (tip > 0) {
    text += `   Tip:         +$${tip.toFixed(2)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 <b>TOTAL AMOUNT: $${total.toFixed(2)}</b>\n`;
  if (paymentMethod) {
    text += `💳 <b>Payment:</b> ${escapeHtml(paymentMethod.toUpperCase())}\n`;
  }
  if (paymentStatus) {
    text += `📊 <b>Status:</b> <b>${escapeHtml(paymentStatus.toUpperCase())}</b>\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (generalNote) {
    text += `💬 <b>Customer Special Note:</b>\n<i>"${escapeHtml(generalNote)}"</i>\n━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  if (orderPayload.voiceNote || orderPayload.voiceNoteUrl) {
    const vUrl = orderPayload.voiceNote || orderPayload.voiceNoteUrl;
    text += `🎙️ <b>Voice Instructions:</b> <a href="${vUrl}">Listen to Customer Voice</a>\n`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();

    // If orderPayload also carries voiceBlob, transmit the voice note directly as well
    if (orderPayload.voiceBlob) {
      sendVoiceNoteToTelegram(orderPayload.voiceBlob, {
        tableNumber: table,
        orderNumber: orderId
      }).catch(err => {
        console.warn('[TelegramClient] Attached voice note dispatch failed:', err);
      });
    }

    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Client Bridge Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Packages the entire restaurant menu as a JSON document snapshot, sends it via
 * sendDocument (smartdine_menu_<timestamp>.json) and pins it to the channel.
 * 
 * @param {Array} dishes - List of menu dishes
 * @param {Array} categories - List of menu categories
 * @returns {Promise<{ success: boolean, messageId: number, fileId: string, filename: string, cdnUrl: string|null, pinned: boolean, totalDishes: number, totalCategories: number, data: object }>}
 */
export async function publishMenuSnapshotToTelegram(dishes = [], categories = []) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID not configured');
  }

  const timestamp = Date.now();
  const filename = `smartdine_menu_${timestamp}.json`;
  const snapshotData = {
    app: 'SmartDine QR Restaurant Suite',
    schemaVersion: '1.0',
    exportTimestamp: timestamp,
    exportedAt: new Date().toISOString(),
    stats: {
      totalCategories: Array.isArray(categories) ? categories.length : 0,
      totalDishes: Array.isArray(dishes) ? dishes.length : 0
    },
    categories: Array.isArray(categories) ? categories : [],
    dishes: Array.isArray(dishes) ? dishes : []
  };

  const jsonContent = JSON.stringify(snapshotData, null, 2);
  const jsonBlob = new Blob([jsonContent], { type: 'application/json' });

  const caption = `📦 <b>SMARTDINE MENU CLOUD SNAPSHOT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>Exported:</b> ${new Date().toLocaleString()}\n` +
    `🏷️ <b>Categories:</b> ${snapshotData.stats.totalCategories}\n` +
    `🍽️ <b>Dishes:</b> ${snapshotData.stats.totalDishes}\n` +
    `📄 <b>Filename:</b> <code>${filename}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 <i>Cloud snapshot pinned for disaster recovery & fast offline restore.</i>`;

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');
  formData.append('document', jsonBlob, filename);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || 'Failed to publish menu snapshot to Telegram');
  }

  const messageId = data.result?.message_id;
  const fileId = data.result?.document?.file_id;

  let pinned = false;
  if (messageId) {
    try {
      const pinRes = await fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          disable_notification: false
        })
      });
      const pinData = await pinRes.json();
      pinned = pinData.ok === true;
    } catch (pinErr) {
      console.warn('[TelegramClient] pinChatMessage warning:', pinErr);
    }
  }

  let cdnUrl = '';
  if (fileId) {
    try {
      cdnUrl = await resolveTelegramFileUrl(fileId);
    } catch (urlErr) {
      console.warn('[TelegramClient] Failed to resolve menu snapshot CDN path:', urlErr);
    }
  }

  return {
    success: true,
    messageId,
    fileId,
    filename,
    cdnUrl: cdnUrl ? String(cdnUrl) : null,
    pinned,
    totalDishes: snapshotData.stats.totalDishes,
    totalCategories: snapshotData.stats.totalCategories,
    data: data.result
  };
}

/**
 * Send Waiter Bell Notification to Telegram Channel directly from Diner PWA
 * 
 * @param {string|number|object} tableNumber - Table identifier or object with details
 * @param {string} [reason] - Reason for assistance (e.g. 'Water Refill', 'Bill')
 * @param {string} [assignedWaiter] - Optional assigned staff member name
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendWaiterCallToTelegramChannel(tableNumber, reason = 'General Assistance', assignedWaiter = '') {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  // Handle object signature if caller invoked with single object { tableNumber, reason, assignedWaiter }
  let table = tableNumber;
  let rsn = reason;
  let waiter = assignedWaiter;
  if (typeof tableNumber === 'object' && tableNumber !== null) {
    table = tableNumber.tableNumber || tableNumber.table_number || tableNumber.table || 'Unknown';
    rsn = tableNumber.reason || 'General Assistance';
    waiter = tableNumber.assignedWaiter || tableNumber.waiter || tableNumber.server || '';
  }

  let text = `🛎️ <b>WAITER ASSISTANCE CALLED!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🙋 <b>Reason:</b> <b>${escapeHtml(rsn || 'General Assistance')}</b>\n`;
  if (waiter) {
    text += `🧑‍💼 <b>Assigned Staff:</b> <b>${escapeHtml(waiter)}</b>\n`;
  }
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚠️ <i>Immediate assistance requested at Table ${escapeHtml(table)}.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Waiter Call Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Customer Feedback or Experience Report to Telegram Channel
 * 
 * @param {object|string} report - Customer report object or feedback text
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendCustomerReportToTelegramChannel(report) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const payload = typeof report === 'string' ? { feedback: report } : (report || {});
  const table = payload.tableNumber || payload.table_number || payload.table || 'General';
  const customerName = payload.customerName || payload.name || payload.dinerName || '';
  const phone = payload.phone || payload.contact || '';
  const orderId = payload.orderId || payload.orderNumber || '';
  const rating = Number(payload.rating || 0);
  const category = payload.category || payload.type || payload.subject || 'Feedback';
  const feedback = payload.feedback || payload.comment || payload.message || payload.notes || payload.reportText || 'No comments provided.';
  const time = payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  let stars = '';
  if (rating > 0 && rating <= 5) {
    stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  let text = `⭐ <b>CUSTOMER FEEDBACK & EXPERIENCE REPORT</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  if (orderId) {
    text += `🧾 <b>Order ID:</b> <code>#${escapeHtml(orderId)}</code>\n`;
  }
  if (customerName) {
    text += `👤 <b>Customer:</b> ${escapeHtml(customerName)}\n`;
  }
  if (phone) {
    text += `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n`;
  }
  if (stars) {
    text += `🌟 <b>Rating:</b> ${stars} (${rating}/5)\n`;
  }
  if (category) {
    text += `🏷️ <b>Category:</b> <b>${escapeHtml(category)}</b>\n`;
  }
  text += `⏱️ <b>Time:</b> ${time}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💬 <b>Customer Note / Feedback:</b>\n`;
  text += `<i>"${escapeHtml(feedback)}"</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 <i>Recorded in SmartDine Diner Experience Database.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Customer Report Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Payment Settlement Receipt to Telegram Channel
 * 
 * @param {object} settlement - Payment settlement details
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendSettlementToTelegramChannel(settlement) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const s = settlement || {};
  const orderId = s.orderId || s.orderNumber || (Array.isArray(s.orderIds) && s.orderIds.length ? s.orderIds.join(', ') : (s.settlementId || s.billNumber || `SET-${Date.now().toString().slice(-4)}`));
  const billNo = s.billNumber || s.billNo || '';
  const table = s.tableNumber || s.table_number || s.table || 'Counter / Takeout';
  const total = Number(s.total !== undefined ? s.total : (s.amountPaid !== undefined ? s.amountPaid : (s.totalAmount || 0)));
  const subtotal = s.subtotal !== undefined ? Number(s.subtotal) : null;
  const tax = s.tax !== undefined ? Number(s.tax) : null;
  const service = s.service !== undefined ? Number(s.service) : null;
  const discount = Number(s.discount || 0);
  const tip = Number(s.tip || 0);
  const paymentMethod = s.paymentMethod || s.method || 'Cash';
  const paymentStatus = s.paymentStatus || s.status || 'Settled';
  const change = Number(s.change !== undefined ? s.change : (s.changeDue || 0));
  const cashier = s.cashier || s.settledBy || s.staff || s.server || '';
  const txnRef = s.transactionId || s.txnRef || s.reference || s.authCode || '';
  const timestamp = s.paidAt || s.timestamp;
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  const date = timestamp ? new Date(timestamp).toLocaleDateString() : new Date().toLocaleDateString();

  let text = `💳 <b>PAYMENT SETTLEMENT RECEIPT</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (billNo) {
    text += `🧾 <b>Bill No:</b> <code>${escapeHtml(billNo)}</code>\n`;
  }
  text += `📦 <b>Order ID(s):</b> <code>#${escapeHtml(orderId)}</code>\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🕒 <b>Settled:</b> ${time} | ${date}\n`;
  if (cashier) {
    text += `🧑‍💼 <b>Cashier / Staff:</b> ${escapeHtml(cashier)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 <b>SETTLEMENT SUMMARY:</b>\n`;
  if (subtotal !== null) {
    text += `   Subtotal:      $${subtotal.toFixed(2)}\n`;
  }
  if (service !== null && service > 0) {
    text += `   Service:      +$${service.toFixed(2)}\n`;
  }
  if (tax !== null) {
    text += `   Tax / VAT:    +$${tax.toFixed(2)}\n`;
  }
  if (discount > 0) {
    text += `   Discount:     -$${discount.toFixed(2)}\n`;
  }
  if (tip > 0) {
    text += `   Tip:          +$${tip.toFixed(2)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 <b>TOTAL PAID:     $${total.toFixed(2)}</b>\n`;
  text += `💳 <b>Payment Method:</b> <b>${escapeHtml(paymentMethod.toUpperCase())}</b>\n`;
  text += `📊 <b>Status:</b>         <b>${escapeHtml(paymentStatus.toUpperCase())}</b>\n`;
  if (txnRef) {
    text += `🔢 <b>Txn Reference:</b>  <code>${escapeHtml(txnRef)}</code>\n`;
  }
  if (change > 0) {
    text += `🪙 <b>Change Given:</b>   $${change.toFixed(2)}\n`;
  }

  if (Array.isArray(s.lines) && s.lines.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 <b>Settled Items:</b>\n`;
    s.lines.forEach((l, idx) => {
      const lineCost = l.lineTotal !== undefined ? Number(l.lineTotal) : (Number(l.price || 0) * Number(l.qty || 1));
      text += `${idx + 1}. <b>${escapeHtml(l.name)}</b> × ${l.qty} ($${lineCost.toFixed(2)})\n`;
    });
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ <i>Bill fully settled. Payment confirmed & recorded in cloud ledger.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Settlement Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Item Void or Discount Correction Audit Log to Telegram Channel
 * 
 * @param {object} correction - Correction or audit log payload
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendCorrectionToTelegramChannel(correction) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const c = correction || {};
  const actionType = c.type || c.action || (c.discountAmount || c.discountPercent || c.discountType ? 'DISCOUNT' : 'ITEM VOID');
  const orderId = c.orderLabel || c.orderId || c.orderNumber || 'Unknown';
  const table = c.tableNumber || c.table_number || c.table || 'General';
  const itemName = c.itemName || c.item || c.dishName || (Array.isArray(c.itemNames) && c.itemNames.length ? c.itemNames.join(', ') : (c.wholeOrder ? 'Entire Order' : ''));
  const quantity = c.quantity !== undefined ? Number(c.quantity) : null;
  const amount = c.amount !== undefined ? Number(c.amount) : (c.voidAmount !== undefined ? Number(c.voidAmount) : (c.discountAmount !== undefined ? Number(c.discountAmount) : (c.discountType === 'fixed' ? Number(c.value) : null)));
  const discountPercent = c.discountPercent !== undefined ? Number(c.discountPercent) : (c.discountType === 'percent' ? Number(c.value) : null);
  const reason = c.reason || c.justification || 'No reason specified';
  const authorizedBy = c.authorizedBy || c.appliedBy || c.requestedBy || c.resolvedBy || c.manager || c.staff || c.supervisor || 'Manager';
  const notes = c.notes || c.note || c.comment || '';
  const timestamp = c.timestamp || c.appliedAt || c.requestedAt;
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  let text = `⚠️ <b>ORDER CORRECTION & AUDIT LOG</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏷️ <b>Action Type:</b> <b>${escapeHtml(actionType.toUpperCase())}</b>\n`;
  text += `🧾 <b>Order ID:</b> <code>#${escapeHtml(orderId)}</code>\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🕒 <b>Time:</b> ${time}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (itemName) {
    text += `🍽️ <b>Item Affected:</b> <b>${escapeHtml(itemName)}</b>${quantity !== null ? ` × ${quantity}` : ''}\n`;
  }
  if (amount !== null) {
    text += `💰 <b>Adjustment Amount:</b> $${amount.toFixed(2)}\n`;
  }
  if (discountPercent !== null) {
    text += `🏷️ <b>Discount Applied:</b> ${discountPercent}%\n`;
  }
  text += `❓ <b>Reason:</b> <i>"${escapeHtml(reason)}"</i>\n`;
  if (authorizedBy) {
    text += `🔑 <b>Authorized By:</b> <b>${escapeHtml(authorizedBy)}</b>\n`;
  }
  if (notes) {
    text += `📝 <b>Additional Notes:</b> <i>${escapeHtml(notes)}</i>\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔒 <i>Recorded for management audit trail and inventory accounting.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Correction Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Guest / Diner Chat Message directly to Telegram Channel
 * 
 * @param {string|number} tableNumber - Table number
 * @param {string} messageText - Message or question from diner
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendGuestChatToTelegramChannel(tableNumber, messageText) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const table = tableNumber || 'Unknown';
  const now = new Date();
  const time = now.toLocaleTimeString();

  let text = `💬 <b>GUEST MESSAGE - TABLE ${escapeHtml(table)}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `⏱️ <b>Time:</b> ${time}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💭 <b>Question / Comment:</b>\n<i>"${escapeHtml(messageText)}"</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Sent from Diner Table ${escapeHtml(table)} Guest Chat.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Guest Chat Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Floor Occupancy Snapshot to Telegram Channel
 * Formats current floor occupancy, table status, active orders, and alerts into an executive snapshot.
 * 
 * @param {object|string} snapshotPayload 
 * @returns {Promise<{ success: boolean, messageId?: number, data?: object, reason?: string, error?: string }>}
 */
export async function sendFloorSnapshotToTelegram(snapshotPayload) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  let text = '';

  if (typeof snapshotPayload === 'string') {
    text = snapshotPayload;
  } else if (snapshotPayload && typeof snapshotPayload === 'object') {
    const {
      totalTables = 0,
      occupiedTables = 0,
      availableTables = 0,
      orderingTables = 0,
      readyTables = 0,
      assistanceTables = 0,
      occupancyRate = 0,
      activeOrdersCount = 0,
      tables = [],
      timestamp = new Date()
    } = snapshotPayload;

    const timeStr = typeof timestamp === 'string' ? timestamp : new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    text = `📋 <b>SMARTDINE — LIVE FLOOR SNAPSHOT</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🕒 <b>Time:</b> ${timeStr} | ${dateStr}\n`;
    text += `🏛️ <b>Total Tables:</b> ${totalTables}\n`;
    text += `📊 <b>Floor Occupancy:</b> <b>${occupancyRate}%</b> (${occupiedTables}/${totalTables} occupied)\n`;
    text += `🍽️ <b>Active Kitchen Tickets:</b> <b>${activeOrdersCount}</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🟢 <b>Available:</b> ${availableTables}\n`;
    text += `🟡 <b>Ordering / Cooking:</b> ${orderingTables}\n`;
    text += `🔵 <b>Food Ready for Pickup:</b> ${readyTables}\n`;
    if (assistanceTables > 0) {
      text += `🔴 <b>Needs Assistance:</b> <b>${assistanceTables} ⚠️</b>\n`;
    } else {
      text += `⚪ <b>Needs Assistance:</b> 0\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    // Active tables breakdown
    const activeTables = (tables || []).filter(t => t.status !== 'available' && t.status !== 'AVAILABLE');
    if (activeTables.length > 0) {
      text += `📌 <b>Active Tables Breakdown:</b>\n`;
      activeTables.forEach((t) => {
        const tNum = t.tableNumber || t.id;
        let statusBadge = '🟡 Ordering';
        const st = String(t.status || '').toLowerCase();
        if (st.includes('ready')) statusBadge = '🔵 Ready for Pickup';
        if (st.includes('assist')) statusBadge = '🔴 Assistance Call';
        
        let line = `• <b>Table #${escapeHtml(tNum)}</b> (${escapeHtml(t.location || 'Floor')}): ${statusBadge}`;
        if (t.assignedStaffName && t.assignedStaffName !== 'Unassigned') {
          line += ` | <i>Staff: ${escapeHtml(t.assignedStaffName)}</i>`;
        }
        if (t.orderSummary) {
          line += `\n   ↳ <i>${escapeHtml(t.orderSummary)}</i>`;
        }
        text += `${line}\n`;
      });
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    text += `📡 <i>Live broadcast from SmartDine POS • Offline-Ready Floor Console</i>`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return { 
      success: data.ok === true, 
      messageId: data.result?.message_id,
      data 
    };
  } catch (err) {
    console.warn('[Telegram Floor Snapshot Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send arbitrary text message to Telegram Channel
 */
export async function sendMessage(text, options = {}) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }
  const targetChatId = options.chatId || options.chat_id || chatId;
  const parseMode = options.parse_mode !== undefined ? options.parse_mode : 'HTML';

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: parseMode,
        ...options
      })
    });
    const data = await res.json();
    return { success: Boolean(data.ok), messageId: data.result?.message_id, data };
  } catch (err) {
    console.warn('[Telegram sendMessage Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send kitchen order status update / receipt to Telegram Channel
 */
export async function sendOrderStatusToTelegram(orderId, tableNumber, status, metadata = {}) {
  const statusUpper = String(status || '').toUpperCase();
  let emoji = '🍳';
  if (statusUpper.includes('READY')) {
    emoji = '🔔';
  } else if (statusUpper.includes('SERVE') || statusUpper.includes('COMPLET')) {
    emoji = '✅';
  } else if (statusUpper.includes('PREPAR') || statusUpper.includes('COOK')) {
    emoji = '🔥';
  } else if (statusUpper.includes('PLACED') || statusUpper.includes('PENDING')) {
    emoji = '📝';
  } else if (statusUpper.includes('CANCEL') || statusUpper.includes('VOID')) {
    emoji = '🚫';
  }

  const cleanNum = String(orderId).startsWith('ord_') || String(orderId).length > 8
    ? String(orderId).slice(-4).toUpperCase()
    : String(orderId);
  const table = tableNumber || metadata.tableNumber || metadata.table_no || 'Unknown';

  let text = `${emoji} <b>LIVE ORDER UPDATE — SMARTDINE</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${escapeHtml(table)}\n`;
  text += `🧾 <b>Order:</b> <code>#${escapeHtml(cleanNum)}</code>\n`;
  text += `📊 <b>Status:</b> <b>${escapeHtml(statusUpper)}</b>\n`;
  if (metadata.actorName || metadata.serverName) {
    text += `👤 <b>Handled By:</b> ${escapeHtml(metadata.actorName || metadata.serverName)}\n`;
  }
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;

  const items = metadata.items || [];
  if (Array.isArray(items) && items.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 <b>Items:</b>\n`;
    items.forEach((it, i) => {
      const q = it.quantity || it.qty || 1;
      text += `${i + 1}. <b>${escapeHtml(it.name || 'Item')}</b> × ${q}`;
      if (it.notes || it.note) {
        text += ` <i>(${escapeHtml(it.notes || it.note)})</i>`;
      }
      text += `\n`;
    });
  }

  const total = metadata.total || metadata.totalAmount || metadata.total_amount;
  if (total !== undefined && total !== null) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 <b>Total:</b> ৳${Number(total).toLocaleString()}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Live Admin Console Order Pipeline Sync</i>`;

  return sendMessage(text);
}

/**
 * Send order clearance / archive receipt to Telegram Channel
 */
export async function sendOrdersClearedToTelegram({ count = 0, stage = 'all', clearedOrders = [], clearedBy = 'Admin Desk' } = {}) {
  let text = `🧹 <b>ORDERS CLEARED / ARCHIVED — SMARTDINE</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📦 <b>Cleared Tickets:</b> ${count}\n`;
  text += `🏷️ <b>Scope / Filter:</b> ${escapeHtml(String(stage).toUpperCase())}\n`;
  text += `🧑‍💼 <b>Action By:</b> ${escapeHtml(clearedBy)}\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;

  if (Array.isArray(clearedOrders) && clearedOrders.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 <b>Cleared Orders:</b>\n`;
    clearedOrders.slice(0, 8).forEach((o, i) => {
      const t = o.tableNumber || o.table_no || '-';
      const num = o.orderNumber || o.id || 'N/A';
      text += `${i + 1}. Table ${escapeHtml(t)} &middot; #${escapeHtml(String(num).slice(-6))} (${escapeHtml(o.kitchenFlowStage || o.status || 'unknown')})\n`;
    });
    if (clearedOrders.length > 8) {
      text += `<i>...and ${clearedOrders.length - 8} more</i>\n`;
    }
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Local orders and storage synchronized.</i>`;

  return sendMessage(text);
}

/**
 * Real-time health telemetry ping for Telegram Cloud DB / Media Channel.
 * Fully standalone and decoupled from external cloud database status.
 *
 * @returns {Promise<{
 *   connected: boolean,
 *   status: 'online' | 'degraded' | 'offline' | 'unconfigured' | 'error',
 *   latency: number | null,
 *   channelTitle?: string,
 *   channelUsername?: string | null,
 *   chatId?: string,
 *   type?: string,
 *   inviteLink?: string | null,
 *   description?: string,
 *   pinnedMessageId?: number | null,
 *   botUsername?: string | null,
 *   error?: string | null,
 *   checkedAt: string
 * }>}
 */
export async function checkTelegramHealth() {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return {
      connected: false,
      status: 'unconfigured',
      latency: null,
      error: 'Bot token or Chat ID is missing',
      checkedAt: new Date().toISOString()
    };
  }

  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    try {
      controller?.abort();
    } catch (_) {}
  }, 7000);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`, {
      method: 'GET',
      signal: controller?.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);

    const latency = Math.max(1, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime));
    const data = await res.json();

    if (data.ok && data.result) {
      return {
        connected: true,
        status: 'online',
        latency,
        channelTitle: data.result.title || 'Restaurant Media',
        channelUsername: data.result.username || null,
        chatId: String(data.result.id || chatId),
        type: data.result.type || 'channel',
        inviteLink: data.result.invite_link || null,
        description: data.result.description || '',
        pinnedMessageId: data.result.pinned_message?.message_id || null,
        hasPinnedSnapshot: Boolean(data.result.pinned_message),
        checkedAt: new Date().toISOString()
      };
    }

    // Secondary fallback: test Bot API getMe to verify network connectivity
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result) {
        return {
          connected: true,
          status: 'online',
          latency,
          channelTitle: 'Restaurant Media',
          chatId: String(chatId),
          type: 'channel',
          botUsername: meData.result.username || 'restaurant_media_bot',
          checkedAt: new Date().toISOString()
        };
      }
    } catch (_) {}

    return {
      connected: false,
      status: 'error',
      latency,
      error: data.description || 'Telegram API returned non-OK status',
      checkedAt: new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
    const isTimeout = err?.name === 'AbortError';

    return {
      connected: false,
      status: 'offline',
      latency: isTimeout ? null : latency,
      error: isTimeout ? 'Ping timed out (>7s)' : (err?.message || 'Network connection failed'),
      checkedAt: new Date().toISOString()
    };
  }
}

/**
 * Send an on-demand test signal ping to Telegram Channel to verify write capability.
 */
export async function sendTelegramTestPing() {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, error: 'Telegram Bot Token or Chat ID not configured' };
  }

  const text = `📡 <b>TELEGRAM CDN LIVE TELEMETRY PING</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🟢 <b>Status:</b> Connected & Operational\n` +
    `📍 <b>Origin:</b> SmartDine Admin Suite (Header Telemetry)\n` +
    `⏱️ <b>Timestamp:</b> ${new Date().toLocaleTimeString()} • ${new Date().toLocaleDateString()}\n` +
    `⚡ <b>Channel:</b> Restaurant Media\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Verified CDN photo/video storage & realtime cloud event pipeline.</i>`;

  return sendMessage(text);
}

/**
 * Sanitize and Hash Employee Roster for secure Telegram backup.
 * All raw PINs/passcodes/passwords are stripped and securely salted & hashed.
 * Shifts, profiles, and table custody records are preserved in full.
 */
export function sanitizeAndHashStaffRoster(employees = [], tableCustody = {}) {
  const staffList = Array.isArray(employees) ? employees : [];

  return staffList.map((emp, index) => {
    const rawPin = emp.passcode || emp.waiterPin || emp.pin || emp.password;
    let credential = null;
    if (typeof hasStaffCredentialHash === 'function' && hasStaffCredentialHash(emp)) {
      credential = {
        passwordHash: emp.passwordHash,
        passwordSalt: emp.passwordSalt,
        passwordUpdatedAt: emp.passwordUpdatedAt || new Date().toISOString()
      };
    } else if (rawPin && typeof createStaffCredential === 'function') {
      credential = createStaffCredential(rawPin);
    } else if (typeof createStaffCredential === 'function') {
      credential = createStaffCredential('1234');
    } else {
      credential = {
        passwordHash: 'HASHED_CREDENTIAL_PROTECTED',
        passwordSalt: 'SALT_PROTECTED',
        passwordUpdatedAt: new Date().toISOString()
      };
    }

    // Strip raw plaintext PIN / passwords
    const stripped = typeof stripPlainCredentials === 'function'
      ? stripPlainCredentials({ ...emp, ...credential })
      : { ...emp, ...credential };
    delete stripped.password;
    delete stripped.passcode;
    delete stripped.pin;
    delete stripped.waiterPin;

    const assigned = Array.isArray(emp.assignedTables) ? emp.assignedTables : [];

    // Custody records belonging to or held by this employee
    const custodyRecords = Object.keys(tableCustody || {})
      .map(Number)
      .filter(t => tableCustody[t]?.originalOwnerId === emp.id || assigned.includes(t))
      .map(t => ({
        tableNumber: t,
        originalOwnerId: tableCustody[t]?.originalOwnerId,
        delegationTrail: tableCustody[t]?.delegationTrail || [tableCustody[t]?.originalOwnerId],
        isCurrentlyAssigned: assigned.includes(t),
        isOriginalOwner: tableCustody[t]?.originalOwnerId === emp.id
      }));

    const custodyTables = Object.keys(tableCustody || {})
      .map(Number)
      .filter(t => tableCustody[t]?.originalOwnerId === emp.id);

    return {
      ...stripped,
      id: emp.id || `emp-${index + 1}`,
      numericId: emp.numericId || (index + 1),
      name: emp.name || `Staff #${index + 1}`,
      initials: emp.initials || 'EM',
      role: emp.role || 'Floor Specialist',
      shift: emp.shift || 'Morning Shift (08:00 - 16:00)',
      shiftTime: emp.shiftTime || emp.shift || '08:00 - 16:00',
      status: emp.status || 'Active',
      accountCode: emp.accountCode || emp.waiterCode || `WAIT-${101 + index}`,
      waiterCode: emp.waiterCode || emp.accountCode || `WAIT-${101 + index}`,
      assignedTables: assigned,
      custodyTables: custodyTables.length > 0 ? custodyTables : assigned,
      tableCustodyRecords: custodyRecords,
      pinMask: '••••••',
      credentialProtection: 'SHA256-SALTED-ITERATED',
      passwordHash: credential.passwordHash,
      passwordSalt: credential.passwordSalt,
      passwordUpdatedAt: credential.passwordUpdatedAt
    };
  });
}

/**
 * Backup Staff Roster to Telegram Channel.
 * Exports staff profiles, shift assignments, and table custody records
 * while sanitizing and hashing all raw PINs.
 * Posts the backup to Telegram Channel via sendDocument / sendMessage.
 */
export async function sendStaffRosterBackupToTelegram(payload = {}) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured', error: 'Telegram Bot Token or Chat ID not configured' };
  }

  // Extract employees and tableCustody from payload
  const rawEmployees = Array.isArray(payload) ? payload : (payload.employees || []);
  const tableCustody = payload.tableCustody || {};
  const activeCount = rawEmployees.filter(e => e.status === 'Active').length;

  // Sanitize and hash raw PINs
  const sanitizedRoster = sanitizeAndHashStaffRoster(rawEmployees, tableCustody);

  const timestamp = Date.now();
  const filename = `smartdine_staff_roster_${timestamp}.json`;

  const backupData = {
    app: 'SmartDine QR Restaurant Suite',
    schemaVersion: '1.0',
    backupType: 'STAFF_ROSTER_BACKUP',
    exportTimestamp: timestamp,
    exportedAt: new Date().toISOString(),
    stats: {
      totalStaff: sanitizedRoster.length,
      activeStaff: activeCount,
      totalTablesWithCustody: Object.keys(tableCustody).length,
      credentialProtection: 'SHA-256 Iterated + Salted Hash (Raw PINs sanitized)'
    },
    venueTableCustody: tableCustody,
    employees: sanitizedRoster
  };

  const jsonContent = JSON.stringify(backupData, null, 2);

  // Formatted summary lines
  const rosterLines = sanitizedRoster.map(emp => {
    const tablesStr = emp.assignedTables?.length > 0 ? emp.assignedTables.map(t => `T${t}`).join(', ') : 'None';
    const code = emp.accountCode || emp.waiterCode || 'WAIT';
    return `• <b>${escapeHtml(emp.name)}</b> (${escapeHtml(emp.role || 'Staff')})\n  🆔 <code>${escapeHtml(code)}</code> | 🍽️ Tables: ${tablesStr} | ⏰ ${escapeHtml(emp.shift || 'Default')}`;
  }).join('\n');

  const caption = `👥 <b>SMARTDINE STAFF ROSTER BACKUP</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>Exported:</b> ${new Date().toLocaleString()}\n` +
    `🧑‍🍳 <b>Total Staff:</b> ${sanitizedRoster.length}\n` +
    `🟢 <b>Active On Floor:</b> ${activeCount}\n` +
    `🔒 <b>Security:</b> Raw PINs sanitized & SHA-256 hashed\n` +
    `📄 <b>Filename:</b> <code>${filename}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>Staff Roster & Custody:</b>\n` +
    `${rosterLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💾 <i>Cloud backup archived for audit trail & disaster recovery.</i>`;

  // 1. Try sending as document attachment with caption
  try {
    let jsonBlob;
    if (typeof Blob !== 'undefined') {
      jsonBlob = new Blob([jsonContent], { type: 'application/json' });
    }

    if (jsonBlob && typeof FormData !== 'undefined') {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('caption', caption.length > 1000 ? caption.slice(0, 990) + '...' : caption);
      formData.append('parse_mode', 'HTML');
      formData.append('document', jsonBlob, filename);

      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.ok) {
        return {
          success: true,
          messageId: data.result?.message_id,
          fileId: data.result?.document?.file_id,
          data,
          backupData
        };
      }
    }
  } catch (docErr) {
    console.warn('[Telegram Roster Backup] sendDocument error, falling back to sendMessage:', docErr);
  }

  // 2. Fallback: sendMessage with HTML summary
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return {
      success: Boolean(data.ok),
      messageId: data.result?.message_id,
      data,
      backupData
    };
  } catch (msgErr) {
    console.warn('[Telegram Roster Backup] sendMessage error:', msgErr);
    return { success: false, error: msgErr.message, backupData };
  }
}

export const backupStaffRosterToTelegram = sendStaffRosterBackupToTelegram;

export default {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  getTelegramConfig,
  escapeHtml,
  dataUrlToBlob,
  isVideoMedia,
  resolveTelegramFileUrl,
  uploadPhotoToTelegram,
  uploadVideoToTelegram,
  uploadMediaToTelegram,
  sendVoiceNoteToTelegram,
  sendOrderToTelegramChannel,
  publishMenuSnapshotToTelegram,
  sendStaffRosterBackupToTelegram,
  backupStaffRosterToTelegram,
  sanitizeAndHashStaffRoster,
  sendWaiterCallToTelegramChannel,
  sendGuestChatToTelegramChannel,
  sendCustomerReportToTelegramChannel,
  sendSettlementToTelegramChannel,
  sendCorrectionToTelegramChannel,
  sendFloorSnapshotToTelegram,
  sendMessage,
  sendOrderStatusToTelegram,
  sendOrdersClearedToTelegram,
  checkTelegramHealth,
  sendTelegramTestPing
};
