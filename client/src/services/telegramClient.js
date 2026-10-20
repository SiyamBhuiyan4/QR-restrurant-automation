/**
 * Client-Side Telegram Channel Bridge & CDN Storage
 * 
 * Allows the browser PWA (on Vercel or local network) to post orders and alerts,
 * and seamlessly hosts Food Photos & 360° Product Profile Videos on Telegram CDN!
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
 * Send an Order Notification to Telegram Channel directly from Diner PWA
 */
export async function sendOrderToTelegramChannel(orderPayload) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  const table = orderPayload.tableNumber || orderPayload.table_number || 'Unknown';
  const orderId = orderPayload.orderId || orderPayload.orderNumber || `ORD-${Date.now().toString().slice(-4)}`;
  const total = orderPayload.total || orderPayload.totalAmount || '0.00';
  const items = orderPayload.items || [];

  let itemsText = items.map((it, i) => {
    let line = `${i + 1}. <b>${it.name}</b> × ${it.quantity} ($${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)})`;
    if (it.note) line += `\n   <i>Note: ${it.note}</i>`;
    return line;
  }).join('\n');

  let text = `🍽️ <b>NEW ORDER - SMARTDINE</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${table}\n`;
  text += `🧾 <b>Order ID:</b> <code>${orderId}</code>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>Items Ordered:</b>\n${itemsText || 'None'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💵 <b>Total:</b> $${Number(total).toFixed(2)}\n`;

  if (orderPayload.generalNote) {
    text += `💬 <b>Customer Note:</b> <i>"${orderPayload.generalNote}"</i>\n`;
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
    return { success: data.ok, data };
  } catch (err) {
    console.warn('[Telegram Client Bridge Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Waiter Bell Notification to Telegram Channel directly from Diner PWA
 */
export async function sendWaiterCallToTelegramChannel(tableNumber, reason) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return { success: false, reason: 'unconfigured' };
  }

  let text = `🛎️ <b>WAITER CALLED!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 <b>Table:</b> Table ${tableNumber}\n`;
  text += `🙋 <b>Reason:</b> <b>${reason}</b>\n`;
  text += `⏱️ <b>Time:</b> ${new Date().toLocaleTimeString()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Immediate assistance requested at Table ${tableNumber}.</i>`;

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
    return { success: data.ok, data };
  } catch (err) {
    console.warn('[Telegram Waiter Call Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Upload food photo to Telegram Channel and retrieve permanent CDN URL
 */
export async function uploadPhotoToTelegram(file) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID not configured');
  }

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', `📸 Food Photo: ${file?.name || 'dish-photo'}`);
  formData.append('photo', file);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || 'Failed to upload photo to Telegram');
  }

  const largestPhoto = Array.isArray(data.result?.photo) ? data.result.photo.slice(-1)[0] : null;
  if (!largestPhoto?.file_id) {
    throw new Error('No photo file_id returned from Telegram');
  }

  const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`);
  const fileData = await fileRes.json();
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Failed to resolve photo CDN path from Telegram: ' + (fileData.description || 'unknown error'));
  }

  const cdnUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
  return { 
    cdnUrl, 
    fileId: largestPhoto.file_id, 
    messageId: data.result?.message_id,
    mediaType: 'photo' 
  };
}

/**
 * Upload 360° product video or kitchen reel to Telegram Channel and retrieve permanent CDN URL.
 * Supports MP4, WebM, QuickTime (.mov), and mobile video formats.
 * Includes progressive streaming flag and fallback to sendDocument for broader codec support.
 */
export async function uploadVideoToTelegram(file) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Telegram Bot Token or Chat ID not configured');
  }

  const fileName = file?.name || 'dish-360-video.mp4';
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', `🎥 360° Profile Video / Kitchen Reel: ${fileName}`);
  formData.append('video', file);
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
    docFormData.append('document', file);

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
  let cdnUrl = '';

  if (fileId) {
    try {
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (fileData.ok && fileData.result?.file_path) {
        cdnUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
      }
    } catch (err) {
      console.warn('[TelegramClient] Failed to resolve video CDN path from Telegram getFile:', err);
    }
  }

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
 * @param {File|Blob} file 
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
