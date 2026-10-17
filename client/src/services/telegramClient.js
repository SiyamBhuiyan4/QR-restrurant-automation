/**
 * Client-Side Telegram Channel Bridge
 * 
 * Allows the browser PWA (on Vercel or local network) to post orders and alerts
 * directly to the restaurant's Telegram Channel!
 */

export const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

/**
 * Send an Order Notification to Telegram Channel directly from Diner PWA
 */
export async function sendOrderToTelegramChannel(orderPayload) {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_token') : '') || '';
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_chat_id') : '') || '';

  if (!token || !chatId) {
    // Config not yet provided
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
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_token') : '') || '';
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || (typeof window !== 'undefined' ? localStorage.getItem('smartdine_tg_chat_id') : '') || '';

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
